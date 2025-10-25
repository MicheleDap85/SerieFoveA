import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { teamLogoUrl } from '../utils/logo'

/**
 * Rimuove "GD" e il segno "+" da una stringa come "GD +8" o "+8"
 * Restituisce solo il numero pulito (es. "8" o "-2")
 */
function cleanGD(value) {
  return String(value ?? '')
    .replace(/GD\s*/i, '')
    .replace('+', '')
    .trim()
}

export default function StandingsPage() {
  const [rows, setRows] = useState([])
  const [wdl, setWdl] = useState({}) // Vittorie, Pareggi, Sconfitte

  // Calcola Vittorie / Pareggi / Sconfitte dai match già giocati
  async function computeWDL() {
    const { data: matches, error } = await supabase
      .from('matches')
      .select('home_team, away_team, home_goals, away_goals')
      .not('home_goals', 'is', null)
      .not('away_goals', 'is', null)

    const map = {}
    if (!error && Array.isArray(matches)) {
      for (const m of matches) {
        const h = String(m.home_team)
        const a = String(m.away_team)
        const hg = Number(m.home_goals)
        const ag = Number(m.away_goals)
        if (!(h in map)) map[h] = { w: 0, d: 0, l: 0 }
        if (!(a in map)) map[a] = { w: 0, d: 0, l: 0 }

        if (hg > ag) { map[h].w++; map[a].l++; }
        else if (hg < ag) { map[a].w++; map[h].l++; }
        else { map[h].d++; map[a].d++; }
      }
    }
    return map
  }

  useEffect(() => {
    let alive = true
    ;(async () => {
      const { data, error } = await supabase
        .from('standings_v')
        .select('*')
        .order('pts', { ascending: false })
        .order('gd', { ascending: false })
        .order('gf', { ascending: false })

      if (!alive) return

      if (error) {
        setRows([])
        setWdl({})
      } else {
        setRows(data || [])
        const wmap = await computeWDL()
        if (alive) setWdl(wmap)
      }
    })(); // punto e virgola necessario
    return () => { alive = false }
  }, [])

  const n = rows.length
  const cut = Math.ceil(n / 2)
  const champions = rows.slice(0, cut)
  const fovea = rows.slice(cut)

  return (
    <main className="container standings">
      <header className="d-flex align-items-center justify-content-between">
        <h2>Classifica</h2>
      </header>

      {/* Header allineato alle colonne */}
      <div className="table-header">
        <span className="pos" aria-hidden>Pos</span>
        <span className="teamCell">Squadra</span>
        <span className="w"  title="Vittorie">V</span>
        <span className="d"  title="Pareggi">P</span>
        <span className="l"  title="Sconfitte">S</span>
        <span className="gf" title="Gol fatti">GF</span>
        <span className="ga" title="Gol subiti">GS</span>
        <span className="gd" title="Differenza reti">GD</span>
        <span className="pts" title="Punti">Pts</span>
      </div>

      <ol className="table">
        {rows.map((r, i) => {
          const key = String(r.id ?? r.name)
          const w = wdl[key]?.w ?? r.w ?? 0
          const d = wdl[key]?.d ?? r.d ?? 0
          const l = wdl[key]?.l ?? r.l ?? 0
          const gf = r.gf ?? 0
          const ga = r.ga ?? 0
          const gdRaw = r.gd ?? (gf - ga)
          const gd = cleanGD(gdRaw)
          const pts = r.pts ?? 0
          const tierClass = i < cut ? 'tier-champ' : 'tier-fovea'

          return (
            <li key={key} className={`table-row ${tierClass}`}>
              <span className="pos" title={`Posizione ${i + 1}`}>{i + 1}</span>

              <span className="teamCell">
                {r.logo_url && (
                  <img
                    src={teamLogoUrl(r.logo_url)}
                    alt={r.name}
                    className="team-logo"
                    loading="lazy"
                    width={22}
                    height={22}
                  />
                )}
                <strong className="team-name">{r.name}</strong>
                {r.player_name && <small> · {r.player_name}</small>}
              </span>

              <span className="w"  title="Vittorie">{w}</span>
              <span className="d"  title="Pareggi">{d}</span>
              <span className="l"  title="Sconfitte">{l}</span>
              <span className="gf" title="Gol fatti">{gf}</span>
              <span className="ga" title="Gol subiti">{ga}</span>
              <span className="gd" title="Differenza reti">{gd}</span>
              <span className="pts" title="Punti">{pts}</span>
            </li>
          )
        })}
        {!rows.length && <li className="muted">Classifica non disponibile</li>}
      </ol>

      <section className="card">
        <h3 className="card-title">Qualificazioni</h3>
        <p className="muted">
          Prime {champions.length} → <strong>Champion&apos;s Fovea</strong>.&nbsp;
          Restanti {fovea.length} → <strong>Fovea League</strong>.
        </p>
      </section>
    </main>
  )
}
