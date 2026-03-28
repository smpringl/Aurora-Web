import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Receipt, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'

const SUPABASE_URL = 'https://kfuuqxmaihlwhzfibhvj.supabase.co'
const PAGE_SIZE = 10

interface Transaction {
  id: string
  created_at: string
  pack_name: string | null
  type: string
  amount_cents: number | null
  discount_cents: number | null
  credits: number
  card_last4: string | null
  card_brand: string | null
  status: string
  promo_code: string | null
}

interface InvoiceHistoryProps {
  userId: string
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function statusDot(status: string): React.ReactNode {
  const color =
    status === 'completed' ? '#B3FD00' : status === 'failed' ? '#ef4444' : '#9ca3af'
  const label = status === 'completed' ? 'SUCCESS' : status === 'failed' ? 'FAILED' : 'REFUNDED'
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-black">
        {label}
      </span>
    </span>
  )
}

const InvoiceHistory = ({ userId }: InvoiceHistoryProps) => {
  const { sessionReady } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTransactions = async (offset = 0, append = false) => {
    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }
    setError(null)

    try {
      const session = await supabase.auth.getSession()
      const res = await fetch(`${SUPABASE_URL}/functions/v1/stripe-billing`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.data.session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'get-transactions',
          limit: PAGE_SIZE,
          offset,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to load transactions')
      }

      const data = await res.json()
      const items: Transaction[] = data.transactions || []

      if (append) {
        setTransactions((prev) => [...prev, ...items])
      } else {
        setTransactions(items)
      }
      setHasMore(items.length === PAGE_SIZE)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    if (!sessionReady) return
    if (userId) {
      fetchTransactions()
    }
  }, [sessionReady, userId])

  return (
    <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-[13px] font-medium text-gray-900">Invoice History</h2>
        <p className="text-[12px] text-gray-400 mt-0.5">All credit purchases and transactions</p>
      </div>

      {loading ? (
        <div className="p-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-gray-50 rounded animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="p-12 text-center">
          <p className="text-[13px] text-red-500 mb-3">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchTransactions()}
            className="text-[12px]"
          >
            Retry
          </Button>
        </div>
      ) : transactions.length === 0 ? (
        <div className="p-12 text-center">
          <Receipt className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-[13px] text-gray-500">No transactions yet</p>
          <p className="text-[12px] text-gray-400 mt-1">
            Purchases will appear here
          </p>
        </div>
      ) : (
        <>
          {/* Table header */}
          <div className="grid grid-cols-[1fr_1fr_90px_90px_100px_80px] px-6 py-2.5 border-b border-gray-100 bg-gray-50/50">
            <span className="text-[11px] font-medium text-gray-500 uppercase tracking-[0.05em]">
              Date
            </span>
            <span className="text-[11px] font-medium text-gray-500 uppercase tracking-[0.05em]">
              Description
            </span>
            <span className="text-[11px] font-medium text-gray-500 uppercase tracking-[0.05em] text-right">
              Amount
            </span>
            <span className="text-[11px] font-medium text-gray-500 uppercase tracking-[0.05em] text-right">
              Credits
            </span>
            <span className="text-[11px] font-medium text-gray-500 uppercase tracking-[0.05em] text-right">
              Card
            </span>
            <span className="text-[11px] font-medium text-gray-500 uppercase tracking-[0.05em] text-right">
              Status
            </span>
          </div>

          {/* Table rows */}
          <div className="divide-y divide-gray-50">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="grid grid-cols-[1fr_1fr_90px_90px_100px_80px] px-6 py-3 hover:bg-gray-50/50 transition-colors"
              >
                <span className="text-[13px] text-gray-900">{formatDate(tx.created_at)}</span>
                <span className="text-[13px] text-gray-600 truncate pr-4">
                  {tx.type === 'refund' ? 'Refund' : tx.pack_name ? `${tx.pack_name} Pack` : 'Credit purchase'}
                  {tx.promo_code ? ` (${tx.promo_code})` : ''}
                </span>
                <span className="text-[13px] font-mono text-gray-900 text-right">
                  {tx.amount_cents != null ? `$${(((tx.amount_cents ?? 0) - (tx.discount_cents ?? 0)) / 100).toFixed(2)}` : '-'}
                </span>
                <span className="text-[13px] font-mono text-gray-900 text-right">
                  {tx.credits > 0 ? '+' : ''}{tx.credits.toLocaleString()}
                </span>
                <span className="text-[12px] text-gray-400 text-right">
                  {tx.card_brand && tx.card_last4
                    ? `${tx.card_brand.charAt(0).toUpperCase() + tx.card_brand.slice(1)} ${tx.card_last4}`
                    : '-'}
                </span>
                <span className="text-right">{statusDot(tx.status)}</span>
              </div>
            ))}
          </div>

          {/* Footer */}
          {hasMore && (
            <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/30 flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchTransactions(transactions.length, true)}
                disabled={loadingMore}
                className="text-[12px] text-gray-600 hover:text-black"
              >
                {loadingMore ? (
                  'Loading...'
                ) : (
                  <>
                    Show more
                    <ChevronDown className="w-3 h-3 ml-1" />
                  </>
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default InvoiceHistory
