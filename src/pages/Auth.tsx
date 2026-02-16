import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
    // Check URL params to determine initial view
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
    <div className="min-h-screen flex items-center justify-center bg-[#f9f9f9] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <img
            src="/aurora-logo-black.png"
            alt="Aurora"
            className="h-8 w-auto mx-auto mb-6"
          />
          <h2 className="mt-6 text-3xl font-heading font-bold text-primary-black">
            {view === 'sign_up' ? 'Get Started with Aurora Carbon' : 'Welcome Back'}
          </h2>
          <p className="mt-2 text-sm text-detail-gray font-sans">
            {view === 'sign_up'
              ? 'Create your account to access carbon emissions data'
              : 'Sign in to access your API dashboard'
            }
          </p>
        </div>

        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="font-heading text-primary-black">
              {view === 'sign_up' ? 'Create Account' : 'Sign In'}
            </CardTitle>
            <CardDescription className="font-sans text-detail-gray">
              {view === 'sign_up'
                ? 'Choose your preferred sign-up method'
                : 'Choose your preferred sign-in method'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Auth
              supabaseClient={supabase}
              view={view}
              appearance={{
                theme: ThemeSupa,
                variables: {
                  default: {
                    colors: {
                      brand: '#000000',
                      brandAccent: '#808080',
                    },
                    fonts: {
                      bodyFontFamily: 'Inter, sans-serif',
                      buttonFontFamily: 'Inter, sans-serif',
                      inputFontFamily: 'Inter, sans-serif',
                      labelFontFamily: 'Inter, sans-serif',
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
              <p className="text-sm text-detail-gray font-sans">
                {view === 'sign_up' ? 'Already have an account?' : "Don't have an account yet?"}
              </p>
              <Button
                variant="link"
                onClick={toggleView}
                className="text-primary-black hover:text-detail-gray p-0 h-auto font-heading font-medium"
              >
                {view === 'sign_up' ? 'Sign in' : 'Sign up'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default AuthPage
