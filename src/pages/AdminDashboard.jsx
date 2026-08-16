import "../styles/dashboard.css"
import "../styles/adminTheme.css"
import Sidebar from "../components/Sidebar"
import Topbar from "../components/Topbar"
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { AdminAPI, AdminPurchaseAPI, AuthAPI } from "../api/api"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line
} from "recharts"
import {
  AiOutlineTeam, AiOutlineUser, AiOutlineFileText,
  AiOutlineShoppingCart, AiOutlineBarChart, AiOutlineHistory,
  AiOutlineCheckCircle, AiOutlineCloseCircle, AiOutlineClockCircle
} from "react-icons/ai"

const COLORS = ["#2563eb", "#16a34a", "#d97706", "#dc2626", "#7c3aed", "#0891b2"]

/* Map backend purchase status → semantic label + pill class */
function purchaseStatusPill(status) {
  const s = String(status || "").toUpperCase()
  if (s === "SUBMITTED_TO_HOD")  return { label: "Submitted to HOD", cls: "a-sp-amber" }
  if (s === "APPROVED_BY_HOD")   return { label: "Approved by HOD",  cls: "a-sp-purple" }
  if (s === "REJECTED_BY_HOD")   return { label: "Rejected by HOD",  cls: "a-sp-red" }
  if (s === "ISSUED_BY_ADMIN")   return { label: "Issued by Admin",   cls: "a-sp-blue" }
  if (s === "REJECTED_BY_ADMIN") return { label: "Rejected by Admin", cls: "a-sp-red" }
  if (s === "RECEIVED_BY_HOD")   return { label: "Received by HOD",  cls: "a-sp-green" }
  return { label: s.replace(/_/g, " ") || "–", cls: "a-sp-slate" }
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen]   = useState(false)
  const [user, setUser]                 = useState(null)
  const [departments, setDepartments]   = useState([])
  const [selectedDept, setSelectedDept] = useState("")
  const [allPurchases, setAllPurchases] = useState({})   // { deptName: [...] }
  const [userCounts, setUserCounts]     = useState({})   // { deptName: number }
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState("")

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [depts, me] = await Promise.all([AdminAPI.departments(), AuthAPI.me()])
        if (alive) setUser(me)
        const deptList = Array.isArray(depts) ? depts : []
        const names    = deptList.map(d => d.name || d)

        const [purchaseMap, userMap] = [{}, {}]
        await Promise.all(names.map(async name => {
          try {
            const p = await AdminPurchaseAPI.historyByDept(name)
            purchaseMap[name] = Array.isArray(p) ? p : []
          } catch { purchaseMap[name] = [] }
          try {
            const u = await AdminAPI.departmentUsers(name)
            const arr = Array.isArray(u) ? u : (Array.isArray(u?.hods) ? [
              ...u.hods, ...u.tos, ...u.lecturers, ...u.staff, ...u.students
            ] : [])
            userMap[name] = arr.length
          } catch { userMap[name] = 0 }
        }))

        if (!alive) return
        setDepartments(deptList)
        setSelectedDept(names[0] || "")
        setAllPurchases(purchaseMap)
        setUserCounts(userMap)
      } catch (e) {
        if (alive) setError(e?.message || "Failed to load")
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  /* totals across all departments */
  const totals = useMemo(() => {
    let pending = 0, approved = 0, rejected = 0, total = 0, users = 0
    for (const [, list] of Object.entries(allPurchases)) {
      for (const p of list) {
        total++
        const s = String(p.status || "").toUpperCase()
        if (s === "APPROVED_BY_HOD")                           pending++
        if (s === "ISSUED_BY_ADMIN" || s === "RECEIVED_BY_HOD") approved++
        if (s === "REJECTED_BY_ADMIN" || s === "REJECTED_BY_HOD") rejected++
      }
    }
    for (const v of Object.values(userCounts)) users += v
    return { pending, approved, rejected, total, users, depts: departments.length }
  }, [allPurchases, userCounts, departments])

  /* selected dept purchases */
  const deptPurchases = useMemo(() =>
    [...(allPurchases[selectedDept] || [])].sort((a, b) => (b.id || 0) - (a.id || 0))
  , [allPurchases, selectedDept])

  /* bar: purchases + users per dept */
  const deptBar = useMemo(() =>
    departments.map(d => {
      const n = d.name || d
      return { name: n.length > 10 ? n.slice(0, 10) + "…" : n, fullName: n,
        purchases: (allPurchases[n] || []).length, users: userCounts[n] || 0 }
    })
  , [departments, allPurchases, userCounts])

  /* pie: purchase status for selected dept */
  const statusPie = useMemo(() => {
    const m = {}
    for (const p of deptPurchases) {
      const { label } = purchaseStatusPill(p.status)
      m[label] = (m[label] || 0) + 1
    }
    return Object.entries(m).map(([name, value]) => ({ name, value }))
  }, [deptPurchases])

  /* line: monthly purchase trend (all depts, last 6 months) */
  const trendLine = useMemo(() => {
    const now = new Date()
    const map = {}
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      map[d.toLocaleString("default", { month: "short", year: "2-digit" })] = 0
    }
    for (const list of Object.values(allPurchases)) {
      for (const p of list) {
        if (!p.createdDate) continue
        const d = new Date(p.createdDate)
        if (isNaN(d)) continue
        const key = d.toLocaleString("default", { month: "short", year: "2-digit" })
        if (map[key] !== undefined) map[key]++
      }
    }
    return Object.entries(map).map(([month, count]) => ({ month, count }))
  }, [allPurchases])

  /* recent purchases across all depts for table */
  const recentAll = useMemo(() => {
    const out = []
    for (const [dept, list] of Object.entries(allPurchases)) {
      for (const p of list) out.push({ ...p, _dept: dept })
    }
    return out.sort((a, b) => (b.id || 0) - (a.id || 0)).slice(0, 8)
  }, [allPurchases])

  return (
    <div className="dashboard-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <div className="content">

          {/* Welcome Banner */}
          <div className="admin-welcome-banner">
            <div className="admin-welcome-name">
              Welcome, {loading ? "…" : (user?.fullName || "Administrator")}!
            </div>
            <div className="admin-welcome-sub">
              System Administrator · Faculty of Engineering, University of Jaffna
            </div>
            <div className="admin-welcome-badge">🛡 ADMIN</div>
          </div>

          {error && <div className="a-alert a-alert-error">{error}</div>}

          {/* Global stats */}
          <div className="admin-stat-grid">
            <div className="admin-stat-card blue">
              <div className="admin-stat-label">Departments</div>
              <div className="admin-stat-value">{loading ? "–" : totals.depts}</div>
            </div>
            <div className="admin-stat-card slate">
              <div className="admin-stat-label">Total Users</div>
              <div className="admin-stat-value">{loading ? "–" : totals.users}</div>
            </div>
            <div className="admin-stat-card amber">
              <div className="admin-stat-label">Pending (HOD Approved)</div>
              <div className="admin-stat-value">{loading ? "–" : totals.pending}</div>
              <div className="admin-stat-sub">Awaiting admin action</div>
            </div>
            <div className="admin-stat-card green">
              <div className="admin-stat-label">Issued / Received</div>
              <div className="admin-stat-value">{loading ? "–" : totals.approved}</div>
            </div>
            <div className="admin-stat-card red">
              <div className="admin-stat-label">Rejected</div>
              <div className="admin-stat-value">{loading ? "–" : totals.rejected}</div>
            </div>
            <div className="admin-stat-card purple">
              <div className="admin-stat-label">Total Purchases</div>
              <div className="admin-stat-value">{loading ? "–" : totals.total}</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="admin-section-hd">
            <span className="admin-section-title">Quick Actions</span>
          </div>
          <div className="a-qa-grid">
            <div className="a-qa-card a-qa-blue"   onClick={() => navigate("/admin-users")}>
              <div className="a-qa-icon"><AiOutlineUser /></div>
              <div className="a-qa-label">User Management</div>
            </div>
            <div className="a-qa-card a-qa-green"  onClick={() => navigate("/admin-department")}>
              <div className="a-qa-icon"><AiOutlineTeam /></div>
              <div className="a-qa-label">Departments</div>
            </div>
            <div className="a-qa-card a-qa-amber"  onClick={() => navigate("/admin-view-requests")}>
              <div className="a-qa-icon"><AiOutlineShoppingCart /></div>
              <div className="a-qa-label">Purchase Requests</div>
            </div>
            <div className="a-qa-card a-qa-purple" onClick={() => navigate("/admin-report")}>
              <div className="a-qa-icon"><AiOutlineBarChart /></div>
              <div className="a-qa-label">Reports</div>
            </div>
            <div className="a-qa-card a-qa-slate"  onClick={() => navigate("/admin-history")}>
              <div className="a-qa-icon"><AiOutlineHistory /></div>
              <div className="a-qa-label">History</div>
            </div>
          </div>

          {/* Charts */}
          {!loading && (
            <>
              <div className="a-chart-grid-2">
                {deptBar.length > 0 && (
                  <div className="a-chart-card">
                    <div className="a-chart-title">Department Comparison — Purchases &amp; Users</div>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={deptBar} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <Tooltip labelFormatter={(l, p) => p?.[0]?.payload?.fullName || l} />
                        <Legend iconSize={9} wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="purchases" fill="#2563eb" radius={[4,4,0,0]} name="Purchases" />
                        <Bar dataKey="users"     fill="#16a34a" radius={[4,4,0,0]} name="Users" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {trendLine.length > 0 && (
                  <div className="a-chart-card">
                    <div className="a-chart-title">Monthly Purchase Activity (All Depts)</div>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={trendLine} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                        <Tooltip />
                        <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2}
                          dot={{ r: 4 }} activeDot={{ r: 6 }} name="Purchases" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Dept selector + pie */}
              <div className="admin-section-hd">
                <span className="admin-section-title">Department Detail</span>
              </div>
              <div className="a-dept-tabs">
                {departments.map(d => {
                  const n = d.name || d
                  return (
                    <button key={n} className={`a-dept-tab${selectedDept === n ? " active" : ""}`}
                      onClick={() => setSelectedDept(n)}>
                      {n}
                    </button>
                  )
                })}
              </div>

              <div className="a-chart-grid-2">
                {statusPie.length > 0 && (
                  <div className="a-chart-card">
                    <div className="a-chart-title">{selectedDept} — Purchase Status Breakdown</div>
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
                <div className="a-chart-card">
                  <div className="a-chart-title">{selectedDept} — Summary</div>
                  <div style={{ padding: "12px 0" }}>
                    {[
                      { label: "Total Purchases",  value: deptPurchases.length, icon: <AiOutlineFileText />,       color: "#2563eb" },
                      { label: "Pending (HOD Appr)", value: deptPurchases.filter(p => p.status === "APPROVED_BY_HOD").length, icon: <AiOutlineClockCircle />, color: "#d97706" },
                      { label: "Issued by Admin",   value: deptPurchases.filter(p => p.status === "ISSUED_BY_ADMIN" || p.status === "RECEIVED_BY_HOD").length, icon: <AiOutlineCheckCircle />, color: "#16a34a" },
                      { label: "Rejected",          value: deptPurchases.filter(p => p.status === "REJECTED_BY_ADMIN" || p.status === "REJECTED_BY_HOD").length, icon: <AiOutlineCloseCircle />, color: "#dc2626" },
                      { label: "Users",             value: userCounts[selectedDept] ?? 0, icon: <AiOutlineUser />, color: "#7c3aed" },
                    ].map(item => (
                      <div key={item.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#334155" }}>
                          <span style={{ color: item.color }}>{item.icon}</span>
                          {item.label}
                        </div>
                        <span style={{ fontWeight: 800, fontSize: 18, color: item.color }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Recent all-dept purchases */}
          <div className="admin-section-hd">
            <span className="admin-section-title">Recent Purchases — All Departments</span>
            <button className="a-btn a-btn-ghost a-btn-sm" onClick={() => navigate("/admin-view-requests")}>
              View Pending →
            </button>
          </div>
          <div className="a-table-wrap">
            <table className="a-table">
              <thead>
                <tr>
                  <th>#ID</th><th>Dept</th><th>Requested By</th><th>First Item</th>
                  <th>Items</th><th>Date</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr className="empty-row"><td colSpan="7">Loading…</td></tr>}
                {!loading && recentAll.length === 0 && (
                  <tr className="empty-row"><td colSpan="7">No purchases yet</td></tr>
                )}
                {!loading && recentAll.map(p => {
                  const { label, cls } = purchaseStatusPill(p.status)
                  const items = Array.isArray(p.items) ? p.items : []
                  return (
                    <tr key={`${p._dept}-${p.id}`}>
                      <td className="a-id">#{p.id}</td>
                      <td><span className="a-sp a-sp-slate">{p._dept}</span></td>
                      <td>{p.requestedByName || p.toName || "–"}</td>
                      <td>{items[0]?.equipmentName || "–"}</td>
                      <td className="tc">{items.length}</td>
                      <td className="tc muted">{p.createdDate || "–"}</td>
                      <td><span className={`a-sp ${cls}`}>{label}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  )
}