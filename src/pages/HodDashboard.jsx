import { Navigate } from "react-router-dom"

// Backwards-compatible route: /hod-dashboard
// HOD home should open "My Work" (HOD_Personal)
export default function HodDashboard() {
  return <Navigate to="/hod-my-work" replace />
}
