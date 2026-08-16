import "../styles/dashboard.css"
import "../styles/lecturerTheme.css"
import Sidebar from "../components/Sidebar"
import Topbar from "../components/Topbar"
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { LecturerRequestAPI, AuthAPI } from "../api/api"
import {
  AiOutlinePlus, AiOutlineClockCircle, AiOutlineUnorderedList, AiOutlineHistory
} from "react-icons/ai"
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts"

/* ---------- helpers ---------- */
function statusPill(status) {
  const s = String(status || "").toUpperCase()
  if (s === "PENDING_LECTURER_APPROVAL")       return { cls: "lt-sp-pending",    label: "Pending Approval" }
  if (s === "APPROVED_BY_LECTURER")            return { cls: "lt-sp-approved",   label: "Approved" }
  if (s === "REJECTED_BY_LECTURER")            return { cls: "lt-sp-rejected",   label: "Rejected" }
  if (s === "TO_PROCESSING")                   return { cls: "lt-sp-processing", label: "TO Processing" }
  if (s === "WAITING_TO_ISSUE")                return { cls: "lt-sp-waiting",    label: "Waiting to Issue" }
  if (s === "ISSUED_PENDING_REQUESTER_ACCEPT") return { cls: "lt-sp-issued",     label: "Issued — Confirm?" }
  if (s === "ISSUED_CONFIRMED")                return { cls: "lt-sp-confirmed",  label: "Issued Confirmed" }
  if (s === "RETURN_REQUESTED")                return { cls: "lt-sp-returned",   label: "Return Requested" }
  if (s === "RETURN_VERIFIED")                 return { cls: "lt-sp-returned",   label: "Returned" }
  if (s === "DAMAGED_REPORTED")                return { cls: "lt-sp-damaged",    label: "Damaged" }
  return { cls: "lt-sp-slate", label: s.replace(/_/g, " ") || "–" }
}

function reqSemanticLabel(status) {
  const s = String(status || "").toUpperCase()
  if (s === "PENDING_LECTURER_APPROVAL") return "Pending"
  if (s.includes("REJECT"))             return "Rejected"
  if (s.includes("ISSUED"))             return "Issued"
  if (s.includes("RETURN"))             return "Returned"
  if (s === "APPROVED_BY_LECTURER" || s === "TO_PROCESSING") return "Approved"
  return "Active"
}

const PIE_COLORS = ["#d97706","#16a34a","#dc2626","#2563eb","#7c3aed","#0891b2"]

/* True if ALL items in the request are fully returned/verified */
function isFullyCompleted(r) {
  const items = Array.isArray(r?.items) ? r.items : []
  if (!items.length) {
    const u = String(r.status || "").toUpperCase()
    return u === "RETURN_VERIFIED" || u === "RETURNED_VERIFIED" || u === "DAMAGED_REPORTED"
  }
  return items.every(it => {
    const s = String(it.itemStatus || "").toUpperCase()
    return s === "RETURN_VERIFIED" || s === "DAMAGED_REPORTED"
  })
}

function firstItemLabel(r) {
  const items = Array.isArray(r?.items) ? r.items : []
  if (!items.length) return "–"
  return items.length === 1
    ? (items[0].equipmentName || "–")
    : `${items[0].equipmentName || "–"} +${items.length - 1} more`
}
/* ------------------------------ */

