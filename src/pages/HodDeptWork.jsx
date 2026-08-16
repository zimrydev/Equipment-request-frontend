//check
import "../styles/hodTheme.css"
import Sidebar from "../components/Sidebar"
import Topbar from "../components/Topbar"
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { HodDepartmentAPI, HodPurchaseAPI, AuthAPI } from "../api/api"
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line
} from "recharts"
import { FaBox, FaClipboardList, FaListAlt, FaSearch, FaFlask, FaHistory } from "react-icons/fa"
import { AiOutlineTeam } from "react-icons/ai"

function getStatusPill(s) {
  const v = String(s || "").toUpperCase()
  if (v.includes("APPROVED") || v.includes("CONFIRMED") || v.includes("VERIFIED") || v.includes("RECEIVED")) return "sp sp-green"
  if (v.includes("REJECTED") || v.includes("DAMAGED")) return "sp sp-red"
  if (v.includes("PROCESSING") || v.includes("ISSUED")) return "sp sp-blue"
  if (v.includes("PENDING") || v.includes("SUBMITTED")) return "sp sp-amber"
  return "sp sp-slate"
}
const fmtStatus = s => String(s || "–").replace(/_/g, " ")
const COLORS = ["#d97706", "#2563eb", "#16a34a", "#dc2626", "#7c3aed", "#0891b2"]

