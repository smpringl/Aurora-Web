import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/integrations/supabase/client'
import { Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Calendar, Filter, AlertCircle, Globe } from 'lucide-react'

interface ApiRequest {
  id: string
  received_at: string
  domain: string | null
  status: string
  http_status: number | null
  duration_ms: number | null
  method: string | null
  endpoint: string | null
  error_message: string | null
}

const PAGE_SIZE = 10
const CACHE_KEY = 'aurora_activity_logs'

function loadCache(): ApiRequest[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts > 10 * 60 * 1000) return null
    return data as ApiRequest[]
  } catch {
    return null
  }
}

function saveCache(data: ApiRequest[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }))
  } catch { /* quota exceeded — ignore */ }
}

const statusLabels: Record<string, string> = {
  succeeded: 'SUCCESS',
  failed: 'FAILED',
  authorized: 'AUTHORIZED',
  received: 'RECEIVED',
  rejected: 'REJECTED',
}

function formatDuration(ms: number | null) {
  if (ms === null) return '--'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const month = d.toLocaleDateString('en-US', { month: 'short' })
  const day = d.getDate().toString().padStart(2, '0')
  const year = d.getFullYear().toString().slice(2)
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  return { date: `${month} ${day}, ${year}`, time }
}

type DateRange = 'last7' | 'last30' | 'all'
type StatusFilter = 'all' | 'succeeded' | 'failed'

function RequestDetail({ request }: { request: ApiRequest }) {
  const [responseData, setResponseData] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (request.status !== 'succeeded' || !request.domain) {
      setLoading(false)
      return
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 6000)

    const fetchDetail = async () => {
      try {
        const { data: domainRow } = await supabase
          .from('company_domains')
          .select('company_id, companies(name)')
          .eq('domain', request.domain!)
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
            const methodology = emissions.total_methodology
            const scope2Basis = emissions.scope2_methodology === 'reported'
              ? 'market-based' : emissions.scope2_methodology === 'estimated'
              ? 'location-based' : null

            setResponseData({
              status: 'ok',
              company: company?.name || request.domain,
              year: emissions.year,
              methodology,
              total_emissions_tco2e: Math.round(Number(emissions.total_emissions_tco2e)),
              ...(emissions.scope1_emissions_tco2e != null && { scope1_emissions_tco2e: Math.round(Number(emissions.scope1_emissions_tco2e)) }),
              ...(emissions.scope2_emissions_tco2e != null && { scope2_emissions_tco2e: Math.round(Number(emissions.scope2_emissions_tco2e)) }),
              ...(scope2Basis && { scope2_basis: scope2Basis }),
              ...(emissions.scope3_emissions_tco2e != null && { scope3_emissions_tco2e: Math.round(Number(emissions.scope3_emissions_tco2e)) }),
            })
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        console.error('Error fetching detail:', err)
      } finally {
        clearTimeout(timeout)
        setLoading(false)
      }
    }

    fetchDetail()
    return () => { controller.abort() }
  }, [request])

  if (loading) {
    return (
      <div className="px-6 py-4">
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="h-3 bg-gray-100 rounded animate-pulse w-1/3" />
          <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3" />
          <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
        </div>
      </div>
    )
  }

  if (request.status === 'succeeded' && responseData) {
    return (
      <div className="px-6 py-4">
        <pre className="text-[13px] font-mono bg-gray-100 rounded-lg p-4 overflow-x-auto text-gray-900">
          {JSON.stringify(responseData, null, 2)}
        </pre>
      </div>
    )
  }

  const errorResponses: Record<string, { code: number; status: string; reason: string }> = {
    failed: {
      code: 200,
      status: 'data_not_available',
      reason: 'Emissions data is not currently available for this company.',
    },
    rejected: {
      code: 401,
      status: 'unauthorized',
      reason: 'Invalid or missing API key.',
    },
    received: {
      code: 500,
      status: 'error',
      reason: 'Request was received but could not be processed.',
    },
    authorized: {
      code: 500,
      status: 'error',
      reason: 'Request was authorized but did not complete.',
    },
  }

  const errorInfo = errorResponses[request.status] || {
    code: 500,
    status: 'error',
    reason: `Request ended with status: ${request.status}`,
  }

  return (
    <div className="px-6 py-4">
      <pre className="text-[13px] font-mono bg-gray-100 rounded-lg p-4 overflow-x-auto text-gray-900">
        {JSON.stringify({
          status: errorInfo.status,
          ...(request.domain && { company: request.domain }),
          reason: errorInfo.reason,
        }, null, 2)}
      </pre>
    </div>
  )
}

