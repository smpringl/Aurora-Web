import { useState, useEffect, useRef, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { ChevronDown, Calendar, Wallet, ArrowRight, CircleDollarSign, Gauge, ExternalLink, X, ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

// ── Types ──────────────────────────────────────────────────────

interface RequestRow {
  id: string
  received_at: string
  status: string
  duration_ms: number | null
  domain: string | null
}

type TimeRange = '24h' | '7d' | '30d'

const CREDITS_PER_LOOKUP = 3
const CACHE_KEY = 'aurora_usage_v2'

// ── Helpers ────────────────────────────────────────────────────

function loadCache(range: TimeRange): RequestRow[] | null {
  try {
    const raw = localStorage.getItem(`${CACHE_KEY}_${range}`)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts > 5 * 60 * 1000) return null
    return data as RequestRow[]
  } catch {
    return null
  }
}

function saveCache(range: TimeRange, data: RequestRow[]) {
  try {
    localStorage.setItem(`${CACHE_KEY}_${range}`, JSON.stringify({ data, ts: Date.now() }))
  } catch {}
}

function formatDomain(domain: string | null): string {
  if (!domain) return 'unknown'
  return domain.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '')
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function groupByBucket(rows: RequestRow[], range: TimeRange) {
  if (range === '24h') {
    // Group by hour for last 24 hours
    const buckets = new Map<string, { succeeded: number; failed: number }>()
    for (let i = 23; i >= 0; i--) {
      const d = new Date(Date.now() - i * 3600000)
      const key = d.toISOString().slice(0, 13) // YYYY-MM-DDTHH
      buckets.set(key, { succeeded: 0, failed: 0 })
    }
    for (const row of rows) {
      const key = row.received_at.slice(0, 13)
      const entry = buckets.get(key)
      if (!entry) continue
      if (row.status === 'succeeded') entry.succeeded++
      else entry.failed++
    }
    return Array.from(buckets.entries()).map(([key, counts]) => {
      const hour = new Date(key + ':00:00').getHours()
      const label = `${hour === 0 ? '12' : hour > 12 ? hour - 12 : hour}${hour >= 12 ? 'p' : 'a'}`
      return { key, label, ...counts }
    })
  }

  // Group by day
  const days = range === '7d' ? 7 : 30
  const buckets = new Map<string, { succeeded: number; failed: number }>()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000)
    const key = d.toISOString().slice(0, 10)
    buckets.set(key, { succeeded: 0, failed: 0 })
  }
  for (const row of rows) {
    const key = row.received_at.slice(0, 10)
    const entry = buckets.get(key)
    if (!entry) continue
    if (row.status === 'succeeded') entry.succeeded++
    else entry.failed++
  }
  return Array.from(buckets.entries()).map(([key, counts]) => {
    const d = new Date(key + 'T00:00:00')
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return { key, label, ...counts }
  })
}

// ── Results Modal ──────────────────────────────────────────────

