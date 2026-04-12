import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

import { AlertTriangle } from 'lucide-react'
import CreditBalanceCard from '@/components/billing/CreditBalanceCard'
import PaymentMethodsList from '@/components/billing/PaymentMethodsList'
import type { Card } from '@/components/billing/PaymentMethodsList'
import AddCardForm from '@/components/billing/AddCardForm'
import PurchaseCreditsPanel from '@/components/billing/PurchaseCreditsPanel'
import InvoiceHistory from '@/components/billing/InvoiceHistory'

const SUPABASE_URL = 'https://kfuuqxmaihlwhzfibhvj.supabase.co'

async function callBilling(action: string, params: Record<string, unknown> = {}) {
  const session = await supabase.auth.getSession()
  const res = await fetch(`${SUPABASE_URL}/functions/v1/stripe-billing`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.data.session?.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, ...params }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `${action} failed`)
  return data
}

const Billing = () => {
  const { user, sessionReady } = useAuth()
  const userId = user?.id

  const [creditBalance, setCreditBalance] = useState(0)
  const [balanceLoading, setBalanceLoading] = useState(true)
  const [cards, setCards] = useState<Card[]>([])
  const [cardsLoading, setCardsLoading] = useState(true)
  const [showAddCard, setShowAddCard] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  // Fetch credit balance
  const fetchBalance = useCallback(async () => {
    if (!sessionReady || !userId) return
    setBalanceLoading(true)
    try {
      const data = await callBilling('get-balance')
      setCreditBalance(data.balance ?? 0)
    } catch (err) {
      console.error('Failed to fetch balance:', err)
    } finally {
      setBalanceLoading(false)
    }
  }, [sessionReady, userId])

  // Fetch payment methods
  const fetchCards = useCallback(async () => {
    if (!sessionReady || !userId) return
    setCardsLoading(true)
    try {
      const data = await callBilling('list-cards')
      setCards(data.cards ?? [])
    } catch (err) {
      console.error('Failed to fetch cards:', err)
    } finally {
      setCardsLoading(false)
    }
  }, [sessionReady, userId])

  useEffect(() => {
    fetchBalance()
    fetchCards()
  }, [fetchBalance, fetchCards])

  // Card actions
  const handleRemoveCard = async (paymentMethodId: string) => {
    try {
      await callBilling('remove-card', { payment_method_id: paymentMethodId })
      toast.success('Card removed')
      fetchCards()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove card')
    }
  }

  const handleSetDefault = async (paymentMethodId: string) => {
    try {
      await callBilling('set-default-card', { payment_method_id: paymentMethodId })
      toast.success('Default card updated')
      fetchCards()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update default card')
    }
  }

  const handleAddCardSuccess = () => {
    setShowAddCard(false)
    toast.success('Card added')
    fetchCards()
  }

  const handlePurchaseComplete = () => {
    toast.success('Credits purchased successfully')
    fetchBalance()
    setRefreshKey((k) => k + 1)
  }

  if (!userId) return null

  return (
    <div>
      {/* Header */}
      <div className="pb-8">
        <h1 className="text-[36px] font-semibold tracking-[-0.02em] leading-[1.2] text-gray-900">
          Billing
        </h1>
        <p className="text-gray-500 mt-1 text-[15px]">
          Manage your payment methods and purchase credits
        </p>
      </div>

      {/* Low balance warning */}
      {!balanceLoading && creditBalance > 0 && creditBalance < 30 && (
        <div className="mb-4 flex items-center gap-3 p-4 border border-yellow-200 bg-yellow-50 rounded-xl text-[13px] text-yellow-800">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Your credit balance is low ({creditBalance} credits remaining). Purchase more below to avoid API interruptions.</span>
        </div>
      )}
      {!balanceLoading && creditBalance <= 0 && (
        <div className="mb-4 flex items-center gap-3 p-4 border border-red-200 bg-red-50 rounded-xl text-[13px] text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Your credit balance is depleted. API requests will return 402 until you purchase more credits.</span>
        </div>
      )}

      {/* Credit Balance */}
      <div className="mb-8">
        <CreditBalanceCard balance={creditBalance} loading={balanceLoading} />
      </div>

      {/* Buy Credits */}
      <div className="mb-8">
        <PurchaseCreditsPanel cards={cards} balance={creditBalance} onPurchaseComplete={handlePurchaseComplete} onCardsChanged={fetchCards} />
      </div>

      {/* Payment Methods */}
      <div className="mb-8">
        {showAddCard ? (
          <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-[13px] font-medium text-gray-900">Add Payment Method</h2>
              <p className="text-[12px] text-gray-400 mt-0.5">
                Enter your card details below
              </p>
            </div>
            <AddCardForm
              onSuccess={handleAddCardSuccess}
              onCancel={() => setShowAddCard(false)}
            />
          </div>
        ) : (
          <PaymentMethodsList
            cards={cards}
            loading={cardsLoading}
            onRemove={handleRemoveCard}
            onSetDefault={handleSetDefault}
            onAddCard={() => setShowAddCard(true)}
          />
        )}
      </div>

      {/* Invoice History */}
      <div className="mb-8">
        <InvoiceHistory key={refreshKey} userId={userId} />
      </div>
    </div>
  )
}

export default Billing
