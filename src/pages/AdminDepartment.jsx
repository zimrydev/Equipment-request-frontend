import "../styles/dashboard.css"
import "../styles/adminTheme.css"
import Sidebar from "../components/Sidebar"
import Topbar from "../components/Topbar"
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { AdminAPI, AdminPurchaseAPI } from "../api/api"
import { AiOutlineTeam, AiOutlineUser, AiOutlineShoppingCart, AiOutlineArrowRight } from "react-icons/ai"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"

const BAR_COLORS = ["#2563eb", "#16a34a", "#d97706", "#7c3aed", "#0891b2", "#dc2626"]

export default function AdminDepartment() {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [deptData, setDeptData]       = useState([]) // [{ name, users, purchases, hods, tos, lecturers, staff, students }]
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState("")

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const depts = await AdminAPI.departments()
        const names = Array.isArray(depts) ? depts.map(d => d.name || d) : []

        const rows = await Promise.all(names.map(async name => {
          const [users, purchases] = await Promise.all([
            AdminAPI.departmentUsers(name).catch(() => null),
            AdminPurchaseAPI.historyByDept(name).catch(() => []),
          ])
          // departmentUsers returns { hods, tos, lecturers, staff, students } or flat array
          const safe = v => Array.isArray(v) ? v : []
          let hods=[], tos=[], lecturers=[], staff=[], students=[], total=0
          if (users && typeof users === "object" && !Array.isArray(users)) {
            hods      = safe(users.hods)
            tos       = safe(users.tos)
            lecturers = safe(users.lecturers)
            staff     = safe(users.staff)
            students  = safe(users.students)
            total     = hods.length + tos.length + lecturers.length + staff.length + students.length
          } else {
            total = safe(users).length
          }
          const purchList = Array.isArray(purchases) ? purchases : []
          return { name, hods: hods.length, tos: tos.length, lecturers: lecturers.length,
            staff: staff.length, students: students.length, totalUsers: total,
            purchases: purchList.length,
            pending: purchList.filter(p => p.status === "APPROVED_BY_HOD").length,
            issued:  purchList.filter(p => p.status === "ISSUED_BY_ADMIN" || p.status === "RECEIVED_BY_HOD").length,
          }
        }))

        if (!alive) return
        setDeptData(rows)
      } catch (e) {
        if (alive) setError(e?.message || "Failed to load")
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  const barData = useMemo(() =>
    deptData.map(d => ({
      name: d.name.length > 10 ? d.name.slice(0, 10) + "…" : d.name,
      fullName: d.name,
      Users: d.totalUsers,
      Purchases: d.purchases,
    }))
  , [deptData])

  const totals = useMemo(() => ({
    depts:     deptData.length,
    users:     deptData.reduce((s, d) => s + d.totalUsers, 0),
    purchases: deptData.reduce((s, d) => s + d.purchases, 0),
    pending:   deptData.reduce((s, d) => s + d.pending, 0),
  }), [deptData])

  return (
    <div className="dashboard-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <div className="content">

          <div className="admin-page-header">
            <div>
              <div className="admin-page-title">Departments</div>
              <div className="admin-page-subtitle">Overview of all departments, users and activity</div>
            </div>
          </div>

          {error && <div className="a-alert a-alert-error">{error}</div>}

          {/* Totals */}
          <div className="admin-stat-grid">
            <div className="admin-stat-card blue">
              <div className="admin-stat-label">Total Departments</div>
              <div className="admin-stat-value">{loading ? "–" : totals.depts}</div>
            </div>
            <div className="admin-stat-card slate">
              <div className="admin-stat-label">Total Users</div>
              <div className="admin-stat-value">{loading ? "–" : totals.users}</div>
            </div>
            <div className="admin-stat-card purple">
              <div className="admin-stat-label">Total Purchases</div>
              <div className="admin-stat-value">{loading ? "–" : totals.purchases}</div>
            </div>
            <div className="admin-stat-card amber">
              <div className="admin-stat-label">Pending Admin Action</div>
              <div className="admin-stat-value">{loading ? "–" : totals.pending}</div>
            </div>
          </div>

          {/* Chart */}
          {!loading && barData.length > 0 && (
            <div className="a-chart-card" style={{ marginBottom: 24 }}>
              <div className="a-chart-title">Departments — Users &amp; Purchases</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barData} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip labelFormatter={(l, p) => p?.[0]?.payload?.fullName || l} />
                  <Bar dataKey="Users"     fill="#2563eb" radius={[4,4,0,0]} />
                  <Bar dataKey="Purchases" fill="#16a34a" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Department Cards */}
          <div className="admin-section-hd">
            <span className="admin-section-title">All Departments ({deptData.length})</span>
          </div>

          {loading && <div className="a-empty"><div className="a-empty-icon">⏳</div><div className="a-empty-text">Loading…</div></div>}

          {deptData.map((d, idx) => (
            <div key={d.name} className="a-dept-card">
              <div className="a-dept-card-top">
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
                      background: BAR_COLORS[idx % BAR_COLORS.length] + "1a", color: BAR_COLORS[idx % BAR_COLORS.length], fontSize: 20 }}>
                      <AiOutlineTeam />
                    </div>
                    <div>
                      <div className="a-dept-name">{d.name}</div>
                      <div className="a-dept-meta">{d.totalUsers} user{d.totalUsers !== 1 ? "s" : ""} &nbsp;·&nbsp; {d.purchases} purchase record{d.purchases !== 1 ? "s" : ""}</div>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  {d.pending > 0 && <span className="a-sp a-sp-amber">{d.pending} pending</span>}
                  {d.issued  > 0 && <span className="a-sp a-sp-green">{d.issued} issued</span>}
                  <button className="a-btn a-btn-primary a-btn-sm" onClick={() => navigate("/admin-users")}>
                    Manage Users <AiOutlineArrowRight size={12} />
                  </button>
                  <button className="a-btn a-btn-ghost a-btn-sm" onClick={() => navigate("/admin-view-requests")}>
                    Purchases
                  </button>
                </div>
              </div>

              {/* Role breakdown */}
              <div style={{ padding: "12px 20px", display: "flex", gap: 10, flexWrap: "wrap", borderTop: "1px solid #f1f5f9" }}>
                {[
                  { label: "HOD",         count: d.hods,      color: "#2563eb" },
                  { label: "Tech Officer", count: d.tos,       color: "#7c3aed" },
                  { label: "Lecturer",    count: d.lecturers,  color: "#16a34a" },
                  { label: "Staff",       count: d.staff,      color: "#d97706" },
                  { label: "Student",     count: d.students,   color: "#0891b2" },
                ].map(r => (
                  <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px",
                    background: r.color + "12", border: `1px solid ${r.color}30`,
                    borderRadius: 8, fontSize: 12.5 }}>
                    <span style={{ fontWeight: 700, color: r.color }}>{r.count}</span>
                    <span style={{ color: "#475569" }}>{r.label}{r.count !== 1 ? "s" : ""}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {!loading && deptData.length === 0 && (
            <div className="a-empty">
              <div className="a-empty-icon">🏛</div>
              <div className="a-empty-text">No departments found</div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}