export default function HodDeptWork() {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [deptReqs, setDeptReqs] = useState([])
  const [purchases, setPurchases] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [me, reqs, purch] = await Promise.all([
          AuthAPI.me(),
          HodDepartmentAPI.requests().catch(() => []),
          HodPurchaseAPI.pending().catch(() => []),
        ])
        if (!alive) return
        setUser(me)
        setDeptReqs(Array.isArray(reqs) ? reqs : [])
        setPurchases(Array.isArray(purch) ? purch : [])
      } catch (e) {
        if (alive) setError(e?.message || "Failed to load")
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  const stats = useMemo(() => {
    const v = s => String(s || "").toUpperCase()
    return {
      total:        deptReqs.length,
      pending:      deptReqs.filter(r => v(r.status).includes("PENDING")).length,
      active:       deptReqs.filter(r => v(r.status).includes("ISSUED") || v(r.status).includes("PROCESSING")).length,
      returned:     deptReqs.filter(r => v(r.status).includes("RETURN")).length,
      purchPending: purchases.length,
    }
  }, [deptReqs, purchases])

  /* pie — status distribution */
  const statusPie = useMemo(() => {
    const m = {}
    for (const r of deptReqs) {
      const k = fmtStatus(r.status)
      m[k] = (m[k] || 0) + 1
    }
    return Object.entries(m).map(([name, value]) => ({ name, value }))
  }, [deptReqs])

  /* bar — requests per lab */
  const labBar = useMemo(() => {
    const m = {}
    for (const r of deptReqs) {
      const k = r.labName || "Unknown"
      m[k] = (m[k] || 0) + 1
    }
    return Object.entries(m)
      .map(([lab, count]) => ({ lab: lab.replace(/ Lab$/i, ""), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  }, [deptReqs])

  /* line — monthly request trend (last 6 months) */
  const monthlyTrend = useMemo(() => {
    const map = {}
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = d.toLocaleString("default", { month: "short", year: "2-digit" })
      map[key] = 0
    }
    for (const r of deptReqs) {
      if (!r.fromDate) continue
      const d = new Date(r.fromDate)
      if (isNaN(d)) continue
      const key = d.toLocaleString("default", { month: "short", year: "2-digit" })
      if (map[key] !== undefined) map[key]++
    }
    return Object.entries(map).map(([month, count]) => ({ month, count }))
  }, [deptReqs])

  /* recent dept requests */
  const recentReqs = useMemo(() =>
    [...deptReqs]
      .sort((a, b) => (b.requestId || 0) - (a.requestId || 0))
      .slice(0, 8)
      .map(r => {
        const items = Array.isArray(r.items) ? r.items : []
        const first = items[0]
        return {
          id:        r.requestId,
          requester: r.requesterName  || r.requesterEmail || "–",
          regNo:     r.requesterRegNo || "–",
          role:      r.requesterRole  || "–",
          equipment: first?.equipmentName || "–",
          qty:       first?.quantity ?? "–",
          extra:     items.length > 1 ? `+${items.length - 1}` : null,
          lab:       r.labName  || "–",
          from:      r.fromDate || "–",
          status:    r.status   || "–",
        }
      })
  , [deptReqs])

  /* pending purchases */
  const purchRows = useMemo(() =>
    [...purchases]
      .sort((a, b) => (b.id || 0) - (a.id || 0))
      .slice(0, 5)
      .map(p => ({
        id:          p.id,
        submittedBy: p.toName || p.requestedByName || "–",
        itemCount:   (p.items || []).length,
        firstItem:   p.items?.[0]?.equipmentName || "–",
        date:        p.createdDate || "–",
        status:      p.status || "–",
      }))
  , [purchases])

  return (
    <div className="dashboard-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <div className="content">

          <div className="hod-page-header">
            <div>
              <div className="hod-page-title">Department Overview</div>
              <div className="hod-page-subtitle">Dept: {user?.department || "–"} &nbsp;·&nbsp; All requests and purchases</div>
            </div>
          </div>

          {error && <div className="hod-alert hod-alert-error">{error}</div>}

          {/* Stats */}
          <div className="stat-grid">
            <div className="stat-card blue">
              <div className="stat-label">Total Dept Requests</div>
              <div className="stat-value">{loading ? "–" : stats.total}</div>
            </div>
            <div className="stat-card amber">
              <div className="stat-label">Pending Approval</div>
              <div className="stat-value">{loading ? "–" : stats.pending}</div>
            </div>
            <div className="stat-card green">
              <div className="stat-label">Issued / Active</div>
              <div className="stat-value">{loading ? "–" : stats.active}</div>
            </div>
            <div className="stat-card purple">
              <div className="stat-label">Returned</div>
              <div className="stat-value">{loading ? "–" : stats.returned}</div>
            </div>
            <div className="stat-card slate">
              <div className="stat-label">Purchases Pending</div>
              <div className="stat-value">{loading ? "–" : stats.purchPending}</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="section-hd">
            <span className="section-hd-title">Quick Actions</span>
          </div>
          <div className="qa-grid">
            <div className="qa-card qa-blue"   onClick={() => navigate("/hod-inventory")}><div className="qa-card-icon"><FaBox size={18} /></div><div className="qa-card-label">Inventory</div></div>
            <div className="qa-card qa-purple" onClick={() => navigate("/hod-report")}><div className="qa-card-icon"><FaClipboardList size={18} /></div><div className="qa-card-label">Reports</div></div>
            <div className="qa-card qa-amber"  onClick={() => navigate("/hod-dept-purchase")}><div className="qa-card-icon"><FaListAlt size={18} /></div><div className="qa-card-label">Purchase Requests</div></div>
            <div className="qa-card qa-green"  onClick={() => navigate("/hod-inspect")}><div className="qa-card-icon"><FaSearch size={18} /></div><div className="qa-card-label">Inspect Requests</div></div>
            <div className="qa-card qa-red"    onClick={() => navigate("/hod-labs")}><div className="qa-card-icon"><FaFlask size={18} /></div><div className="qa-card-label">Lab Management</div></div>
            <div className="qa-card qa-slate"  onClick={() => navigate("/hod-history")}><div className="qa-card-icon"><FaHistory size={18} /></div><div className="qa-card-label">History</div></div>
          </div>

          {/* Charts */}
          {!loading && deptReqs.length > 0 && (
            <>
              <div className="chart-grid-2" style={{ marginTop: 8 }}>
                {statusPie.length > 0 && (
                  <div className="chart-card">
                    <div className="chart-card-title">Request Status Distribution</div>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={statusPie} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                          dataKey="value" paddingAngle={3}>
                          {statusPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                        <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {monthlyTrend.length > 0 && (
                  <div className="chart-card">
                    <div className="chart-card-title">Monthly Request Trend (Last 6 Months)</div>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={monthlyTrend} margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                        <Tooltip />
                        <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Requests" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
              {labBar.length > 0 && (
                <div className="chart-card" style={{ marginBottom: 20 }}>
                  <div className="chart-card-title">Requests by Lab</div>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={labBar} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="lab" tick={{ fontSize: 11 }} width={110} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#16a34a" radius={[0, 4, 4, 0]} name="Requests" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}

          {/* Pending Purchases */}
          {purchRows.length > 0 && (
            <>
              <div className="section-hd">
                <span className="section-hd-title">Purchase Requests — Awaiting Approval ({stats.purchPending})</span>
                <button className="hod-btn hod-btn-primary" onClick={() => navigate("/hod-dept-purchase")}>
                  Review All →
                </button>
              </div>
              <div className="hod-table-wrap" style={{ marginBottom: 24 }}>
                <table className="hod-table">
                  <thead>
                    <tr><th>#ID</th><th>Submitted By (TO)</th><th>First Item</th><th>Items</th><th>Date</th><th>Status</th><th></th></tr>
                  </thead>
                  <tbody>
                    {purchRows.map(p => (
                      <tr key={p.id}>
                        <td className="req-id">#{p.id}</td>
                        <td>{p.submittedBy}</td>
                        <td>{p.firstItem}</td>
                        <td className="tc">{p.itemCount}</td>
                        <td className="tc muted">{p.date}</td>
                        <td><span className={getStatusPill(p.status)}>{fmtStatus(p.status)}</span></td>
                        <td>
                          <button className="hod-btn hod-btn-primary" style={{ padding: "5px 12px", fontSize: 12 }}
                            onClick={() => navigate("/hod-dept-purchase")}>
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Recent Dept Requests */}
          <div className="section-hd">
            <span className="section-hd-title">Recent Department Requests</span>
            {deptReqs.length > 8 && (
              <button className="hod-btn hod-btn-ghost" onClick={() => navigate("/hod-inspect")}>View All →</button>
            )}
          </div>
          <div className="hod-table-wrap">
            <table className="hod-table">
              <thead>
                <tr><th>#ID</th><th>Requester</th><th>Reg No</th><th>Role</th><th>Equipment</th><th>Qty</th><th>Lab</th><th>From</th><th>Status</th></tr>
              </thead>
              <tbody>
                {loading && <tr className="empty-row"><td colSpan="9">Loading…</td></tr>}
                {!loading && recentReqs.length === 0 && <tr className="empty-row"><td colSpan="9">No requests found</td></tr>}
                {!loading && recentReqs.map(r => (
                  <tr key={r.id}>
                    <td className="req-id">#{r.id}</td>
                    <td>{r.requester}</td>
                    <td className="muted">{r.regNo}</td>
                    <td className="muted">{r.role}</td>
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

        </div>
      </div>
    </div>
  )
}