import { useState, useEffect, useRef } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Loader2, AlertCircle } from 'lucide-react'

const STRIPE_PK = 'pk_test_51LiPMBKGTy4BfEAsmMC56JWFtmQPbLjhAXtcDfZVD1j2XuK3uXlpuaa30ylm0KHcn9MX3nnfKI8oIpBOVBBTEker00oGZlZw5M'
const SUPABASE_URL = 'https://kfuuqxmaihlwhzfibhvj.supabase.co'

const stripePromise = loadStripe(STRIPE_PK)

interface AddCardFormProps {
  onSuccess: () => void
  onCancel: () => void
}

// Inner form rendered inside <Elements>
function CardForm({ onSuccess, onCancel }: AddCardFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setLoading(true)
    setError(null)

    try {
      const { error: submitError } = await elements.submit()
      if (submitError) {
        setError(submitError.message || 'Validation failed')
        setLoading(false)
        return
      }

      const { error: confirmError, setupIntent } = await stripe.confirmSetup({
        elements,
        redirect: 'if_required',
        confirmParams: {
          return_url: window.location.href,
        },
      })

      if (confirmError) {
        setError(confirmError.message || 'Failed to save card')
        setLoading(false)
        return
      }

      if (setupIntent && setupIntent.status === 'succeeded') {
        // Attach the payment method to the customer via our Edge Function
        const session = await supabase.auth.getSession()
        const res = await fetch(`${SUPABASE_URL}/functions/v1/stripe-billing`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.data.session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'add-card',
            payment_method_id: setupIntent.payment_method,
          }),
        })

        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || 'Failed to save card')
        }

        onSuccess()
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4">
        <PaymentElement
          options={{
            layout: 'tabs',
          }}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-[13px] mb-4 p-3 bg-red-50 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={loading}
          className="text-[13px]"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!stripe || loading}
          className="bg-black text-white hover:bg-gray-900 rounded-full px-6 py-2.5 text-[13px]"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Card'
          )}
        </Button>
      </div>
    </form>
  )
}

// Wrapper that fetches SetupIntent and provides Elements
const AddCardForm = ({ onSuccess, onCancel }: AddCardFormProps) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [fetching, setFetching] = useState(true)
  const abortRef = useRef<AbortController | null>(null)

  const fetchSetupIntent = async () => {
    // Cancel any in-flight request
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setFetching(true)
    setFetchError(null)
    try {
      const session = await supabase.auth.getSession()
      const res = await fetch(`${SUPABASE_URL}/functions/v1/stripe-billing`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.data.session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'setup-intent' }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to initialize card setup')
      }

      const data = await res.json()
      if (!controller.signal.aborted) {
        setClientSecret(data.client_secret)
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setFetchError(err instanceof Error ? err.message : 'Failed to initialize')
    } finally {
      if (!controller.signal.aborted) {
        setFetching(false)
      }
    }
  }

  // Fetch on mount, cleanup on unmount
  useEffect(() => {
    fetchSetupIntent()
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  if (fetchError) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-red-600 text-[13px] mb-4 p-3 bg-red-50 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{fetchError}</span>
        </div>
        <div className="flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={onCancel} className="text-[13px]">
            Cancel
          </Button>
          <Button
            onClick={fetchSetupIntent}
            className="bg-black text-white hover:bg-gray-900 rounded-full px-6 py-2.5 text-[13px]"
          >
            Retry
          </Button>
        </div>
      </div>
    )
  }

  if (fetching || !clientSecret) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        <span className="ml-2 text-[13px] text-gray-500">Initializing...</span>
      </div>
    )
  }

  return (
    <div className="p-6">
      <Elements
        stripe={stripePromise}
        options={{
          clientSecret,
          appearance: {
            theme: 'stripe',
            variables: {
              colorPrimary: '#000000',
              borderRadius: '8px',
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSizeBase: '13px',
            },
          },
        }}
      >
        <CardForm onSuccess={onSuccess} onCancel={onCancel} />
      </Elements>
    </div>
  )
}

export default AddCardForm
