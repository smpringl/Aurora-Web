import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { Check, ChevronDown, Loader2, Tag, Minus, Plus, ArrowRight } from 'lucide-react'
import type { Card } from './PaymentMethodsList'

const SUPABASE_URL = 'https://kfuuqxmaihlwhzfibhvj.supabase.co'

const PACK = {
  id: 'starter',
  priceId: 'price_1TDlfXKGTy4BfEAsATcrEiJo',
  name: 'Starter Pack',
  price: 20,
  credits: 120,
  lookups: 40,
}

interface PurchaseCreditsPanelProps {
  cards: Card[]
  onPurchaseComplete: () => void
}

interface PromoResult {
  valid: boolean
  discount_percent?: number
  discount_amount?: number
  coupon_id?: string
  name?: string
}

const PurchaseCreditsPanel = ({ cards, onPurchaseComplete }: PurchaseCreditsPanelProps) => {
  const [quantity, setQuantity] = useState(1)
  const [selectedCardId, setSelectedCardId] = useState<string>(() => {
    const def = cards.find((c) => c.is_default)
    return def?.stripe_payment_method_id || cards[0]?.stripe_payment_method_id || ''
  })
  const [promoCode, setPromoCode] = useState('')
  const [promoResult, setPromoResult] = useState<PromoResult | null>(null)
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoError, setPromoError] = useState<string | null>(null)
  const [purchasing, setPurchasing] = useState(false)
  const [purchaseError, setPurchaseError] = useState<string | null>(null)
  const [showPromo, setShowPromo] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const subtotal = PACK.price * quantity
  const totalCredits = PACK.credits * quantity
  const totalLookups = PACK.lookups * quantity

  const computeTotal = () => {
    if (promoResult?.valid) {
      if (promoResult.discount_percent) {
        return subtotal * (1 - promoResult.discount_percent / 100)
      }
      if (promoResult.discount_amount) {
        return Math.max(0, subtotal - promoResult.discount_amount / 100)
      }
    }
    return subtotal
  }

  const total = computeTotal()

  const handleValidatePromo = async () => {
    if (!promoCode.trim()) return
    setPromoLoading(true)
    setPromoError(null)
    setPromoResult(null)

    try {
      const session = await supabase.auth.getSession()
      const res = await fetch(`${SUPABASE_URL}/functions/v1/stripe-billing`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.data.session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'validate-promo', code: promoCode.trim(), price_id: PACK.priceId }),
      })

      const data = await res.json()
      if (!res.ok) {
        setPromoError(data.error || 'Invalid promo code')
        return
      }

      if (data.valid) {
        setPromoResult({
          valid: true,
          discount_percent: data.percent_off ?? undefined,
          discount_amount: data.amount_off ?? undefined,
          coupon_id: data.coupon_id,
          name: promoCode.trim(),
        })
      } else {
        setPromoError(data.error || 'This promo code is not valid')
      }
    } catch {
      setPromoError('Failed to validate promo code')
    } finally {
      setPromoLoading(false)
    }
  }

  const handlePurchase = async () => {
    if (!selectedCardId) return
    setPurchasing(true)
    setPurchaseError(null)

    try {
      const session = await supabase.auth.getSession()
      // Purchase one at a time for each quantity unit
      for (let i = 0; i < quantity; i++) {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/stripe-billing`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.data.session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'purchase-credits',
            price_id: PACK.priceId,
            payment_method_id: selectedCardId,
            ...(i === 0 && promoResult?.valid ? { promo_code: promoCode.trim() } : {}),
          }),
        })

        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || 'Purchase failed')
        }
      }

      setQuantity(1)
      setPromoCode('')
      setPromoResult(null)
      setShowPromo(false)
      onPurchaseComplete()
    } catch (err: unknown) {
      setPurchaseError(err instanceof Error ? err.message : 'Purchase failed')
    } finally {
      setPurchasing(false)
    }
  }

  if (cards.length > 0 && !cards.find((c) => c.stripe_payment_method_id === selectedCardId)) {
    const def = cards.find((c) => c.is_default)
    setSelectedCardId(def?.stripe_payment_method_id || cards[0]?.stripe_payment_method_id || '')
  }

  return (
    <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-[13px] font-medium text-gray-900">Buy Credits</h2>
        <p className="text-[12px] text-gray-400 mt-0.5">
          1 lookup = 3 credits &middot; Credits never expire
        </p>
      </div>

      <div className="p-6 space-y-5">
        {/* Line item table */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1fr_auto_auto] items-center px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-[11px] font-medium text-gray-500 uppercase tracking-wide">
            <span>Item</span>
            <span className="text-center w-28">Qty</span>
            <span className="text-right w-20">Price</span>
          </div>

          {/* Pack row */}
          <div className="grid grid-cols-[1fr_auto_auto] items-center px-4 py-4">
            <div>
              <div className="text-[13px] font-medium text-gray-900">{PACK.name}</div>
              <div className="text-[12px] text-gray-400">
                {totalCredits.toLocaleString()} credits &middot; {totalLookups.toLocaleString()} lookups
              </div>
            </div>

            {/* Quantity toggle */}
            <div className="flex items-center gap-0 border border-gray-200 rounded-lg overflow-hidden w-28 justify-center">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-black hover:bg-gray-50 disabled:opacity-30 transition-colors"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-10 text-center text-[14px] font-semibold font-mono text-gray-900">{quantity}</span>
              <button
                onClick={() => setQuantity(Math.min(20, quantity + 1))}
                disabled={quantity >= 20}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-black hover:bg-gray-50 disabled:opacity-30 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="text-right w-20">
              <span className="text-[14px] font-semibold font-mono text-gray-900">${subtotal}</span>
            </div>
          </div>
        </div>

        {/* Payment method */}
        {cards.length > 0 ? (
          <div>
            <label className="text-[11px] font-medium text-gray-500 uppercase tracking-[0.05em] mb-1.5 block">
              Payment Method
            </label>
            <div className="relative">
              <select
                value={selectedCardId}
                onChange={(e) => setSelectedCardId(e.target.value)}
                className="appearance-none w-full pl-4 pr-10 h-10 border border-gray-200 rounded-lg bg-white text-[13px] text-gray-900 cursor-pointer focus:outline-none focus:ring-2 focus:ring-black/5"
              >
                {cards.map((c) => (
                  <option key={c.stripe_payment_method_id} value={c.stripe_payment_method_id}>
                    {c.brand.charAt(0).toUpperCase() + c.brand.slice(1)} ···· {c.last4}
                    {c.is_default ? ' (Default)' : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        ) : (
          <div className="text-[13px] text-gray-500 p-3 bg-gray-50 rounded-lg">
            Add a payment method above before purchasing.
          </div>
        )}

        {/* Promo code toggle + input */}
        {!showPromo ? (
          <button
            onClick={() => setShowPromo(true)}
            className="text-[12px] text-gray-400 hover:text-gray-600 transition-colors"
          >
            Have a promo code?
          </button>
        ) : (
          <div>
            <label className="text-[11px] font-medium text-gray-500 uppercase tracking-[0.05em] mb-1.5 block">
              Promo Code
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => {
                    setPromoCode(e.target.value.toUpperCase())
                    setPromoResult(null)
                    setPromoError(null)
                  }}
                  placeholder="Enter code"
                  className="w-full pl-9 pr-4 h-10 border border-gray-200 rounded-lg text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/5 placeholder:text-gray-300"
                />
              </div>
              <Button
                variant="outline"
                onClick={handleValidatePromo}
                disabled={!promoCode.trim() || promoLoading}
                className="h-10 text-[13px] px-4"
              >
                {promoLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Apply'}
              </Button>
            </div>
            {promoResult?.valid && (
              <p className="text-[12px] mt-1.5 flex items-center gap-1" style={{ color: '#65a30d' }}>
                <Check className="w-3 h-3" />
                {promoResult.name || 'Promo applied'}
                {promoResult.discount_percent
                  ? ` — ${promoResult.discount_percent}% off`
                  : promoResult.discount_amount
                    ? ` — $${(promoResult.discount_amount / 100).toFixed(2)} off`
                    : ''}
              </p>
            )}
            {promoError && (
              <p className="text-[12px] text-red-500 mt-1.5">{promoError}</p>
            )}
          </div>
        )}

        {purchaseError && (
          <div className="text-[13px] text-red-600 p-3 bg-red-50 rounded-lg">
            {purchaseError}
          </div>
        )}

      </div>

      {/* Checkout gutter with total */}
      <div className="bg-gray-50 rounded-lg mx-6 mb-6 px-5 pt-4 pb-6 space-y-4">
        <div className="flex items-center justify-between py-2">
          <span className="text-[16px] font-semibold text-gray-900">Total</span>
          <div className="flex items-baseline gap-2">
            <span className="text-[11px] font-medium text-black px-2.5 py-1 rounded-full" style={{ backgroundColor: '#B3FD00' }}>{totalCredits.toLocaleString()} credits</span>
            <span className="text-[24px] font-semibold font-mono text-black">
              {promoResult?.valid ? (
                <>
                  <span className="line-through text-gray-300 text-[14px] mr-2">${subtotal.toFixed(2)}</span>
                  ${total.toFixed(2)}
                </>
              ) : (
                `$${subtotal.toFixed(2)}`
              )}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-gray-400">You'll review your order before being charged</span>
          <Button
            onClick={() => setShowConfirm(true)}
            disabled={cards.length === 0 || !selectedCardId}
            className="bg-black text-white hover:bg-gray-900 rounded-lg px-6 py-2.5 text-[13px] h-10 font-medium"
          >
            Go to Checkout
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>

      {/* Confirmation Modal */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="max-w-[400px] rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[16px]">Confirm Purchase</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-2">
                <div className="border border-gray-200 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-[13px]">
                    <span className="text-gray-500">{PACK.name} &times; {quantity}</span>
                    <span className="font-medium text-gray-900">{totalCredits.toLocaleString()} credits</span>
                  </div>
                  <div className="flex justify-between text-[13px]">
                    <span className="text-gray-500">{totalLookups.toLocaleString()} lookups</span>
                    <span className="font-semibold text-black">
                      {promoResult?.valid && total !== subtotal ? (
                        <>
                          <span className="line-through text-gray-300 font-normal mr-1">${subtotal.toFixed(2)}</span>
                          ${total.toFixed(2)}
                        </>
                      ) : (
                        `$${subtotal.toFixed(2)}`
                      )}
                    </span>
                  </div>
                  {(() => {
                    const card = cards.find(c => c.stripe_payment_method_id === selectedCardId)
                    return card ? (
                      <div className="flex justify-between text-[12px] pt-1 border-t border-gray-100">
                        <span className="text-gray-400">Payment</span>
                        <span className="text-gray-500">{card.brand.charAt(0).toUpperCase() + card.brand.slice(1)} ···· {card.last4}</span>
                      </div>
                    ) : null
                  })()}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel className="rounded-lg text-[13px]" disabled={purchasing}>Cancel</AlertDialogCancel>
            <Button
              onClick={async () => {
                await handlePurchase()
                setShowConfirm(false)
              }}
              disabled={purchasing}
              className="bg-black text-white hover:bg-gray-900 rounded-lg text-[13px]"
            >
              {purchasing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                `Confirm Purchase for $${total.toFixed(2)}`
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default PurchaseCreditsPanel
