import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Play, Globe, Loader2, Clock, Copy, Check, AlertCircle, ExternalLink, X } from 'lucide-react'

const API_URL = 'https://api.auroracarbon.com/v1/ghg/latest'
const CREDITS_PER_LOOKUP = 3

interface RecentRow {
  id: string
  received_at: string
  status: string
  domain: string | null
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

// ── Results Modal ──────────────────────────────────────────────

function ResultsModal({ call, onClose }: { call: RecentRow; onClose: () => void }) {
  const [responseData, setResponseData] = useState<Record<string, unknown> | null>(null)
  const [modalLoading, setModalLoading] = useState(true)

  useEffect(() => {
    if (call.status !== 'succeeded' || !call.domain) {
      const errorResponses: Record<string, { status: string; reason: string }> = {
        failed: { status: 'data_not_available', reason: 'Emissions data is not currently available for this company.' },
        rejected: { status: 'unauthorized', reason: 'Invalid or missing API key.' },
      }
      const info = errorResponses[call.status] || { status: 'error', reason: `Request ended with status: ${call.status}` }
      setResponseData(info)
      setModalLoading(false)
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
        setModalLoading(false)
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
          {modalLoading ? (
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

interface ApiResponse {
  status: string
  company?: string
  year?: number
  methodology?: string
  total_emissions_tco2e?: number
  scope1_emissions_tco2e?: number
  scope2_emissions_tco2e?: number
  scope2_basis?: string
  scope3_emissions_tco2e?: number
  reason?: string
  [key: string]: unknown
}

const Playground = () => {
  const { user, sessionReady } = useAuth()
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [keyLoading, setKeyLoading] = useState(true)
  const [domain, setDomain] = useState('')
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<ApiResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startRef = useRef(0)
  const controllerRef = useRef<AbortController | null>(null)

  const [recentRows, setRecentRows] = useState<RecentRow[]>([])
  const [recentLoading, setRecentLoading] = useState(true)
  const [selectedCall, setSelectedCall] = useState<RecentRow | null>(null)

  const userId = user?.id
  useEffect(() => {
    if (!sessionReady || !userId) {
      if (!sessionReady) return
      setKeyLoading(false)
      return
    }

    supabase
      .from('api_keys')
      .select('key_encrypted')
      .eq('user_id', userId)
      .single()
      .then(({ data }) => {
        setApiKey(data?.key_encrypted ?? null)
        setKeyLoading(false)
      })
      .catch(() => setKeyLoading(false))
  }, [sessionReady, userId])

  const fetchRecent = () => {
    if (!userId) {
      setRecentLoading(false)
      return
    }
    supabase
      .from('api_requests')
      .select('id, received_at, status, domain')
      .eq('endpoint', '/v1/ghg/latest')
      .in('status', ['succeeded', 'failed', 'rejected'])
      .order('received_at', { ascending: false })
      .limit(25)
      .then(({ data, error }) => {
        if (error) console.error('Recent calls fetch error:', error)
        if (data) setRecentRows(data)
        setRecentLoading(false)
      })
      .catch(() => setRecentLoading(false))
  }

  useEffect(() => {
    if (!sessionReady) return
    fetchRecent()
  }, [sessionReady, userId])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const handleSubmit = async () => {
    if (!apiKey) return

    const trimmedDomain = domain.trim().toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/.*$/, '')

    if (!trimmedDomain) return

    if (controllerRef.current) controllerRef.current.abort()
    controllerRef.current = new AbortController()

    setLoading(true)
    setResponse(null)
    setError(null)
    setElapsedMs(0)

    startRef.current = Date.now()
    timerRef.current = setInterval(() => {
      setElapsedMs(Date.now() - startRef.current)
    }, 100)

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ domain: trimmedDomain }),
        signal: controllerRef.current.signal,
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data?.reason || data?.message || data?.error || `HTTP ${res.status}`)
      } else {
        setResponse(data)
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      if (timerRef.current) clearInterval(timerRef.current)
      setElapsedMs(Date.now() - startRef.current)
      setLoading(false)
      // Refresh recent calls after a short delay for the log to be written
      setTimeout(fetchRecent, 1500)
    }
  }

  const handleCancel = () => {
    if (controllerRef.current) controllerRef.current.abort()
    if (timerRef.current) clearInterval(timerRef.current)
    setLoading(false)
  }

  const handleCopy = () => {
    if (!response) return
    navigator.clipboard.writeText(JSON.stringify(response, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatElapsed = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const canSubmit = !!apiKey && domain.trim().length > 0 && !loading

  return (
    <div>
      {/* Header */}
      <div className="pb-8">
        <h1 className="text-[36px] font-semibold tracking-[-0.02em] leading-[1.2] text-gray-900">
          Playground
        </h1>
        <p className="text-gray-500 mt-1 text-[15px]">
          Test the Aurora GHG API with a company domain
        </p>
      </div>

      {/* No API key state */}
      {!keyLoading && !apiKey && (
        <div className="border border-gray-200 rounded-xl p-6 mb-4 bg-white">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-900">No API key found</p>
              <p className="text-sm text-gray-500 mt-1">
                Create an API key in the <button
                  onClick={() => { window.location.hash = 'api-key' }}
                  className="text-black underline hover:no-underline"
                >API Key</button> tab to use the Playground.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Query section */}
      <div className="border border-gray-200 rounded-xl p-6 bg-white">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-[15px] font-semibold text-gray-900">Emissions Lookup</h2>
          <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-black px-2.5 py-0.5 rounded-full" style={{ backgroundColor: '#B3FD00' }}>3 credits</span>
        </div>
        <p className="text-[13px] text-gray-500 mb-4">
          Enter a company's domain to retrieve their most recent greenhouse gas emissions data.
        </p>

        <div className="flex gap-3">
          <Input
            placeholder="e.g. apple.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && canSubmit) handleSubmit() }}
            className="flex-1 text-[13px] bg-white border-gray-200 rounded-lg"
            disabled={loading || !apiKey}
          />
          {loading ? (
            <Button
              onClick={handleCancel}
              variant="outline"
              className="shrink-0 border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg"
            >
              Cancel
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="shrink-0 bg-black text-white hover:bg-gray-800 disabled:opacity-40 rounded-full px-6"
            >
              <Play className="w-4 h-4 mr-2" />
              Run
            </Button>
          )}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="mt-6 flex items-center gap-3 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin text-black" />
            <span>Querying emissions data...</span>
            <span className="flex items-center gap-1 font-mono text-xs text-gray-400">
              <Clock className="w-3 h-3" />
              {formatElapsed(elapsedMs)}
            </span>
          </div>
        )}

        {/* Response */}
        {response && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  response.status === 'ok'
                    ? 'bg-black text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {response.status === 'ok' ? 'SUCCESS' : 'NOT AVAILABLE'}
                </span>
                {response.methodology && (
                  <span className="text-xs text-gray-400">{response.methodology}</span>
                )}
                <span className="text-xs font-mono text-gray-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatElapsed(elapsedMs)}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => { window.location.hash = 'activity-logs' }}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-black transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View in logs
                </button>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-black transition-colors"
                >
                  {copied
                    ? <><Check className="w-3.5 h-3.5" /> Copied</>
                    : <><Copy className="w-3.5 h-3.5" /> Copy</>
                  }
                </button>
              </div>
            </div>
            <pre className="text-[13px] font-mono bg-gray-50 rounded-lg p-4 overflow-x-auto text-gray-900 leading-relaxed">
              {JSON.stringify(response, null, 2)}
            </pre>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-6">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-200 text-gray-600 mb-2 inline-block">
              ERROR
            </span>
            {error.toLowerCase().includes('insufficient credit') ? (
              <div className="bg-gray-50 rounded-lg p-4 mt-2">
                <p className="text-[13px] text-gray-600">You don't have enough credits to run a lookup.</p>
                <a href="#billing" className="inline-block mt-2 text-[13px] font-medium text-black underline underline-offset-2 hover:text-gray-600">
                  Add credits in Billing &rarr;
                </a>
              </div>
            ) : (
              <pre className="text-[13px] font-mono bg-gray-50 rounded-lg p-4 overflow-x-auto text-gray-600 mt-2">
                {error}
              </pre>
            )}
          </div>
        )}
      </div>

      {/* ── Recent Lookups ── */}
      <div className="border border-gray-200 rounded-xl bg-white overflow-hidden mt-12">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-[13px] font-medium text-gray-900">Recent Lookups</h2>
          <p className="text-[12px] text-gray-400 mt-0.5">All recent API calls and credits charged</p>
        </div>

        {recentLoading ? (
          <div className="p-6">
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-10 bg-gray-50 rounded animate-pulse" />
              ))}
            </div>
          </div>
        ) : recentRows.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-500">
            No API calls yet — try running a query above
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[1fr_100px_100px_100px_60px] px-6 py-2.5 border-b border-gray-100 bg-gray-50/50">
              <span className="text-[11px] font-medium text-gray-500 uppercase tracking-[0.05em]">Domain</span>
              <span className="text-[11px] font-medium text-gray-500 uppercase tracking-[0.05em] text-right">Status</span>
              <span className="text-[11px] font-medium text-gray-500 uppercase tracking-[0.05em] text-right">Credits</span>
              <span className="text-[11px] font-medium text-gray-500 uppercase tracking-[0.05em] text-right">Time</span>
              <span className="text-[11px] font-medium text-gray-500 uppercase tracking-[0.05em] text-right">Results</span>
            </div>

            <div className="divide-y divide-gray-50">
              {recentRows.map((row) => {
                const credits = row.status === 'succeeded' ? CREDITS_PER_LOOKUP : 0
                return (
                  <div
                    key={row.id}
                    className="grid grid-cols-[1fr_100px_100px_100px_60px] px-6 py-3 hover:bg-gray-50/50 transition-colors"
                  >
                    <span className="text-[13px] text-gray-900 font-medium truncate pr-4">
                      {formatDomain(row.domain)}
                    </span>
                    <span className="inline-flex items-center justify-end gap-1.5">
                      {row.status === 'succeeded' ? (
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
                      {credits > 0 ? <span>-{credits}</span> : <span className="text-gray-300">0</span>}
                    </span>
                    <span className="text-[12px] text-gray-400 text-right">
                      {timeAgo(row.received_at)}
                    </span>
                    <span className="text-right">
                      <button
                        onClick={() => setSelectedCall(row)}
                        className="text-gray-400 hover:text-black transition-colors"
                        title="View results"
                      >
                        <ExternalLink className="w-3.5 h-3.5 inline" />
                      </button>
                    </span>
                  </div>
                )
              })}
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

export default Playground
