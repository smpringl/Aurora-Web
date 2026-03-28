import { Wallet } from 'lucide-react'

interface CreditBalanceCardProps {
  balance: number
  loading: boolean
}

const CREDITS_PER_LOOKUP = 3
const GROWTH_RATE = 250 / 1800 // dollars per lookup at Growth pack rate

const CreditBalanceCard = ({ balance, loading }: CreditBalanceCardProps) => {
  const lookups = Math.floor(balance / CREDITS_PER_LOOKUP)
  const dollarValue = lookups * GROWTH_RATE

  return (
    <div className="border border-gray-200 rounded-xl bg-white p-6">
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: '#B3FD00' }}
        >
          <Wallet className="w-4 h-4 text-black" />
        </div>
        <span className="text-[13px] font-medium text-gray-500 uppercase tracking-[0.05em]">
          Credit Balance
        </span>
      </div>
      {loading ? (
        <div className="h-12 w-32 bg-gray-100 rounded animate-pulse" />
      ) : (
        <>
          <div className="text-[48px] font-semibold font-mono text-black tracking-[-0.03em] leading-none">
            ${dollarValue.toFixed(0)}
          </div>
          <div className="text-[14px] text-gray-400 mt-2 font-mono">
            {balance.toLocaleString()} credits remaining &middot; {lookups.toLocaleString()} lookups
          </div>
        </>
      )}
    </div>
  )
}

export default CreditBalanceCard
