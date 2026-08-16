import "../styles/hodTheme.css"
import Sidebar from "../components/Sidebar"
import Topbar from "../components/Topbar"
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { LecturerRequestAPI, AuthAPI } from "../api/api"
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts"
import {
  AiOutlinePlus, AiOutlineFileText,
  AiOutlineCheckCircle, AiOutlineCloseCircle
} from "react-icons/ai"
import {
  FaClipboardCheck, FaListAlt, FaFlask, FaSearch
} from "react-icons/fa"

/* ── helpers ── */
function getStatusPill(s) {
  const v = String(s || "").toUpperCase()
  if (v.includes("APPROVED") || v.includes("CONFIRMED") || v.includes("VERIFIED") || v.includes("RECEIVED")) return "sp sp-green"
  if (v.includes("REJECTED") || v.includes("DAMAGED")) return "sp sp-red"
  if (v.includes("PROCESSING") || v.includes("ISSUED")) return "sp sp-blue"
  if (v.includes("PENDING") || v.includes("SUBMITTED")) return "sp sp-amber"
  return "sp sp-slate"
}
const fmtStatus = s => String(s || "–").replace(/_/g, " ")

const CHART_COLORS = ["#2563eb", "#16a34a", "#d97706", "#dc2626", "#7c3aed", "#0891b2"]

