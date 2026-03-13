import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { ChevronDown, Calendar } from 'lucide-react'

interface RequestRow {
  received_at: string
  status: string
  duration_ms: number | null
  domain: string | null
}

type DateRange = 'last7' | 'last30' | 'last90'

const CACHE_KEY = 'aurora_usage_data'

function loadCache(range: DateRange): RequestRow[] | null {
  try {
    const raw = localStorage.getItem(`${CACHE_KEY}_${range}`)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts > 10 * 60 * 1000) return null
    return data as RequestRow[]
  } catch {
    return null
  }
}

function saveCache(range: DateRange, data: RequestRow[]) {
  try {
    localStorage.setItem(`${CACHE_KEY}_${range}`, JSON.stringify({ data, ts: Date.now() }))
  } catch {}
}

function groupByDay(rows: RequestRow[], days: number): { date: string; label: string; succeeded: number; failed: number }[] {
  const map = new Map<string, { succeeded: number; failed: number }>()

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000)
    const key = d.toISOString().slice(0, 10)
    map.set(key, { succeeded: 0, failed: 0 })
  }

  for (const row of rows) {
    const key = row.received_at.slice(0, 10)
    const entry = map.get(key)
    if (!entry) continue
    if (row.status === 'succeeded') {
      entry.succeeded++
    } else {
      entry.failed++
    }
  }

  return Array.from(map.entries()).map(([date, counts]) => {
    const d = new Date(date + 'T00:00:00')
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return { date, label, ...counts }
  })
}

