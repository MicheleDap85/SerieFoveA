import { useEffect, useRef, useState } from 'react'

export default function Timer15({ onFinish, label }){
const [secs, setSecs] = useState(15*60)
const [running, setRunning] = useState(false)
const raf = useRef(null)
const last = useRef(null)

function beep(){
const ctx = new (window.AudioContext||window.webkitAudioContext)()
const o = ctx.createOscillator(); const g = ctx.createGain()
o.type = 'sawtooth'; o.frequency.value = 880
o.connect(g); g.connect(ctx.destination)
g.gain.setValueAtTime(0.001, ctx.currentTime)
g.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime+0.01)
g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+0.35)
o.start(); o.stop(ctx.currentTime+0.35)
}

useEffect(()=>{ return ()=> cancelAnimationFrame(raf.current) },[])

function tick(t){
if(!running){ last.current = null; return }
if(!last.current) last.current = t
const dt = (t - last.current)/1000
last.current = t
setSecs(s => {
const n = Math.max(0, s - dt)
if (n === 0) { setRunning(false); beep(); onFinish && onFinish() }
return n
})
raf.current = requestAnimationFrame(tick)
}

function toggle(){
const n = !running
setRunning(n)
if(n){ beep(); raf.current = requestAnimationFrame(tick) } else { beep() }
}
function reset(){ setRunning(false); setSecs(15*60) }

const m = String(Math.floor(secs/60)).padStart(2,'0')
const s = String(Math.floor(secs%60)).padStart(2,'0')

return (
<div className="timer">
<div className="timer-head"><strong>{label}</strong></div>
<div className="timer-disp">{m}:{s}</div>
<div className="timer-ctrls">
<button onClick={toggle}>{running? 'Pausa' : 'Avvia'}</button>
<button onClick={reset}>Reset</button>
</div>
</div>
)
}