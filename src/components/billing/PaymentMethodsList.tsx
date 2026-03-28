import { CreditCard, Plus, Star, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface Card {
  stripe_payment_method_id: string
  brand: string
  last4: string
  exp_month: number
  exp_year: number
  is_default: boolean
}

interface PaymentMethodsListProps {
  cards: Card[]
  loading: boolean
  onRemove: (id: string) => void
  onSetDefault: (id: string) => void
  onAddCard: () => void
}

function brandLabel(brand: string): string {
  const map: Record<string, string> = {
    visa: 'Visa',
    mastercard: 'Mastercard',
    amex: 'Amex',
    discover: 'Discover',
    diners: 'Diners Club',
    jcb: 'JCB',
    unionpay: 'UnionPay',
  }
  return map[brand.toLowerCase()] || brand.charAt(0).toUpperCase() + brand.slice(1)
}

const PaymentMethodsList = ({ cards, loading, onRemove, onSetDefault, onAddCard }: PaymentMethodsListProps) => {
  const handleRemove = (card: Card) => {
    if (card.is_default) {
      window.confirm('This is your default payment method. Remove it anyway?') && onRemove(card.stripe_payment_method_id)
    } else {
      window.confirm(`Remove card ending in ${card.last4}?`) && onRemove(card.stripe_payment_method_id)
    }
  }

  return (
    <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-[13px] font-medium text-gray-900">Payment Methods</h2>
        <p className="text-[12px] text-gray-400 mt-0.5">Manage your saved cards</p>
      </div>

      {loading ? (
        <div className="p-6 space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-14 bg-gray-50 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : cards.length === 0 ? (
        <div className="p-12 text-center">
          <CreditCard className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-[13px] text-gray-500 mb-4">No payment methods on file</p>
          <Button
            onClick={onAddCard}
            className="bg-black text-white hover:bg-gray-900 rounded-full px-6 py-2.5"
          >
            <Plus className="w-3.5 h-3.5 mr-2" />
            Add Card
          </Button>
        </div>
      ) : (
        <>
          <div className="divide-y divide-gray-50">
            {cards.map((card) => (
              <div
                key={card.stripe_payment_method_id}
                className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center bg-gray-50">
                    <CreditCard className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-gray-900">
                        {brandLabel(card.brand)} &bull;&bull;&bull;&bull; {card.last4}
                      </span>
                      {card.is_default && (
                        <span
                          className="text-[10px] font-bold uppercase tracking-[0.06em] px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: '#B3FD00', color: '#000' }}
                        >
                          Default
                        </span>
                      )}
                    </div>
                    <span className="text-[12px] text-gray-400">
                      Expires {String(card.exp_month).padStart(2, '0')}/{String(card.exp_year).slice(-2)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {!card.is_default && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onSetDefault(card.stripe_payment_method_id)}
                      className="text-gray-500 hover:text-black h-8 text-[12px]"
                    >
                      <Star className="w-3.5 h-3.5 mr-1" />
                      Set Default
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(card)}
                    className="text-gray-400 hover:text-red-600 h-8"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/30">
            <Button
              variant="ghost"
              size="sm"
              onClick={onAddCard}
              className="text-gray-600 hover:text-black h-8 text-[12px]"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add Card
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

export default PaymentMethodsList
