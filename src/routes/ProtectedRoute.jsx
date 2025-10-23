import { Navigate, Outlet } from 'react-router-dom'

export default function ProtectedRoute({ isAuthed }) {
  if (isAuthed === false) return <Navigate to="/login" replace />
  if (isAuthed === null)  return <div className="container"><p>Verifica sessione…</p></div>
  return <Outlet />
}
