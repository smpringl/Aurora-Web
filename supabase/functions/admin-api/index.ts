import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function verifyAdmin(authHeader: string): Promise<{ userId: string; email: string }> {
  const token = authHeader.replace('Bearer ', '')
  // Create a client with the user's JWT to get their identity
  const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: { user }, error } = await userClient.auth.getUser(token)
  if (error || !user) throw new Error('Invalid token')

  // Check admin_users table with service role
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  const { data: adminRow } = await admin
    .from('admin_users')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (!adminRow) throw new Error('Not an admin')
  return { userId: user.id, email: user.email || '' }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Missing authorization' }, 401)

    const { userId } = await verifyAdmin(authHeader)
    const body = await req.json()
    const action = body.action

    // Service-role client for cross-user queries
    const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    switch (action) {
      // ── Dashboard ──
      case 'dashboard-stats': {
        const now = new Date()
        const lastHour = new Date(now.getTime() - 3600000).toISOString()
        const lastDay = new Date(now.getTime() - 86400000).toISOString()
        const last30d = new Date(now.getTime() - 30 * 86400000).toISOString()

        const [hourRes, dayRes, monthRes] = await Promise.all([
          db.from('api_requests').select('status', { count: 'exact' })
            .eq('endpoint', '/v1/ghg/latest')
            .gte('received_at', lastHour),
          db.from('api_requests').select('status, duration_ms', { count: 'exact' })
            .eq('endpoint', '/v1/ghg/latest')
            .gte('received_at', lastDay),
          db.from('api_requests').select('status, received_at', { count: 'exact' })
            .eq('endpoint', '/v1/ghg/latest')
            .in('status', ['succeeded', 'failed', 'rejected'])
            .gte('received_at', last30d),
        ])

        const dayRows = dayRes.data || []
        const succeeded = dayRows.filter(r => r.status === 'succeeded').length
        const durations = dayRows.filter(r => r.duration_ms != null).map(r => r.duration_ms as number)
        const avgLatency = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0

        // Build 30-day chart data
        const monthRows = monthRes.data || []
        const bucketMap: Record<string, { succeeded: number; failed: number }> = {}
        for (let i = 29; i >= 0; i--) {
          const d = new Date(now.getTime() - i * 86400000)
          bucketMap[d.toISOString().slice(0, 10)] = { succeeded: 0, failed: 0 }
        }
        for (const r of monthRows) {
          const key = r.received_at.substring(0, 10)
          if (bucketMap[key]) {
            if (r.status === 'succeeded') bucketMap[key].succeeded++
            else bucketMap[key].failed++
          }
        }
        const chart_data = Object.entries(bucketMap).map(([key, counts]) => ({ key, ...counts }))

        return json({
          last_hour: hourRes.count || 0,
          last_day: dayRes.count || 0,
          last_30d: monthRes.count || 0,
          success_rate: dayRows.length > 0 ? Math.round((succeeded / dayRows.length) * 100) : 0,
          avg_latency_ms: avgLatency,
          chart_data,
        })
      }

      case 'request-feed': {
        const limit = body.limit || 50
        const { data } = await db
          .from('api_requests')
          .select('id, domain, status, received_at, duration_ms, client_id')
          .eq('endpoint', '/v1/ghg/latest')
          .in('status', ['succeeded', 'failed', 'rejected'])
          .order('received_at', { ascending: false })
          .limit(limit)

        // Fetch user emails for the client_ids
        const clientIds = [...new Set((data || []).map(r => r.client_id).filter(Boolean))]
        let emailMap: Record<string, string> = {}
        if (clientIds.length > 0) {
          const { data: profiles } = await db
            .from('profiles')
            .select('user_id, email')
            .in('user_id', clientIds)
          if (profiles) {
            emailMap = Object.fromEntries(profiles.map(p => [p.user_id, p.email]))
          }
        }

        const requests = (data || []).map(r => ({
          ...r,
          user_email: emailMap[r.client_id] || r.client_id,
        }))

        return json({ requests })
      }

      case 'request-detail': {
        const { request_id } = body
        if (!request_id) return json({ error: 'request_id required' }, 400)

        // Full request record
        const { data: request } = await db
          .from('api_requests')
          .select('*')
          .eq('id', request_id)
          .single()

        if (!request) return json({ error: 'Request not found' }, 404)

        // Request events (trace)
        const { data: events } = await db
          .from('api_request_events')
          .select('*')
          .eq('request_id', request_id)
          .order('ts', { ascending: true })

        // If we have a domain, get the company + emissions
        let company = null
        let emissions = null
        if (request.domain) {
          const { data: domainRow } = await db
            .from('company_domains')
            .select('company_id, companies(name, sector_id, revenue_usd, sectors(name))')
            .eq('domain', request.domain)
            .limit(1)
            .single()

          if (domainRow) {
            const c = domainRow.companies as Record<string, unknown>
            const sectorObj = c?.sectors as Record<string, unknown> | null
            company = { ...c, sector_name: sectorObj?.name ?? null }
            delete (company as Record<string, unknown>).sectors
            const { data: emissionsRow } = await db
              .from('emissions_annual')
              .select('*')
              .eq('company_id', domainRow.company_id)
              .order('year', { ascending: false })
              .limit(1)
              .single()
            emissions = emissionsRow
          }
        }

        // User email
        let userEmail = request.client_id
        if (request.client_id) {
          const { data: profile } = await db
            .from('profiles')
            .select('email')
            .eq('user_id', request.client_id)
            .single()
          if (profile) userEmail = profile.email
        }

        return json({
          request: { ...request, user_email: userEmail },
          events: events || [],
          company,
          emissions,
        })
      }

      case 'extraction-detail': {
        const { company_id, year } = body
        if (!company_id) return json({ error: 'company_id required' }, 400)

        // Company info
        const { data: companyRaw } = await db
          .from('companies')
          .select('id, name, sector_id, revenue_usd, report_domain, reporting_entity_name, sectors(name)')
          .eq('id', company_id)
          .single()
        const sectorObj = (companyRaw as Record<string, unknown>)?.sectors as Record<string, unknown> | null
        const company = companyRaw ? { ...companyRaw, sector_name: sectorObj?.name ?? null } : null
        if (company) delete (company as Record<string, unknown>).sectors

        // Domains
        const { data: domains } = await db
          .from('company_domains')
          .select('domain')
          .eq('company_id', company_id)

        // Emissions for this year (or latest)
        let emissionsQuery = db
          .from('emissions_annual')
          .select('*')
          .eq('company_id', company_id)
          .order('year', { ascending: false })
          .limit(1)
        if (year) {
          emissionsQuery = db
            .from('emissions_annual')
            .select('*')
            .eq('company_id', company_id)
            .eq('year', year)
            .single()
        }
        const { data: emissions } = await emissionsQuery

        // Manual queue entries
        const { data: queueEntries } = await db
          .from('manual_report_queue')
          .select('*')
          .eq('company_id', company_id)
          .order('created_at', { ascending: false })
          .limit(5)

        // Processing lock
        const { data: lock } = await db
          .from('processing_locks')
          .select('*')
          .eq('company_id', company_id)
          .single()

        // Execution trace — find request_ids for this company from api_requests and processing_locks
        const traceRequestIds: string[] = []
        if (lock?.request_id) traceRequestIds.push(lock.request_id)

        // Also find recent api_requests for this company's domains
        const companyDomains = (domains || []).map(d => d.domain)
        if (companyDomains.length > 0) {
          const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
          const { data: recentReqs } = await db
            .from('api_requests')
            .select('id')
            .in('domain', companyDomains)
            .gte('received_at', weekAgo)
            .order('received_at', { ascending: false })
            .limit(5)
          if (recentReqs) {
            for (const r of recentReqs) {
              if (!traceRequestIds.includes(r.id)) traceRequestIds.push(r.id)
            }
          }
        }

        // Fetch events for all related request IDs
        let events: unknown[] = []
        if (traceRequestIds.length > 0) {
          const { data: evts } = await db
            .from('api_request_events')
            .select('*')
            .in('request_id', traceRequestIds)
            .order('ts', { ascending: true })
          events = evts || []
        }

        return json({
          company,
          domains: (domains || []).map(d => d.domain),
          emissions: Array.isArray(emissions) ? emissions[0] : emissions,
          queue_entries: queueEntries || [],
          lock: lock || null,
          events,
        })
      }

      case 'recent-requests': {
        const page = body.page || 0
        const pageSize = body.page_size || 25
        const from = page * pageSize
        const to = from + pageSize

        const { data, count } = await db
          .from('api_requests')
          .select('id, domain, status, received_at, duration_ms, client_id, http_status, error_message', { count: 'exact' })
          .eq('endpoint', '/v1/ghg/latest')
          .order('received_at', { ascending: false })
          .range(from, to)

        const clientIds = [...new Set((data || []).map(r => r.client_id).filter(Boolean))]
        let emailMap: Record<string, string> = {}
        if (clientIds.length > 0) {
          const { data: profiles } = await db
            .from('profiles')
            .select('user_id, email')
            .in('user_id', clientIds)
          if (profiles) {
            emailMap = Object.fromEntries(profiles.map(p => [p.user_id, p.email]))
          }
        }

        return json({
          requests: (data || []).map(r => ({ ...r, user_email: emailMap[r.client_id] || r.client_id })),
          total: count || 0,
        })
      }

      // ── Manual Report Queue ──
      case 'manual-queue': {
        const statusFilter = body.status || 'pending'
        let query = db
          .from('manual_report_queue')
          .select('*, companies(name)')
          .order('created_at', { ascending: false })
          .limit(50)

        if (statusFilter !== 'all') {
          query = query.eq('status', statusFilter)
        }

        const { data } = await query
        return json({ items: data || [] })
      }

      case 'upload-report': {
        // Expects: queue_id, report_url (URL of uploaded report or manual URL)
        const { queue_id, report_url } = body
        if (!queue_id || !report_url) return json({ error: 'queue_id and report_url required' }, 400)

        const { error } = await db
          .from('manual_report_queue')
          .update({ status: 'completed', report_url, updated_at: new Date().toISOString() })
          .eq('id', queue_id)

        if (error) return json({ error: error.message }, 500)
        return json({ success: true })
      }

      case 'trigger-extraction': {
        const { domain } = body
        if (!domain) return json({ error: 'domain required' }, 400)

        // Read API key from env for n8n auth
        const authKey = Deno.env.get('AURORA_API_KEY')
        const res = await fetch('https://n8n-yp1u.onrender.com/v1/ghg/extract', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authKey}`,
          },
          body: JSON.stringify({ domain }),
        })

        return json({ success: res.ok, status: res.status })
      }

      // ── Extraction Pipeline Overview ──
      case 'extraction-overview': {
        // 1. Currently processing (locked)
        const { data: locks } = await db
          .from('processing_locks')
          .select('company_id, year, locked_at, locked_by, request_id')
          .order('locked_at', { ascending: false })

        // 2. Manual report queue
        const { data: queue } = await db
          .from('manual_report_queue')
          .select('id, company_id, report_year, report_url, status, needs_report_search, created_at, updated_at, companies(name)')
          .order('created_at', { ascending: false })
          .limit(100)

        // 3. Recent extractions — only rows from actual n8n extraction (not edge function estimation)
        const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
        const { data: recentEmissions } = await db
          .from('emissions_annual')
          .select('company_id, year, emissions_source, total_methodology, source_url, data_source, total_emissions_tco2e, scope1_emissions_tco2e, scope2_emissions_tco2e, scope3_emissions_tco2e, created_at, updated_at')
          .neq('emissions_source', 'ESTIMATED')
          .gte('updated_at', weekAgo)
          .order('updated_at', { ascending: false })
          .limit(50)

        // 4. Failed extractions — companies that were queried recently but still only have estimated data
        const { data: failedExtractions } = await db
          .from('emissions_annual')
          .select('company_id, year, emissions_source, data_source, created_at, updated_at')
          .eq('emissions_source', 'ESTIMATED')
          .gte('created_at', weekAgo)
          .order('created_at', { ascending: false })
          .limit(30)

        // 5. Outlier-flagged emissions
        const { data: outliers } = await db
          .from('emissions_annual')
          .select('company_id, year, total_emissions_tco2e, emissions_source, total_methodology, outlier_flag, outlier_reason, source_url, updated_at')
          .eq('outlier_flag', true)
          .order('updated_at', { ascending: false })

        // Get company names for locks, emissions, failed extractions, and outliers
        const allCompanyIds = [
          ...(locks || []).map(l => l.company_id),
          ...(recentEmissions || []).map(e => e.company_id),
          ...(failedExtractions || []).map(e => e.company_id),
          ...(outliers || []).map(e => e.company_id),
        ].filter(Boolean)
        const uniqueIds = [...new Set(allCompanyIds)]

        let nameMap: Record<string, string> = {}
        if (uniqueIds.length > 0) {
          const { data: companies } = await db
            .from('companies')
            .select('id, name')
            .in('id', uniqueIds)
          if (companies) {
            nameMap = Object.fromEntries(companies.map(c => [c.id, c.name]))
          }
        }

        // Get domain for each locked company (for re-trigger)
        let domainMap: Record<string, string> = {}
        if (uniqueIds.length > 0) {
          const { data: domains } = await db
            .from('company_domains')
            .select('company_id, domain')
            .in('company_id', uniqueIds)
          if (domains) {
            // Take first domain per company
            for (const d of domains) {
              if (!domainMap[d.company_id]) domainMap[d.company_id] = d.domain
            }
          }
        }

        return json({
          in_progress: (locks || []).map(l => ({
            ...l,
            company_name: nameMap[l.company_id] || l.company_id,
            domain: domainMap[l.company_id] || null,
            age_minutes: Math.round((Date.now() - new Date(l.locked_at).getTime()) / 60000),
          })),
          manual_queue: (queue || []).map(q => ({
            ...q,
            company_name: (q.companies as unknown as { name: string })?.name || q.company_id,
            domain: domainMap[q.company_id] || null,
          })),
          recent_results: (recentEmissions || []).map(e => ({
            ...e,
            company_name: nameMap[e.company_id] || e.company_id,
            domain: domainMap[e.company_id] || null,
          })),
          failed_extractions: (failedExtractions || []).map(e => ({
            ...e,
            company_name: nameMap[e.company_id] || e.company_id,
            domain: domainMap[e.company_id] || null,
            // Check if also in manual queue
            in_manual_queue: (queue || []).some(q => q.company_id === e.company_id),
          })),
          outliers: (outliers || []).map(e => ({
            ...e,
            company_name: nameMap[e.company_id] || e.company_id,
            domain: domainMap[e.company_id] || null,
          })),
          summary: {
            in_progress: (locks || []).length,
            pending_upload: (queue || []).filter(q => q.status === 'pending').length,
            blocked_download: (queue || []).filter(q => q.status === 'blocked_download').length,
            completed_7d: (recentEmissions || []).filter(e => e.emissions_source === 'REPORTED').length,
            estimated_7d: (recentEmissions || []).filter(e => e.emissions_source === 'ESTIMATED').length,
            failed_7d: (failedExtractions || []).length,
            outliers: (outliers || []).length,
          },
        })
      }

      // ── Users ──
      case 'users-list': {
        const { data: profiles } = await db
          .from('profiles')
          .select('user_id, email, updated_at')
          .order('email')

        const userIds = (profiles || []).map(p => p.user_id)

        // Fetch credit balances
        const { data: balances } = await db
          .from('credit_balances')
          .select('user_id, balance')
          .in('user_id', userIds)

        const balanceMap = Object.fromEntries((balances || []).map(b => [b.user_id, b.balance]))

        // Fetch request counts (last 30 days)
        const since = new Date(Date.now() - 30 * 86400000).toISOString()
        const { data: requestCounts } = await db
          .from('api_requests')
          .select('client_id')
          .eq('endpoint', '/v1/ghg/latest')
          .in('status', ['succeeded', 'failed'])
          .gte('received_at', since)
          .in('client_id', userIds)

        const countMap: Record<string, number> = {}
        for (const r of requestCounts || []) {
          countMap[r.client_id] = (countMap[r.client_id] || 0) + 1
        }

        const users = (profiles || []).map(p => ({
          ...p,
          credit_balance: balanceMap[p.user_id] ?? 0,
          requests_30d: countMap[p.user_id] ?? 0,
        }))

        return json({ users })
      }

      case 'user-detail': {
        const { user_id: targetUserId } = body
        if (!targetUserId) return json({ error: 'user_id required' }, 400)

        const [profileRes, balanceRes, transactionsRes, recentRes, keyRes] = await Promise.all([
          db.from('profiles').select('*').eq('user_id', targetUserId).single(),
          db.from('credit_balances').select('balance').eq('user_id', targetUserId).single(),
          db.from('credit_transactions').select('*').eq('user_id', targetUserId).order('created_at', { ascending: false }).limit(25),
          db.from('api_requests').select('id, domain, status, received_at, duration_ms').eq('client_id', targetUserId).eq('endpoint', '/v1/ghg/latest').order('received_at', { ascending: false }).limit(25),
          db.from('api_keys').select('prefix, last_four, created_at, updated_at').eq('user_id', targetUserId).single(),
        ])

        return json({
          profile: profileRes.data,
          balance: balanceRes.data?.balance ?? 0,
          transactions: transactionsRes.data || [],
          recent_requests: recentRes.data || [],
          api_key: keyRes.data,
        })
      }

      case 'user-add-credits': {
        const { user_id: targetUserId, amount, reason } = body
        if (!targetUserId || !amount) return json({ error: 'user_id and amount required' }, 400)

        const { data, error } = await db.rpc('add_credits', {
          p_user_id: targetUserId,
          p_amount: amount,
          p_stripe_pi: `manual_${Date.now()}`,
          p_price_id: null,
          p_pack_name: 'Manual Adjustment',
          p_promo_code: null,
          p_amount_cents: 0,
          p_discount_cents: 0,
          p_card_brand: null,
          p_card_last4: null,
          p_description: reason || `Manual adjustment by admin`,
        })

        if (error) return json({ error: error.message }, 500)
        return json(data)
      }

      case 'user-suspend': {
        const { user_id: targetUserId, suspended } = body
        if (!targetUserId) return json({ error: 'user_id required' }, 400)

        // Set credit balance to 0 to effectively suspend, or we could delete the API key
        if (suspended) {
          const { error } = await db
            .from('api_keys')
            .delete()
            .eq('user_id', targetUserId)
          if (error) return json({ error: error.message }, 500)
        }

        return json({ success: true })
      }

      // ── Accounting ──
      case 'accounting-summary': {
        // Total revenue: sum of amount_cents for purchase transactions
        const { data: allPurchases } = await db
          .from('credit_transactions')
          .select('user_id, amount, amount_cents, created_at')
          .eq('type', 'purchase')
          .order('created_at', { ascending: false })

        const purchases = allPurchases || []

        const total_revenue_cents = purchases.reduce((sum, tx) => sum + (tx.amount_cents || 0), 0)
        const total_revenue_usd = total_revenue_cents / 100

        // This month's revenue
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        const monthPurchases = purchases.filter(tx => tx.created_at >= monthStart)
        const month_revenue_cents = monthPurchases.reduce((sum, tx) => sum + (tx.amount_cents || 0), 0)
        const month_revenue_usd = month_revenue_cents / 100

        // Group by user_id
        const userMap: Record<string, { total_cents: number; credits: number; last_purchase: string }> = {}
        for (const tx of purchases) {
          if (!userMap[tx.user_id]) {
            userMap[tx.user_id] = { total_cents: 0, credits: 0, last_purchase: tx.created_at }
          }
          userMap[tx.user_id].total_cents += tx.amount_cents || 0
          userMap[tx.user_id].credits += tx.amount || 0
          if (tx.created_at > userMap[tx.user_id].last_purchase) {
            userMap[tx.user_id].last_purchase = tx.created_at
          }
        }

        const userIds = Object.keys(userMap)

        // Fetch emails
        let emailMap: Record<string, string> = {}
        if (userIds.length > 0) {
          const { data: profiles } = await db
            .from('profiles')
            .select('user_id, email')
            .in('user_id', userIds)
          if (profiles) {
            emailMap = Object.fromEntries(profiles.map(p => [p.user_id, p.email]))
          }
        }

        const revenue_by_user = userIds
          .map(uid => ({
            user_id: uid,
            email: emailMap[uid] || uid,
            total_usd: userMap[uid].total_cents / 100,
            credits: userMap[uid].credits,
            last_purchase: userMap[uid].last_purchase,
          }))
          .sort((a, b) => b.total_usd - a.total_usd)

        return json({
          total_revenue_usd,
          month_revenue_usd,
          paying_users: userIds.length,
          revenue_by_user,
        })
      }

      // ── Systems ──
      case 'systems-health': {
        const ping = async (name: string, url: string): Promise<{ name: string; status: 'up' | 'down'; latency_ms: number }> => {
          const start = Date.now()
          try {
            const controller = new AbortController()
            const timeout = setTimeout(() => controller.abort(), 5000)
            const res = await fetch(url, { signal: controller.signal })
            clearTimeout(timeout)
            const latency_ms = Date.now() - start
            return { name, status: res.ok ? 'up' : 'down', latency_ms }
          } catch {
            return { name, status: 'down', latency_ms: Date.now() - start }
          }
        }

        const [n8n, tika] = await Promise.all([
          ping('n8n', 'https://n8n-yp1u.onrender.com/healthz'),
          ping('Tika', 'https://aurora-tika-pdf.onrender.com/tika'),
        ])

        return json({
          services: [
            n8n,
            tika,
            { name: 'Supabase', status: 'up', latency_ms: 0 },
            { name: 'Cloudflare Worker', status: 'up', latency_ms: 0 },
          ],
        })
      }

      case 'systems-error-rates': {
        const since = new Date(Date.now() - 24 * 3600000).toISOString()
        const { data: rows } = await db
          .from('api_requests')
          .select('status, received_at')
          .eq('endpoint', '/v1/ghg/latest')
          .gte('received_at', since)

        // Group by hour
        const bucketMap: Record<string, { total: number; failed: number }> = {}
        for (const r of rows || []) {
          const hour = r.received_at.substring(0, 13) // YYYY-MM-DDTHH
          if (!bucketMap[hour]) bucketMap[hour] = { total: 0, failed: 0 }
          bucketMap[hour].total++
          if (r.status === 'failed' || r.status === 'rejected') bucketMap[hour].failed++
        }

        // Fill missing hours
        const buckets = []
        const now = new Date()
        for (let i = 23; i >= 0; i--) {
          const d = new Date(now.getTime() - i * 3600000)
          const key = d.toISOString().substring(0, 13)
          const b = bucketMap[key] || { total: 0, failed: 0 }
          buckets.push({
            hour: key,
            total: b.total,
            failed: b.failed,
            rate: b.total > 0 ? (b.failed / b.total) * 100 : 0,
          })
        }

        return json({ buckets })
      }

      case 'systems-n8n-executions': {
        const n8nApiKey = Deno.env.get('N8N_API_KEY')
        if (!n8nApiKey) return json({ error: 'N8N_API_KEY not configured' }, 500)

        try {
          const controller = new AbortController()
          const timeout = setTimeout(() => controller.abort(), 10000)
          const res = await fetch('https://n8n-yp1u.onrender.com/api/v1/executions?limit=10', {
            headers: { 'X-N8N-API-KEY': n8nApiKey },
            signal: controller.signal,
          })
          clearTimeout(timeout)

          if (!res.ok) return json({ error: `n8n API returned ${res.status}` }, 502)
          const payload = await res.json()
          const executions = (payload.data || []).map((e: Record<string, unknown>) => ({
            id: e.id,
            status: e.status,
            workflowId: e.workflowId,
            workflowName: (e.workflowData as Record<string, unknown>)?.name || e.workflowId,
            startedAt: e.startedAt,
            stoppedAt: e.stoppedAt,
          }))

          return json({ executions })
        } catch {
          return json({ error: 'Failed to reach n8n API' }, 502)
        }
      }

      case 'systems-latency': {
        const since = new Date(Date.now() - 24 * 3600000).toISOString()
        const { data: rows } = await db
          .from('api_requests')
          .select('duration_ms')
          .eq('endpoint', '/v1/ghg/latest')
          .not('duration_ms', 'is', null)
          .gte('received_at', since)
          .order('duration_ms', { ascending: true })

        const durations = (rows || []).map((r: { duration_ms: number }) => r.duration_ms).filter((d: number) => d > 0)
        const count = durations.length

        if (count === 0) return json({ p50: 0, p95: 0, count: 0 })

        const p50 = durations[Math.floor(count * 0.5)]
        const p95 = durations[Math.floor(count * 0.95)]

        return json({ p50, p95, count })
      }

      // ── Data Health ──
      case 'data-health': {
        const { data: health } = await db.rpc('get_pipeline_health')
        const { data: sectors } = await db.rpc('get_sector_health')
        const { data: outlierRows } = await db
          .from('emissions_annual')
          .select('id, company_id, year, total_emissions_tco2e, scope1_emissions_tco2e, scope2_emissions_tco2e, scope3_emissions_tco2e, outlier_reason, outlier_flag, source_url, data_source, companies!inner(name, sector, revenue_usd)')
          .eq('outlier_flag', true)
          .order('total_emissions_tco2e', { ascending: false })
          .limit(100)
        // Fetch domains separately to avoid join issues
        const companyIds = [...new Set((outlierRows || []).map((o: Record<string, unknown>) => o.company_id))]
        const { data: domainRows } = companyIds.length > 0
          ? await db.from('company_domains').select('company_id, domain').in('company_id', companyIds)
          : { data: [] }
        const domainMap: Record<string, string> = {}
        for (const d of (domainRows || [])) {
          if (!domainMap[d.company_id as string]) domainMap[d.company_id as string] = d.domain as string
        }
        const outliers = (outlierRows || []).map((o: Record<string, unknown>) => ({
          ...o,
          domain: domainMap[o.company_id as string] || null,
        }))
        return json({ health: health?.[0] ?? null, sectors: sectors ?? [], outliers })
      }

      case 'update-emissions': {
        const { emission_id, updates } = body
        if (!emission_id || !updates) return json({ error: 'emission_id and updates required' }, 400)
        const allowed = ['total_emissions_tco2e', 'scope1_emissions_tco2e', 'scope2_emissions_tco2e', 'scope3_emissions_tco2e', 'outlier_flag', 'outlier_reason']
        const clean: Record<string, unknown> = {}
        for (const key of allowed) {
          if (key in updates) clean[key] = updates[key]
        }
        if (Object.keys(clean).length === 0) return json({ error: 'No valid fields to update' }, 400)
        const { error: updateErr } = await db
          .from('emissions_annual')
          .update(clean)
          .eq('id', emission_id)
        if (updateErr) return json({ error: updateErr.message }, 500)
        return json({ ok: true })
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error'
    const status = message === 'Not an admin' ? 403 : message === 'Invalid token' ? 401 : 500
    return json({ error: message }, status)
  }
})
