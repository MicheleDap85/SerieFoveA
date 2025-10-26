import { useEffect, useState, useRef, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { teamLogoUrl } from '../utils/logo'

export default function MatchdayCarousel() {
  const [slides, setSlides] = useState([])
  const [offset, setOffset] = useState(0)         // indice della PRIMA slide visibile
  const autoplayRef = useRef(null)

  // 1) 1 card su mobile, 3 su desktop
  const visibleCount = useResponsiveVisibleCount()

  useEffect(() => {
    async function load() {
      const { data: mds, error } = await supabase
        .from('matchdays')
        .select('id, matchday_number')
        .order('matchday_number', { ascending: true })

      if (error) { console.error(error); return }

      const enrich = await Promise.all((mds || []).map(async (md) => {
        const { data: matches, error: em } = await supabase
          .from('matches')
          .select(`id, home_goals, away_goals,
                   home:home_team ( id, name, logo_url ),
                   away:away_team ( id, name, logo_url )`)
          .eq('matchday_id', md.id)
          .order('id', { ascending: true })

        if (em) { console.error(em); return { ...md, matches: [] } }
        return { ...md, matches }
      }))

      setSlides(enrich || [])
      setOffset(0) // parti dalla prima giornata
    }
    load()
  }, [])

  // 2) Navigazione CIRCOLARE in entrambe le direzioni
  function prev() {
    setOffset(o => slides.length ? (o - 1 + slides.length) % slides.length : 0)
  }
  function next() {
    setOffset(o => slides.length ? (o + 1) % slides.length : 0)
  }

  // 3) Autoplay (solo se c'è qualcosa da far scorrere)
  useEffect(() => {
    if (slides.length <= Math.max(1, visibleCount)) return
    autoplayRef.current = setInterval(() => next(), 6000)
    return () => clearInterval(autoplayRef.current)
  }, [slides, visibleCount])

  function handlePrev() { clearInterval(autoplayRef.current); prev() }
  function handleNext() { clearInterval(autoplayRef.current); next() }

  // 4) Finestra visibile “wrap-around” (modulo)
  const visible = useMemo(() => {
    if (!slides.length) return []
    const n = Math.min(visibleCount, slides.length)
    const out = []
    for (let k = 0; k < n; k++) out.push(slides[(offset + k) % slides.length])
    return out
  }, [slides, offset, visibleCount])

  // Se c'è <= 1 “pagina” di contenuto, i controlli sono facoltativi
  const controlsDisabled = slides.length <= 1

  return (
    <section className="carousel three" id="calendario">
      <div className="container">
        <div className="carousel-controls">
          <button onClick={handlePrev} aria-label="Precedente" disabled={controlsDisabled}>‹</button>

          <div className="carousel-window">
            {visible.map((s, i) => (
              <article key={s?.id ?? `${offset}-${i}`} className="carousel-slide">
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

          <button onClick={handleNext} aria-label="Successiva" disabled={controlsDisabled}>›</button>
        </div>
      </div>
    </section>
  )
}

/* ==== hook: 1 card su mobile, 3 su desktop ==== */
function useResponsiveVisibleCount() {
  const [count, setCount] = useState(3)
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 720px)')
    const update = () => setCount(mql.matches ? 1 : 3)
    update()
    // compat vecchi browser
    const add = mql.addEventListener ? 'addEventListener' : 'addListener'
    const rem = mql.removeEventListener ? 'removeEventListener' : 'removeListener'
    mql[add]('change', update)
    return () => mql[rem]('change', update)
  }, [])
  return count
}
