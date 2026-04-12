import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { ArrowRight, Zap, CreditCard, Code2 } from 'lucide-react'

const Onboarding = () => {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [completing, setCompleting] = useState(false)

  if (loading) return null

  if (!user) {
    navigate('/auth')
    return null
  }

  const handleContinue = async () => {
    setCompleting(true)
    await supabase
      .from('profiles')
      .update({ onboarding_completed: true })
      .eq('user_id', user.id)
    navigate('/dashboard#playground')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full space-y-8">
        <div className="text-center">
          <img
            src="/aurora-logo-black.png"
            alt="Aurora"
            className="h-8 w-auto mx-auto mb-6"
          />
          <h1 className="text-[36px] font-semibold tracking-[-0.02em] leading-[1.2] text-gray-900">
            Welcome to Aurora
          </h1>
          <p className="mt-3 text-[15px] text-gray-500 leading-relaxed">
            You're all set. Here's what you need to know to get started.
          </p>
        </div>

        {/* Gift banner */}
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-5 flex items-center gap-4" style={{ backgroundColor: '#f7ffe6' }}>
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: '#B3FD00' }}
            >
              <Zap className="w-5 h-5 text-black" />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-gray-900">
                10 free lookups on us
              </p>
              <p className="text-[13px] text-gray-500 mt-0.5">
                We've added 30 credits to your account — enough for 10 company lookups. No card required.
              </p>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="border border-gray-200 rounded-xl p-6 space-y-5">
          <h2 className="text-[14px] font-semibold text-gray-900 uppercase tracking-wide">How it works</h2>

          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
              <Code2 className="w-4 h-4 text-gray-600" />
            </div>
            <div>
              <p className="text-[14px] font-medium text-gray-900">Look up any company</p>
              <p className="text-[13px] text-gray-500 mt-0.5">
                Enter a company domain (e.g. apple.com) and get their latest greenhouse gas emissions data — scopes 1, 2, and 3.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4 text-gray-600" />
            </div>
            <div>
              <p className="text-[14px] font-medium text-gray-900">3 credits per lookup</p>
              <p className="text-[13px] text-gray-500 mt-0.5">
                Each API call costs 3 credits. You only get charged for successful lookups — if we don't have data, you keep your credits.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-4 h-4 text-gray-600" />
            </div>
            <div>
              <p className="text-[14px] font-medium text-gray-900">Buy more when you need them</p>
              <p className="text-[13px] text-gray-500 mt-0.5">
                Credit packs start at $20 for 40 lookups. Credits never expire.
              </p>
            </div>
          </div>
        </div>

        <Button
          onClick={handleContinue}
          disabled={completing}
          className="w-full bg-black text-white hover:bg-gray-800 h-12 text-[15px] font-medium rounded-xl"
        >
          Try your first lookup
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}

export default Onboarding
