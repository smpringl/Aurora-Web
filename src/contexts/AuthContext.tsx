import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'
import { showError } from '@/utils/toast'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {}
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

        if (event === 'SIGNED_IN' && session?.user) {
          // Upsert profile on sign in
          try {
            const { error } = await supabase
              .from('profiles')
              .upsert({
                user_id: session.user.id,
                email: session.user.email || ''
              })

            if (error) {
              console.error('Error upserting profile:', error)
              showError('Error creating user profile')
            }
          } catch (error) {
            console.error('Error upserting profile:', error)
            showError('Error creating user profile')
          }
        }

        // Redirect to sign-in page after sign out
        if (event === 'SIGNED_OUT') {
          window.location.href = '/auth?mode=signin'
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        showError('Error signing out')
      }
      // The redirect will be handled by the auth state change listener
    } catch {
      showError('Error signing out')
    }
  }

  const value = {
    user,
    session,
    loading,
    signOut
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