const ActivityLogs = () => {
  const { user, sessionReady } = useAuth()

  const cached = useRef(loadCache())
  const [requests, setRequests] = useState<ApiRequest[]>(cached.current || [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [dateRange, setDateRange] = useState<DateRange>('last30')
  const [initialLoad, setInitialLoad] = useState(!cached.current)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setPage(0)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    setPage(0)
  }, [statusFilter, dateRange])

  const userId = user?.id
  useEffect(() => {
    if (!sessionReady || !userId) {
      if (!sessionReady) return
      setInitialLoad(false)
      return
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    const isDefaultView = page === 0 && !debouncedSearch.trim() && statusFilter === 'all' && dateRange === 'last30'

    const doFetch = async () => {
      setLoading(true)
      setError(null)

      try {
        let query = supabase
          .from('api_requests')
          .select('id, received_at, domain, status, http_status, duration_ms, method, endpoint, error_message')
          .eq('endpoint', '/v1/ghg/latest')
          .abortSignal(controller.signal)

        if (debouncedSearch.trim()) {
          query = query.ilike('domain', `%${debouncedSearch.trim()}%`)
        }

        if (statusFilter === 'succeeded') {
          query = query.eq('status', 'succeeded')
        } else if (statusFilter === 'failed') {
          query = query.in('status', ['failed', 'rejected'])
        }

        if (dateRange !== 'all') {
          const days = dateRange === 'last7' ? 7 : 30
          const since = new Date(Date.now() - days * 86400000).toISOString()
          query = query.gte('received_at', since)
        }

        const from = page * PAGE_SIZE
        const to = from + PAGE_SIZE

        const { data, error: queryError } = await query
          .order('received_at', { ascending: false })
          .range(from, to)

        if (controller.signal.aborted) return

        if (queryError) {
          console.error('Supabase error:', queryError)
          setError(queryError.message)
        } else {
          const rows = data || []
          setHasNextPage(rows.length > PAGE_SIZE)
          setRequests(rows.slice(0, PAGE_SIZE))

          if (isDefaultView) {
            saveCache(rows.slice(0, PAGE_SIZE))
          }
        }
      } catch (err) {
        if (controller.signal.aborted) return
        if (err instanceof DOMException && err.name === 'AbortError') {
          if (requests.length === 0) {
            setError('Request timed out. Please try again.')
          }
        } else {
          console.error('Exception fetching requests:', err)
          if (requests.length === 0) {
            setError(err instanceof Error ? err.message : 'Unknown error')
          }
        }
      } finally {
        clearTimeout(timeout)
        setLoading(false)
        setInitialLoad(false)
      }
    }

    doFetch()
    return () => controller.abort()
  }, [sessionReady, userId, page, debouncedSearch, statusFilter, dateRange])

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id)
  }

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="pb-8">
        <h1 className="text-[36px] font-semibold tracking-[-0.02em] leading-[1.2] text-gray-900">
          Activity Logs
        </h1>
        <p className="text-gray-500 mt-1 text-[15px]">
          Take a look at your requests activity
        </p>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-t-xl border border-gray-200 border-b-0 px-5 py-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-[360px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white border-gray-200 rounded-lg h-9 text-[13px]"
            />
          </div>

          {/* Status filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="appearance-none pl-9 pr-8 h-9 border border-gray-200 rounded-lg bg-white text-[13px] text-gray-900 cursor-pointer focus:outline-none focus:ring-2 focus:ring-black/5"
            >
              <option value="all">All Statuses</option>
              <option value="succeeded">Completed</option>
              <option value="failed">Failed</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>

          <div className="flex-1" />

          {/* Date range */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
              className="appearance-none pl-9 pr-8 h-9 border border-gray-200 rounded-lg bg-white text-[13px] text-gray-900 cursor-pointer focus:outline-none focus:ring-2 focus:ring-black/5"
            >
              <option value="last7">Last 7 days</option>
              <option value="last30">Last 30 days</option>
              <option value="all">All time</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-b-xl border border-gray-200 overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[120px_1fr_130px_100px_140px] gap-4 px-5 py-3 bg-gray-50 text-[12px] font-medium text-gray-500 uppercase tracking-[0.05em] border-b border-gray-100">
          <div>Endpoint</div>
          <div>Domain</div>
          <div>Status</div>
          <div>Duration</div>
          <div>Time</div>
        </div>

        {/* Loading bar */}
        {loading && !initialLoad && requests.length > 0 && (
          <div className="h-0.5 bg-gray-100 overflow-hidden">
            <div className="h-full bg-black animate-pulse w-1/2" />
          </div>
        )}

        {/* Content states */}
        {error && requests.length === 0 ? (
          <div className="text-center py-16">
            <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-medium text-gray-900 mb-1">Failed to load logs</h3>
            <p className="text-gray-500 text-sm mb-4">{error}</p>
          </div>
        ) : initialLoad && requests.length === 0 ? (
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="grid grid-cols-[120px_1fr_130px_100px_140px] gap-4 px-5 py-5 items-center"
              >
                <div className="h-4 bg-gray-100 rounded animate-pulse w-16" />
                <div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: `${50 + (i % 3) * 15}%` }} />
                <div className="h-4 bg-gray-100 rounded animate-pulse w-20" />
                <div className="h-4 bg-gray-100 rounded animate-pulse w-12" />
                <div className="space-y-1.5">
                  <div className="h-3 bg-gray-100 rounded animate-pulse w-20" />
                  <div className="h-3 bg-gray-100 rounded animate-pulse w-14" />
                </div>
              </div>
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-16">
            <Globe className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-medium text-gray-900 mb-1">No requests found</h3>
            <p className="text-gray-500 text-sm">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your filters.'
                : 'API requests will appear here once you start using your API key.'}
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-100">
              {requests.map((req) => {
                const time = formatTime(req.received_at)
                const statusLabel = statusLabels[req.status] || req.status.toUpperCase()
                const isExpanded = expandedId === req.id
                const isCompleted = req.status === 'succeeded'

                return (
                  <div key={req.id}>
                    <button
                      onClick={() => toggleExpand(req.id)}
                      className="w-full grid grid-cols-[120px_1fr_130px_100px_140px] gap-4 px-5 py-4 text-sm hover:bg-gray-50 transition-colors items-center text-left"
                    >
                      <div className="text-gray-500 text-[13px] truncate">
                        {req.endpoint ? req.endpoint.replace('/v1/', '/').toUpperCase() : '--'}
                      </div>
                      <div className="text-gray-900 text-[13px] truncate" title={req.domain || '--'}>
                        {req.domain || '--'}
                      </div>
                      <div className="inline-flex items-center gap-1.5">
                        {isCompleted ? (
                          <>
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: '#B3FD00' }}></span>
                            <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-black">{statusLabel}</span>
                          </>
                        ) : (
                          <>
                            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
                            <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-black">{statusLabel}</span>
                          </>
                        )}
                      </div>
                      <div className="text-gray-500 font-mono text-[12px]">
                        {formatDuration(req.duration_ms)}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-gray-400 text-[12px] leading-snug">
                          <div>{time.date}</div>
                          <div>{time.time}</div>
                        </div>
                        {isExpanded
                          ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
                          : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                        }
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="bg-gray-50 border-t border-gray-100">
                        <RequestDetail request={req} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Pagination */}
        {!loading && !error && requests.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <span className="text-[13px] text-gray-500">
              Page {page + 1}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => { setPage(p => p - 1); setExpandedId(null) }}
                className="h-8 w-8 p-0 border-gray-200"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!hasNextPage}
                onClick={() => { setPage(p => p + 1); setExpandedId(null) }}
                className="h-8 w-8 p-0 border-gray-200"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ActivityLogs
