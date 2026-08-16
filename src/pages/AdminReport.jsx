import "../styles/dashboard.css"
import "../styles/adminTheme.css"
import Sidebar from "../components/Sidebar"
import Topbar from "../components/Topbar"
import { useEffect, useMemo, useState } from "react"
import { AdminAPI, AdminPurchaseAPI } from "../api/api"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line
} from "recharts"
import { FaSearch } from "react-icons/fa"

/* Map backend PurchaseStatus → clean label + pill class */
function mapStatus(status) {
  const s = String(status || "").toUpperCase()
  if (s === "SUBMITTED_TO_HOD")  return { label: "Submitted to HOD", cls: "a-sp-amber" }
  if (s === "APPROVED_BY_HOD")   return { label: "Approved by HOD",  cls: "a-sp-purple" }
  if (s === "REJECTED_BY_HOD")   return { label: "Rejected by HOD",  cls: "a-sp-red" }
  if (s === "ISSUED_BY_ADMIN")   return { label: "Issued by Admin",   cls: "a-sp-blue" }
  if (s === "REJECTED_BY_ADMIN") return { label: "Rejected by Admin", cls: "a-sp-red" }
  if (s === "RECEIVED_BY_HOD")   return { label: "Received by HOD",  cls: "a-sp-green" }
  return { label: s.replace(/_/g, " "), cls: "a-sp-slate" }
}

const COLORS = ["#2563eb","#16a34a","#d97706","#dc2626","#7c3aed","#0891b2"]

