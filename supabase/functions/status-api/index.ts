import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Cache-Control': 'public, max-age=30',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

interface ServiceStatus {
  name: string
  status: 'operational' | 'degraded' | 'down'
  latency_ms: number
  details?: string
}

async function pingService(name: string, url: string, timeoutMs = 8000): Promise<ServiceStatus> {
  const start = Date.now()
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)
    const latency = Date.now() - start
    if (!res.ok) {
      return { name, status: 'degraded', latency_ms: latency, details: `HTTP ${res.status}` }
    }
    // If latency is very high, mark as degraded
    if (latency > 5000) {
      return { name, status: 'degraded', latency_ms: latency, details: 'High latency' }
    }
    return { name, status: 'operational', latency_ms: latency }
  } catch (err) {
    return { name, status: 'down', latency_ms: Date.now() - start, details: err instanceof Error ? err.message : 'Connection failed' }
  }
}

// In-memory cache: avoid hitting DB on every request
let cachedResponse: string | null = null
let cachedAt = 0
const CACHE_TTL_MS = 120_000 // 2 minutes

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Handle /ping sub-path (lightweight, no DB)
  const url = new URL(req.url)
  if (url.pathname.endsWith('/ping')) {
    return json({ status: 'ok', ts: new Date().toISOString() })
  }

  // Serve from cache if fresh
  if (cachedResponse && (Date.now() - cachedAt) < CACHE_TTL_MS) {
    return new Response(cachedResponse, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    // Ping all services in parallel
    const [apiGateway, n8n, tika] = await Promise.all([
      // API Gateway — ping the Edge Function itself (a lightweight call)
      pingService('API Gateway', `${SUPABASE_URL}/functions/v1/status-api/ping`).then(r => ({
        ...r,
        name: 'API Gateway',
        status: 'operational' as const, // If we're running, gateway is up
        latency_ms: 0,
      })),
      // n8n
      pingService('Extraction Engine', 'https://n8n-yp1u.onrender.com/healthz'),
      // Tika
      pingService('PDF Processor', 'https://aurora-tika-pdf.onrender.com/tika'),
    ])

    // Check Supabase — lightweight ping via REST API (no Supabase client overhead)
    const dbStart = Date.now()
    let dbError: string | null = null
    try {
      const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/sectors?select=id&limit=1`, {
        headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
        signal: AbortSignal.timeout(5000),
      })
      if (!dbRes.ok) dbError = `HTTP ${dbRes.status}`
    } catch (e) {
      dbError = e instanceof Error ? e.message : 'timeout'
    }
    const dbLatency = Date.now() - dbStart
    const database: ServiceStatus = {
      name: 'Database',
      status: dbError ? 'down' : dbLatency > 3000 ? 'degraded' : 'operational',
      latency_ms: dbLatency,
      details: dbError ?? undefined,
    }

    // Check if API is responding — use count queries instead of fetching all rows
    const hourAgo = new Date(Date.now() - 3600000).toISOString()
    const { count: totalHour } = await db
      .from('api_requests')
      .select('id', { count: 'exact', head: true })
      .eq('endpoint', '/v1/ghg/latest')
      .gte('received_at', hourAgo)

    const { count: errorsHour } = await db
      .from('api_requests')
      .select('id', { count: 'exact', head: true })
      .eq('endpoint', '/v1/ghg/latest')
      .gte('received_at', hourAgo)
      .gte('http_status', 500)

    const total = totalHour ?? 0
    const systemErrors = errorsHour ?? 0
    const systemErrorRate = total > 0 ? (systemErrors / total) * 100 : 0

    // Average latency from last 50 requests only
    const { data: recentLatency } = await db
      .from('api_requests')
      .select('duration_ms')
      .eq('endpoint', '/v1/ghg/latest')
      .gte('received_at', hourAgo)
      .not('duration_ms', 'is', null)
      .gt('duration_ms', 0)
      .order('received_at', { ascending: false })
      .limit(50)

    const durations = (recentLatency || []).map(r => r.duration_ms as number)
    const avgLatency = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0

    const apiStatus: ServiceStatus = {
      name: 'Aurora API',
      status: systemErrorRate > 10 ? 'degraded' : 'operational',
      latency_ms: avgLatency,
    }

    // Public-facing services
    const publicServices = [apiStatus, database]

    // All services (including internal) for overall status
    const allServices = [apiStatus, apiGateway, database, n8n, tika]

    const hasDown = allServices.some(s => s.status === 'down')
    const hasDegraded = allServices.some(s => s.status === 'degraded')
    const overall = hasDown ? 'partial_outage' : hasDegraded ? 'degraded' : 'operational'

    // Fetch recent incidents
    const { data: incidents } = await db
      .from('status_incidents')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    // Uptime: use count queries — never fetch all 30 days of rows
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString()
    const { count: monthTotal } = await db
      .from('api_requests')
      .select('id', { count: 'exact', head: true })
      .eq('endpoint', '/v1/ghg/latest')
      .gte('received_at', monthAgo)

    const { count: monthErrors } = await db
      .from('api_requests')
      .select('id', { count: 'exact', head: true })
      .eq('endpoint', '/v1/ghg/latest')
      .gte('received_at', monthAgo)
      .gte('http_status', 500)

    const mt = monthTotal ?? 0
    const me = monthErrors ?? 0
    const monthUp = mt - me
    const uptime30d = mt > 0 ? ((monthUp / mt) * 100).toFixed(2) : '100.00'

    const result = {
      overall,
      services: publicServices,
      uptime_30d: parseFloat(uptime30d),
      incidents: incidents || [],
      checked_at: new Date().toISOString(),
    }

    // Cache the response
    cachedResponse = JSON.stringify(result)
    cachedAt = Date.now()

    return json(result)
  } catch (err) {
    // On error, serve stale cache if available
    if (cachedResponse) {
      return new Response(cachedResponse, {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    return json({ error: 'Status check failed', details: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})
