import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { teamLogoUrl } from '../utils/logo'

export default function TopFour() {
const [rows, setRows] = useState([])

useEffect(() => {
async function load() {
const { data, error } = await supabase
.from('standings_v')
.select('*')
.order('pts', { ascending: false })
.order('gd', { ascending: false })
.order('gf', { ascending: false })
.limit(4)
if (error) { console.error(error); return }
setRows(data || [])
}
load()
}, [])

return (
<section className="top4" id="classifica">
<div className="container">
<h2>Top 4</h2>
<ol className="table mini">
{rows.map((r, i) => (
<li key={r.id} className="table-row">
<span className="pos">{i+1}</span>
<span className="teamCell">
{/* {r.logo_url && <img src={r.logo_url} alt={r.name} />} */}
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
<strong>{r.name}</strong>
{r.player_name && <small> · {r.player_name}</small>}
</span>
<span className="pts">{r.pts} pts</span>
<span className="gd">GD {r.gd}</span>
</li>
))}
{!rows.length && <li className="muted">Classifica non disponibile</li>}
</ol>
</div>
</section>
)
}