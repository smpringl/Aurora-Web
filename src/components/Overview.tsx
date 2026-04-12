import { useState, useEffect, useRef, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Wallet, Eye, EyeOff, Copy, Play, ExternalLink, ArrowUpRight, X, RefreshCw, Loader2, Clock } from 'lucide-react'
import { showSuccess, showError } from '@/utils/toast'

const API_URL = 'https://api.auroracarbon.com/v1/ghg/latest'
const CREDITS_PER_LOOKUP = 3

interface RecentRow {
  id: string
  received_at: string
  status: string
  domain: string | null
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

// ── Main Component ─────────────────────────────────────────────

const Overview = () => {
  const { user, sessionReady } = useAuth()
  const userId = user?.id

  // Credit balance
  const [creditBalance, setCreditBalance] = useState(0)
  const [balanceLoading, setBalanceLoading] = useState(true)
  const lookupsRemaining = Math.floor(creditBalance / CREDITS_PER_LOOKUP)

  const fetchBalance = async (showLoading = true) => {
    if (!userId) return
    if (showLoading) setBalanceLoading(true)
    try {
      const { data } = await supabase
        .from('credit_balances')
        .select('balance')
        .eq('user_id', userId)
        .single()
      setCreditBalance(data?.balance ?? 0)
    } catch {}
    setBalanceLoading(false)
  }

  // API key
  const [apiKey, setApiKey] = useState<{ prefix: string; last_four: string; key_encrypted: string } | null>(null)
  const [showKey, setShowKey] = useState(false)

  // Quick lookup
  const [domain, setDomain] = useState('')
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupResponse, setLookupResponse] = useState<ApiResponse | null>(null)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [elapsedMs, setElapsedMs] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startRef = useRef(0)
  const controllerRef = useRef<AbortController | null>(null)

  // Recent calls
  const [recentRows, setRecentRows] = useState<RecentRow[]>([])
  const [recentLoading, setRecentLoading] = useState(true)
  const [selectedCall, setSelectedCall] = useState<RecentRow | null>(null)

  // Usage chart data (30 days)
  interface UsageRow { received_at: string; status: string }
  const [usageRows, setUsageRows] = useState<UsageRow[]>([])
  const [usageLoading, setUsageLoading] = useState(true)

