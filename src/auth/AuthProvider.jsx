import { useEffect, useState } from 'react'
import { AuthContext } from './AuthContext'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profileRecord, setProfileRecord] = useState(null)
  const [profileErrorRecord, setProfileErrorRecord] = useState(null)
  const [authError, setAuthError] = useState('')
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const userId = session?.user?.id
  const profile =
    profileRecord && profileRecord.userId === userId ? profileRecord.data : null
  const profileError =
    profileErrorRecord && profileErrorRecord.userId === userId
      ? profileErrorRecord.message
      : ''

  useEffect(() => {
    if (!supabase) return undefined

    let mounted = true
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) {
        setSession(nextSession)
        setAuthError('')
      }
    })

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!mounted) return
        if (error) throw error
        setSession(data.session)
      })
      .catch((error) => {
        if (mounted) setAuthError(error.message)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!supabase || !userId) return undefined

    let mounted = true
    supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
      .then(({ data, error }) => {
        if (error) throw error
        if (mounted) {
          setProfileRecord({ userId, data })
          setProfileErrorRecord(null)
        }
      })
      .catch((error) => {
        if (mounted) setProfileErrorRecord({ userId, message: error.message })
      })

    return () => {
      mounted = false
    }
  }, [userId])

  async function signOut() {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  async function updateProfile(changes) {
    if (!supabase || !userId) throw new Error('Not signed in.')
    const { data, error } = await supabase
      .from('profiles')
      .update(changes)
      .eq('id', userId)
      .select()
      .single()
    if (error) throw error
    setProfileRecord({ userId, data })
    setProfileErrorRecord(null)
    return data
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        loading,
        profileError,
        authError,
        signOut,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
