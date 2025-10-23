import { useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { supabase } from './supabaseClient'
import Navbar from './components/Navbar'
import ProtectedRoute from './routes/ProtectedRoute'

import LoginPage from './pages/LoginPage'
import PlayPage from './pages/PlayPage'
import TeamsNew from './pages/TeamsNew'

// 🔽 aggiungi queste import
import Home from './pages/Home'
import CalendarPage from './pages/CalendarPage'
import StandingsPage from './pages/StandingsPage'

export default function App() {
  const [session, setSession] = useState(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setChecking(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (checking) return null

  const isAuthed = !!session
  const handleLogout = async () => { await supabase.auth.signOut(); setSession(null) }

  return (
    <>
      <Navbar onLogout={handleLogout} isAuthed={isAuthed} />
      <Routes>
        {/* Pubbliche */}
        <Route path="/" element={<Home />} />
        <Route path="/standings" element={<StandingsPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Protette */}
        <Route element={<ProtectedRoute isAuthed={isAuthed} />}>
          <Route path="/play" element={<PlayPage />} />
          <Route path="/teams/new" element={<TeamsNew />} />
        </Route>
      </Routes>

      <footer className="footer">
        <div className="container">© {new Date().getFullYear()} Serie FoveA</div>
      </footer>
    </>
  )
}