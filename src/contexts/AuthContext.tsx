import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signOut: () => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: () => {}
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Read the cached Supabase session from localStorage synchronously.
// If it exists, we can render the dashboard immediately instead of showing
// a loading screen while getSession() makes a network call.
function getCachedUser(): User | null {
  try {
    const raw = localStorage.getItem('sb-kfuuqxmaihlwhzfibhvj-auth-token')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.user ?? null
  } catch {
    return null
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const cachedUser = useRef(getCachedUser())
  const [user, setUser] = useState<User | null>(cachedUser.current)
  const [session, setSession] = useState<Session | null>(null)
  // Skip the loading screen entirely if we have a cached session
  const [loading, setLoading] = useState(!cachedUser.current)
  const initializedRef = useRef(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Ignore INITIAL_SESSION — let getSession() handle initial auth
        if (event === 'INITIAL_SESSION') return

        setSession(session)
        setUser(session?.user ?? null)

        if (event === 'SIGNED_IN' && session?.user) {
          try {
            await supabase
              .from('profiles')
              .upsert({
                user_id: session.user.id,
                email: session.user.email || ''
              })
          } catch (error) {
            console.error('Error upserting profile:', error)
          }
        }

        if (event === 'SIGNED_OUT') {
          window.location.href = '/auth?mode=signin'
        }
      }
    )

    // Refresh the session in the background
    const timeout = setTimeout(() => {
      if (!initializedRef.current) {
        initializedRef.current = true
        setLoading(false)
      }
    }, 5000)

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeout)
      if (!initializedRef.current) {
        initializedRef.current = true
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      }
    }).catch(() => {
      clearTimeout(timeout)
      if (!initializedRef.current) {
        initializedRef.current = true
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = () => {
    supabase.auth.signOut().catch(() => {})
    localStorage.removeItem('sb-kfuuqxmaihlwhzfibhvj-auth-token')
    window.location.href = '/auth?mode=signin'
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