function ResultsModal({ call, onClose }: { call: RequestRow; onClose: () => void }) {
  const [responseData, setResponseData] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (call.status !== 'succeeded' || !call.domain) {
      const errorResponses: Record<string, { status: string; reason: string }> = {
        failed: { status: 'data_not_available', reason: 'Emissions data is not currently available for this company.' },
        rejected: { status: 'unauthorized', reason: 'Invalid or missing API key.' },
      }
      const info = errorResponses[call.status] || { status: 'error', reason: `Request ended with status: ${call.status}` }
      setResponseData(info)
      setLoading(false)
      return
    }

    const controller = new AbortController()
    const fetchDetail = async () => {
      try {
        const { data: domainRow } = await supabase
          .from('company_domains')
          .select('company_id, companies(name)')
          .eq('domain', call.domain!)
          .limit(1)
          .single()
          .abortSignal(controller.signal)

        if (domainRow?.company_id) {
          const company = domainRow.companies as unknown as { name: string } | null
          const { data: emissions } = await supabase
            .from('emissions_annual')
            .select('year, total_emissions_tco2e, scope1_emissions_tco2e, scope2_emissions_tco2e, scope3_emissions_tco2e, scope2_methodology, total_methodology')
            .eq('company_id', domainRow.company_id)
            .order('year', { ascending: false })
            .limit(1)
            .single()
            .abortSignal(controller.signal)

          if (emissions) {
            const scope2Basis = emissions.scope2_methodology === 'reported'
              ? 'market-based' : emissions.scope2_methodology === 'estimated'
              ? 'location-based' : null

            setResponseData({
              status: 'ok',
              company: company?.name || call.domain,
              year: emissions.year,
              methodology: emissions.total_methodology,
              total_emissions_tco2e: Math.round(Number(emissions.total_emissions_tco2e)),
              ...(emissions.scope1_emissions_tco2e != null && { scope1_emissions_tco2e: Math.round(Number(emissions.scope1_emissions_tco2e)) }),
              ...(emissions.scope2_emissions_tco2e != null && { scope2_emissions_tco2e: Math.round(Number(emissions.scope2_emissions_tco2e)) }),
              ...(scope2Basis && { scope2_basis: scope2Basis }),
              ...(emissions.scope3_emissions_tco2e != null && { scope3_emissions_tco2e: Math.round(Number(emissions.scope3_emissions_tco2e)) }),
            })
          } else {
            setResponseData({ status: 'data_not_available', reason: 'No emissions data found.' })
          }
        } else {
          setResponseData({ status: 'data_not_available', reason: 'Company not found.' })
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setResponseData({ status: 'error', reason: 'Failed to load results.' })
      } finally {
        setLoading(false)
      }
    }

    fetchDetail()
    return () => controller.abort()
  }, [call])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-xl border border-gray-200 w-full max-w-lg mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-[14px] font-medium text-gray-900">API Response</h3>
            <p className="text-[12px] text-gray-400 mt-0.5">
              {formatDomain(call.domain)} · {new Date(call.received_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-black transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="space-y-2">
              <div className="h-3 bg-gray-100 rounded animate-pulse w-1/3" />
              <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3" />
              <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
            </div>
          ) : (
            <pre className="text-[13px] font-mono bg-gray-50 rounded-lg p-4 overflow-x-auto text-gray-900 max-h-[400px] overflow-y-auto">
              {JSON.stringify(responseData, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────

const Usage = () => {
  const { user, sessionReady } = useAuth()
  const [timeRange, setTimeRange] = useState<TimeRange>('30d')
  const [rows, setRows] = useState<RequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const initialCache = useRef(loadCache('30d'))

  const [creditBalance, setCreditBalance] = useState(0)
  const [selectedCall, setSelectedCall] = useState<RequestRow | null>(null)
  const [chartFilter, setChartFilter] = useState<'succeeded' | 'failed' | 'all'>('succeeded')

  useEffect(() => {
    if (initialCache.current) {
      setRows(initialCache.current)
      setLoading(false)
    }
  }, [])

  const userId = user?.id

  // Fetch real credit balance
  useEffect(() => {
    if (!sessionReady || !userId) return
    supabase
      .from('credit_balances')
      .select('balance')
      .eq('user_id', userId)
      .single()
      .then(({ data }) => {
        if (data) setCreditBalance(data.balance)
      })
  }, [sessionReady, userId])

  useEffect(() => {
    if (!sessionReady || !userId) {
      if (!sessionReady) return
      setLoading(false)
      return
    }

    const cached = loadCache(timeRange)
    if (cached) {
      setRows(cached)
      setLoading(false)
    }

    const controller = new AbortController()
    const ms = timeRange === '24h' ? 86400000 : timeRange === '7d' ? 7 * 86400000 : 30 * 86400000
    const since = new Date(Date.now() - ms).toISOString()

    supabase
      .from('api_requests')
      .select('id, received_at, status, duration_ms, domain')
      .eq('endpoint', '/v1/ghg/latest')
      .gte('received_at', since)
      .order('received_at', { ascending: false })
      .abortSignal(controller.signal)
      .then(({ data, error }) => {
        if (error) {
          console.error('Usage fetch error:', error.message, error)
        } else if (data) {
          console.log('Usage loaded:', data.length, 'rows')
          setRows(data)
          saveCache(timeRange, data)
        }
        setLoading(false)
      })

    return () => controller.abort()
  }, [sessionReady, userId, timeRange])

  // ── Derived data ──
  const succeededCount = rows.filter(r => r.status === 'succeeded').length
  const failedCount = rows.filter(r => r.status === 'failed' || r.status === 'rejected').length
  const creditsUsed = succeededCount * CREDITS_PER_LOOKUP
  const dollarValue = (creditBalance / CREDITS_PER_LOOKUP) * (250 / 1800) // approx dollar value based on Growth pack rate

  const chartData = useMemo(() => groupByBucket(rows, timeRange), [rows, timeRange])
  const maxBucket = Math.max(...chartData.map(d =>
    chartFilter === 'succeeded' ? d.succeeded : chartFilter === 'failed' ? d.failed : d.succeeded + d.failed
  ), 1)

  const labelInterval = timeRange === '24h' ? 3 : timeRange === '7d' ? 1 : 5

  // Recent calls — last 25 calls with running balance
  // Rows are newest-first. creditBalance is the current balance (after the most recent deduction).
  // The newest row's balanceAfter = creditBalance.
  // Each older row's balanceAfter = previous row's balanceAfter + that previous row's credits deducted.
  const recentCalls = useMemo(() => {
    const all = rows
      .filter(r => r.status === 'succeeded' || r.status === 'failed' || r.status === 'rejected')
      .slice(0, 25)

    let runningBalance = creditBalance
    return all.map(row => {
      const credits = row.status === 'succeeded' ? CREDITS_PER_LOOKUP : 0
      const entry = {
        ...row,
        creditsUsed: credits,
        balanceAfter: runningBalance,
      }
      // Older rows had MORE credits, so add back what this row deducted
      runningBalance += credits
      return entry
    })
  }, [rows, creditBalance])

  return (
    <div>
      {/* Header */}
      <div className="pb-8 flex items-end justify-between">
        <div>
          <h1 className="text-[36px] font-semibold tracking-[-0.02em] leading-[1.2] text-gray-900">
            Usage
          </h1>
          <p className="text-gray-500 mt-1 text-[15px]">
            Monitor your API usage and credit balance
          </p>
        </div>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            className="appearance-none pl-9 pr-8 h-9 border border-gray-200 rounded-lg bg-white text-[13px] text-gray-900 cursor-pointer focus:outline-none focus:ring-2 focus:ring-black/5"
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* ── Credit Balance Hero ── */}
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-200 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px">
          {/* Balance */}
          <div className="bg-white p-6 md:col-span-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#B3FD00' }}>
                <Wallet className="w-4 h-4 text-black" />
              </div>
              <span className="text-[13px] font-medium text-gray-500 uppercase tracking-[0.05em]">Credit Balance</span>
            </div>
            {loading ? (
              <div className="h-12 w-32 bg-gray-100 rounded animate-pulse" />
            ) : (
              <>
                <div className="text-[48px] font-semibold font-mono text-black tracking-[-0.03em] leading-none">
                  ${dollarValue.toFixed(2)}
                </div>
                <div className="text-[14px] text-gray-400 mt-2 font-mono">
                  {creditBalance.toLocaleString()} credits remaining
                </div>
              </>
            )}
          </div>

          {/* Buy credits CTA */}
          <div className="bg-white p-6 flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#B3FD00' }}>
                <CircleDollarSign className="w-4 h-4 text-black" />
              </div>
              <span className="text-[13px] font-medium text-gray-500 uppercase tracking-[0.05em]">Add Credits</span>
            </div>
            <p className="text-[13px] text-gray-500 mb-4">
              Credits never expire. Only charged on successful lookups.
            </p>
            <a href="#billing">
              <Button variant="outline" className="w-full group">
                Buy Credits
                <ArrowUpRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Button>
            </a>
          </div>

          {/* Period usage stats */}
          <div className="bg-white p-6 flex flex-col justify-between">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#B3FD00' }}>
                <Gauge className="w-4 h-4 text-black" />
              </div>
              <span className="text-[13px] font-medium text-gray-500 uppercase tracking-[0.05em]">Period Usage</span>
            </div>
            {loading ? (
              <div className="h-8 w-16 bg-gray-100 rounded animate-pulse" />
            ) : (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-[32px] font-semibold font-mono text-black tracking-[-0.02em]">{creditsUsed.toLocaleString()}</span>
                  <span className="text-[13px] text-black">credits used</span>
                </div>
                <div className="text-[12px] mt-1">
                  <span className="text-black">{succeededCount} lookups succeeded</span>{failedCount > 0 && <> · <span className="text-red-500">{failedCount} failed</span></>}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Daily Usage Chart ── */}
      <div className="border border-gray-200 rounded-xl p-6 bg-white mb-8">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-[13px] font-medium text-gray-900">
            {timeRange === '24h' ? 'Requests per Hour' : 'Requests per Day'}
          </h2>
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            {(['succeeded', 'failed', 'all'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setChartFilter(filter)}
                className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors ${
                  chartFilter === filter
                    ? 'bg-black text-white'
                    : 'text-gray-600 hover:text-black'
                }`}
              >
                {filter === 'succeeded' ? 'Succeeded' : filter === 'failed' ? 'Failed' : 'All'}
              </button>
            ))}
          </div>
        </div>
        <p className="text-[12px] text-gray-400 mb-5">
          {chartFilter === 'succeeded' && <>{succeededCount} successful lookups · {creditsUsed} credits consumed</>}
          {chartFilter === 'failed' && <>{failedCount} failed requests</>}
          {chartFilter === 'all' && <>{succeededCount + failedCount} total requests · {creditsUsed} credits consumed</>}
        </p>

        {loading && rows.length === 0 ? (
          <div className="h-40 flex items-center justify-center">
            <div className="h-4 w-48 bg-gray-100 rounded animate-pulse" />
          </div>
        ) : rows.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-sm text-gray-500">
            No requests in this period
          </div>
        ) : (
          <div>
            <div className="flex items-end gap-px" style={{ height: 160 }}>
              {chartData.map((bucket) => {
                const value = chartFilter === 'succeeded' ? bucket.succeeded
                  : chartFilter === 'failed' ? bucket.failed
                  : bucket.succeeded + bucket.failed
                const height = value > 0 ? Math.max((value / maxBucket) * 100, 4) : 0

                return (
                  <div
                    key={bucket.key}
                    className="flex-1 flex flex-col justify-end group relative"
                    style={{ height: '100%' }}
                  >
                    {value > 0 && (
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
                        <div className="bg-black text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap">
                          <div className="font-medium mb-1">{bucket.label}</div>
                          {(chartFilter === 'succeeded' || chartFilter === 'all') && (
                            <div className="text-gray-300">{bucket.succeeded} succeeded</div>
                          )}
                          {(chartFilter === 'failed' || chartFilter === 'all') && bucket.failed > 0 && (
                            <div className="text-gray-400">{bucket.failed} failed</div>
                          )}
                          {chartFilter !== 'failed' && (
                            <div className="text-gray-400 mt-1">{bucket.succeeded * CREDITS_PER_LOOKUP} credits</div>
                          )}
                        </div>
                      </div>
                    )}
                    {value > 0 ? (
                      chartFilter === 'all' ? (
                        <div
                          className="w-full rounded-t overflow-hidden transition-all"
                          style={{ height: `${height}%` }}
                        >
                          <div className="bg-black w-full" style={{ height: `${(bucket.succeeded / value) * 100}%` }} />
                          <div className="bg-gray-300 w-full" style={{ height: `${(bucket.failed / value) * 100}%` }} />
                        </div>
                      ) : (
                        <div
                          className={`w-full rounded-t transition-all ${chartFilter === 'failed' ? 'bg-gray-300' : 'bg-black'}`}
                          style={{ height: `${height}%` }}
                        />
                      )
                    ) : (
                      <div className="w-full bg-gray-50 rounded-t" style={{ height: '2px' }} />
                    )}
                  </div>
                )
              })}
            </div>
            <div className="flex gap-px mt-2">
              {chartData.map((bucket, i) => (
                <div key={bucket.key} className="flex-1 text-center">
                  {i % labelInterval === 0 && (
                    <span className="text-[10px] text-gray-400">{bucket.label}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Recent API Calls ── */}
      <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-[13px] font-medium text-gray-900">Recent Lookups</h2>
          <p className="text-[12px] text-gray-400 mt-0.5">All recent API calls and credits charged</p>
        </div>

        {loading && rows.length === 0 ? (
          <div className="p-6">
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-10 bg-gray-50 rounded animate-pulse" />
              ))}
            </div>
          </div>
        ) : recentCalls.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-500">
            No API calls in this period
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="grid grid-cols-[1fr_100px_100px_120px_100px_60px] px-6 py-2.5 border-b border-gray-100 bg-gray-50/50">
              <span className="text-[11px] font-medium text-gray-500 uppercase tracking-[0.05em]">Domain</span>
              <span className="text-[11px] font-medium text-gray-500 uppercase tracking-[0.05em] text-right">Status</span>
              <span className="text-[11px] font-medium text-gray-500 uppercase tracking-[0.05em] text-right">Credits</span>
              <span className="text-[11px] font-medium text-gray-500 uppercase tracking-[0.05em] text-right">Balance</span>
              <span className="text-[11px] font-medium text-gray-500 uppercase tracking-[0.05em] text-right">Time</span>
              <span className="text-[11px] font-medium text-gray-500 uppercase tracking-[0.05em] text-right">Results</span>
            </div>

            {/* Table rows */}
            <div className="divide-y divide-gray-50">
              {recentCalls.map((call) => (
                <div
                  key={call.id}
                  className="grid grid-cols-[1fr_100px_100px_120px_100px_60px] px-6 py-3 hover:bg-gray-50/50 transition-colors"
                >
                  <span className="text-[13px] text-gray-900 font-medium truncate pr-4">
                    {formatDomain(call.domain)}
                  </span>
                  <span className="inline-flex items-center justify-end gap-1.5">
                    {call.status === 'succeeded' ? (
                      <>
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: '#B3FD00' }}></span>
                        <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-black">Success</span>
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
                        <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-black">Failed</span>
                      </>
                    )}
                  </span>
                  <span className="text-[13px] font-mono text-gray-900 text-right">
                    {call.creditsUsed > 0 ? (
                      <span>-{call.creditsUsed}</span>
                    ) : (
                      <span className="text-gray-300">0</span>
                    )}
                  </span>
                  <span className="text-[13px] font-mono text-gray-500 text-right">
                    {call.balanceAfter.toLocaleString()}
                  </span>
                  <span className="text-[12px] text-gray-400 text-right">
                    {timeAgo(call.received_at)}
                  </span>
                  <span className="text-right">
                    <button
                      onClick={() => setSelectedCall(call)}
                      className="text-gray-400 hover:text-black transition-colors"
                      title="View results"
                    >
                      <ExternalLink className="w-3.5 h-3.5 inline" />
                    </button>
                  </span>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/30 flex items-center justify-between">
              <span className="text-[12px] text-gray-400">
                Showing last {recentCalls.length} calls
              </span>
              <a
                href="#activity-logs"
                className="text-[12px] text-gray-900 font-medium flex items-center gap-1 hover:underline"
              >
                View all activity
                <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          </>
        )}
      </div>

      {/* Results modal */}
      {selectedCall && (
        <ResultsModal call={selectedCall} onClose={() => setSelectedCall(null)} />
      )}
    </div>
  )
}

export default Usage