function topDomains(rows: RequestRow[], limit: number): { domain: string; count: number; succeeded: number }[] {
  const map = new Map<string, { count: number; succeeded: number }>()
  for (const row of rows) {
    if (!row.domain) continue
    const entry = map.get(row.domain) || { count: 0, succeeded: 0 }
    entry.count++
    if (row.status === 'succeeded') entry.succeeded++
    map.set(row.domain, entry)
  }
  return Array.from(map.entries())
    .map(([domain, stats]) => ({ domain, ...stats }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

const Usage = () => {
  const { user } = useAuth()
  const [dateRange, setDateRange] = useState<DateRange>('last30')
  const [rows, setRows] = useState<RequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const initialCache = useRef(loadCache('last30'))

  useEffect(() => {
    if (initialCache.current) {
      setRows(initialCache.current)
      setLoading(false)
    }
  }, [])

  const userId = user?.id
  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    const cached = loadCache(dateRange)
    if (cached) {
      setRows(cached)
      setLoading(false)
    }

    const controller = new AbortController()
    const days = dateRange === 'last7' ? 7 : dateRange === 'last30' ? 30 : 90
    const since = new Date(Date.now() - days * 86400000).toISOString()

    supabase
      .from('api_requests')
      .select('received_at, status, duration_ms, domain')
      .gte('received_at', since)
      .order('received_at', { ascending: false })
      .abortSignal(controller.signal)
      .then(({ data, error }) => {
        if (error) {
          console.error('Usage fetch error:', error)
        } else if (data) {
          setRows(data)
          saveCache(dateRange, data)
        }
        setLoading(false)
      })

    return () => controller.abort()
  }, [userId, dateRange])

  const days = dateRange === 'last7' ? 7 : dateRange === 'last30' ? 30 : 90
  const totalRequests = rows.length
  const succeeded = rows.filter(r => r.status === 'succeeded').length
  const failed = rows.filter(r => r.status === 'failed' || r.status === 'rejected').length
  const other = totalRequests - succeeded - failed
  const successRate = totalRequests > 0 ? Math.round((succeeded / totalRequests) * 100) : 0
  const durations = rows.filter(r => r.duration_ms != null).map(r => r.duration_ms!)
  const avgLatency = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0
  const uniqueDomains = new Set(rows.filter(r => r.domain).map(r => r.domain!)).size

  const dailyData = groupByDay(rows, days)
  const maxDaily = Math.max(...dailyData.map(d => d.succeeded + d.failed), 1)
  const domains = topDomains(rows, 8)
  const maxDomainCount = domains.length > 0 ? domains[0].count : 1

  const labelInterval = dateRange === 'last7' ? 1 : dateRange === 'last30' ? 5 : 14

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="pb-8 flex items-end justify-between">
        <div>
          <h1 className="text-[36px] font-semibold tracking-[-0.02em] leading-[1.2] text-gray-900">
            Usage
          </h1>
          <p className="text-gray-500 mt-1 text-[15px]">
            API usage and performance metrics
          </p>
        </div>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as DateRange)}
            className="appearance-none pl-9 pr-8 h-9 border border-gray-200 rounded-lg bg-white text-[13px] text-gray-900 cursor-pointer focus:outline-none focus:ring-2 focus:ring-black/5"
          >
            <option value="last7">Last 7 days</option>
            <option value="last30">Last 30 days</option>
            <option value="last90">Last 90 days</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* KPI Stat cards */}
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-200 mb-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px">
          <KpiCard label="Total Requests" value={totalRequests.toLocaleString()} loading={loading} />
          <KpiCard label="Success Rate" value={`${successRate}%`} sub={`${succeeded} of ${totalRequests}`} loading={loading} />
          <KpiCard label="Avg Latency" value={avgLatency > 0 ? `${(avgLatency / 1000).toFixed(1)}s` : '--'} loading={loading} />
          <KpiCard label="Unique Domains" value={uniqueDomains.toLocaleString()} loading={loading} />
        </div>
      </div>

      {/* Daily requests chart */}
      <div className="border border-gray-200 rounded-xl p-6 bg-white mb-4">
        <h2 className="text-[13px] font-medium text-gray-900 mb-1">Requests per Day</h2>
        <p className="text-[12px] text-gray-400 mb-5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-black mr-1.5 align-middle" />
          Succeeded
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-gray-300 mr-1.5 ml-4 align-middle" />
          Failed
        </p>

        {loading && rows.length === 0 ? (
          <div className="h-40 flex items-center justify-center">
            <div className="h-4 w-48 bg-gray-100 rounded animate-pulse" />
          </div>
        ) : totalRequests === 0 ? (
          <div className="h-40 flex items-center justify-center text-sm text-gray-500">
            No requests in this period
          </div>
        ) : (
          <div>
            <div className="flex items-end gap-px" style={{ height: 160 }}>
              {dailyData.map((day) => {
                const total = day.succeeded + day.failed
                const height = total > 0 ? Math.max((total / maxDaily) * 100, 4) : 0
                const succeededPct = total > 0 ? (day.succeeded / total) * 100 : 0

                return (
                  <div
                    key={day.date}
                    className="flex-1 flex flex-col justify-end group relative"
                    style={{ height: '100%' }}
                  >
                    {total > 0 && (
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
                        <div className="bg-black text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap">
                          <div className="font-medium mb-1">{day.label}</div>
                          <div className="text-gray-300">{day.succeeded} succeeded</div>
                          {day.failed > 0 && <div className="text-gray-400">{day.failed} failed</div>}
                        </div>
                      </div>
                    )}
                    {total > 0 ? (
                      <div
                        className="w-full rounded-t overflow-hidden transition-all"
                        style={{ height: `${height}%` }}
                      >
                        <div className="bg-black w-full" style={{ height: `${succeededPct}%` }} />
                        <div className="bg-gray-300 w-full" style={{ height: `${100 - succeededPct}%` }} />
                      </div>
                    ) : (
                      <div className="w-full bg-gray-50 rounded-t" style={{ height: '2px' }} />
                    )}
                  </div>
                )
              })}
            </div>
            <div className="flex gap-px mt-2">
              {dailyData.map((day, i) => (
                <div key={day.date} className="flex-1 text-center">
                  {i % labelInterval === 0 && (
                    <span className="text-[10px] text-gray-400">{day.label}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status breakdown */}
        <div className="border border-gray-200 rounded-xl p-6 bg-white">
          <h2 className="text-[13px] font-medium text-gray-900 mb-4">Status Breakdown</h2>
          {loading && rows.length === 0 ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-6 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : totalRequests === 0 ? (
            <p className="text-sm text-gray-500">No requests in this period</p>
          ) : (
            <div className="space-y-3">
              <StatusBar label="Succeeded" count={succeeded} total={totalRequests} />
              <StatusBar label="Failed" count={failed} total={totalRequests} />
              {other > 0 && (
                <StatusBar label="Other" count={other} total={totalRequests} muted />
              )}
            </div>
          )}
        </div>

        {/* Top domains */}
        <div className="border border-gray-200 rounded-xl p-6 bg-white">
          <h2 className="text-[13px] font-medium text-gray-900 mb-4">Top Domains</h2>
          {loading && rows.length === 0 ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-5 bg-gray-100 rounded animate-pulse" style={{ width: `${90 - i * 15}%` }} />
              ))}
            </div>
          ) : domains.length === 0 ? (
            <p className="text-sm text-gray-500">No domains queried in this period</p>
          ) : (
            <div className="space-y-2.5">
              {domains.map(d => (
                <div key={d.domain} className="flex items-center gap-3">
                  <span className="text-[12px] text-gray-900 w-36 truncate shrink-0 font-medium" title={d.domain}>
                    {d.domain}
                  </span>
                  <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
                    <div
                      className="h-full bg-black rounded flex items-center transition-all"
                      style={{ width: `${Math.max((d.count / maxDomainCount) * 100, 8)}%` }}
                    >
                      <span className="text-[11px] font-mono text-white px-2 whitespace-nowrap">
                        {d.count}
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-gray-500 shrink-0">
                    {d.count > 0 ? Math.round((d.succeeded / d.count) * 100) : 0}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function KpiCard({ label, value, sub, loading }: {
  label: string
  value: string
  sub?: string
  loading: boolean
}) {
  return (
    <div className="bg-white p-6">
      <span className="text-[13px] font-medium text-gray-500 uppercase tracking-[0.05em]">{label}</span>
      {loading ? (
        <div className="h-8 w-16 bg-gray-100 rounded animate-pulse mt-2" />
      ) : (
        <>
          <div className="text-[32px] font-semibold font-mono text-black tracking-[-0.02em] mt-1">{value}</div>
          {sub && <div className="text-[12px] text-gray-400 mt-0.5">{sub}</div>}
        </>
      )}
    </div>
  )
}

function StatusBar({ label, count, total, muted }: {
  label: string
  count: number
  total: number
  muted?: boolean
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[12px] text-gray-900">{label}</span>
        <span className="text-[12px] font-mono text-gray-500">{count} ({pct}%)</span>
      </div>
      <div className="h-[6px] bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${muted ? 'bg-gray-300' : 'bg-black'}`}
          style={{ width: `${Math.max(pct, 1)}%` }}
        />
      </div>
    </div>
  )
}

export default Usage
