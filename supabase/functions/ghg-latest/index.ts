import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const N8N_WEBHOOK_URL = 'https://n8n-yp1u.onrender.com/v1/ghg/extract'
const N8N_ONBOARD_URL = 'https://n8n-yp1u.onrender.com/v1/ghg/onboard-company'

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
    total_emissions_tco2e: row.total_emissions_tco2e != null ? Math.round(Number(row.total_emissions_tco2e)) : null,
    scope1_emissions_tco2e: row.scope1_emissions_tco2e != null ? Math.round(Number(row.scope1_emissions_tco2e)) : null,
    scope2_emissions_tco2e: row.scope2_emissions_tco2e != null ? Math.round(Number(row.scope2_emissions_tco2e)) : null,
    scope2_basis: row.scope2_basis || null,
    scope3_emissions_tco2e: row.scope3_emissions_tco2e != null ? Math.round(Number(row.scope3_emissions_tco2e)) : null,
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const start = Date.now()
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  let requestId: string | null = null
  let clientId: string | null = null
  let domain: string | null = null

  try {
    // --- Parse request ---
    if (req.method !== 'POST') {
      return jsonResponse({ status: 'error', reason: 'Method not allowed' }, 405)
    }

    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ status: 'error', reason: 'Invalid JSON body' }, 400)
    }

    domain = typeof body.domain === 'string' ? body.domain.trim().toLowerCase() : null
    if (!domain) {
      return jsonResponse({ status: 'error', reason: 'Missing required field: domain' }, 400)
    }

    // --- Authenticate ---
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return jsonResponse({ status: 'error', reason: 'API key required. Use Authorization: Bearer <key>' }, 401)
    }

    const apiKey = authHeader.slice(7) // strip "Bearer "
    const keyHash = await hashApiKey(apiKey)

    const { data: keyRecord, error: keyError } = await supabase
      .from('api_keys')
      .select('user_id, key_hash')
      .eq('key_hash', keyHash)
      .single()

    if (keyError || !keyRecord) {
      return jsonResponse({ status: 'error', reason: 'Invalid API key' }, 401)
    }

    clientId = keyRecord.user_id

    // --- Credit check ---
    const { data: creditBal } = await supabase
      .from('credit_balances')
      .select('balance')
      .eq('user_id', clientId)
      .single()

    if (!creditBal || creditBal.balance < 3) {
      return jsonResponse(
        { status: 'error', reason: 'Insufficient credits. Purchase more at https://auroracarbon.com/dashboard#billing' },
        402,
      )
    }

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

    // --- Log request ---
    const { data: reqRow } = await supabase
      .from('api_requests')
      .insert({
        client_id: clientId,
        endpoint: '/v1/ghg/latest',
        method: 'POST',
        domain,
        status: 'authorized',
        http_status: null,
      })
      .select('id')
      .single()

    requestId = reqRow?.id ?? null

    // --- Compute emissions year ---
    const { emissions_year } = getEmissionsYear()

    // --- Resolve domain ---
    const { data: resolveResult, error: resolveError } = await supabase.rpc(
      'resolve_company_by_domain',
      { in_domain: domain },
    )

    let companyId: string
    const resolved = (!resolveError && resolveResult && resolveResult.length > 0) ? resolveResult[0] : null

    if (!resolved || resolved.outcome === 'NEW_COMPANY_NEEDED') {
      // Unknown domain — call lightweight onboard workflow synchronously
      const onboardResult = await onboardCompany(domain, authHeader)

      if (!onboardResult?.success || !onboardResult?.company_id) {
        // Onboarding failed — fall back to firing full extraction async
        fireN8nAsync(domain, authHeader)
        await finalizeRequest(supabase, requestId, 'failed', 200, Date.now() - start)
        return jsonResponse({
          status: 'data_not_available',
          reason: 'Emissions data is not currently available for this company.',
        })
      }

      companyId = onboardResult.company_id
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

    // --- Cache check: current year, then fall back to prior year ---
    const { data: cachedRows } = await supabase
      .from('emissions_annual')
      .select('*')
      .eq('company_id', companyId)
      .eq('year', emissions_year)
      .limit(10)

    let cached = pickBestRow(cachedRows)
    let servedFromPriorYear = false

    if (!cached) {
      // No data for current emissions_year — check prior year
      const { data: priorRows } = await supabase
        .from('emissions_annual')
        .select('*')
        .eq('company_id', companyId)
        .eq('year', emissions_year - 1)
        .limit(10)

      const priorBest = pickBestRow(priorRows)
      if (priorBest && String(priorBest.total_methodology) !== 'estimated') {
        // Serve prior year's reported/partially_reported data
        cached = priorBest
        servedFromPriorYear = true
      }
    }

    if (cached) {
      // Cache HIT — deduct credits and return
      const { data: deductResult } = await supabase.rpc('deduct_credits', {
        p_user_id: clientId, p_amount: 3, p_request_id: requestId,
      })
      if (deductResult && !deductResult.success) {
        return jsonResponse({ status: 'error', reason: 'Insufficient credits.' }, 402)
      }
      if (deductResult?.balance != null) checkLowBalance(supabase, clientId!, deductResult.balance)

      // If serving prior year data, still fire extraction in background
      // to look for the new year's report (respecting monthly cooldown)
      if (servedFromPriorYear) {
        const { data: shouldExtract } = await supabase.rpc('should_attempt_extraction', {
          p_company_id: companyId, p_year: emissions_year,
        })
        if (shouldExtract) {
          await supabase.rpc('record_extraction_attempt', {
            p_company_id: companyId, p_year: emissions_year, p_result: 'pending',
          })
          fireN8nAsync(domain, authHeader)
        }
      }

      await finalizeRequest(supabase, requestId, 'succeeded', 200, Date.now() - start)
      return jsonResponse(formatEmissionsResponse(companyName, cached))
    }

    // --- Cache MISS (no data for current or prior year) ---
    // Check monthly extraction cooldown before firing n8n
    await supabase.rpc('cleanup_stale_locks')

    const { data: shouldExtract } = await supabase.rpc('should_attempt_extraction', {
      p_company_id: companyId, p_year: emissions_year,
    })

    if (shouldExtract) {
      const { data: lockResult, error: lockError } = await supabase
        .from('processing_locks')
        .insert({
          company_id: companyId,
          year: emissions_year,
          request_id: requestId,
          locked_by: 'edge_function',
        })
        .select('company_id')

      const lockAcquired = !lockError && lockResult && lockResult.length > 0

      if (lockAcquired) {
        await supabase.rpc('record_extraction_attempt', {
          p_company_id: companyId, p_year: emissions_year, p_result: 'pending',
        })
        fireN8nAsync(domain, authHeader)
      }
    }

    // --- Call estimation RPC (retry once for newly onboarded companies) ---
    const isNewlyOnboarded = !resolved || resolved.outcome === 'NEW_COMPANY_NEEDED'
    const maxAttempts = isNewlyOnboarded ? 2 : 1

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const { data: estResult, error: estError } = await supabase.rpc(
        'estimate_emissions_for_company_year_http',
        { in_company_id: companyId, in_year: emissions_year },
      )

      if (estError) {
        console.error(`Estimation RPC error for ${domain} (attempt ${attempt}):`, estError.message)
        if (attempt < maxAttempts) {
          await new Promise(r => setTimeout(r, 2000))
          continue
        }
        await finalizeRequest(supabase, requestId, 'failed', 500, Date.now() - start, 'estimation_error', estError.message)
        return jsonResponse({
          status: 'data_not_available',
          reason: 'Emissions data is not currently available for this company.',
        })
      }

      if (estResult) {
        const estStatus = estResult.status
        const emissions = estResult.emissions

        if ((estStatus === 'ok' || estStatus === 'already_exists') && emissions) {
          // Deduct credits for estimated response
          const { data: deductResult } = await supabase.rpc('deduct_credits', {
            p_user_id: clientId, p_amount: 3, p_request_id: requestId,
          })
          if (deductResult && !deductResult.success) {
            return jsonResponse({ status: 'error', reason: 'Insufficient credits.' }, 402)
          }
          if (deductResult?.balance != null) checkLowBalance(supabase, clientId!, deductResult.balance)
          await finalizeRequest(supabase, requestId, 'succeeded', 200, Date.now() - start)
          return jsonResponse(formatEmissionsResponse(companyName, emissions))
        }

        // Estimation returned but not usable — retry if newly onboarded (sector/revenue might not be committed yet)
        console.warn(`Estimation not usable for ${domain} (attempt ${attempt}):`, JSON.stringify({ status: estStatus, reason: estResult.reason, debug: estResult.debug }))
        if (attempt < maxAttempts) {
          await new Promise(r => setTimeout(r, 2000))
          continue
        }
      }
    }

    // Estimation not available after all attempts
    await finalizeRequest(supabase, requestId, 'failed', 200, Date.now() - start)
    return jsonResponse({
      status: 'data_not_available',
      reason: 'Emissions data is not currently available for this company.',
    })

  } catch (err) {
    console.error('ghg-latest error:', err)
    if (requestId) {
      await finalizeRequest(supabase, requestId, 'failed', 500, Date.now() - start, 'internal_error', String(err))
    }
    return jsonResponse({ status: 'error', reason: 'Internal server error' }, 500)
  }
})

