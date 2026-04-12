import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

const TURNSTILE_SITE_KEY = '0x4AAAAAAC2IjTG7p5ZWj4mj'

// Disposable/temporary email providers — block signup abuse
const DISPOSABLE_DOMAINS = new Set([
  'guerrillamail.com','guerrillamail.net','guerrillamail.org','guerrillamail.de',
  'tempmail.com','temp-mail.org','temp-mail.io','tempail.com',
  'throwaway.email','throwaway.com','throwamail.com',
  'mailinator.com','mailinator.net','mailinator2.com',
  'yopmail.com','yopmail.fr','yopmail.net',
  'sharklasers.com','guerrillamailblock.com','grr.la','dispostable.com',
  'maildrop.cc','mailnesia.com','mailcatch.com','trashmail.com','trashmail.net',
  'trashmail.me','fakeinbox.com','mailnull.com','discard.email',
  'getnada.com','nada.email','tempinbox.com','burnermail.io',
  'harakirimail.com','mailscrap.com','mohmal.com',
  '10minutemail.com','10minutemail.net','minutemail.com',
  'emailondeck.com','emailfake.com','crazymailing.com',
  'tmail.ws','tmpmail.net','tmpmail.org','moakt.cc','moakt.ws',
  'inboxkitten.com','33mail.com','mailtothis.com',
  'mailsac.com','mytemp.email','tempmailo.com',
  'internxt.com','duck.com',
])

function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase()
  return domain ? DISPOSABLE_DOMAINS.has(domain) : false
}

const AuthPage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [view, setView] = useState<'sign_up' | 'sign_in' | 'forgot_password'>('sign_up')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const turnstileRef = useRef<TurnstileInstance>(null)

  useEffect(() => {
    if (user) {
      navigate('/dashboard')
    }
  }, [user, navigate])

  useEffect(() => {
    const mode = searchParams.get('mode')
    if (mode === 'signin') {
      setView('sign_in')
    } else {
      setView('sign_up')
    }
  }, [searchParams])

  const resetForm = () => {
    setError(null)
    setMessage(null)
    setCaptchaToken(null)
    turnstileRef.current?.reset()
  }

  const toggleView = () => {
    resetForm()
    setView(view === 'sign_up' ? 'sign_in' : 'sign_up')
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isDisposableEmail(email)) {
      setError('Please use a permanent email address — temporary emails are not allowed')
      return
    }
    if (!captchaToken) {
      setError('Please complete the verification')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Password must include uppercase, lowercase, and a number')
      return
    }

    setLoading(true)
    setError(null)

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        captchaToken,
        emailRedirectTo: `${window.location.origin}/onboarding`,
      },
    })

    setLoading(false)
    setCaptchaToken(null)
    turnstileRef.current?.reset()

    if (signUpError) {
      setError(signUpError.message)
    } else {
      setMessage('Check your email for a confirmation link to activate your account.')
    }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!captchaToken) {
      setError('Please complete the verification')
      return
    }

    setLoading(true)
    setError(null)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: { captchaToken },
    })

    setLoading(false)
    setCaptchaToken(null)
    turnstileRef.current?.reset()

    if (signInError) {
      setError(signInError.message)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!captchaToken) {
      setError('Please complete the verification')
      return
    }

    setLoading(true)
    setError(null)

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/dashboard#settings`,
      captchaToken,
    })

    setLoading(false)
    setCaptchaToken(null)
    turnstileRef.current?.reset()

    if (resetError) {
      setError(resetError.message)
    } else {
      setMessage('If an account exists with that email, you will receive a password reset link.')
    }
  }

  const headings: Record<string, { title: string; subtitle: string; formTitle: string; formSubtitle: string }> = {
    sign_up: {
      title: 'Get Started with Aurora',
      subtitle: 'Create your account to access carbon emissions data',
      formTitle: 'Create Account',
      formSubtitle: 'Enter your email and choose a password',
    },
    sign_in: {
      title: 'Welcome Back',
      subtitle: 'Sign in to access your API dashboard',
      formTitle: 'Sign In',
      formSubtitle: 'Enter your credentials to continue',
    },
    forgot_password: {
      title: 'Reset Password',
      subtitle: 'Enter your email to receive a reset link',
      formTitle: 'Forgot Password',
      formSubtitle: "We'll send you a link to reset your password",
    },
  }

  const h = headings[view]

  return (
    <div className="min-h-screen flex items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <img
            src="/aurora-logo-black.png"
            alt="Aurora"
            className="h-8 w-auto mx-auto mb-6"
          />
          <h2 className="mt-6 text-[36px] font-semibold tracking-[-0.02em] leading-[1.2] text-gray-900">
            {h.title}
          </h2>
          <p className="mt-2 text-sm text-gray-500">{h.subtitle}</p>
        </div>

        <div className="border border-gray-200 rounded-xl p-8 bg-white">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900">{h.formTitle}</h3>
            <p className="text-sm text-gray-500 mt-1">{h.formSubtitle}</p>
          </div>

          {message ? (
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
              <p className="text-sm text-gray-700">{message}</p>
              <button
                onClick={() => { resetForm(); setView('sign_in') }}
                className="text-sm font-medium text-black hover:text-gray-600 mt-3"
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={view === 'sign_up' ? handleSignUp : view === 'sign_in' ? handleSignIn : handleForgotPassword}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email" className="text-sm text-gray-700">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="mt-1 border-gray-200"
                    placeholder="you@company.com"
                  />
                </div>

                {view !== 'forgot_password' && (
                  <div>
                    <Label htmlFor="password" className="text-sm text-gray-700">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete={view === 'sign_up' ? 'new-password' : 'current-password'}
                      className="mt-1 border-gray-200"
                      placeholder={view === 'sign_up' ? 'Min 8 chars, uppercase, lowercase, number' : ''}
                    />
                  </div>
                )}

                {view === 'sign_up' && (
                  <div>
                    <Label htmlFor="confirm-password" className="text-sm text-gray-700">Confirm password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      className="mt-1 border-gray-200"
                    />
                  </div>
                )}

                {view === 'sign_in' && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => { resetForm(); setView('forgot_password') }}
                      className="text-[13px] text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                <div className="flex justify-center">
                  <Turnstile
                    ref={turnstileRef}
                    siteKey={TURNSTILE_SITE_KEY}
                    onSuccess={(token) => setCaptchaToken(token)}
                    onExpire={() => setCaptchaToken(null)}
                    options={{ theme: 'light', size: 'normal' }}
                  />
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-100 p-3">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading || !captchaToken}
                  className="w-full bg-black text-white hover:bg-gray-800 h-10 text-sm font-medium"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : view === 'sign_up' ? 'Create Account' : view === 'sign_in' ? 'Sign In' : 'Send Reset Link'}
                </Button>
              </div>
            </form>
          )}

          {view !== 'forgot_password' && !message && (
            <div className="text-center pt-4">
              <p className="text-sm text-gray-500">
                {view === 'sign_up' ? 'Already have an account?' : "Don't have an account yet?"}
              </p>
              <Button
                variant="link"
                onClick={toggleView}
                className="text-black hover:text-gray-600 p-0 h-auto font-medium"
              >
                {view === 'sign_up' ? 'Sign in' : 'Sign up'}
              </Button>
            </div>
          )}

          {view === 'forgot_password' && !message && (
            <div className="text-center pt-4">
              <Button
                variant="link"
                onClick={() => { resetForm(); setView('sign_in') }}
                className="text-black hover:text-gray-600 p-0 h-auto font-medium"
              >
                Back to Sign In
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AuthPage
