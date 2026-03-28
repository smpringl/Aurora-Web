import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const N8N_EXTRACT_URL = 'https://n8n-yp1u.onrender.com/v1/ghg/extract'
const N8N_ONBOARD_URL = 'https://n8n-yp1u.onrender.com/v1/ghg/onboard-company'

const MAX_DOMAINS = 500
const CONCURRENCY_LIMIT = 10
const DEADLINE_MS = 120_000 // 120s — leave 30s buffer before Supabase 150s timeout

// ---------------------------------------------------------------------------
// Shared helpers (same as ghg-latest)
// ---------------------------------------------------------------------------

function jsonResponse(body: Record<string, unknown>, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...extra },
  })
}

async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(apiKey)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = new Uint8Array(hashBuffer)
  return Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('')
}

function getEmissionsYear(): { report_year: number; emissions_year: number } {
  const now = new Date()
  const currentYear = now.getFullYear()
  const cutoff = new Date(currentYear, 3, 1) // April 1
  const report_year = now > cutoff ? currentYear : currentYear - 1
  return { report_year, emissions_year: report_year - 1 }
}

function formatEmissionsResponse(
  companyName: string,
  row: Record<string, unknown>,
): Record<string, unknown> {
  return {
    status: 'ok',
    company: companyName,
    year: row.year,
    methodology: row.total_methodology || (row.emissions_source === 'ESTIMATED' ? 'estimated' : 'reported'),
    total_emissions_tco2e: Number(row.total_emissions_tco2e) || null,
    scope1_emissions_tco2e: Number(row.scope1_emissions_tco2e) || null,
    scope2_emissions_tco2e: Number(row.scope2_emissions_tco2e) || null,
    scope2_basis: row.scope2_basis || null,
    scope3_emissions_tco2e: Number(row.scope3_emissions_tco2e) || null,
  }
}

function pickBestRow(rows: Record<string, unknown>[] | null): Record<string, unknown> | null {
  if (!rows || rows.length === 0) return null
  const priority: Record<string, number> = { reported: 0, partially_reported: 1, estimated: 2 }
  rows.sort((a, b) => {
    const pa = priority[String(a.total_methodology)] ?? 3
    const pb = priority[String(b.total_methodology)] ?? 3
    return pa - pb
  })
  return rows[0]
}

function fireN8nAsync(domain: string, authHeader: string): void {
  fetch(N8N_EXTRACT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader,
      'X-Aurora-Source': 'edge-function-batch',
    },
    body: JSON.stringify({ domain }),
  }).catch(err => console.error('n8n fire-and-forget failed:', err))
}

async function onboardCompany(domain: string, authHeader: string): Promise<Record<string, unknown> | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 25_000) // 25s timeout per onboard call
    const res = await fetch(N8N_ONBOARD_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        'X-Aurora-Source': 'edge-function-batch',
      },
      body: JSON.stringify({ domain }),
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (!res.ok) return null
    return await res.json()
  } catch (err) {
    console.error('Onboard company failed:', err)
    return null
  }
}

// ---------------------------------------------------------------------------
// Concurrency helper — run async tasks with a concurrency cap
// ---------------------------------------------------------------------------