// --- Low-balance alerts ---

function checkLowBalance(
  supabase: ReturnType<typeof createClient>,
  clientId: string,
  newBalance: number,
): void {
  if (newBalance > 30) return
  const template = newBalance <= 0 ? 'credits_depleted' : 'credits_low'
  // Look up user email and send alert (fire-and-forget)
  supabase.auth.admin.getUserById(clientId).then(({ data }) => {
    const email = data?.user?.email
    if (!email) return
    fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({ template, to: email, data: { balance: newBalance } }),
    }).catch(() => {})
  }).catch(() => {})
}

// --- Helpers ---

function pickBestRow(rows: Record<string, unknown>[] | null): Record<string, unknown> | null {
  if (!rows || rows.length === 0) return null
  // Prefer non-outlier REPORTED > partially_reported > ESTIMATED > outlier-flagged REPORTED
  const priority: Record<string, number> = { reported: 0, partially_reported: 1, estimated: 2 }
  rows.sort((a, b) => {
    const aOutlier = a.outlier_flag === true
    const bOutlier = b.outlier_flag === true
    // Outlier-flagged rows rank below estimated (priority 3)
    const pa = aOutlier ? 3 : (priority[String(a.total_methodology)] ?? 4)
    const pb = bOutlier ? 3 : (priority[String(b.total_methodology)] ?? 4)
    return pa - pb
  })
  return rows[0]
}

