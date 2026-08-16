import "../styles/studentTheme.css"
import Sidebar from "../components/Sidebar"
import Topbar from "../components/Topbar"
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { AuthAPI, StudentRequestAPI } from "../api/api"
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts"

/* ── Status helpers ── */
function reqStatusLabel(s) {
  switch (String(s || "").toUpperCase()) {
    case "PENDING_LECTURER_APPROVAL":     return "Pending Approval"
    case "APPROVED_BY_LECTURER":          return "Approved"
    case "REJECTED_BY_LECTURER":          return "Rejected"
    case "TO_PROCESSING":                 return "TO Processing"
    case "ISSUED_PENDING_STUDENT_ACCEPT": return "Issued — Confirm?"
    case "ISSUED_CONFIRMED":              return "Issued & Confirmed"
    case "RETURNED_PENDING_TO_VERIFY":    return "Return Pending"
    case "RETURNED_VERIFIED":             return "Returned"
    case "DAMAGED_REPORTED":              return "Damaged"
    default: return String(s || "").replace(/_/g, " ") || "—"
  }
}

function reqSpClass(s) {
  switch (String(s || "").toUpperCase()) {
    case "PENDING_LECTURER_APPROVAL":     return "st-sp st-sp-pending"
    case "APPROVED_BY_LECTURER":          return "st-sp st-sp-approved"
    case "REJECTED_BY_LECTURER":          return "st-sp st-sp-rejected"
    case "TO_PROCESSING":                 return "st-sp st-sp-processing"
    case "ISSUED_PENDING_STUDENT_ACCEPT": return "st-sp st-sp-issued"
    case "ISSUED_CONFIRMED":              return "st-sp st-sp-confirmed"
    case "RETURNED_PENDING_TO_VERIFY":    return "st-sp st-sp-return-req"
    case "RETURNED_VERIFIED":             return "st-sp st-sp-returned"
    case "DAMAGED_REPORTED":              return "st-sp st-sp-damaged"
    default: return "st-sp st-sp-slate"
  }
}

/* Semantic bucket for charts */
function reqBucket(s) {
  const u = String(s || "").toUpperCase()
  if (u === "PENDING_LECTURER_APPROVAL")                         return "Pending"
  if (u === "REJECTED_BY_LECTURER")                              return "Rejected"
  if (u === "RETURNED_VERIFIED" || u === "DAMAGED_REPORTED")     return "Completed"
  if (u.includes("ISSUED") || u === "TO_PROCESSING")             return "Issued / Active"
  if (u.includes("RETURN"))                                      return "Returning"
  return "Approved"
}

/* Derive a "display" overall status for a request that has multiple items.
   The request-level status can lag; we compute a more accurate label from items. */
