import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  sessionReady: boolean
  signOut: () => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  sessionReady: false,
  signOut: () => {}
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

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
  const [loading, setLoading] = useState(!cachedUser.current)
  const [sessionReady, setSessionReady] = useState(false)
  const initializedRef = useRef(false)

  useEffect(() => {
    // Mark session ready as soon as we get ANY auth event with a session.
    // Profile upsert is fire-and-forget — never blocks state updates.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log('[Auth]', event, 'session?', !!newSession, 'initialized?', initializedRef.current)

        setSession(newSession)
        setUser(prev => {
          const newUser = newSession?.user ?? null
          if (prev?.id === newUser?.id) return prev
          return newUser
        })

        if (!initializedRef.current && newSession) {
          initializedRef.current = true
          setSessionReady(true)
          setLoading(false)
        }

        // Fire-and-forget profile upsert on sign in (not awaited)
        if (event === 'SIGNED_IN' && newSession?.user) {
          supabase
            .from('profiles')
            .upsert({
              user_id: newSession.user.id,
              email: newSession.user.email || ''
            })
            .then(null, (err: unknown) => console.error('Error upserting profile:', err))
        }

        if (event === 'SIGNED_OUT') {
          setSessionReady(false)
          window.location.href = '/auth?mode=signin'
        }
      }
    )

    // Safety timeout — if no auth event fires within 3 seconds, proceed anyway
    const timeout = setTimeout(() => {
      if (!initializedRef.current) {
        console.warn('[Auth] Timeout — no auth event received, proceeding without session')
        initializedRef.current = true
        setSessionReady(true)
        setLoading(false)
      }
    }, 3000)

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  const signOut = () => {
    supabase.auth.signOut().catch(() => {})
    localStorage.removeItem('sb-kfuuqxmaihlwhzfibhvj-auth-token')
    window.location.href = '/auth?mode=signin'
  }

  const value = useMemo(
    () => ({ user, session, loading, sessionReady, signOut }),
    [user, loading, sessionReady]
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