  useEffect(() => {
    if (!sessionReady || !userId) return

    // Fetch credit balance
    fetchBalance()

    // Fetch API key
    supabase
      .from('api_keys')
      .select('prefix, last_four, key_encrypted')
      .eq('user_id', userId)
      .single()
      .then(({ data }) => {
        if (data) setApiKey(data)
      })

    // Fetch recent calls
    supabase
      .from('api_requests')
      .select('id, received_at, status, domain')
      .eq('endpoint', '/v1/ghg/latest')
      .in('status', ['succeeded', 'failed', 'rejected'])
      .order('received_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (data) {
          setRecentRows(data)
        }
        setRecentLoading(false)
      })
      .catch(() => setRecentLoading(false))
  }, [sessionReady, userId])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  // Fetch 30-day usage for mini chart
  const fetchUsage = async () => {
    if (!userId) return
    const since = new Date(Date.now() - 30 * 86400000).toISOString()
    const { data } = await supabase
      .from('api_requests')
      .select('received_at, status')
      .eq('endpoint', '/v1/ghg/latest')
      .in('status', ['succeeded', 'failed', 'rejected'])
      .gte('received_at', since)
      .order('received_at', { ascending: false })
    if (data) setUsageRows(data)
    setUsageLoading(false)
  }

  useEffect(() => {
    if (!sessionReady) return
    fetchUsage()
  }, [sessionReady, userId])

  // Build 30-day chart buckets
  const chartData = useMemo(() => {
    const buckets = new Map<string, { succeeded: number; failed: number }>()
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000)
      buckets.set(d.toISOString().slice(0, 10), { succeeded: 0, failed: 0 })
    }
    for (const row of usageRows) {
      const key = row.received_at.slice(0, 10)
      const entry = buckets.get(key)
      if (!entry) continue
      if (row.status === 'succeeded') entry.succeeded++
      else entry.failed++
    }
    return Array.from(buckets.entries()).map(([key, counts]) => ({ key, ...counts }))
  }, [usageRows])

  const totalRequests = usageRows.length
  const succeededRequests = usageRows.filter(r => r.status === 'succeeded').length
  const chartMax = Math.max(...chartData.map(d => d.succeeded), 1)

  const formatElapsed = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const handleLookup = async () => {
    if (!apiKey?.key_encrypted || !domain.trim()) return

    const trimmed = domain.trim().toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/.*$/, '')

    if (controllerRef.current) controllerRef.current.abort()
    controllerRef.current = new AbortController()

    setLookupLoading(true)
    setLookupResponse(null)
    setLookupError(null)
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
          'Authorization': `Bearer ${apiKey.key_encrypted}`,
        },
        body: JSON.stringify({ domain: trimmed }),
        signal: controllerRef.current.signal,
      })

      const data = await res.json()
      if (!res.ok) {
        setLookupError(data?.reason || data?.message || data?.error || `HTTP ${res.status}`)
      } else {
        setLookupResponse(data)
      }

      // Optimistically add to usage chart data
      const status = (res.ok && data?.status === 'ok') ? 'succeeded' : 'failed'
      setUsageRows(prev => [{ received_at: new Date().toISOString(), status }, ...prev])
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setLookupError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      if (timerRef.current) clearInterval(timerRef.current)
      setElapsedMs(Date.now() - startRef.current)
      setLookupLoading(false)
      // Refresh recent calls, credit balance, and stats
      setTimeout(() => {
        fetchBalance(false)
        fetchUsage()
        supabase
          .from('api_requests')
          .select('id, received_at, status, domain')
          .eq('endpoint', '/v1/ghg/latest')
          .in('status', ['succeeded', 'failed', 'rejected'])
          .order('received_at', { ascending: false })
          .limit(10)
          .then(({ data }) => {
            if (data) setRecentRows(data)
          })
      }, 1500)
    }
  }

  const copyKey = async () => {
    if (!apiKey?.key_encrypted) return
    try {
      await navigator.clipboard.writeText(apiKey.key_encrypted)
      showSuccess('API key copied to clipboard')
    } catch {
      showError('Failed to copy')
    }
  }

  const keyDisplay = showKey && apiKey?.key_encrypted
    ? apiKey.key_encrypted
    : apiKey ? `${apiKey.prefix}${'•'.repeat(20)}${apiKey.last_four}` : ''

  const succeededCount = recentRows.filter(r => r.status === 'succeeded').length

  return (
    <div>
      {/* Header */}
      <div className="pb-8">
        <h1 className="text-[36px] font-semibold tracking-[-0.02em] leading-[1.2] text-gray-900">
          Overview
        </h1>
        <p className="text-gray-500 mt-1 text-[15px]">
          Your Aurora dashboard at a glance
        </p>
      </div>

      {/* ── Top row: Balance + Stats ── */}
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-200 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px">
          {/* Credit balance */}
          <div className="bg-white p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#B3FD00' }}>
                <Wallet className="w-4 h-4 text-black" />
              </div>
              <span className="text-[13px] font-medium text-gray-500 uppercase tracking-[0.05em]">Credit Balance</span>
            </div>
            <div className="text-[48px] font-semibold font-mono text-black tracking-[-0.03em] leading-none">
              {creditBalance.toLocaleString()}
            </div>
            <div className="text-[14px] text-gray-400 mt-2 font-mono">
              {lookupsRemaining.toLocaleString()} lookups remaining
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 rounded-full border-gray-200"
              onClick={() => { window.location.hash = 'billing' }}
            >
              Reload Balance
              <ArrowUpRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </div>

          {/* 30-day usage chart */}
          <div className="bg-white p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-medium text-gray-500 uppercase tracking-[0.05em]">Last 30 Days</span>
              <a href="#usage" className="text-[11px] text-gray-400 hover:text-black transition-colors inline-flex items-center gap-1">
                Details <ArrowUpRight className="w-3 h-3" />
              </a>
            </div>
            {usageLoading ? (
              <div className="h-28 bg-gray-50 rounded animate-pulse" />
            ) : succeededRequests === 0 ? (
              <div className="h-28 flex items-center justify-center text-[12px] text-gray-400">
                No requests yet
              </div>
            ) : (
              <div className="flex items-end gap-px" style={{ height: 112 }}>
                {chartData.map((bucket) => {
                  const count = bucket.succeeded
                  const height = count > 0 ? Math.max((count / chartMax) * 100, 6) : 0
                  const date = new Date(bucket.key + 'T00:00:00')
                  const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  return (
                    <div
                      key={bucket.key}
                      className="flex-1 flex flex-col justify-end group relative"
                      style={{ height: '100%' }}
                    >
                      {count > 0 && (
                        <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover:block z-10 pointer-events-none">
                          <div className="bg-black text-white text-[11px] rounded-md px-2.5 py-1.5 whitespace-nowrap">
                            <span className="font-medium">{count}</span> <span className="text-gray-400">{label}</span>
                          </div>
                        </div>
                      )}
                      {count > 0 ? (
                        <div
                          className="w-full bg-black rounded-sm transition-all hover:bg-gray-700"
                          style={{ height: `${height}%` }}
                        />
                      ) : (
                        <div className="w-full bg-gray-100 rounded-sm" style={{ height: '2px' }} />
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* API key */}
          <div className="bg-white p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-medium text-gray-500 uppercase tracking-[0.05em]">API Key</span>
              {apiKey && (
                <div className="flex items-center gap-1">
                  <button onClick={() => setShowKey(!showKey)} className="p-1 text-gray-400 hover:text-black transition-colors" title={showKey ? 'Hide' : 'Show'}>
                    {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={copyKey} className="p-1 text-gray-400 hover:text-black transition-colors" title="Copy">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
            {apiKey ? (
              <div className="font-mono text-[13px] text-gray-900 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 truncate">
                {keyDisplay}
              </div>
            ) : (
              <div className="text-[13px] text-gray-400">
                No API key yet — <a href="#api-key" className="text-black underline">create one</a>
              </div>
            )}
            <a href="#api-key" className="text-[12px] text-gray-400 hover:text-black mt-2 inline-flex items-center gap-1">
              Manage key <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* ── Quick Lookup ── */}
      <div className="border border-gray-200 rounded-xl p-6 bg-white mb-8">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-[15px] font-semibold text-gray-900">Quick Lookup</h2>
          <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-black px-2.5 py-0.5 rounded-full" style={{ backgroundColor: '#B3FD00' }}>3 credits</span>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <p className="text-[13px] text-gray-500">
            Enter a domain to look up a company's emissions
          </p>
          {(lookupResponse || lookupError) && (
            <button
              onClick={() => { setDomain(''); setLookupResponse(null); setLookupError(null); setElapsedMs(0) }}
              className="text-[12px] text-gray-400 hover:text-black transition-colors inline-flex items-center gap-1 shrink-0"
            >
              <RefreshCw className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>

        <div className="flex gap-3">
          <Input
            placeholder="e.g. apple.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && apiKey && domain.trim() && !lookupLoading) handleLookup() }}
            className="flex-1 text-[13px] bg-white border-gray-200 rounded-lg"
            disabled={lookupLoading || !apiKey}
          />
          {lookupLoading ? (
            <Button
              onClick={() => { controllerRef.current?.abort(); if (timerRef.current) clearInterval(timerRef.current); setLookupLoading(false) }}
              variant="outline"
              className="shrink-0 border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg"
            >
              Cancel
            </Button>
          ) : (
            <Button
              onClick={handleLookup}
              disabled={!apiKey || !domain.trim()}
              className="shrink-0 bg-black text-white hover:bg-gray-800 disabled:opacity-40 rounded-full px-6"
            >
              <Play className="w-4 h-4 mr-2" />
              Run
            </Button>
          )}
        </div>

        {lookupLoading && (
          <div className="mt-4 flex items-center gap-3 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin text-black" />
            <span>Querying emissions data...</span>
            <span className="flex items-center gap-1 font-mono text-xs text-gray-400">
              <Clock className="w-3 h-3" />
              {formatElapsed(elapsedMs)}
            </span>
          </div>
        )}

        {lookupResponse && (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              {lookupResponse.status === 'ok' ? (
                <>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: '#B3FD00' }}></span>
                  <span className="text-[12px] font-bold uppercase text-black">Success</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
                  <span className="text-[12px] font-bold uppercase text-black">Not Available</span>
                </>
              )}
              {lookupResponse.company && (
                <span className="text-[12px] text-gray-400 ml-1">{lookupResponse.company}</span>
              )}
            </div>
            <pre className="text-[13px] font-mono bg-gray-50 rounded-lg p-4 overflow-x-auto text-gray-900 max-h-[200px] overflow-y-auto">
              {JSON.stringify(lookupResponse, null, 2)}
            </pre>
          </div>
        )}

        {lookupError && (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
              <span className="text-[12px] font-bold uppercase text-black">Error</span>
            </div>
            {lookupError.toLowerCase().includes('insufficient credit') ? (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-[13px] text-gray-600">You don't have enough credits to run a lookup.</p>
                <a href="#billing" className="inline-block mt-2 text-[13px] font-medium text-black underline underline-offset-2 hover:text-gray-600">
                  Add credits in Billing &rarr;
                </a>
              </div>
            ) : (
              <pre className="text-[13px] font-mono bg-gray-50 rounded-lg p-4 text-gray-600">{lookupError}</pre>
            )}
          </div>
        )}

      </div>

      {/* ── Recent Activity ── */}
      <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-[13px] font-medium text-gray-900">Recent Activity</h2>
            <p className="text-[12px] text-gray-400 mt-0.5">Your latest API calls</p>
          </div>
          <a href="#activity-logs" className="text-[12px] text-gray-400 hover:text-black inline-flex items-center gap-1">
            View all <ArrowUpRight className="w-3 h-3" />
          </a>
        </div>

        {recentLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-10 bg-gray-50 rounded animate-pulse" />
            ))}
          </div>
        ) : recentRows.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-500">
            No API calls yet — try a lookup above
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

export default Overview