function deriveOverallStatus(r) {
  const items = Array.isArray(r?.items) ? r.items : []
  if (!items.length) return r.status

  const statuses = items.map(it => String(it.itemStatus || "").toUpperCase())

  // If every item is returned/verified → fully completed
  if (statuses.every(s => s === "RETURN_VERIFIED" || s === "DAMAGED_REPORTED"))
    return "RETURNED_VERIFIED"

  // If some items need return verification
  if (statuses.some(s => s === "RETURN_REQUESTED" || s === "RETURN_VERIFIED"))
    return "RETURNED_PENDING_TO_VERIFY"

  // If any item needs student to confirm
  if (statuses.some(s => s === "ISSUED_PENDING_REQUESTER_ACCEPT"))
    return "ISSUED_PENDING_STUDENT_ACCEPT"

  // Fall back to request-level status
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

/* Need-action: student has something to do */
function needsAction(r) {
  const u = String(r.status || "").toUpperCase()
  if (u === "ISSUED_PENDING_STUDENT_ACCEPT") return true
  // any item pending accept
  if (Array.isArray(r.items) && r.items.some(
    it => String(it.itemStatus || "").toUpperCase() === "ISSUED_PENDING_REQUESTER_ACCEPT"
  )) return true
  return false
}

const PIE_COLORS = ["#d97706", "#16a34a", "#dc2626", "#4f46e5", "#7c3aed", "#0891b2"]

function itemsSummary(r) {
  const items = Array.isArray(r?.items) ? r.items : []
  if (!items.length) return "—"
  if (items.length === 1) return items[0].equipmentName || "—"
  return `${items[0].equipmentName || "—"} +${items.length - 1} more`
}

export default function StudentDashboard() {
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
        const [list, me] = await Promise.all([StudentRequestAPI.my(), AuthAPI.me()])
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
  const counts = useMemo(() => ({
    total:      rows.length,
    pending:    rows.filter(r => String(r.status || "").toUpperCase() === "PENDING_LECTURER_APPROVAL").length,
    rejected:   rows.filter(r => String(r.status || "").toUpperCase() === "REJECTED_BY_LECTURER").length,
    active:     rows.filter(r => {
      const u = String(r.status || "").toUpperCase()
      return u !== "PENDING_LECTURER_APPROVAL" && u !== "REJECTED_BY_LECTURER" && !isFullyCompleted(r)
    }).length,
    needAction: rows.filter(needsAction).length,
    completed:  rows.filter(isFullyCompleted).length,
  }), [rows])

  /* ── Pie data ── */
  const pieData = useMemo(() => {
    const map = {}
    for (const r of rows) { const k = reqBucket(r.status); map[k] = (map[k] || 0) + 1 }
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [rows])

  /* ── Monthly bar ── */
  const barData = useMemo(() => {
    const map = {}
    for (const r of rows) {
      const d = r.fromDate ? new Date(r.fromDate) : null
      if (!d || isNaN(d)) continue
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      map[key] = (map[key] || 0) + 1
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, count]) => ({ month: month.slice(5), count }))
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
          <div className="st-welcome-banner">
            <div className="st-welcome-name">
              Welcome back, {user?.fullName || "Student"}!
            </div>
            <div className="st-welcome-sub">
              {user?.regNo ? `Reg. No: ${user.regNo}` : ""}
              {user?.regNo && user?.department ? " · " : ""}
              {user?.department || ""}
              {(user?.regNo || user?.department) ? " · " : ""}
              Faculty of Engineering, University of Jaffna
            </div>
            {user?.role && (
              <div className="st-welcome-badge">🎓 {user.role}</div>
            )}
          </div>

          {/* Page Header */}
          <div className="st-page-header">
            <div className="st-page-header-left">
              <div className="st-page-title">Dashboard</div>
              <div className="st-page-subtitle">Overview of your equipment requests</div>
            </div>
            <div className="st-page-actions">
              <button className="st-btn st-btn-primary" onClick={() => navigate("/new-request")}>
                + New Request
              </button>
            </div>
          </div>

          {error && <div className="st-alert st-alert-error">{error}</div>}

          {/* Stat Cards */}
          <div className="st-stat-grid">
            <div className="st-stat-card indigo">
              <div className="st-stat-label">Total Requests</div>
              <div className="st-stat-value">{loading ? "—" : counts.total}</div>
              <div className="st-stat-sub">All time</div>
            </div>
            <div className="st-stat-card amber">
              <div className="st-stat-label">Pending</div>
              <div className="st-stat-value">{loading ? "—" : counts.pending}</div>
              <div className="st-stat-sub">Awaiting lecturer</div>
            </div>
            <div className="st-stat-card blue">
              <div className="st-stat-label">Active</div>
              <div className="st-stat-value">{loading ? "—" : counts.active}</div>
              <div className="st-stat-sub">In progress</div>
            </div>
            <div className="st-stat-card green">
              <div className="st-stat-label">Action Needed</div>
              <div className="st-stat-value">{loading ? "—" : counts.needAction}</div>
              <div className="st-stat-sub">Accept issuance</div>
            </div>
            <div className="st-stat-card red">
              <div className="st-stat-label">Rejected</div>
              <div className="st-stat-value">{loading ? "—" : counts.rejected}</div>
              <div className="st-stat-sub">Declined by lecturer</div>
            </div>
            <div className="st-stat-card slate">
              <div className="st-stat-label">Completed</div>
              <div className="st-stat-value">{loading ? "—" : counts.completed}</div>
              <div className="st-stat-sub">All items returned</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="st-section-hd" style={{ marginTop: 0 }}>
            <div className="st-section-title">Quick Actions</div>
          </div>
          <div className="st-qa-grid">
            <div className="st-qa-card st-qa-indigo" onClick={() => navigate("/new-request")}>
              <div className="st-qa-icon">📋</div>
              <div className="st-qa-label">New Request</div>
            </div>
            <div className="st-qa-card st-qa-blue" onClick={() => navigate("/view-requests")}>
              <div className="st-qa-icon">🔍</div>
              <div className="st-qa-label">My Requests</div>
            </div>
            <div className="st-qa-card st-qa-amber" onClick={() => navigate("/history")}>
              <div className="st-qa-icon">📜</div>
              <div className="st-qa-label">History</div>
            </div>
          </div>

          {/* Charts */}
          {!loading && (pieData.length > 0 || barData.length > 0) && (
            <div className="st-chart-grid-2" style={{ marginBottom: 28 }}>
              {pieData.length > 0 && (
                <div className="st-chart-card">
                  <div className="st-chart-title">Request Status Breakdown</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" outerRadius={74} dataKey="value">
                        {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend iconSize={10} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              {barData.length > 0 && (
                <div className="st-chart-card">
                  <div className="st-chart-title">Monthly Request Activity</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={barData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Requests" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Recent Requests */}
          <div className="st-section-hd">
            <div className="st-section-title">Recent Requests</div>
            {rows.length > 8 && (
              <button className="st-btn st-btn-ghost st-btn-sm" onClick={() => navigate("/view-requests")}>
                View all →
              </button>
            )}
          </div>

          {loading ? (
            <div className="st-empty">
              <div className="st-empty-icon">⏳</div>
              <div className="st-empty-text">Loading dashboard…</div>
            </div>
          ) : recent.length === 0 ? (
            <div className="st-empty">
              <div className="st-empty-icon">📭</div>
              <div className="st-empty-text">No requests yet — submit your first equipment request</div>
              <div style={{ marginTop: 14 }}>
                <button className="st-btn st-btn-primary" onClick={() => navigate("/new-request")}>
                  + New Request
                </button>
              </div>
            </div>
          ) : (
            <div className="st-table-wrap">
              <table className="st-table">
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
                    <tr key={r.requestId}
                      style={needsAction(r) ? { background: "#faf5ff" } : undefined}
                    >
                      <td className="st-id">#{r.requestId}</td>
                      <td style={{ fontWeight: 600 }}>{itemsSummary(r)}</td>
                      <td className="st-muted">{r.labName || "—"}</td>
                      <td>
                        {r.purpose && (
                          <span className={`st-purpose ${String(r.purpose).toLowerCase()}`}>
                            {r.purpose}
                          </span>
                        )}
                      </td>
                      <td className="st-muted">{r.fromDate || "—"}</td>
                      <td className="st-muted">{r.toDate || "—"}</td>
                      <td><span className={reqSpClass(deriveOverallStatus(r))}>{reqStatusLabel(deriveOverallStatus(r))}</span></td>
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