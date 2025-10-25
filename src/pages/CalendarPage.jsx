import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { teamLogoUrl } from '../utils/logo'

export default function CalendarPage() {
  const [matchdays, setMatchdays] = useState([])
  const [loading, setLoading] = useState(true)
  const [teamFilter, setTeamFilter] = useState('')
  const [teams, setTeams] = useState([])
  const [teamsMap, setTeamsMap] = useState({})
  const [generating, setGenerating] = useState(false)
  const [session, setSession] = useState(null)

  // 🔹 Controlla sessione utente
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => {
      listener.subscription?.unsubscribe()
    }
  }, [])

  // 🔹 Carica giornate e partite
  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('matchdays')
        .select(`
          id,
          matchday_number,
          matches (
            id,
            home_team,
            away_team,
            home_goals,
            away_goals
          )
        `)
        .order('matchday_number', { ascending: true })

      if (!alive) return
      if (error) {
        console.error('Errore caricamento giornate:', error)
        setMatchdays([])
      } else {
        setMatchdays(data || [])
      }
      setLoading(false)
    })()
    return () => { alive = false }
  }, [])

  // 🔹 Carica squadre (id, nome, logo)
  useEffect(() => {
    let alive = true
    ;(async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name, logo_url')
        .order('name', { ascending: true })

      if (!alive) return
      if (!error && data) {
        setTeams(data)
        const map = {}
        for (const t of data) map[String(t.id)] = { name: t.name, logo: t.logo_url }
        setTeamsMap(map)
      }
    })()
    return () => { alive = false }
  }, [])

  // 🔹 Filtra partite per squadra
  const filteredDays = useMemo(() => {
    const teamIdStr = String(teamFilter)
    return (matchdays || [])
      .map((day) => ({
        ...day,
        matches: teamFilter
          ? (day.matches || []).filter(
              (m) =>
                String(m.home_team) === teamIdStr ||
                String(m.away_team) === teamIdStr
            )
          : day.matches,
      }))
      .filter((day) => (day.matches || []).length > 0)
  }, [matchdays, teamFilter])

  // 🔹 Funzione per generare il calendario
  async function generateCalendar() {
    if (!window.confirm('⚠️ Tutte le giornate e partite esistenti verranno eliminate. Procedere?')) {
      return
    }

    try {
      setGenerating(true)
      // cancella giornate esistenti
      await supabase.from('matchdays').delete().neq('id', 0)
      console.log('Giornate eliminate.')

      // round robin base (tutte contro tutte)
      const teamIds = teams.map((t) => t.id)
      const n = teamIds.length
      if (n < 2) {
        alert('Servono almeno due squadre per creare il calendario.')
        return
      }

      let giornate = []
      for (let i = 0; i < n - 1; i++) {
        const giornata = []
        for (let j = 0; j < n / 2; j++) {
          const home = teamIds[j]
          const away = teamIds[n - 1 - j]
          giornata.push({ home, away })
        }
        teamIds.splice(1, 0, teamIds.pop()) // algoritmo round-robin
        giornate.push(giornata)
      }

      // Inserisci nel DB
      for (const [index, giornata] of giornate.entries()) {
        const { data: md, error: mdErr } = await supabase
          .from('matchdays')
          .insert({ matchday_number: index + 1 })
          .select()
          .single()

        if (mdErr) {
          console.error('Errore inserimento giornata:', mdErr)
          continue
        }

        for (const match of giornata) {
          await supabase.from('matches').insert({
            matchday_id: md.id,
            home_team: match.home,
            away_team: match.away,
            home_goals: null,
            away_goals: null,
          })
        }
      }

      alert('Calendario generato con successo!')
      // Ricarica giornate
      const { data } = await supabase
        .from('matchdays')
        .select(`
          id,
          matchday_number,
          matches (
            id,
            home_team,
            away_team,
            home_goals,
            away_goals
          )
        `)
        .order('matchday_number', { ascending: true })
      setMatchdays(data || [])
    } catch (err) {
      console.error('Errore generazione calendario:', err)
      alert('Errore durante la generazione del calendario.')
    } finally {
      setGenerating(false)
    }
  }

  // 🔹 Render team (logo + nome)
  const renderTeam = (teamId, align = 'left') => {
    const info = teamsMap[String(teamId)]
    if (!info) return <span>{teamId}</span>
    return (
      <span className={`team d-inline-flex align-items-center gap-2 ${align}`}>
        {align === 'left' && info.logo && (
          <img
            src={teamLogoUrl(info.logo)}
            alt={info.name}
            className="team-logo"
            width={26}
            height={26}
            loading="lazy"
          />
        )}
        <strong>{info.name}</strong>
        {align === 'right' && info.logo && (
          <img
            src={teamLogoUrl(info.logo)}
            alt={info.name}
            className="team-logo"
            width={26}
            height={26}
            loading="lazy"
          />
        )}
      </span>
    )
  }

  return (
    <main className="container calendar-page">
      <header className="d-flex align-items-center justify-content-between mb-3">
        <h2>Calendario</h2>

        <div className="d-flex gap-2">
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="form-select"
          >
            <option value="">Tutte le squadre</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          {/* 🔒 Mostra solo se loggato */}
          {session && (
            <button
              className="btn"
              disabled={generating || loading}
              onClick={generateCalendar}
            >
              {generating ? 'Generazione...' : 'Genera calendario'}
            </button>
          )}
        </div>
      </header>

      {loading ? (
        <p>Caricamento in corso...</p>
      ) : filteredDays.length === 0 ? (
        <p>Nessuna partita trovata.</p>
      ) : (
        filteredDays.map((day) => (
          <section key={day.id} className="matchday mb-4">
            <h3>Giornata {day.matchday_number}</h3>
            <ul className="list-group">
              {(day.matches || []).map((m) => (
                <li
                  key={m.id}
                  className="list-group-item d-flex justify-content-center align-items-center gap-2"
                >
                  {renderTeam(m.home_team, 'left')}

                  {m.home_goals != null && m.away_goals != null ? (
                    <>
                      <strong className="score-num">{m.home_goals}</strong>
                      <span className="dash">-</span>
                      <strong className="score-num">{m.away_goals}</strong>
                    </>
                  ) : (
                    <span className="text-muted mx-2">da giocare</span>
                  )}

                  {renderTeam(m.away_team, 'right')}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </main>
  )
}
