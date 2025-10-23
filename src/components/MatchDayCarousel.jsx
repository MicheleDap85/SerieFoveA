import { useEffect, useState, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { teamLogoUrl } from '../utils/logo'

export default function MatchdayCarousel() {
  const [slides, setSlides] = useState([])
  const [offset, setOffset] = useState(0)
  const autoplayRef = useRef(null)

  useEffect(() => {
    async function load() {
      const { data: mds, error } = await supabase
        .from('matchdays')
        .select('id, matchday_number')
        .order('matchday_number', { ascending: true })

      if (error) {
        console.error(error)
        return
      }

      const enrich = await Promise.all((mds || []).map(async (md) => {
        const { data: matches, error: em } = await supabase
          .from('matches')
          .select(`id, home_goals, away_goals,
                   home:home_team ( id, name, logo_url ),
                   away:away_team ( id, name, logo_url )`)
          .eq('matchday_id', md.id)
          .order('id', { ascending: true })

        if (em) {
          console.error(em)
          return { ...md, matches: [] }
        }
        return { ...md, matches }
      }))

      setSlides(enrich || [])
      setOffset(Math.max(0, (enrich || []).length - 3))
    }

    load()
  }, [])

  // helpers per navigazione
  function prev() {
    setOffset((o) => Math.max(0, o - 1))
  }

  function next() {
    setOffset((o) => {
      if (slides.length <= 3) return 0 // nessun carosello reale
      const max = Math.max(0, slides.length - 3)
      return o >= max ? 0 : o + 1 // loopa automaticamente all’inizio
    })
  }

  // autoplay: cambia slide ogni 6 secondi
  useEffect(() => {
    if (slides.length <= 3) return // non serve se meno di 3 giornate
    autoplayRef.current = setInterval(() => {
      next()
    }, 6000) // ⏱ ogni 6s

    // pulizia
    return () => clearInterval(autoplayRef.current)
  }, [slides])

  // resetta timer se l’utente interagisce (prev/next manuali)
  function handlePrev() {
    clearInterval(autoplayRef.current)
    prev()
  }

  function handleNext() {
    clearInterval(autoplayRef.current)
    next()
  }

  // calcola le 3 da mostrare
  const visible = slides.slice(offset, offset + 3)

  return (
    <section className="carousel three" id="calendario">
      <div className="container">
        <div className="carousel-controls">
          <button
            onClick={handlePrev}
            aria-label="Precedente"
            disabled={offset === 0}
          >
            ‹
          </button>

          <div className="carousel-window">
            {visible.map((s, i) => (
              <article key={s?.id || i} className="carousel-slide">
                <h3>Giornata {s?.matchday_number ?? '-'}</h3>
                <ul className="match-list">
                  {s?.matches?.length ? (
                    s.matches.map((m) => (
                      <li key={m.id} className="match-item">
                        <div className="team">
                          {m.home?.logo_url && (
                            <img
                              className="team-logo"
                              src={teamLogoUrl(m.home?.logo_url)}
                              alt={m.home?.name}
                              width={18}
                              height={18}
                              loading="lazy"
                            />
                          )}
                          <span>{m.home?.name}</span>
                        </div>

                        <div className="score">
                          {Number.isInteger(m.home_goals) ? m.home_goals : '-'}
                          <span> : </span>
                          {Number.isInteger(m.away_goals) ? m.away_goals : '-'}
                        </div>

                        <div className="team">
                          {m.away?.logo_url && (
                            <img
                              className="team-logo"
                              src={teamLogoUrl(m.away?.logo_url)}
                              alt={m.away?.name}
                              width={18}
                              height={18}
                              loading="lazy"
                            />
                          )}
                          <span>{m.away?.name}</span>
                        </div>
                      </li>
                    ))
                  ) : (
                    <li className="muted">Nessuna partita inserita</li>
                  )}
                </ul>
              </article>
            ))}
          </div>

          <button
            onClick={handleNext}
            aria-label="Successiva"
            disabled={slides.length <= 3}
          >
            ›
          </button>
        </div>
      </div>
    </section>
  )
}
