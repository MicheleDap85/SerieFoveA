import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function LoginPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('login') // 'login' | 'signup' | 'reset'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [session, setSession] = useState(null)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data?.session ?? null)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => setSession(sess))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session) navigate('/', { replace: true })
  }, [session, navigate])

  const setMessage = (type, text) => setMsg({ type, text })

  async function onLogin(e) {
    e.preventDefault()
    setMsg(null)
    try {
      setSaving(true)
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    } catch (e) {
      setMessage('error', e?.message ?? 'Errore di accesso')
    } finally {
      setSaving(false)
    }
  }

  async function onSignup(e) {
    e.preventDefault()
    setMsg(null)
    try {
      if (!email || !password) throw new Error('Email e password sono obbligatorie')
      if (password.length < 6) throw new Error('La password deve avere almeno 6 caratteri')
      if (confirm !== password) throw new Error('Le password non coincidono')
      setSaving(true)
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
      setMessage('ok', 'Registrazione effettuata. Ora accedi.')
      setMode('login')
    } catch (e) {
      setMessage('error', e?.message ?? 'Errore di registrazione')
    } finally {
      setSaving(false)
    }
  }

  async function onReset(e) {
    e.preventDefault()
    setMsg(null)
    try {
      if (!email) throw new Error('Inserisci la tua email')
      setSaving(true)
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
      setMessage('ok', 'Email inviata: segui il link per impostare una nuova password.')
    } catch (e) {
      setMessage('error', e?.message ?? 'Errore reset password')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <main className="container"><p>Caricamento…</p></main>

  return (
    <main className="container">
      <div className="card" style={{ maxWidth: 480, margin: '40px auto' }}>
        <div className="card-header">
          <strong>{mode === 'login' ? 'Accedi' : mode === 'signup' ? 'Crea account' : 'Recupero password'}</strong>
          <div style={{ opacity: .7, fontSize: 14 }}>
            {mode === 'login' ? (
              <button className="btn btn-ghost btn-sm" onClick={() => setMode('signup')} type="button">Registrati</button>
            ) : (
              <button className="btn btn-ghost btn-sm" onClick={() => setMode('login')} type="button">Hai già un account?</button>
            )}
          </div>
        </div>

        <div className="card-body">
          {msg && (
            <div role="alert" style={{
              marginBottom: 12, padding: '10px 12px', borderRadius: 10,
              border: `1px solid ${msg.type === 'ok' ? '#264f2c' : '#5b1c1c'}`,
              background: msg.type === 'ok' ? '#13251a' : '#2a1010'
            }}>
              {msg.text}
            </div>
          )}

          {mode === 'login' && (
            <form className="form" onSubmit={onLogin}>
              <label>
                <span>Email</span>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
              </label>
              <label>
                <span>Password</span>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
              </label>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop: 8}}>
                <button className="btn" disabled={saving}>{saving ? 'Accesso…' : 'Accedi'}</button>
                <button type="button" className="btn btn-ghost" onClick={() => setMode('reset')}>Password dimenticata?</button>
              </div>
            </form>
          )}

          {mode === 'signup' && (
            <form className="form" onSubmit={onSignup}>
              <label>
                <span>Email</span>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
              </label>
              <label>
                <span>Password</span>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
              </label>
              <label>
                <span>Conferma password</span>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
              </label>
              <button className="btn" disabled={saving}>{saving ? 'Creazione…' : 'Crea account'}</button>
            </form>
          )}

          {mode === 'reset' && (
            <form className="form" onSubmit={onReset}>
              <label>
                <span>Email</span>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
              </label>
              <div style={{display:'flex', gap:8}}>
                <button className="btn" disabled={saving}>{saving ? 'Invio…' : 'Invia link reset'}</button>
                <button type="button" className="btn btn-ghost" onClick={() => setMode('login')}>Torna al login</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}