export default function AdminReport() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [departments, setDepartments] = useState([])
  const [dept, setDept]               = useState("")
  const [rows, setRows]               = useState([])
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState("")
  const [search, setSearch]           = useState("")
  const [filterStatus, setFilterStatus] = useState("")

  useEffect(() => {
    AdminAPI.departments()
      .then(list => {
        const arr = Array.isArray(list) ? list : []
        setDepartments(arr)
        if (arr.length) setDept(arr[0].name || arr[0])
      })
      .catch(e => setError(e?.message || "Failed to load departments"))
  }, [])

  useEffect(() => { if (dept) load(dept) }, [dept])

  const load = async (d = dept) => {
    if (!d) return
    setError("")
    try {
      setLoading(true)
      const list = await AdminPurchaseAPI.reportByDept(d)
      setRows(Array.isArray(list) ? list : [])
    } catch (e) { setError(e?.message || "Failed to load") }
    finally { setLoading(false) }
  }

  /* flat rows — one row per item per purchase */
  const flatRows = useMemo(() => {
    const out = []
    for (const pr of rows) {
      const { label, cls } = mapStatus(pr.status)
      const items = Array.isArray(pr.items) ? pr.items : []
      if (items.length === 0) {
        out.push({ key: `${pr.id}-0`, id: pr.id, equipment: "–", qty: "–",
          requestedDate: pr.createdDate || "–", issuedDate: pr.issuedDate || "–",
          receivedDate: pr.receivedDate || "–", statusLabel: label, statusCls: cls, rawStatus: pr.status })
      } else {
        items.forEach((it, i) => {
          out.push({ key: `${pr.id}-${i}`, id: pr.id,
            equipment: it.equipmentName || "–", qty: it.quantityRequested ?? it.quantity ?? "–",
            requestedDate: pr.createdDate || "–", issuedDate: pr.issuedDate || "–",
            receivedDate: pr.receivedDate || "–", statusLabel: label, statusCls: cls, rawStatus: pr.status })
        })
      }
    }
    return out.sort((a, b) => (b.id || 0) - (a.id || 0))
  }, [rows])

  const uniqueStatuses = useMemo(() => [...new Set(flatRows.map(r => r.rawStatus))].filter(Boolean), [flatRows])

  const filtered = useMemo(() => {
    let list = flatRows
    if (filterStatus) list = list.filter(r => r.rawStatus === filterStatus)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(r =>
        String(r.equipment).toLowerCase().includes(q) ||
        String(r.id).includes(q)
      )
    }
    return list
  }, [flatRows, filterStatus, search])

  /* summary stats */
  const stats = useMemo(() => ({
    total:    rows.length,
    issued:   rows.filter(r => r.status === "ISSUED_BY_ADMIN" || r.status === "RECEIVED_BY_HOD").length,
    rejected: rows.filter(r => r.status === "REJECTED_BY_ADMIN" || r.status === "REJECTED_BY_HOD").length,
    pending:  rows.filter(r => r.status === "APPROVED_BY_HOD" || r.status === "SUBMITTED_TO_HOD").length,
  }), [rows])

  /* pie — status */
  const statusPie = useMemo(() => {
    const m = {}
    for (const r of rows) {
      const { label } = mapStatus(r.status)
      m[label] = (m[label] || 0) + 1
    }
    return Object.entries(m).map(([name, value]) => ({ name, value }))
  }, [rows])

  /* bar — top equipment */
  const topEquipment = useMemo(() => {
    const m = {}
    for (const r of flatRows) {
      if (r.equipment && r.equipment !== "–") {
        m[r.equipment] = (m[r.equipment] || 0) + Number(r.qty || 0)
      }
    }
    return Object.entries(m)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 8)
  }, [flatRows])

  /* line — monthly purchases */
  const monthlyTrend = useMemo(() => {
    const now = new Date()
    const map = {}
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      map[d.toLocaleString("default", { month: "short", year: "2-digit" })] = 0
    }
    for (const r of rows) {
      if (!r.createdDate) continue
      const d = new Date(r.createdDate)
      if (isNaN(d)) continue
      const key = d.toLocaleString("default", { month: "short", year: "2-digit" })
      if (map[key] !== undefined) map[key]++
    }
    return Object.entries(map).map(([month, count]) => ({ month, count }))
  }, [rows])

  return (
    <div className="dashboard-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <div className="content">

          <div className="admin-page-header">
            <div>
              <div className="admin-page-title">Purchase Report</div>
              <div className="admin-page-subtitle">Full purchase history with analytics — {dept}</div>
            </div>
            <select className="a-filter-select" value={dept} onChange={e => setDept(e.target.value)}>
              {departments.map(d => { const n = d.name||d; return <option key={n} value={n}>{n}</option> })}
            </select>
          </div>

          {error && <div className="a-alert a-alert-error">{error}</div>}

          {/* Stats */}
          <div className="admin-stat-grid">
            <div className="admin-stat-card blue">
              <div className="admin-stat-label">Total Purchases</div>
              <div className="admin-stat-value">{loading ? "–" : stats.total}</div>
            </div>
            <div className="admin-stat-card green">
              <div className="admin-stat-label">Issued / Received</div>
              <div className="admin-stat-value">{loading ? "–" : stats.issued}</div>
            </div>
            <div className="admin-stat-card amber">
              <div className="admin-stat-label">Pending</div>
              <div className="admin-stat-value">{loading ? "–" : stats.pending}</div>
            </div>
            <div className="admin-stat-card red">
              <div className="admin-stat-label">Rejected</div>
              <div className="admin-stat-value">{loading ? "–" : stats.rejected}</div>
            </div>
          </div>

          {/* Charts */}
          {!loading && rows.length > 0 && (
            <>
              <div className="a-chart-grid-2">
                {statusPie.length > 0 && (
                  <div className="a-chart-card">
                    <div className="a-chart-title">Purchase Status Breakdown</div>
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
                  <div className="a-chart-card">
                    <div className="a-chart-title">Monthly Purchase Trend (Last 6 Months)</div>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={monthlyTrend} margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
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
              {topEquipment.length > 0 && (
                <div className="a-chart-card" style={{ marginBottom: 20 }}>
                  <div className="a-chart-title">Top Requested Equipment — by Total Quantity</div>
                  <ResponsiveContainer width="100%" height={Math.max(160, topEquipment.length * 32)}>
                    <BarChart data={topEquipment} layout="vertical" margin={{ left: 8, right: 20, top: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={140} />
                      <Tooltip />
                      <Bar dataKey="qty" fill="#7c3aed" radius={[0, 4, 4, 0]} name="Total Qty" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}

          {/* Filter + table */}
          <div className="a-filter-bar">
            <div className="a-filter-wrap">
              <FaSearch size={12} />
              <input className="a-filter-input" placeholder="Search equipment, purchase ID…"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="a-filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All Statuses</option>
              {uniqueStatuses.map(s => {
                const { label } = mapStatus(s)
                return <option key={s} value={s}>{label}</option>
              })}
            </select>
          </div>

          <div className="a-table-wrap">
            <table className="a-table">
              <thead>
                <tr>
                  <th>#ID</th><th>Equipment</th><th className="tc">Qty</th>
                  <th className="tc">Submitted Date</th><th className="tc">Issued Date</th>
                  <th className="tc">Received Date</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr className="empty-row"><td colSpan="7">Loading…</td></tr>}
                {!loading && filtered.length === 0 && (
                  <tr className="empty-row"><td colSpan="7">No report data</td></tr>
                )}
                {!loading && filtered.map(r => (
                  <tr key={r.key}>
                    <td className="a-id">#{r.id}</td>
                    <td>{r.equipment}</td>
                    <td className="tc">{r.qty}</td>
                    <td className="tc muted">{r.requestedDate}</td>
                    <td className="tc muted">{r.issuedDate !== "–" ? r.issuedDate : <span style={{ color: "var(--a-text-muted)" }}>–</span>}</td>
                    <td className="tc muted">{r.receivedDate !== "–" ? r.receivedDate : <span style={{ color: "var(--a-text-muted)" }}>–</span>}</td>
                    <td><span className={`a-sp ${r.statusCls}`}>{r.statusLabel}</span></td>
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