import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { generateCalendar } from '../lib/generateCalendar'
import { teamLogoUrl } from '../utils/logo'

export default function CalendarPage() {
  const [authed, setAuthed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [days, setDays] = useState([])

  // ===== AUTH: mostra il bottone solo se loggato =====
  useEffect(() => {
    let subscription
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setAuthed(!!session)
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        setAuthed(!!session)
      })
      subscription = data?.subscription
    })()
    return () => subscription?.unsubscribe()
  }, [])

  // ===== FETCH calendario =====
  const fetchCalendar = async () => {
    setLoading(true)
    const { data: mds, error: mdErr } = await supabase
      .from('matchdays')
      .select(
        `
          id,
          matchday_number,
          matchday_date,
          matches:matches(
            id,
            home_team,
            away_team,
            home_goals,
            away_goals,
            home:home_team(name, logo_url),
            away:away_team(name, logo_url)
          )
        `
      )
      .order('matchday_number', { ascending: true })

    if (mdErr) {
      console.error(mdErr)
      setDays([])
      setLoading(false)
      return
    }
    setDays(mds || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchCalendar()
  }, [])

  // Ordinamento difensivo per sicurezza (già ordinato da query)
  const sortedDays = useMemo(
    () => [...days].sort((a, b) => (a.matchday_number || 0) - (b.matchday_number || 0)),
    [days]
  )

  return (
    <main className="container">
      <div className="d-flex align-items-center justify-content-between">
        <h2>Calendario — Serie FoveA</h2>

        {authed && (
          <button
            onClick={async () => {
              try {
                setGenerating(true)
                await generateCalendar()
                await fetchCalendar()
                alert('Calendario generato!')
              } catch (e) {
                console.error(e)
                alert(e.message || 'Errore nella generazione del calendario')
              } finally {
                setGenerating(false)
              }
            }}
            disabled={generating}
            className="btn btn-primary"
            title="Genera un calendario completo (2 andate + 2 ritorni)"
          >
            {generating ? 'Genero…' : 'Genera giornate'}
          </button>
        )}
      </div>

      {loading && <p>Caricamento calendario…</p>}
      {!loading && sortedDays.length === 0 && <p>Nessuna giornata presente.</p>}

      {!loading && sortedDays.length > 0 && (
        <div className="calendar-list">
          {sortedDays.map((day) => (
            <section key={day.id} className="card mb-3">
              <div className="card-header">
                <strong>Giornata {day.matchday_number}</strong>
                {/* Richiesta: non mettere in evidenza / non mostrare le date */}
                {/* NIENTE data visualizzata */}
              </div>
              <div className="card-body">
                {(day.matches?.length ?? 0) === 0 && <p>Nessuna partita per questa giornata.</p>}

                {day.matches?.map((m) => (
                  <div key={m.id} className="match-row d-flex align-items-center justify-content-between">
                    <div className="team d-flex align-items-center gap-2">
                      <img
                        className="team-logo"
                        src={teamLogoUrl(m.home?.logo_url)}
                        alt={m.home?.name || 'Home'}
                        loading="lazy"
                        width={22}
                        height={22}
                      />
                      <span className="team-name">{m.home?.name || '—'}</span>
                    </div>

                    <div className="score text-mono">
                      {m.home_goals ?? '-'} : {m.away_goals ?? '-'}
                    </div>

                    <div className="team d-flex align-items-center gap-2">
                      <img
                        className="team-logo"
                        src={teamLogoUrl(m.away?.logo_url)}
                        alt={m.away?.name || 'Away'}
                        loading="lazy"
                        width={22}
                        height={22}
                      />
                      <span className="team-name">{m.away?.name || '—'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  )
}