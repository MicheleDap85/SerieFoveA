import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { supabase } from '../supabaseClient'


const BUCKET = 'team-logos'
const FOLDER = 'teams' // cartella logica dentro al bucket

export default function TeamsNew() {
  const nav = useNavigate()

  const [session, setSession] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)

  const [form, setForm] = useState({
    teamName: '',
    playerName: '',
  })
  const [logoFile, setLogoFile] = useState(null)
  const [preview, setPreview] = useState(null)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Recupera la sessione per evitare errori RLS (upload/insert richiedono authenticated)
  useEffect(() => {
    let unsub
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      setSession(data.session ?? null)
      setCheckingSession(false)
      const sub = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
      unsub = () => sub?.data?.subscription?.unsubscribe?.()
    })()
    return () => { if (unsub) unsub() }
  }, [])

  function handleChange(e) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  function handleLogo(e) {
    const file = e.target.files?.[0] || null
    setLogoFile(file)
    setPreview(file ? URL.createObjectURL(file) : null)
  }

  async function uploadLogo(file) {
    if (!file) return null

    const ext = (file.name.split('.').pop() || 'png').toLowerCase()
    const path = `${FOLDER}/${uuidv4()}.${ext}`

    // Upload nel bucket scelto
    const { error: upErr } = await supabase
      .storage
      .from(BUCKET)
      .upload(path, file, {
        upsert: false,
        cacheControl: '3600',
        contentType: file.type || 'image/png',
      })

    if (upErr) {
      // Messaggi più chiari per i casi comuni
      const msg = upErr.message?.toLowerCase?.() || ''
      if (msg.includes('bucket not found')) {
        throw new Error(
          `Bucket '${BUCKET}' non trovato: crea il bucket in Supabase Storage (stesso progetto delle tue ENV) o aggiorna il nome in BUCKET.`
        )
      }
      if (msg.includes('row-level security')) {
        throw new Error(
          'Permessi mancanti sul bucket: crea le policy RLS (select: public, insert: authenticated) su storage.objects per questo bucket.'
        )
      }
      throw upErr
    }

    // URL pubblico corretto (usa /object/public/…)
    const { data: { session } } = await supabase.auth.getSession()
if (!session) {  }

  }

  // Messaggio inline utile se non loggati
  const notLoggedWarning = useMemo(() => {
    if (checkingSession) return null
    if (!session) {
      return 'Devi effettuare il login per creare una squadra e caricare un logo.'
    }
    return null
  }, [checkingSession, session])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    // Validazioni base
    if (!form.teamName.trim()) {
      setError('Inserisci il nome della squadra.')
      return
    }
    if (!form.playerName.trim()) {
      setError('Inserisci il nome del giocatore.')
      return
    }
    if (!session) {
      setError('Devi essere loggato per creare una squadra.')
      return
    }

    try {
      setSaving(true)

      // 1) Upload logo (opzionale)
      const logoUrl = await uploadLogo(logoFile)

      // 2) Insert su tabella teams
      const { error: insErr } = await supabase
        .from('teams')
        .insert({
          name: form.teamName.trim(),
          player_name: form.playerName.trim(),
          logo_url: logoUrl ?? null,
        })

      if (insErr) {
        const msg = (insErr.message || '').toLowerCase()
        if (msg.includes('row level security') || msg.includes('violates row-level security')) {
          throw new Error(
            'Inserimento negato da RLS: crea le policy su public.teams (select: public, insert: authenticated).'
          )
        }
        if ((insErr.code || '').toString() === '403') {
          throw new Error(
            '403 su /rest/v1/teams: controlla che la tabella teams abbia policy RLS per insert.'
          )
        }
        throw insErr
      }

      // 3) Vai alla Classifica
      nav('/standings')
    } catch (err) {
      console.error('TeamsNew handleSubmit error:', err)
      setError(err.message || 'Errore durante il salvataggio. Riprova.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="page">
      <h2>Nuova squadra</h2>

      {notLoggedWarning && (
        <div className="alert warn" role="alert" style={{ marginBottom: 16 }}>
          {notLoggedWarning}
        </div>
      )}

      <form className="form card" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="teamName">Nome squadra</label>
          <input
            id="teamName"
            name="teamName"
            type="text"
            placeholder="Es. Real Fovea"
            value={form.teamName}
            onChange={handleChange}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="playerName">Nome giocatore</label>
          <input
            id="playerName"
            name="playerName"
            type="text"
            placeholder="Es. Michele D’Apollo"
            value={form.playerName}
            onChange={handleChange}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="logo">Logo (opzionale)</label>
          <input
            id="logo"
            type="file"
            accept="image/*"
            onChange={handleLogo}
          />
          {preview && (
            <div className="logo-preview" style={{ marginTop: 10 }}>
              <img
                src={preview}
                alt="Anteprima logo"
                style={{ maxWidth: 160, height: 'auto', display: 'block', borderRadius: 8 }}
              />
            </div>
          )}
        </div>

        {error && (
          <p className="error" role="alert" style={{ marginTop: 8 }}>
            {error}
          </p>
        )}

        <div className="actions" style={{ marginTop: 16 }}>
          <button type="submit" disabled={saving || !session}>
            {saving ? 'Salvataggio…' : 'Crea squadra'}
          </button>
        </div>
      </form>

      {/* Minimo stile “di cortesia” se non hai un CSS dedicato */}
      <style>{`
        .page { padding: 16px; }
        .card { background: #111318; border: 1px solid #202028; border-radius: 12px; padding: 16px; }
        .field { display: grid; gap: 6px; margin-bottom: 12px; }
        .field input[type="text"], .field input[type="file"] {
          background: #0c0e12; border: 1px solid #1c1f27; border-radius: 10px; padding: 10px 12px; color: #e7e9ee;
        }
        .actions button {
          padding: 10px 14px; border-radius: 10px; border: 1px solid #202028; background: #1b1f2a; color: #e7e9ee;
        }
        .actions button[disabled] { opacity: 0.6; cursor: not-allowed; }
        .error { color: #ff7d7d; }
        .alert.warn { background:#2a1f12; border:1px solid #4a2f12; border-radius: 10px; padding: 10px 12px; color:#ffcf8a; }
      `}</style>
    </main>
  )
}
