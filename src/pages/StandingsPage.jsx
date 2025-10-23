import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { teamLogoUrl } from '../utils/logo'

export default function StandingsPage() {
  const [rows, setRows] = useState([])

  useEffect(() => {
    ;(async () => {
      const { data, error } = await supabase
        .from('standings_v')
        .select('*')
        .order('pts', { ascending: false })
        .order('gd', { ascending: false })
        .order('gf', { ascending: false })

      if (error) {
        console.error(error)
        setRows([])
      } else {
        setRows(data || [])
      }
    })()
  }, [])

  // Calcolo metà alta/bassa
  const n = rows.length
  const cut = useMemo(() => Math.ceil(n / 2), [n])

  // Bucket già usati nella tua card "Qualificazioni"
  const champions = rows.slice(0, cut)
  const fovea = rows.slice(cut)

  return (
    <main className="container">
      <div className="d-flex align-items-center justify-content-between" style={{ gap: 12 }}>
        <h2>Classifica — Serie FoveA</h2>
        {/* Legend compatta (usa le classi aggiunte nello stylesheet) */}
        <div className="tier-legend" aria-hidden="true">
          <span className="tier-pill blue"><span className="tier-dot" /> Champion&apos;s Fovea</span>
          <span className="tier-pill green"><span className="tier-dot" /> Fovea League</span>
        </div>
      </div>

      <ol className="table">
        {rows.map((r, i) => {
          const tierClass = i < cut ? 'tier-champ' : 'tier-fovea'
          return (
            <li key={r.id} className={`table-row ${tierClass}`}>
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

              <span className="pts" title="Punti">{r.pts}</span>
              <span className="gd" title="Differenza reti">GD {r.gd}</span>
            </li>
          )
        })}
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