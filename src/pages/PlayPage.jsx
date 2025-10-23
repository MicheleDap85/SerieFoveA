import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { teamLogoUrl } from '../utils/logo'

export default function PlayPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [matchdays, setMatchdays] = useState([]) // [{ id, matchday_number, matches: [...] }]
  const [selected, setSelected] = useState(() => new Set()) // set di match.id
  const [scores, setScores] = useState({}) // { [matchId]: { home: "", away: "" } }
  const [message, setMessage] = useState(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      try {
        // 1) Giornate in ordine crescente (senza data)
        const { data: mds, error: mdErr } = await supabase
          .from('matchdays')
          .select('id, matchday_number')
          .order('matchday_number', { ascending: true })
        if (mdErr) throw mdErr

        // 2) Partite per giornata con nomi/loghi
        const enriched = await Promise.all(
          (mds || []).map(async (md) => {
            const { data: mx, error: mErr } = await supabase
              .from('matches')
              .select(`
                id,
                home_team,
                away_team,
                home_goals,
                away_goals,
                matchday_id,
                home:home_team ( id, name, logo_url ),
                away:away_team ( id, name, logo_url )
              `)
              .eq('matchday_id', md.id)
              .order('id', { ascending: true })
            if (mErr) {
              console.error(mErr)
              return { ...md, matches: [] }
            }
            return { ...md, matches: mx || [] }
          })
        )

        if (mounted) {
          setMatchdays(enriched)
        }
      } catch (e) {
        console.error(e)
        setMessage({ type: 'error', text: 'Errore nel caricamento delle giornate/partite.' })
      } finally {
        if (mounted) setLoading(false)
      }
    })()

    return () => { mounted = false }
  }, [])

  const flatMatches = useMemo(() => {
    const arr = []
    for (const md of matchdays) for (const m of md.matches) arr.push({ ...m, _md: md })
    return arr
  }, [matchdays])

  const totalSelectable = useMemo(() => {
    return matchdays.reduce((acc, md) => {
      return acc + md.matches.filter(m => m.home_goals == null && m.away_goals == null).length
    }, 0)
  }, [matchdays])

  const selectedCount = selected.size
  const selectedMatches = useMemo(
    () => flatMatches.filter(m => selected.has(m.id)),
    [selected, flatMatches]
  )

  // --- selezione
  function toggleMatch(match) {
    if (match.home_goals != null || match.away_goals != null) return // già giocata, ignoro
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(match.id)) {
        next.delete(match.id)
      } else {
        next.add(match.id)
      }
      return next
    })
    setScores(prev => {
      // inizializzo solo se non presente
      if (prev[match.id]) return prev
      return { ...prev, [match.id]: { home: '', away: '' } }
    })
  }

  function selectAllOfMatchday(md) {
    const unplayed = md.matches.filter(m => m.home_goals == null && m.away_goals == null)
    setSelected(prev => {
      const next = new Set(prev)
      unplayed.forEach(m => next.add(m.id))
      return next
    })
    setScores(prev => {
      const next = { ...prev }
      unplayed.forEach(m => {
        if (!next[m.id]) next[m.id] = { home: '', away: '' }
      })
      return next
    })
  }

  function deselectAllOfMatchday(md) {
    const ids = new Set(md.matches.map(m => m.id))
    setSelected(prev => {
      const next = new Set(prev)
      ids.forEach(id => next.delete(id))
      return next
    })
  }

  function removeOne(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  function clearAll() {
    setSelected(new Set())
  }

  // --- gestione input risultati
  function onScoreChange(matchId, side, value) {
    // consenti solo interi >= 0, o vuoto
    let v = value
    if (v === '') {
      setScores(prev => ({ ...prev, [matchId]: { ...prev[matchId], [side]: '' } }))
      return
    }
    // normalizzo: tolgo caratteri non numerici, blocco negativo
    const n = Math.max(0, parseInt(v.replace(/\D/g, ''), 10) || 0)
    setScores(prev => ({ ...prev, [matchId]: { ...prev[matchId], [side]: n.toString() } }))
  }

  const readyToSave = useMemo(() => {
    // almeno una partita selezionata con entrambi i campi compilati
    return selectedMatches.some(m => {
      const s = scores[m.id]
      return s && s.home !== '' && s.away !== ''
    })
  }, [selectedMatches, scores])

  // dentro PlayPage.jsx
  async function saveResults() {
    try {
      setSaving(true)
      setMessage(null)

      const toSave = selectedMatches
        .map(m => ({ m, s: scores[m.id] }))
        .filter(({ s }) => s && s.home !== '' && s.away !== '')
        .map(({ m, s }) => ({
          id: m.id,
          home_goals: Number(s.home),
          away_goals: Number(s.away),
        }))

      if (!toSave.length) {
        setMessage({ type: 'warn', text: 'Compila entrambi i punteggi per almeno una partita.' })
        return
      }

      for (const row of toSave) {
        const { error } = await supabase
          .from('matches')
          .update({ home_goals: row.home_goals, away_goals: row.away_goals })
          .eq('id', row.id)
        if (error) throw error
      }

      const savedIds = new Set(toSave.map(r => r.id))
      setMatchdays(prev =>
        prev.map(md => ({
          ...md,
          matches: md.matches.map(m =>
            savedIds.has(m.id)
              ? {
                  ...m,
                  home_goals: toSave.find(r => r.id === m.id)?.home_goals ?? m.home_goals,
                  away_goals: toSave.find(r => r.id === m.id)?.away_goals ?? m.away_goals
                }
              : m
          ),
        }))
      )
      setSelected(prev => {
        const next = new Set(prev)
        for (const id of savedIds) next.delete(id)
        return next
      })
      setMessage({ type: 'ok', text: `Salvate ${toSave.length} partite.` })
    } catch (e) {
      console.error('[saveResults] update error:', e)
      const msg = e?.message ?? e?.error_description ?? e?.hint ?? 'Errore nel salvataggio dei risultati'
      setMessage({ type: 'error', text: msg })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="container">
        <h2>Gioca – selezione e risultati</h2>
        <p>Caricamento…</p>
      </main>
    )
  }

  if (!matchdays.length) {
    return (
      <main className="container">
        <h2>Gioca – selezione e risultati</h2>
        <p>Nessuna giornata trovata.</p>
      </main>
    )
  }

  return (
    <main className="container play-grid">
      <section className="play-left">
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:12}}>
          <h2>Seleziona e inserisci i risultati</h2>
          <div style={{opacity:.8}}>
            Selezionate: <strong>{selectedCount}</strong> / {totalSelectable}
          </div>
        </div>
        <p style={{ marginTop: -6, opacity: 0.9 }}>
          Seleziona partite anche di giornate diverse. Inserisci i punteggi nelle righe selezionate e premi <em>Salva risultati</em>.
        </p>

        {message && (
          <div
            role="alert"
            style={{
              margin: '8px 0 16px',
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid',
              borderColor:
                message.type === 'ok' ? '#86efac' :
                message.type === 'warn' ? '#fde68a' :
                message.type === 'error' ? '#fecaca' : '#e5e7eb',
              background:
                message.type === 'ok' ? '#ecfdf5' :
                message.type === 'warn' ? '#fffbeb' :
                message.type === 'error' ? '#fef2f2' : '#fff'
            }}
          >
            {message.text}
          </div>
        )}

        {matchdays.map(md => {
          const unplayed = md.matches.filter(m => m.home_goals == null && m.away_goals == null)
          const hasUnplayed = unplayed.length > 0

          return (
            <div key={md.id} className="card md-card">
              <div className="card-header md-header">
                <div>
                  <strong>Giornata {md.matchday_number}</strong>
                  {/* Nessuna data mostrata */}
                </div>
                <div className="md-actions">
                  <button
                    className="btn btn-sm"
                    disabled={!hasUnplayed}
                    onClick={() => selectAllOfMatchday(md)}
                    title="Seleziona tutte le non giocate"
                  >
                    Seleziona tutte
                  </button>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => deselectAllOfMatchday(md)}
                    title="Deseleziona tutte"
                  >
                    Deseleziona tutte
                  </button>
                </div>
              </div>

              <div className="card-body">
                {md.matches.length === 0 && <p>Nessuna partita.</p>}

                {md.matches.map(m => {
                  const played = m.home_goals != null || m.away_goals != null
                  const checked = selected.has(m.id)
                  const sc = scores[m.id] || { home: '', away: '' }

                  return (
                    <div key={m.id} className={`match-row ${played ? 'disabled' : 'selectable'}`}>
                      {/* checkbox */}
                      <input
                        type="checkbox"
                        disabled={played}
                        checked={checked}
                        onChange={() => toggleMatch(m)}
                        aria-label="Seleziona partita"
                      />

                      {/* home */}
                      <div className="team">
                        {m.home?.logo_url && (
                          <img
                        className="team-logo"
                        src={teamLogoUrl(m.home?.logo_url)}
                        alt={m.home?.name || 'Home'}
                        loading="lazy"
                        width={22}
                        height={22}
                      />
                        )}
                        <span>{m.home?.name ?? `Team ${m.home_team}`}</span>
                      </div>

                      {/* score / input */}
                      <div className="score">
                        {played ? (
                          <strong>{m.home_goals} : {m.away_goals}</strong>
                        ) : checked ? (
                          <div className="score-inputs">
                            <input
                              type="number"
                              min="0"
                              inputMode="numeric"
                              value={sc.home}
                              onChange={(e) => onScoreChange(m.id, 'home', e.target.value)}
                              className="score-input"
                              aria-label="Gol casa"
                            />
                            <span>:</span>
                            <input
                              type="number"
                              min="0"
                              inputMode="numeric"
                              value={sc.away}
                              onChange={(e) => onScoreChange(m.id, 'away', e.target.value)}
                              className="score-input"
                              aria-label="Gol trasferta"
                            />
                          </div>
                        ) : (
                          <span>- : -</span>
                        )}
                      </div>

                      {/* away */}
                      <div className="team">
                        <span>{m.away?.name ?? `Team ${m.away_team}`}</span>
                        {m.away?.logo_url && (
                          <img
                        className="team-logo"
                        src={teamLogoUrl(m.away?.logo_url)}
                        alt={m.away?.name || 'Away'}
                        loading="lazy"
                        width={22}
                        height={22}
                      />
                        )}
                      </div>

                      {/* pillola stato */}
                      {played ? (
                        <span className="played-pill">Giocata</span>
                      ) : checked ? (
                        <button className="btn btn-xs btn-danger" onClick={() => removeOne(m.id)}>
                          Rimuovi
                        </button>
                      ) : (
                        <span style={{opacity:.4, fontSize:12}}>—</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </section>

      <aside className="play-right">
        <div className="card sticky">
          <div className="card-header">
            <strong>Azioni</strong>
          </div>
          <div className="card-body">
            <p style={{marginTop:0}}>
              Compila i risultati delle partite selezionate e premi <em>Salva risultati</em>.
            </p>
            <div className="right-actions" style={{marginTop:12}}>
              <button className="btn btn-ghost" onClick={clearAll} disabled={selectedCount === 0 || saving}>
                Svuota selezione
              </button>
              <button className="btn" onClick={saveResults} disabled={!readyToSave || saving}>
                {saving ? 'Salvataggio…' : `Salva risultati`}
              </button>
            </div>
            {selectedMatches.length > 0 && (
              <div style={{marginTop:16, opacity:.9}}>
                <small>
                  Salva solo le partite con entrambi i punteggi compilati; le altre rimangono selezionate.
                </small>
              </div>
            )}
          </div>
        </div>
      </aside>
    </main>
  )
}