export default function HodMyWork() {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [myRows, setMyRows] = useState([])
  const [queue, setQueue] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [me, q, my] = await Promise.all([
          AuthAPI.me(),
          LecturerRequestAPI.queue(),
          LecturerRequestAPI.my(),
        ])
        if (!alive) return
        setUser(me)
        setQueue(Array.isArray(q) ? q : [])
        setMyRows(Array.isArray(my) ? my : [])
      } catch (e) {
        if (alive) setError(e?.message || "Failed to load dashboard")
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  /* summary counts */
  const stats = useMemo(() => {
    const v = s => String(s || "").toUpperCase()
    return {
      pending:  queue.length,
      total:    myRows.length,
      approved: myRows.filter(r => v(r.status).includes("APPROVED") || v(r.status).includes("ISSUED") || v(r.status).includes("PROCESSING")).length,
      rejected: myRows.filter(r => v(r.status).includes("REJECTED")).length,
      returned: myRows.filter(r => v(r.status).includes("RETURN")).length,
    }
  }, [queue, myRows])

  /* pie chart — my request status breakdown */
  const pieData = useMemo(() => {
    const counts = {}
    for (const r of myRows) {
      const label = fmtStatus(r.status)
      counts[label] = (counts[label] || 0) + 1
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [myRows])

  /* bar chart — approval queue by lab */
  const barData = useMemo(() => {
    const map = {}
    for (const r of queue) {
      const lab = r.labName || "Unknown"
      map[lab] = (map[lab] || 0) + 1
    }
    return Object.entries(map).map(([lab, count]) => ({ lab: lab.replace(/ Lab$/i, ""), count }))
  }, [queue])

  /* recent approval queue */
  const queueRows = useMemo(() =>
    [...queue]
      .sort((a, b) => (b.requestId || 0) - (a.requestId || 0))
      .slice(0, 6)
      .map(r => {
        const items = Array.isArray(r.items) ? r.items : []
        const first = items[0]
        return {
          id: r.requestId,
          requester: r.requesterName || r.requesterEmail || "–",
          regNo:     r.requesterRegNo || "–",
          role:      r.requesterRole  || "–",
          equipment: first?.equipmentName || "–",
          qty:       first?.quantity ?? "–",
          extra:     items.length > 1 ? `+${items.length - 1}` : null,
          lab:       r.labName   || "–",
          from:      r.fromDate  || "–",
          status:    r.status    || "–",
        }
      })
  , [queue])

  /* recent my requests */
  const myRecentRows = useMemo(() =>
    [...myRows]
      .sort((a, b) => (b.requestId || 0) - (a.requestId || 0))
      .slice(0, 8)
      .map(r => {
        const items = Array.isArray(r.items) ? r.items : []
        const first = items[0]
        return {
          id:        r.requestId,
          equipment: first?.equipmentName || "–",
          qty:       first?.quantity ?? "–",
          extra:     items.length > 1 ? `+${items.length - 1}` : null,
          lab:       r.labName     || "–",
          from:      r.fromDate    || "–",
          to:        r.toDate      || "–",
          purpose:   r.purpose || r.purposeType || "–",
          status:    r.status      || "–",
        }
      })
  , [myRows])

  return (
    <div className="dashboard-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <div className="content">

          {/* Welcome Banner */}
          <div className="hod-welcome-banner">
            <div className="hod-welcome-name">
              Welcome back, {loading ? "…" : (user?.fullName || "HOD")}!
            </div>
            <div className="hod-welcome-sub">
              {user?.department ? `Dept: ${user.department} · ` : ""}Head of Department · Faculty of Engineering, University of Jaffna
            </div>
            <div className="hod-welcome-badge">🏛 HOD</div>
          </div>

          {error && <div className="hod-alert hod-alert-error">{error}</div>}

          {/* Stats */}
          <div className="stat-grid">
            <div className="stat-card amber">
              <div className="stat-label">Pending Approvals</div>
              <div className="stat-value">{loading ? "–" : stats.pending}</div>
              <div className="stat-sub">Requests awaiting decision</div>
            </div>
            <div className="stat-card blue">
              <div className="stat-label">My Total Requests</div>
              <div className="stat-value">{loading ? "–" : stats.total}</div>
              <div className="stat-sub">All time</div>
            </div>
            <div className="stat-card green">
              <div className="stat-label">Approved / Active</div>
              <div className="stat-value">{loading ? "–" : stats.approved}</div>
              <div className="stat-sub">Issued or in progress</div>
            </div>
            <div className="stat-card red">
              <div className="stat-label">Rejected</div>
              <div className="stat-value">{loading ? "–" : stats.rejected}</div>
              <div className="stat-sub">All time</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="section-hd">
            <span className="section-hd-title">Quick Actions</span>
          </div>
          <div className="qa-grid">
            <div className="qa-card qa-blue" onClick={() => navigate("/lecturer-new-request")}>
              <div className="qa-card-icon"><AiOutlinePlus /></div>
              <div className="qa-card-label">New Request</div>
            </div>
            <div className="qa-card qa-amber" onClick={() => navigate("/lecturer-applications")}>
              <div className="qa-card-icon"><FaClipboardCheck size={18} /></div>
              <div className="qa-card-label">Approve Requests</div>
            </div>
            <div className="qa-card qa-green" onClick={() => navigate("/lecturer-view-requests")}>
              <div className="qa-card-icon"><FaListAlt size={18} /></div>
              <div className="qa-card-label">My Requests</div>
            </div>
            <div className="qa-card qa-purple" onClick={() => navigate("/hod-labs")}>
              <div className="qa-card-icon"><FaFlask size={18} /></div>
              <div className="qa-card-label">Lab Management</div>
            </div>
            <div className="qa-card qa-slate" onClick={() => navigate("/hod-inspect")}>
              <div className="qa-card-icon"><FaSearch size={18} /></div>
              <div className="qa-card-label">Inspect Dept</div>
            </div>
          </div>

          {/* Charts */}
          {!loading && (myRows.length > 0 || queue.length > 0) && (
            <div className="chart-grid-2">
              {myRows.length > 0 && pieData.length > 0 && (
                <div className="chart-card">
                  <div className="chart-card-title">My Requests — Status Breakdown</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                        dataKey="value" paddingAngle={3}>
                        {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v, n) => [v, n]} />
                      <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              {barData.length > 0 && (
                <div className="chart-card">
                  <div className="chart-card-title">Pending Approvals — By Lab</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={barData} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="lab" tick={{ fontSize: 11 }} width={110} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#2563eb" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Pending Approval Queue */}
          {queueRows.length > 0 && (
            <>
              <div className="section-hd">
                <span className="section-hd-title">Pending Your Approval ({stats.pending})</span>
                <button className="hod-btn hod-btn-primary" onClick={() => navigate("/lecturer-applications")}>
                  View All →
                </button>
              </div>
              <div className="hod-table-wrap" style={{ marginBottom: 24 }}>
                <table className="hod-table">
                  <thead>
                    <tr>
                      <th>#ID</th><th>Requester</th><th>Reg No</th><th>Equipment</th>
                      <th>Qty</th><th>Lab</th><th>From</th><th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queueRows.map(r => (
                      <tr key={r.id}>
                        <td className="req-id">#{r.id}</td>
                        <td>{r.requester}</td>
                        <td className="muted">{r.regNo}</td>
                        <td>
                          {r.equipment}
                          {r.extra && <span style={{ fontSize: 11, color: "var(--blue)", marginLeft: 5 }}>{r.extra}</span>}
                        </td>
                        <td className="tc">{r.qty}</td>
                        <td>{r.lab}</td>
                        <td className="tc muted">{r.from}</td>
                        <td><span className={getStatusPill(r.status)}>{fmtStatus(r.status)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* My Recent Requests */}
          <div className="section-hd">
            <span className="section-hd-title">My Recent Requests</span>
            {myRows.length > 8 && (
              <button className="hod-btn hod-btn-ghost" onClick={() => navigate("/lecturer-view-requests")}>
                View All →
              </button>
            )}
          </div>
          <div className="hod-table-wrap">
            <table className="hod-table">
              <thead>
                <tr>
                  <th>#ID</th><th>Equipment</th><th>Qty</th><th>Lab</th>
                  <th>From</th><th>To</th><th>Purpose</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr className="empty-row"><td colSpan="8">Loading…</td></tr>}
                {!loading && myRecentRows.length === 0 && (
                  <tr className="empty-row"><td colSpan="8">No requests yet</td></tr>
                )}
                {!loading && myRecentRows.map(r => (
                  <tr key={r.id}>
                    <td className="req-id">#{r.id}</td>
                    <td>
                      {r.equipment}
                      {r.extra && <span style={{ fontSize: 11, color: "var(--blue)", marginLeft: 5 }}>{r.extra}</span>}
                    </td>
                    <td className="tc">{r.qty}</td>
                    <td>{r.lab}</td>
                    <td className="tc muted">{r.from}</td>
                    <td className="tc muted">{r.to}</td>
                    <td className="muted">{r.purpose}</td>
                    <td><span className={getStatusPill(r.status)}>{fmtStatus(r.status)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  )
}