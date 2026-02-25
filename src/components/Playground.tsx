import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Play, Globe, Loader2, Clock, Copy, Check, AlertCircle, ExternalLink } from 'lucide-react'

const API_URL = 'https://api.auroracarbon.com/v1/ghg/latest'

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
  const { user } = useAuth()
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

  // Fetch the user's API key from Supabase — depend on user.id (stable string)
  const userId = user?.id
  useEffect(() => {
    if (!userId) {
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
  }, [userId])

  // Cleanup timer on unmount
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

    // Cancel any in-flight request
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
        setError(data?.message || data?.error || `HTTP ${res.status}`)
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
    <div className="space-y-0">
      {/* Header */}
      <div className="pb-8">
        <h1 className="text-4xl font-heading font-bold text-primary-black leading-tight">
          Playground
        </h1>
        <p className="text-detail-gray font-sans mt-1">
          Test the Aurora GHG API with a company domain
        </p>
      </div>

      {/* No API key state */}
      {!keyLoading && !apiKey && (
        <div className="bg-white rounded-xl border border-detail-light p-6 mb-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-sans font-medium text-primary-black">
                No API key found
              </p>
              <p className="text-sm font-sans text-detail-gray mt-1">
                Create an API key in the <button
                  onClick={() => {
                    window.location.hash = 'api-key'
                  }}
                  className="text-primary-black underline hover:no-underline"
                >API Key</button> tab to use the Playground.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Query section */}
      <div className="bg-white rounded-xl border border-detail-light p-6">
        <div className="flex items-center gap-2 mb-3">
          <Globe className="w-4 h-4 text-detail-gray" />
          <span className="text-sm font-sans font-medium text-primary-black">
            POST /v1/ghg/latest
          </span>
        </div>

        <div className="flex gap-3">
          <Input
            placeholder="e.g. apple.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && canSubmit) handleSubmit() }}
            className="flex-1 font-sans text-sm bg-white border-detail-light"
            disabled={loading || !apiKey}
          />
          {loading ? (
            <Button
              onClick={handleCancel}
              variant="outline"
              className="shrink-0 border-detail-light hover:bg-gray-50"
            >
              Cancel
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="shrink-0 bg-primary-black text-white hover:bg-gray-800 disabled:opacity-40"
            >
              <Play className="w-4 h-4 mr-2" />
              Run
            </Button>
          )}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="mt-6 flex items-center gap-3 text-sm text-detail-gray font-sans">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Querying emissions data...</span>
            <span className="flex items-center gap-1 font-mono text-xs">
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
                <span className={`text-xs font-sans font-medium px-2 py-0.5 rounded-full ${
                  response.status === 'ok'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-amber-50 text-amber-700'
                }`}>
                  {response.status === 'ok' ? 'SUCCESS' : 'NOT AVAILABLE'}
                </span>
                {response.methodology && (
                  <span className="text-xs font-sans text-detail-gray">
                    {response.methodology}
                  </span>
                )}
                <span className="text-xs font-mono text-detail-gray flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatElapsed(elapsedMs)}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => { window.location.hash = 'activity-logs' }}
                  className="flex items-center gap-1.5 text-xs font-sans text-detail-gray hover:text-primary-black transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View in logs
                </button>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs font-sans text-detail-gray hover:text-primary-black transition-colors"
                >
                  {copied
                    ? <><Check className="w-3.5 h-3.5" /> Copied</>
                    : <><Copy className="w-3.5 h-3.5" /> Copy</>
                  }
                </button>
              </div>
            </div>
            <pre className="text-xs font-mono bg-[#f0f0f0] rounded-lg p-4 overflow-x-auto text-primary-black leading-relaxed">
              {JSON.stringify(response, null, 2)}
            </pre>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-6">
            <span className="text-xs font-sans font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600 mb-2 inline-block">
              ERROR
            </span>
            <pre className="text-xs font-mono bg-[#f0f0f0] rounded-lg p-4 overflow-x-auto text-red-600 mt-2">
              {error}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

export default Playground
