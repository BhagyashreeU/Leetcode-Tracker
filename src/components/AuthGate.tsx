import type { Session } from '@supabase/supabase-js'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { supabase } from '../data/store'

/** Requires a Supabase sign-in (email magic link). Passes through in demo mode. */
export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(supabase ? undefined : null)

  useEffect(() => {
    if (!supabase) return
    void supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (!supabase) return <>{children}</>
  if (session === undefined) return null
  if (!session) return <SignIn />
  return <>{children}</>
}

function SignIn() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const { error } = await supabase!.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) setError(error.message)
    else setSent(true)
  }

  return (
    <main className="mx-auto mt-24 max-w-sm px-4">
      <h1 className="text-2xl font-semibold text-slate-900">LeetCode Tracker</h1>
      {sent ? (
        <p className="mt-4 text-slate-600">Check {email} for a sign-in link.</p>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
          <button className="w-full rounded-lg bg-slate-900 px-3 py-2 font-medium text-white">Email me a sign-in link</button>
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </form>
      )}
    </main>
  )
}
