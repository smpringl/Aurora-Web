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

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
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

    // Check Supabase by running a simple query
    const dbStart = Date.now()
    const { error: dbError } = await db.from('companies').select('id').limit(1)
    const dbLatency = Date.now() - dbStart
    const database: ServiceStatus = {
      name: 'Database',
      status: dbError ? 'down' : dbLatency > 3000 ? 'degraded' : 'operational',
      latency_ms: dbLatency,
      details: dbError ? dbError.message : undefined,
    }

    // Check recent API error rate (last hour)
    const hourAgo = new Date(Date.now() - 3600000).toISOString()
    const { data: recentRequests } = await db
      .from('api_requests')
      .select('status')
      .eq('endpoint', '/v1/ghg/latest')
      .gte('received_at', hourAgo)

    const total = (recentRequests || []).length
    const failed = (recentRequests || []).filter(r => r.status === 'failed' || r.status === 'rejected').length
    const errorRate = total > 0 ? (failed / total) * 100 : 0

    // Overall API status based on error rate
    const apiStatus: ServiceStatus = {
      name: 'Aurora API',
      status: errorRate > 20 ? 'degraded' : 'operational',
      latency_ms: 0,
    }

    // Public-facing services only
    const publicServices = [apiStatus, database]

    // All services (including internal) for overall status computation
    const allServices = [apiStatus, apiGateway, database, n8n, tika]

    // Compute overall status from ALL services (internal issues affect overall)
    const hasDown = allServices.some(s => s.status === 'down')
    const hasDegraded = allServices.some(s => s.status === 'degraded')
    const overall = hasDown ? 'partial_outage' : hasDegraded ? 'degraded' : 'operational'

    // Fetch recent incidents
    const { data: incidents } = await db
      .from('status_incidents')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    // Uptime: compute from api_requests over last 30 days
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString()
    const { data: monthRequests } = await db
      .from('api_requests')
      .select('status')
      .eq('endpoint', '/v1/ghg/latest')
      .gte('received_at', monthAgo)

    const monthTotal = (monthRequests || []).length
    const monthSucceeded = (monthRequests || []).filter(r => r.status === 'succeeded').length
    const uptime30d = monthTotal > 0 ? ((monthSucceeded / monthTotal) * 100).toFixed(2) : '100.00'

    return json({
      overall,
      services: publicServices,
      uptime_30d: parseFloat(uptime30d),
      incidents: incidents || [],
      checked_at: new Date().toISOString(),
    })
  } catch (err) {
    return json({ error: 'Status check failed', details: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})
