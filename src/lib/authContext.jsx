import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const AuthContext = createContext({ session: null, user: null, loading: true })

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let sub
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session || null)
      setUser(session?.user || null)
      setLoading(false)

      const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
        setSession(newSession || null)
        setUser(newSession?.user || null)
      })
      sub = data?.subscription
    })()

    return () => sub?.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ session, user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