async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
): Promise<T[]> {
  const results: T[] = new Array(tasks.length)
  let nextIndex = 0

  async function worker() {
    while (nextIndex < tasks.length) {
      const idx = nextIndex++
      results[idx] = await tasks[idx]()
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker())
  await Promise.all(workers)
  return results
}

// ---------------------------------------------------------------------------
// Process a single domain
// ---------------------------------------------------------------------------

type DomainResult = {
  domain: string
  result: Record<string, unknown>
  needsExtraction: boolean // whether n8n extraction should be fired
}

async function processDomain(
  domain: string,
  supabase: ReturnType<typeof createClient>,
  authHeader: string,
  emissionsYear: number,
  allowOnboard: boolean,
  deadlineMs: number,
): Promise<DomainResult> {
  const errorResult = (reason: string): DomainResult => ({
    domain,
    result: { status: 'data_not_available', reason },
    needsExtraction: false,
  })

  try {
    // Check deadline
    if (Date.now() > deadlineMs) {
      return { domain, result: { status: 'pending', reason: 'Processing timeout — poll GET to check later.' }, needsExtraction: false }
    }

    // --- Resolve domain ---
    const { data: resolveResult, error: resolveError } = await supabase.rpc(
      'resolve_company_by_domain',
      { in_domain: domain },
    )

    const resolved = (!resolveError && resolveResult && resolveResult.length > 0) ? resolveResult[0] : null

    let companyId: string | null = null
    let wasOnboarded = false

    if (!resolved || resolved.outcome === 'NEW_COMPANY_NEEDED') {
      if (!allowOnboard) {
        // Deadline pressure — skip onboarding, mark pending
        return { domain, result: { status: 'pending', reason: 'Unknown domain — queued for processing. Poll GET to check later.' }, needsExtraction: false }
      }

      // Check deadline again before slow onboard call
      if (Date.now() > deadlineMs - 30_000) {
        return { domain, result: { status: 'pending', reason: 'Unknown domain — queued for processing. Poll GET to check later.' }, needsExtraction: false }
      }

      const onboardResult = await onboardCompany(domain, authHeader)
      if (!onboardResult?.success || !onboardResult?.company_id) {
        // Onboard failed — fire extraction async and return unavailable
        fireN8nAsync(domain, authHeader)
        return errorResult('Could not resolve company. Processing has been initiated — data may be available on retry.')
      }

      companyId = onboardResult.company_id as string
      wasOnboarded = true
    } else {
      companyId = resolved.company_id
    }

    // --- Get company name ---
    const { data: companyRow } = await supabase
      .from('companies')
      .select('name, sector_id')
      .eq('id', companyId)
      .single()

    const companyName = companyRow?.name ?? domain

    // --- Cache check ---
    const { data: cachedRows } = await supabase
      .from('emissions_annual')
      .select('*')
      .eq('company_id', companyId)
      .eq('year', emissionsYear)
      .limit(10)

    const cached = pickBestRow(cachedRows)

    if (cached) {
      // Cache hit — still fire extraction if it was only estimated
      const needsExtraction = String(cached.total_methodology) === 'estimated' || cached.emissions_source === 'ESTIMATED'
      return {
        domain,
        result: formatEmissionsResponse(companyName, cached),
        needsExtraction,
      }
    }

    // --- Cache miss: estimate ---
    const { data: estResult } = await supabase.rpc(
      'estimate_emissions_for_company_year_http',
      { in_company_id: companyId, in_year: emissionsYear },
    )

    if (estResult && (estResult.status === 'ok' || estResult.status === 'already_exists') && estResult.emissions) {
      return {
        domain,
        result: formatEmissionsResponse(companyName, estResult.emissions),
        needsExtraction: true, // fire extraction to get reported data
      }
    }

    // Estimation not possible
    return {
      domain,
      result: {
        status: 'data_not_available',
        reason: estResult?.reason || 'Insufficient data to estimate emissions. Processing initiated — data may be available on retry.',
      },
      needsExtraction: true,
    }
  } catch (err) {
    console.error(`Error processing domain ${domain}:`, err)
    return errorResult('Internal error processing this domain.')
  }
}

// ---------------------------------------------------------------------------
// POST handler — submit batch
// ---------------------------------------------------------------------------

async function handlePost(
  req: Request,
  supabase: ReturnType<typeof createClient>,
): Promise<Response> {
  const start = Date.now()
  const deadline = start + DEADLINE_MS

  // --- Auth ---
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return jsonResponse({ status: 'error', reason: 'API key required. Use Authorization: Bearer <key>' }, 401)
  }

  const apiKey = authHeader.slice(7)
  const keyHash = await hashApiKey(apiKey)

  const { data: keyRecord, error: keyError } = await supabase
    .from('api_keys')
    .select('user_id, key_hash')
    .eq('key_hash', keyHash)
    .single()

  if (keyError || !keyRecord) {
    return jsonResponse({ status: 'error', reason: 'Invalid API key' }, 401)
  }

  const clientId: string = keyRecord.user_id

  // --- Rate limit ---
  const { data: rateResult } = await supabase.rpc('check_rate_limit', {
    p_client_id: clientId,
  })

  if (rateResult && !rateResult.allowed) {
    const resetAt = new Date(rateResult.reset_at)
    const retryAfter = Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000))
    return jsonResponse(
      { status: 'error', reason: 'Rate limit exceeded. Try again shortly.' },
      429,
      { 'Retry-After': String(retryAfter) },
    )
  }

  // --- Parse body ---
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ status: 'error', reason: 'Invalid JSON body' }, 400)
  }

  const rawDomains = body.domains
  if (!Array.isArray(rawDomains) || rawDomains.length === 0) {
    return jsonResponse({ status: 'error', reason: 'Missing or empty required field: domains (array of strings)' }, 400)
  }

  if (rawDomains.length > MAX_DOMAINS) {
    return jsonResponse({ status: 'error', reason: `Too many domains. Maximum is ${MAX_DOMAINS}.` }, 400)
  }

  // Normalize & deduplicate domains
  const domainSet = new Set<string>()
  for (const d of rawDomains) {
    if (typeof d === 'string' && d.trim()) {
      domainSet.add(d.trim().toLowerCase())
    }
  }
  const domains = Array.from(domainSet)

  if (domains.length === 0) {
    return jsonResponse({ status: 'error', reason: 'No valid domains provided.' }, 400)
  }

  const webhookUrl = typeof body.webhook_url === 'string' ? body.webhook_url.trim() : null

  // --- Log request ---
  const { data: reqRow } = await supabase
    .from('api_requests')
    .insert({
      client_id: clientId,
      endpoint: '/v1/ghg/batch',
      method: 'POST',
      domain: `batch:${domains.length}`,
      status: 'authorized',
      http_status: null,
    })
    .select('id')
    .single()

  const requestId = reqRow?.id ?? null

  // --- Create batch_requests row ---
  const { data: batchRow, error: batchError } = await supabase
    .from('batch_requests')
    .insert({
      client_id: clientId,
      domains: domains,
      total: domains.length,
      completed: 0,
      status: 'processing',
    })
    .select('id')
    .single()

  if (batchError || !batchRow) {
    console.error('Failed to create batch_requests row:', batchError)
    return jsonResponse({ status: 'error', reason: 'Failed to create batch request.' }, 500)
  }

  const batchId: string = batchRow.id
  const { emissions_year: emissionsYear } = getEmissionsYear()

  // --- Phase 1: Resolve all domains to classify known vs unknown ---
  // Do a quick parallel resolve pass to separate known (fast) from unknown (slow)
  const resolveResults = await runWithConcurrency(
    domains.map(d => async () => {
      const { data, error } = await supabase.rpc('resolve_company_by_domain', { in_domain: d })
      const resolved = (!error && data && data.length > 0) ? data[0] : null
      const isKnown = resolved && resolved.outcome !== 'NEW_COMPANY_NEEDED'
      return { domain: d, isKnown, resolved }
    }),
    CONCURRENCY_LIMIT,
  )

  const knownDomains: string[] = []
  const unknownDomains: string[] = []
  // Cache resolve results so processDomain can skip the RPC
  const resolveCache = new Map<string, { company_id: string }>()

  for (const r of resolveResults) {
    if (r.isKnown) {
      knownDomains.push(r.domain)
      resolveCache.set(r.domain, { company_id: r.resolved.company_id })
    } else {
      unknownDomains.push(r.domain)
    }
  }

  // --- Phase 2: Process known domains first (fast — cache lookups + estimation) ---
  const results: Record<string, Record<string, unknown>> = {}
  let completed = 0
  const domainsNeedingExtraction: string[] = []

  const knownTasks = knownDomains.map(d => async () => {
    // For known domains, we already have the company_id — pass it through processDomain
    const dr = await processDomainKnown(d, resolveCache.get(d)!.company_id, supabase, authHeader, emissionsYear)
    results[d] = dr.result
    if (dr.needsExtraction) domainsNeedingExtraction.push(d)
    completed++
    return dr
  })

  await runWithConcurrency(knownTasks, CONCURRENCY_LIMIT)

  // --- Phase 3: Process unknown domains (slow — onboarding) ---
  const unknownTasks = unknownDomains.map(d => async () => {
    const dr = await processDomain(d, supabase, authHeader, emissionsYear, true, deadline)
    results[d] = dr.result
    if (dr.needsExtraction) domainsNeedingExtraction.push(d)
    completed++
    return dr
  })

  await runWithConcurrency(unknownTasks, CONCURRENCY_LIMIT)

  // --- Fire n8n extraction for domains that need it ---
  for (const d of domainsNeedingExtraction) {
    fireN8nAsync(d, authHeader)
  }

  // --- Determine final status ---
  const hasPending = Object.values(results).some(r => r.status === 'pending')
  const batchStatus = hasPending ? 'partial' : 'completed'

  // --- Save results to batch_requests ---
  await supabase
    .from('batch_requests')
    .update({
      results,
      completed,
      status: batchStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', batchId)

  // --- Finalize API request log ---
  if (requestId) {
    const durationMs = Date.now() - start
    await supabase
      .from('api_requests')
      .update({
        status: 'succeeded',
        http_status: 200,
        duration_ms: Math.round(durationMs),
      })
      .eq('id', requestId)
  }

  return jsonResponse({
    batch_id: batchId,
    total: domains.length,
    completed,
    status: batchStatus,
    results,
  })
}

// ---------------------------------------------------------------------------
// Optimized path for known domains (skip resolve RPC)
// ---------------------------------------------------------------------------

async function processDomainKnown(
  domain: string,
  companyId: string,
  supabase: ReturnType<typeof createClient>,
  authHeader: string,
  emissionsYear: number,
): Promise<DomainResult> {
  try {
    // --- Get company name ---
    const { data: companyRow } = await supabase
      .from('companies')
      .select('name, sector_id')
      .eq('id', companyId)
      .single()

    const companyName = companyRow?.name ?? domain

    // --- Cache check ---
    const { data: cachedRows } = await supabase
      .from('emissions_annual')
      .select('*')
      .eq('company_id', companyId)
      .eq('year', emissionsYear)
      .limit(10)

    const cached = pickBestRow(cachedRows)

    if (cached) {
      const needsExtraction = String(cached.total_methodology) === 'estimated' || cached.emissions_source === 'ESTIMATED'
      return {
        domain,
        result: formatEmissionsResponse(companyName, cached),
        needsExtraction,
      }
    }

    // --- Cache miss: estimate ---
    const { data: estResult } = await supabase.rpc(
      'estimate_emissions_for_company_year_http',
      { in_company_id: companyId, in_year: emissionsYear },
    )

    if (estResult && (estResult.status === 'ok' || estResult.status === 'already_exists') && estResult.emissions) {
      return {
        domain,
        result: formatEmissionsResponse(companyName, estResult.emissions),
        needsExtraction: true,
      }
    }

    return {
      domain,
      result: {
        status: 'data_not_available',
        reason: estResult?.reason || 'Insufficient data to estimate emissions. Processing initiated — data may be available on retry.',
      },
      needsExtraction: true,
    }
  } catch (err) {
    console.error(`Error processing known domain ${domain}:`, err)
    return {
      domain,
      result: { status: 'data_not_available', reason: 'Internal error processing this domain.' },
      needsExtraction: false,
    }
  }
}

// ---------------------------------------------------------------------------
// GET handler — poll batch status
// ---------------------------------------------------------------------------

async function handleGet(
  req: Request,
  supabase: ReturnType<typeof createClient>,
): Promise<Response> {
  // --- Auth ---
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return jsonResponse({ status: 'error', reason: 'API key required. Use Authorization: Bearer <key>' }, 401)
  }

  const apiKey = authHeader.slice(7)
  const keyHash = await hashApiKey(apiKey)

  const { data: keyRecord, error: keyError } = await supabase
    .from('api_keys')
    .select('user_id, key_hash')
    .eq('key_hash', keyHash)
    .single()

  if (keyError || !keyRecord) {
    return jsonResponse({ status: 'error', reason: 'Invalid API key' }, 401)
  }

  const clientId: string = keyRecord.user_id

  // --- Parse batch_id from query params ---
  const url = new URL(req.url)
  const batchId = url.searchParams.get('batch_id')

  if (!batchId) {
    return jsonResponse({ status: 'error', reason: 'Missing required query parameter: batch_id' }, 400)
  }

  // --- Lookup batch request (service role bypasses RLS, so verify client_id manually) ---
  const { data: batchRow, error: batchError } = await supabase
    .from('batch_requests')
    .select('*')
    .eq('id', batchId)
    .single()

  if (batchError || !batchRow) {
    return jsonResponse({ status: 'error', reason: 'Batch request not found.' }, 404)
  }

  if (batchRow.client_id !== clientId) {
    return jsonResponse({ status: 'error', reason: 'Batch request not found.' }, 404)
  }

  // --- For partial batches, check if any pending domains now have data ---
  if (batchRow.status === 'partial') {
    const results: Record<string, Record<string, unknown>> = batchRow.results ?? {}
    const domains: string[] = batchRow.domains ?? []
    const { emissions_year: emissionsYear } = getEmissionsYear()
    let updated = false
    let completedCount = batchRow.completed ?? 0

    for (const domain of domains) {
      const existingResult = results[domain]
      if (!existingResult || existingResult.status !== 'pending') continue

      // Try to resolve and check cache for this pending domain
      const { data: resolveResult } = await supabase.rpc(
        'resolve_company_by_domain',
        { in_domain: domain },
      )

      const resolved = (resolveResult && resolveResult.length > 0) ? resolveResult[0] : null
      if (!resolved || resolved.outcome === 'NEW_COMPANY_NEEDED') continue

      const { data: companyRow } = await supabase
        .from('companies')
        .select('name')
        .eq('id', resolved.company_id)
        .single()

      const { data: cachedRows } = await supabase
        .from('emissions_annual')
        .select('*')
        .eq('company_id', resolved.company_id)
        .eq('year', emissionsYear)
        .limit(10)

      const cached = pickBestRow(cachedRows)
      if (cached) {
        results[domain] = formatEmissionsResponse(companyRow?.name ?? domain, cached)
        completedCount++
        updated = true
      }
    }

    if (updated) {
      const hasPending = Object.values(results).some(r => r.status === 'pending')
      const newStatus = hasPending ? 'partial' : 'completed'

      await supabase
        .from('batch_requests')
        .update({
          results,
          completed: completedCount,
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', batchId)

      return jsonResponse({
        batch_id: batchId,
        total: batchRow.total,
        completed: completedCount,
        status: newStatus,
        results,
      })
    }
  }

  // --- Also check if n8n extraction completed for domains that were estimated ---
  // Re-check emissions_annual for domains that currently have estimated data
  if (batchRow.status === 'completed' || batchRow.status === 'partial') {
    const results: Record<string, Record<string, unknown>> = batchRow.results ?? {}
    const { emissions_year: emissionsYear } = getEmissionsYear()
    let upgraded = false

    for (const [domain, result] of Object.entries(results)) {
      if (result.status !== 'ok' || result.methodology !== 'estimated') continue

      // Check if reported data has arrived since the batch was submitted
      const { data: resolveResult } = await supabase.rpc(
        'resolve_company_by_domain',
        { in_domain: domain },
      )

      const resolved = (resolveResult && resolveResult.length > 0) ? resolveResult[0] : null
      if (!resolved || resolved.outcome === 'NEW_COMPANY_NEEDED') continue

      const { data: cachedRows } = await supabase
        .from('emissions_annual')
        .select('*')
        .eq('company_id', resolved.company_id)
        .eq('year', emissionsYear)
        .limit(10)

      const best = pickBestRow(cachedRows)
      if (best && String(best.total_methodology) !== 'estimated') {
        const { data: companyRow } = await supabase
          .from('companies')
          .select('name')
          .eq('id', resolved.company_id)
          .single()

        results[domain] = formatEmissionsResponse(companyRow?.name ?? domain, best)
        upgraded = true
      }
    }

    if (upgraded) {
      await supabase
        .from('batch_requests')
        .update({
          results,
          updated_at: new Date().toISOString(),
        })
        .eq('id', batchId)

      return jsonResponse({
        batch_id: batchId,
        total: batchRow.total,
        completed: batchRow.completed,
        status: batchRow.status,
        results,
      })
    }
  }

  return jsonResponse({
    batch_id: batchId,
    total: batchRow.total,
    completed: batchRow.completed,
    status: batchRow.status,
    results: batchRow.results,
  })
}

// ---------------------------------------------------------------------------
// Main serve
// ---------------------------------------------------------------------------

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  try {
    if (req.method === 'POST') {
      return await handlePost(req, supabase)
    }

    if (req.method === 'GET') {
      return await handleGet(req, supabase)
    }

    return jsonResponse({ status: 'error', reason: 'Method not allowed' }, 405)
  } catch (err) {
    console.error('ghg-batch error:', err)
    return jsonResponse({ status: 'error', reason: 'Internal server error' }, 500)
  }
})
