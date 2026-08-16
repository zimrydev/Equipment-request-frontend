import "../styles/instructorTheme.css"
import Sidebar from "../components/Sidebar"
import Topbar from "../components/Topbar"
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { AuthAPI, StudentRequestAPI } from "../api/api"
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts"

/* ── Status helpers ── */
function itemSpClass(s) {
  if (!s) return "inst-sp inst-sp-slate"
  switch (String(s).toUpperCase()) {
    case "PENDING_LECTURER_APPROVAL":       return "inst-sp inst-sp-pending"
    case "APPROVED_BY_LECTURER":            return "inst-sp inst-sp-approved"
    case "REJECTED_BY_LECTURER":            return "inst-sp inst-sp-rejected"
    case "TO_PROCESSING":                   return "inst-sp inst-sp-processing"
    case "WAITING_TO_ISSUE":                return "inst-sp inst-sp-waiting"
    case "ISSUED_PENDING_REQUESTER_ACCEPT": return "inst-sp inst-sp-issued"
    case "ISSUED_CONFIRMED":                return "inst-sp inst-sp-confirmed"
    case "RETURN_REQUESTED":                return "inst-sp inst-sp-return-req"
    case "RETURN_VERIFIED":                 return "inst-sp inst-sp-returned"
    case "DAMAGED_REPORTED":                return "inst-sp inst-sp-damaged"
    default:                                return "inst-sp inst-sp-slate"
  }
}

function reqStatusLabel(s) {
  if (!s) return "—"
  switch (String(s).toUpperCase()) {
    case "PENDING_LECTURER_APPROVAL":       return "Pending Approval"
    case "APPROVED_BY_LECTURER":            return "Approved"
    case "REJECTED_BY_LECTURER":            return "Rejected"
    case "TO_PROCESSING":                   return "TO Processing"
    case "ISSUED_PENDING_STUDENT_ACCEPT":   return "Issued — Confirm?"
    case "ISSUED_CONFIRMED":                return "Issued & Confirmed"
    case "RETURNED_PENDING_TO_VERIFY":      return "Return Pending Verify"
    case "RETURNED_VERIFIED":               return "Returned"
    case "DAMAGED_REPORTED":                return "Damaged"
    default:                                return String(s).replace(/_/g, " ")
  }
}

/* Semantic bucket for pie chart */
function reqSemanticLabel(s) {
  const u = String(s || "").toUpperCase()
  if (u === "PENDING_LECTURER_APPROVAL")                          return "Pending"
  if (u === "REJECTED_BY_LECTURER")                               return "Rejected"
  if (u === "RETURNED_VERIFIED" || u === "DAMAGED_REPORTED")      return "Completed"
  if (u.includes("ISSUED") || u === "TO_PROCESSING")              return "Issued / Active"
  if (u.includes("RETURN"))                                       return "Returning"
  return "Approved"
}

/* Derive accurate overall status from item-level statuses for multi-item requests */
function deriveOverallStatus(r) {
  const items = Array.isArray(r?.items) ? r.items : []
  if (!items.length) return r.status
  const statuses = items.map(it => String(it.itemStatus || "").toUpperCase())
  if (statuses.every(s => s === "RETURN_VERIFIED" || s === "DAMAGED_REPORTED"))
    return "RETURNED_VERIFIED"
  if (statuses.some(s => s === "RETURN_REQUESTED" || s === "RETURN_VERIFIED"))
    return "RETURNED_PENDING_TO_VERIFY"
  if (statuses.some(s => s === "ISSUED_PENDING_REQUESTER_ACCEPT"))
    return "ISSUED_PENDING_STUDENT_ACCEPT"
  return r.status
}

/* True if ALL items in the request are fully returned/verified */
function isFullyCompleted(r) {
  const items = Array.isArray(r?.items) ? r.items : []
  if (!items.length) {
    const u = String(r.status || "").toUpperCase()
    return u === "RETURNED_VERIFIED" || u === "DAMAGED_REPORTED"
  }
  return items.every(it => {
    const s = String(it.itemStatus || "").toUpperCase()
    return s === "RETURN_VERIFIED" || s === "DAMAGED_REPORTED"
  })
}

const PIE_COLORS = ["#d97706", "#16a34a", "#dc2626", "#0d9488", "#7c3aed", "#0891b2"]

