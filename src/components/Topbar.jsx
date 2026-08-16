import NotificationBell from "./NotificationBell"
import { useEffect, useState } from "react"
import { AuthAPI } from "../api/api"

// Role badge colours — inline only, no injected CSS that conflicts with dashboard.css
const ROLE_META = {
  hod:        { label: "HOD",        color: "#15803d", bg: "#dcfce7", border: "#86efac" },
  lecturer:   { label: "Lecturer",   color: "#1d4ed8", bg: "#dbeafe", border: "#93c5fd" },
  to:         { label: "TO",         color: "#0e7490", bg: "#cffafe", border: "#67e8f9" },
  admin:      { label: "Admin",      color: "#7c3aed", bg: "#ede9fe", border: "#c4b5fd" },
  student:    { label: "Student",    color: "#be185d", bg: "#fce7f3", border: "#f9a8d4" },
  staff:      { label: "Staff",      color: "#b45309", bg: "#fef3c7", border: "#fcd34d" },
  instructor: { label: "Instructor", color: "#b45309", bg: "#fef3c7", border: "#fcd34d" },
}

function initials(name) {
  if (!name) return "?"
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export default function Topbar({ onMenuClick }) {
  const [user, setUser] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) return
    AuthAPI.me()
      .then(me => setUser(me))
      .catch(() => {})
  }, [])

  const role = (user?.role || localStorage.getItem("role") || "").toLowerCase()
  const meta = ROLE_META[role] || { label: role.toUpperCase(), color: "#475569", bg: "#f1f5f9", border: "#cbd5e1" }

  return (
    <div className="topbar">
      {/* Left — logo + title (matches existing dashboard.css classes) */}
      <div className="topbar-left">
        {onMenuClick && (
          <button className="topbar-menu-btn" onClick={onMenuClick} aria-label="Open menu">
            ☰
          </button>
        )}
        <img src="/images/logo.png" alt="Logo" className="topbar-logo" />
        <span className="topbar-title">Equipment Request Management System</span>
      </div>

      {/* Right — role badge + bell + user chip */}
      <div className="topbar-right">

        {/* Role pill */}
        <span style={{
          display: "inline-block",
          padding: "3px 10px",
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: ".4px",
          textTransform: "uppercase",
          color: meta.color,
          background: meta.bg,
          border: `1px solid ${meta.border}`,
          fontFamily: "inherit",
        }}>
          {meta.label}
        </span>

        <NotificationBell />

        {/* User chip — only renders after AuthAPI.me() resolves, no flash */}
        {user && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "4px 12px 4px 4px",
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 999,
            cursor: "default",
          }}>
            <div style={{
              width: 28, height: 28,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #1d4ed8, #3b82f6)",
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}>
              {initials(user.fullName)}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", lineHeight: 1 }}>
                {user.fullName}
              </span>
              <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 500, textTransform: "uppercase", letterSpacing: ".4px", lineHeight: 1 }}>
                {meta.label}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}