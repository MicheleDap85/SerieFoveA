import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/authContext'

export default function AuthGate({ children }) {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) return null // o uno spinner

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return children
}