/* Items summary text for a request */
function itemsSummary(r) {
  const items = Array.isArray(r?.items) ? r.items : []
  if (!items.length) return "—"
  if (items.length === 1) return items[0].equipmentName || "—"
  return `${items[0].equipmentName || "—"} +${items.length - 1} more`
}

export default function InstructorDashboard() {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [rows,    setRows]    = useState([])
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState("")

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [list, me] = await Promise.all([
          StudentRequestAPI.my(),
          AuthAPI.me(),
        ])
        if (!alive) return
        setRows(Array.isArray(list) ? list : [])
        setUser(me)
      } catch (e) {
        if (alive) setError(e?.message || "Failed to load dashboard")
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  /* ── Counts ── */
  const counts = useMemo(() => {
    const total      = rows.length
    const pending    = rows.filter(r => String(r.status || "").toUpperCase() === "PENDING_LECTURER_APPROVAL").length
    const rejected   = rows.filter(r => String(r.status || "").toUpperCase() === "REJECTED_BY_LECTURER").length
    const active     = rows.filter(r => {
      const s = String(r.status || "").toUpperCase()
      return s !== "PENDING_LECTURER_APPROVAL" && s !== "REJECTED_BY_LECTURER" && !isFullyCompleted(r)
    }).length
    const needAction = rows.filter(r => {
      const s = String(r.status || "").toUpperCase()
      if (s === "ISSUED_PENDING_STUDENT_ACCEPT") return true
      return Array.isArray(r.items) && r.items.some(
        it => String(it.itemStatus || "").toUpperCase() === "ISSUED_PENDING_REQUESTER_ACCEPT"
      )
    }).length
    const completed  = rows.filter(isFullyCompleted).length
    return { total, pending, rejected, active, needAction, completed }
  }, [rows])

  /* ── Pie: status distribution ── */
  const pieData = useMemo(() => {
    const map = {}
    for (const r of rows) {
      const label = reqSemanticLabel(r.status)
      map[label] = (map[label] || 0) + 1
    }
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [rows])

  /* ── Bar: top equipment requested ── */
  const equipBarData = useMemo(() => {
    const map = {}
    for (const r of rows) {
      for (const it of (Array.isArray(r.items) ? r.items : [])) {
        const name = it.equipmentName || `Equipment #${it.equipmentId}`
        map[name] = (map[name] || 0) + (it.quantity || 1)
      }
    }
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 7)
      .map(([name, count]) => ({
        name: name.length > 13 ? name.slice(0, 13) + "…" : name, count,
      }))
  }, [rows])

  /* ── Recent 8 requests ── */
  const recent = useMemo(() =>
    [...rows].sort((a, b) => (b.requestId || 0) - (a.requestId || 0)).slice(0, 8)
  , [rows])

  return (
    <div className="dashboard-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <div className="content">

          {/* Welcome Banner */}
          <div className="inst-welcome-banner">
            <div className="inst-welcome-name">
              Welcome, {user?.fullName || "Instructor"}
            </div>
            <div className="inst-welcome-sub">
              {user?.department ? `${user.department} · ` : ""}Faculty of Engineering, University of Jaffna
            </div>
          </div>

          {/* Page Header */}
          <div className="inst-page-header">
            <div className="inst-page-header-left">
              <div className="inst-page-title">Dashboard</div>
              <div className="inst-page-subtitle">Overview of your equipment requests</div>
            </div>
            <div className="inst-page-actions">
              <button className="inst-btn inst-btn-primary" onClick={() => navigate("/instructor-new-request")}>
                + New Request
              </button>
            </div>
          </div>

          {error && <div className="inst-alert inst-alert-error">{error}</div>}

          {/* Stat Cards */}
          <div className="inst-stat-grid">
            <div className="inst-stat-card teal">
              <div className="inst-stat-label">Total Requests</div>
              <div className="inst-stat-value">{loading ? "—" : counts.total}</div>
              <div className="inst-stat-sub">All time</div>
            </div>
            <div className="inst-stat-card amber">
              <div className="inst-stat-label">Pending Approval</div>
              <div className="inst-stat-value">{loading ? "—" : counts.pending}</div>
              <div className="inst-stat-sub">Awaiting lecturer</div>
            </div>
            <div className="inst-stat-card blue">
              <div className="inst-stat-label">Active</div>
              <div className="inst-stat-value">{loading ? "—" : counts.active}</div>
              <div className="inst-stat-sub">In progress</div>
            </div>
            <div className="inst-stat-card green">
              <div className="inst-stat-label">Need Action</div>
              <div className="inst-stat-value">{loading ? "—" : counts.needAction}</div>
              <div className="inst-stat-sub">Accept issuance</div>
            </div>
            <div className="inst-stat-card red">
              <div className="inst-stat-label">Rejected</div>
              <div className="inst-stat-value">{loading ? "—" : counts.rejected}</div>
              <div className="inst-stat-sub">Declined by lecturer</div>
            </div>
            <div className="inst-stat-card slate">
              <div className="inst-stat-label">Completed</div>
              <div className="inst-stat-value">{loading ? "—" : counts.completed}</div>
              <div className="inst-stat-sub">All items returned</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="inst-section-hd" style={{ marginTop: 0 }}>
            <div className="inst-section-title">Quick Actions</div>
          </div>
          <div className="inst-qa-grid">
            <div className="inst-qa-card inst-qa-teal" onClick={() => navigate("/instructor-new-request")}>
              <div className="inst-qa-icon">📋</div>
              <div className="inst-qa-label">New Request</div>
            </div>
            <div className="inst-qa-card inst-qa-blue" onClick={() => navigate("/instructor-view-requests")}>
              <div className="inst-qa-icon">🔍</div>
              <div className="inst-qa-label">View Requests</div>
            </div>
            <div className="inst-qa-card inst-qa-amber" onClick={() => navigate("/instructor-history")}>
              <div className="inst-qa-icon">📜</div>
              <div className="inst-qa-label">History</div>
            </div>
          </div>

          {/* Charts */}
          {!loading && (pieData.length > 0 || equipBarData.length > 0) && (
            <div className="inst-chart-grid-2" style={{ marginBottom: 28 }}>
              {pieData.length > 0 && (
                <div className="inst-chart-card">
                  <div className="inst-chart-title">Request Status Breakdown</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" outerRadius={74} dataKey="value">
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend iconSize={10} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              {equipBarData.length > 0 && (
                <div className="inst-chart-card">
                  <div className="inst-chart-title">Top Equipment Requested</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={equipBarData} layout="vertical" margin={{ top: 4, right: 20, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#0d9488" radius={[0, 4, 4, 0]} name="Qty" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Recent Requests */}
          <div className="inst-section-hd">
            <div className="inst-section-title">Recent Requests</div>
            {rows.length > 8 && (
              <button className="inst-btn inst-btn-ghost inst-btn-sm" onClick={() => navigate("/instructor-view-requests")}>
                View all →
              </button>
            )}
          </div>

          {loading ? (
            <div className="inst-empty">
              <div className="inst-empty-icon">⏳</div>
              <div className="inst-empty-text">Loading dashboard…</div>
            </div>
          ) : recent.length === 0 ? (
            <div className="inst-empty">
              <div className="inst-empty-icon">📭</div>
              <div className="inst-empty-text">No requests yet — submit your first request</div>
              <div style={{ marginTop: 14 }}>
                <button className="inst-btn inst-btn-primary" onClick={() => navigate("/instructor-new-request")}>
                  + New Request
                </button>
              </div>
            </div>
          ) : (
            <div className="inst-table-wrap">
              <table className="inst-table">
                <thead>
                  <tr>
                    <th>Req #</th>
                    <th>Equipment</th>
                    <th>Lab</th>
                    <th>Purpose</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map(r => (
                    <tr key={r.requestId}>
                      <td className="inst-id">#{r.requestId}</td>
                      <td style={{ fontWeight: 600 }}>{itemsSummary(r)}</td>
                      <td className="inst-muted">{r.labName || "—"}</td>
                      <td>
                        {r.purpose && (
                          <span className={`inst-purpose ${String(r.purpose).toLowerCase()}`}>
                            {r.purpose}
                          </span>
                        )}
                      </td>
                      <td className="inst-muted">{r.fromDate || "—"}</td>
                      <td className="inst-muted">{r.toDate || "—"}</td>
                      <td>
                        <span className={itemSpClass(deriveOverallStatus(r))}>
                          {reqStatusLabel(deriveOverallStatus(r))}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}