async function onboardCompany(domain: string, authHeader: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(N8N_ONBOARD_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        'X-Aurora-Source': 'edge-function',
      },
      body: JSON.stringify({ domain }),
    })
    if (!res.ok) return null
    return await res.json()
  } catch (err) {
    console.error('Onboard company failed:', err)
    return null
  }
}

function fireN8nAsync(domain: string, authHeader: string): void {
  // Fire-and-forget: don't await
  fetch(N8N_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader,
      'X-Aurora-Source': 'edge-function',
    },
    body: JSON.stringify({ domain }),
  }).catch(err => console.error('n8n fire-and-forget failed:', err))
}

async function finalizeRequest(
  supabase: ReturnType<typeof createClient>,
  requestId: string | null,
  status: string,
  httpStatus: number,
  durationMs: number,
  errorCode?: string,
  errorMessage?: string,
): Promise<void> {
  if (!requestId) return
  try {
    const update: Record<string, unknown> = {
      status,
      http_status: httpStatus,
      duration_ms: Math.round(durationMs),
    }
    if (errorCode) update.error_code = errorCode
    if (errorMessage) update.error_message = errorMessage
    await supabase.from('api_requests').update(update).eq('id', requestId)
  } catch (err) {
    console.error('Failed to finalize api_request:', err)
  }
}
