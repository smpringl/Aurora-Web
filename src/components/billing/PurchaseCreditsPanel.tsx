import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Check, ChevronDown, Loader2, Tag, Zap, Rocket } from 'lucide-react'
import type { Card } from './PaymentMethodsList'

const SUPABASE_URL = 'https://kfuuqxmaihlwhzfibhvj.supabase.co'

interface Pack {
  id: string
  priceId: string
  name: string
  price: number
  credits: number
  lookups: number
  badge: string | null
  icon: typeof Zap
}

const PACKS: Pack[] = [
  {
    id: 'starter',
    priceId: 'price_1TDlfXKGTy4BfEAsATcrEiJo',
    name: 'Starter Pack',
    price: 20,
    credits: 120,
    lookups: 40,
    badge: null,
    icon: Zap,
  },
  {
    id: 'growth',
    priceId: 'price_1TDlfZKGTy4BfEAsDmFlTS2u',
    name: 'Growth Pack',
    price: 250,
    credits: 5400,
    lookups: 1800,
    badge: 'Best Value',
    icon: Rocket,
  },
]

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
  const [selectedPack, setSelectedPack] = useState<string | null>(null)
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

  const pack = PACKS.find((p) => p.id === selectedPack)

  const computeTotal = () => {
    if (!pack) return 0
    if (promoResult?.valid) {
      if (promoResult.discount_percent) {
        return pack.price * (1 - promoResult.discount_percent / 100)
      }
      if (promoResult.discount_amount) {
        return Math.max(0, pack.price - promoResult.discount_amount / 100)
      }
    }
    return pack.price
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
        body: JSON.stringify({ action: 'validate-promo', code: promoCode.trim(), price_id: pack?.priceId }),
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
    if (!pack || !selectedCardId) return
    setPurchasing(true)
    setPurchaseError(null)

    try {
      const session = await supabase.auth.getSession()
      const res = await fetch(`${SUPABASE_URL}/functions/v1/stripe-billing`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.data.session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'purchase-credits',
          price_id: pack.priceId,
          payment_method_id: selectedCardId,
          ...(promoResult?.valid ? { promo_code: promoCode.trim() } : {}),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Purchase failed')
      }

      // Reset state
      setSelectedPack(null)
      setPromoCode('')
      setPromoResult(null)
      onPurchaseComplete()
    } catch (err: unknown) {
      setPurchaseError(err instanceof Error ? err.message : 'Purchase failed')
    } finally {
      setPurchasing(false)
    }
  }

  // Update selected card when cards list changes
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

      {/* Pack selection */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {PACKS.map((p) => {
            const isSelected = selectedPack === p.id
            const Icon = p.icon
            return (
              <button
                key={p.id}
                onClick={() => {
                  setSelectedPack(isSelected ? null : p.id)
                  setPurchaseError(null)
                }}
                className={`relative text-left p-5 rounded-xl border-2 transition-all ${
                  isSelected
                    ? 'border-black bg-gray-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                {p.badge && (
                  <span
                    className="absolute -top-2.5 right-4 text-[10px] font-bold uppercase tracking-[0.06em] px-2.5 py-0.5 rounded-full"
                    style={{ backgroundColor: '#B3FD00', color: '#000' }}
                  >
                    {p.badge}
                  </span>
                )}

                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: isSelected ? '#B3FD00' : '#f3f4f6' }}
                  >
                    <Icon className="w-4 h-4 text-black" />
                  </div>
                  <span className="text-[14px] font-semibold text-gray-900">{p.name}</span>
                </div>

                <div className="text-[28px] font-semibold font-mono text-black tracking-[-0.02em] leading-none mb-2">
                  ${p.price}
                </div>
                <div className="text-[12px] text-gray-500">
                  {p.credits.toLocaleString()} credits &middot; {p.lookups.toLocaleString()} lookups
                </div>

                {isSelected && (
                  <div className="absolute top-4 right-4">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: '#000' }}
                    >
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Checkout section (visible when pack selected) */}
        {selectedPack && pack && (
          <div className="border border-gray-200 rounded-xl p-5 space-y-4">
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
                        {c.brand.charAt(0).toUpperCase() + c.brand.slice(1)} ····{' '}
                        {c.last4}
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

            {/* Promo code */}
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

            {/* Total line */}
            <div className="border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[13px] text-gray-600">{pack.name}</span>
                <span className="text-[13px] text-gray-600">
                  {promoResult?.valid ? (
                    <>
                      <span className="line-through text-gray-400 mr-2">${pack.price.toFixed(2)}</span>
                      <span className="font-semibold text-black">${total.toFixed(2)}</span>
                    </>
                  ) : (
                    <span className="font-semibold text-black">${pack.price.toFixed(2)}</span>
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-gray-400">
                  {pack.credits.toLocaleString()} credits &middot;{' '}
                  {pack.lookups.toLocaleString()} lookups
                </span>
              </div>
            </div>

            {purchaseError && (
              <div className="text-[13px] text-red-600 p-3 bg-red-50 rounded-lg">
                {purchaseError}
              </div>
            )}

            {/* Confirm button */}
            <Button
              onClick={handlePurchase}
              disabled={purchasing || cards.length === 0 || !selectedCardId}
              className="w-full bg-black text-white hover:bg-gray-900 rounded-full px-6 py-2.5 text-[13px] h-11"
            >
              {purchasing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                `Confirm Purchase — $${total.toFixed(2)}`
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default PurchaseCreditsPanel