export default function LecturerDashboard() {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [queue,   setQueue]   = useState([])
  const [myRows,  setMyRows]  = useState([])
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState("")

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [q, my, me] = await Promise.all([
          LecturerRequestAPI.queue(),
          LecturerRequestAPI.my(),
          AuthAPI.me(),
        ])
        if (!alive) return
        setQueue(Array.isArray(q) ? q : [])
        setMyRows(Array.isArray(my) ? my : [])
        setUser(me)
      } catch (e) {
        if (alive) setError(e?.message || "Failed to load dashboard")
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  const counts = useMemo(() => {
    const pendingItems = queue.reduce((s, r) =>
      s + (Array.isArray(r.items)
        ? r.items.filter(i => i.itemStatus === "PENDING_LECTURER_APPROVAL").length
        : 0), 0)
    return {
      pendingRequests: queue.length,
      pendingItems,
      totalMine:    myRows.length,
      activeMine:   myRows.filter(r => String(r.status || "").toUpperCase() !== "REJECTED_BY_LECTURER" && !isFullyCompleted(r)).length,
      rejectedMine: myRows.filter(r => String(r.status || "").toUpperCase() === "REJECTED_BY_LECTURER").length,
      returnedMine: myRows.filter(isFullyCompleted).length,
    }
  }, [queue, myRows])

  const myPieData = useMemo(() => {
    const m = {}
    for (const r of myRows) { const l = reqSemanticLabel(r.status); m[l] = (m[l] || 0) + 1 }
    return Object.entries(m).map(([name, value]) => ({ name, value }))
  }, [myRows])

  const topEquipData = useMemo(() => {
    const m = {}
    for (const r of queue) {
      for (const it of (Array.isArray(r.items) ? r.items : [])) {
        const n = it.equipmentName || "Unknown"
        m[n] = (m[n] || 0) + (it.quantity || 1)
      }
    }
    return Object.entries(m).sort(([,a],[,b]) => b-a).slice(0, 6)
      .map(([name, count]) => ({ name: name.length > 16 ? name.slice(0,16)+"…" : name, count }))
  }, [queue])

  const recentMine = useMemo(() =>
    [...myRows].sort((a, b) => (b.requestId || 0) - (a.requestId || 0)).slice(0, 6)
  , [myRows])

  return (
    <div className="dashboard-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <div className="content">

          {/* Welcome Banner */}
          <div className="lt-welcome-banner">
            <div className="lt-welcome-name">
              Welcome, {loading ? "…" : (user?.fullName || "Lecturer")}!
            </div>
            <div className="lt-welcome-sub">
              {user?.department ? `${user.department} · ` : ""}Lecturer Portal · Faculty of Engineering, University of Jaffna
            </div>
            <div className="lt-welcome-badge">🎓 LECTURER</div>
          </div>

          {error && <div className="lt-alert lt-alert-error">{error}</div>}

          {/* Stats */}
          <div className="lt-stat-grid">
            <div className="lt-stat-card amber">
              <div className="lt-stat-label">Pending Approvals</div>
              <div className="lt-stat-value">{loading ? "–" : counts.pendingRequests}</div>
              <div className="lt-stat-sub">{counts.pendingItems} item{counts.pendingItems !== 1 ? "s" : ""} waiting</div>
            </div>
            <div className="lt-stat-card blue">
              <div className="lt-stat-label">My Requests</div>
              <div className="lt-stat-value">{loading ? "–" : counts.totalMine}</div>
            </div>
            <div className="lt-stat-card green">
              <div className="lt-stat-label">Active</div>
              <div className="lt-stat-value">{loading ? "–" : counts.activeMine}</div>
              <div className="lt-stat-sub">In progress</div>
            </div>
            <div className="lt-stat-card red">
              <div className="lt-stat-label">Rejected</div>
              <div className="lt-stat-value">{loading ? "–" : counts.rejectedMine}</div>
              <div className="lt-stat-sub">Declined by lecturer</div>
            </div>
            <div className="lt-stat-card cyan">
              <div className="lt-stat-label">Completed</div>
              <div className="lt-stat-value">{loading ? "–" : counts.returnedMine}</div>
              <div className="lt-stat-sub">All items returned</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="lt-section-hd">
            <span className="lt-section-title">Quick Actions</span>
          </div>
          <div className="lt-qa-grid">
            <div className="lt-qa-card lt-qa-blue"   onClick={() => navigate("/lecturer-new-request")}>
              <div className="lt-qa-icon"><AiOutlinePlus /></div>
              <div className="lt-qa-label">New Request</div>
            </div>
            <div className="lt-qa-card lt-qa-amber"  onClick={() => navigate("/lecturer-applications")}>
              <div className="lt-qa-icon"><AiOutlineClockCircle /></div>
              <div className="lt-qa-label">Pending Approvals ({counts.pendingRequests})</div>
            </div>
            <div className="lt-qa-card lt-qa-green"  onClick={() => navigate("/lecturer-view-requests")}>
              <div className="lt-qa-icon"><AiOutlineUnorderedList /></div>
              <div className="lt-qa-label">My Requests</div>
            </div>
            <div className="lt-qa-card lt-qa-purple" onClick={() => navigate("/lecturer-history")}>
              <div className="lt-qa-icon"><AiOutlineHistory /></div>
              <div className="lt-qa-label">History</div>
            </div>
          </div>

          {/* Charts */}
          {!loading && (myPieData.length > 0 || topEquipData.length > 0) && (
            <div className="lt-chart-grid-2">
              {myPieData.length > 0 && (
                <div className="lt-chart-card">
                  <div className="lt-chart-title">My Requests — Status Breakdown</div>
                  <ResponsiveContainer width="100%" height={210}>
                    <PieChart>
                      <Pie data={myPieData} cx="50%" cy="50%" innerRadius={52} outerRadius={80}
                        dataKey="value" paddingAngle={3}>
                        {myPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              {topEquipData.length > 0 && (
                <div className="lt-chart-card">
                  <div className="lt-chart-title">Top Equipment in Approval Queue</div>
                  <ResponsiveContainer width="100%" height={210}>
                    <BarChart data={topEquipData} layout="vertical" margin={{ top:4, right:20, bottom:4, left:0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#7c3aed" radius={[0,4,4,0]} name="Total Qty" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Pending queue preview */}
          {!loading && queue.length > 0 && (
            <>
              <div className="lt-section-hd">
                <span className="lt-section-title">Pending Student Applications</span>
                <span style={{ background:"#fef3c7", color:"#92400e", padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, border:"1px solid #fde68a" }}>
                  {queue.length} awaiting
                </span>
              </div>
              <div className="lt-table-wrap">
                <table className="lt-table">
                  <thead>
                    <tr><th>#ID</th><th>Requester</th><th>Reg No</th><th>Role</th><th>Lab</th><th>Equipment</th><th>From</th><th>To</th></tr>
                  </thead>
                  <tbody>
                    {queue.slice(0, 5).map(r => (
                      <tr key={r.requestId}>
                        <td className="lt-id">#{r.requestId}</td>
                        <td style={{ fontWeight: 600 }}>{r.requesterFullName || "–"}</td>
                        <td className="lt-muted">{r.requesterRegNo || "–"}</td>
                        <td><span className="lt-sp lt-sp-slate">{r.requesterRole || "–"}</span></td>
                        <td>{r.labName || "–"}</td>
                        <td>{firstItemLabel(r)}</td>
                        <td className="lt-muted">{r.fromDate || "–"}</td>
                        <td className="lt-muted">{r.toDate || "–"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {queue.length > 5 && (
                <div style={{ textAlign: "center", marginBottom: 20 }}>
                  <button className="lt-btn lt-btn-outline" onClick={() => navigate("/lecturer-applications")}>
                    View all {queue.length} applications →
                  </button>
                </div>
              )}
            </>
          )}

          {/* My recent requests */}
          {!loading && recentMine.length > 0 && (
            <>
              <div className="lt-section-hd">
                <span className="lt-section-title">My Recent Requests</span>
                <button className="lt-btn lt-btn-ghost lt-btn-sm" onClick={() => navigate("/lecturer-view-requests")}>
                  View all →
                </button>
              </div>
              <div className="lt-table-wrap">
                <table className="lt-table">
                  <thead>
                    <tr><th>#ID</th><th>Equipment</th><th>Lab</th><th>Purpose</th><th>From</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {recentMine.map(r => {
                      const { cls, label } = statusPill(r.status)
                      return (
                        <tr key={r.requestId}>
                          <td className="lt-id">#{r.requestId}</td>
                          <td style={{ fontWeight: 600 }}>{firstItemLabel(r)}</td>
                          <td>{r.labName || "–"}</td>
                          <td className="lt-muted">{r.purpose || "–"}</td>
                          <td className="lt-muted">{r.fromDate || "–"}</td>
                          <td><span className={`lt-sp ${cls}`}>{label}</span></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {!loading && myRows.length === 0 && queue.length === 0 && (
            <div className="lt-empty">
              <div className="lt-empty-icon">📋</div>
              <div className="lt-empty-text">No requests yet — use <strong>New Request</strong> to get started.</div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}