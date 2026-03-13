import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'

const AuthPage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [view, setView] = useState<'sign_up' | 'sign_in'>('sign_up')

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

  const toggleView = () => {
    setView(view === 'sign_up' ? 'sign_in' : 'sign_up')
  }

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
            {view === 'sign_up' ? 'Get Started with Aurora' : 'Welcome Back'}
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            {view === 'sign_up'
              ? 'Create your account to access carbon emissions data'
              : 'Sign in to access your API dashboard'
            }
          </p>
        </div>

        <div className="border border-gray-200 rounded-xl p-8 bg-white">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {view === 'sign_up' ? 'Create Account' : 'Sign In'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {view === 'sign_up'
                ? 'Choose your preferred sign-up method'
                : 'Choose your preferred sign-in method'
              }
            </p>
          </div>
          <Auth
            supabaseClient={supabase}
            view={view}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#000000',
                    brandAccent: '#404040',
                  },
                  fonts: {
                    bodyFontFamily: 'Inter, -apple-system, sans-serif',
                    buttonFontFamily: 'Inter, -apple-system, sans-serif',
                    inputFontFamily: 'Inter, -apple-system, sans-serif',
                    labelFontFamily: 'Inter, -apple-system, sans-serif',
                  },
                },
              },
            }}
            providers={['google']}
            redirectTo={`${window.location.origin}/dashboard`}
            theme="light"
            showLinks={false}
          />

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
        </div>
      </div>
    </div>
  )
}

export default AuthPage
