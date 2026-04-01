import { useState, useEffect } from 'react'
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, ExternalLink } from 'lucide-react'

const STATUS_API = 'https://kfuuqxmaihlwhzfibhvj.supabase.co/functions/v1/status-api'

interface ServiceStatus {
  name: string
  status: 'operational' | 'degraded' | 'down'
  latency_ms: number
  details?: string
}

interface Incident {
  id: string
  title: string
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved'
  severity: 'minor' | 'major' | 'critical'
  message: string
  affected_services: string[]
  created_at: string
  updated_at: string
  resolved_at: string | null
}

interface StatusData {
  overall: 'operational' | 'degraded' | 'partial_outage'
  services: ServiceStatus[]
  uptime_30d: number
  incidents: Incident[]
  checked_at: string
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

function StatusIcon({ status }: { status: string }) {
  if (status === 'operational') return <CheckCircle2 className="w-5 h-5 text-green-500" />
  if (status === 'degraded') return <AlertTriangle className="w-5 h-5 text-yellow-500" />
  return <XCircle className="w-5 h-5 text-red-500" />
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    operational: { bg: 'bg-green-50', text: 'text-green-700', label: 'Operational' },
    degraded: { bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'Degraded' },
    down: { bg: 'bg-red-50', text: 'text-red-700', label: 'Down' },
  }
  const c = config[status] || config.down
  return (
    <span className={`text-[12px] font-medium px-2.5 py-1 rounded-full ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  )
}

function IncidentBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    investigating: { bg: 'bg-red-50', text: 'text-red-700' },
    identified: { bg: 'bg-yellow-50', text: 'text-yellow-700' },
    monitoring: { bg: 'bg-blue-50', text: 'text-blue-700' },
    resolved: { bg: 'bg-green-50', text: 'text-green-700' },
  }
  const c = config[status] || config.investigating
  return (
    <span className={`text-[11px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>
      {status}
    </span>
  )
}

const Status = () => {
  const [data, setData] = useState<StatusData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const fetchStatus = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    try {
      const res = await fetch(STATUS_API)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load status')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(() => fetchStatus(), 300000) // 5 minutes
    return () => clearInterval(interval)
  }, [])

  const overallConfig: Record<string, { color: string; bg: string; label: string }> = {
    operational: { color: 'text-green-700', bg: 'bg-green-50 border-green-200', label: 'All Systems Operational' },
    degraded: { color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200', label: 'Degraded Performance' },
    partial_outage: { color: 'text-red-700', bg: 'bg-red-50 border-red-200', label: 'Partial System Outage' },
  }

  const activeIncidents = data?.incidents.filter(i => i.status !== 'resolved') || []
  const pastIncidents = data?.incidents.filter(i => i.status === 'resolved') || []

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-[800px] mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/aurora-logo-black.png" alt="Aurora" className="h-7 w-auto" />
            <span className="text-[15px] font-medium text-gray-900">System Status</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => fetchStatus(true)}
              disabled={refreshing}
              className="text-gray-400 hover:text-black transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <a href="/" className="text-[13px] text-gray-500 hover:text-black flex items-center gap-1">
              auroracarbon.com <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-[800px] mx-auto px-6 py-8">
        {loading ? (
          <div className="space-y-6">
            <div className="h-20 bg-gray-50 rounded-xl animate-pulse" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-gray-50 rounded-xl animate-pulse" />)}
            </div>
          </div>
        ) : error ? (
          <div className="border border-red-200 bg-red-50 rounded-xl p-6 text-center">
            <XCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
            <p className="text-[14px] font-medium text-red-700 mb-1">Unable to load status</p>
            <p className="text-[13px] text-red-500">{error}</p>
            <button
              onClick={() => { setLoading(true); fetchStatus() }}
              className="mt-4 text-[13px] text-red-600 hover:text-red-800 underline"
            >
              Try again
            </button>
          </div>
        ) : data ? (
          <div className="space-y-8">
            {/* Overall Status Banner */}
            {(() => {
              const c = overallConfig[data.overall] || overallConfig.operational
              return (
                <div className={`border rounded-xl p-6 ${c.bg}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <StatusIcon status={data.overall === 'partial_outage' ? 'down' : data.overall} />
                      <span className={`text-[18px] font-semibold ${c.color}`}>{c.label}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-[13px] font-medium text-gray-900">{data.uptime_30d}% uptime</div>
                      <div className="text-[11px] text-gray-400">last 30 days</div>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Active Incidents */}
            {activeIncidents.length > 0 && (
              <div>
                <h2 className="text-[13px] font-medium text-gray-500 uppercase tracking-wide mb-3">Active Incidents</h2>
                <div className="space-y-3">
                  {activeIncidents.map(incident => (
                    <div key={incident.id} className="border border-yellow-200 bg-yellow-50/50 rounded-xl p-5">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-[14px] font-semibold text-gray-900">{incident.title}</h3>
                        <IncidentBadge status={incident.status} />
                      </div>
                      <p className="text-[13px] text-gray-600 mb-2">{incident.message}</p>
                      <div className="flex items-center gap-3 text-[11px] text-gray-400">
                        <span>{timeAgo(incident.updated_at)}</span>
                        {incident.affected_services.length > 0 && (
                          <span>Affecting: {incident.affected_services.join(', ')}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Services */}
            <div>
              <h2 className="text-[13px] font-medium text-gray-500 uppercase tracking-wide mb-3">Services</h2>
              <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
                {data.services.map(service => (
                  <div key={service.name} className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <StatusIcon status={service.status} />
                      <div>
                        <div className="text-[14px] font-medium text-gray-900">{service.name}</div>
                        {service.latency_ms > 0 && (
                          <div className="text-[11px] text-gray-400">{service.latency_ms}ms response</div>
                        )}
                      </div>
                    </div>
                    <StatusBadge status={service.status} />
                  </div>
                ))}
              </div>
            </div>

            {/* Uptime Bar */}
            <div>
              <h2 className="text-[13px] font-medium text-gray-500 uppercase tracking-wide mb-3">30-Day Uptime</h2>
              <div className="border border-gray-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[32px] font-semibold font-mono text-black">{data.uptime_30d}%</span>
                  <span className="text-[12px] text-gray-400">Based on API success rate</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${data.uptime_30d >= 99 ? 'bg-green-500' : data.uptime_30d >= 95 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.min(data.uptime_30d, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Past Incidents */}
            {pastIncidents.length > 0 && (
              <div>
                <h2 className="text-[13px] font-medium text-gray-500 uppercase tracking-wide mb-3">Past Incidents</h2>
                <div className="space-y-3">
                  {pastIncidents.map(incident => (
                    <div key={incident.id} className="border border-gray-200 rounded-xl p-5">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-[14px] font-medium text-gray-900">{incident.title}</h3>
                        <IncidentBadge status={incident.status} />
                      </div>
                      <p className="text-[13px] text-gray-500">{incident.message}</p>
                      <div className="text-[11px] text-gray-400 mt-2">
                        {incident.resolved_at ? `Resolved ${timeAgo(incident.resolved_at)}` : timeAgo(incident.created_at)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No incidents message */}
            {data.incidents.length === 0 && (
              <div className="border border-gray-200 rounded-xl p-8 text-center">
                <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-3" />
                <p className="text-[14px] font-medium text-gray-900">No recent incidents</p>
                <p className="text-[13px] text-gray-400 mt-1">All systems have been running smoothly</p>
              </div>
            )}

            {/* Footer */}
            <div className="text-center text-[11px] text-gray-400 pt-4">
              Last checked {data.checked_at ? timeAgo(data.checked_at) : '--'} · Auto-refreshes every 60 seconds
            </div>
          </div>
        ) : null}
      </main>
    </div>
  )
}

export default Status
