import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import logo from '../assets/logo.jpg'

export default function Navbar({ isAuthed, onLogout }) {
  const loc = useLocation()
  const [open, setOpen] = useState(false)

  const active = (path) =>
    loc.pathname === path
      ? { background: '#1b1b20', borderColor: '#202028', color: 'inherit' }
      : {}

  // Chiudi il menu su cambio route
  useEffect(() => {
    setOpen(false)
  }, [loc.pathname])

  // Chiudi se si torna >720px
  useEffect(() => {
    const onResize = () => { if (window.innerWidth > 720 && open) setOpen(false) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [open])

  // (Opzionale) blocca lo scroll sotto quando aperto
  useEffect(() => {
    document.body.classList.toggle('body-lock', open)
  }, [open])

  const NavItems = ({ inPanel = false }) => (
    <>
      {isAuthed ? (
        <>
          <Link style={active('/')} to="/">Home</Link>
          <Link style={active('/play')} to="/play">Gioca</Link>
          <Link style={active('/calendar')} to="/calendar">Calendario</Link>
          <Link style={active('/standings')} to="/standings">Classifica</Link>
          <Link style={active('/teams/new')} to="/teams/new">Nuova squadra</Link>
          <button className="linklike" onClick={onLogout}>Logout</button>
        </>
      ) : (
        <>
          <Link style={active('/')} to="/">Home</Link>
          <Link style={active('/standings')} to="/standings">Classifica</Link>
          <Link style={active('/calendar')} to="/calendar">Calendario</Link>
          <Link style={active('/login')} to="/login">Login</Link>
        </>
      )}
    </>
  )

  return (
    <header className="navbar">
      <div className="container nav-container">
        <div className="nav-left">
          <img src={logo} alt="ASD Foggia Calcio Tavolo" className="nav-logo" />
          <h1 className="brand">Serie FoveA</h1>
        </div>

        {/* Links inline (desktop) */}
        <nav className="nav-links">
          <NavItems />
        </nav>

        {/* Toggle hamburger (solo mobile via CSS) */}
        <button
          className="nav-toggle"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label="Apri menu"
          onClick={() => setOpen(v => !v)}
        >
          <span aria-hidden="true">☰</span>
        </button>
      </div>

      {/* Pannello mobile */}
      <div id="mobile-menu" className="nav-menu">
        <div className={`nav-menu-panel ${open ? 'open' : ''}`}>
          <div className="container">
            <nav className="nav-links">
              <NavItems inPanel />
            </nav>
          </div>
        </div>
      </div>
    </header>
  )
}