import "../styles/dashboard.css"
import "../styles/adminTheme.css"
import Sidebar from "../components/Sidebar"
import Topbar from "../components/Topbar"
import { useEffect, useMemo, useState } from "react"
import { AdminAPI, AdminPurchaseAPI } from "../api/api"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts"
import { FaSearch } from "react-icons/fa"

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

const COLORS = ["#16a34a","#dc2626","#2563eb","#7c3aed","#d97706","#0891b2"]

export default function AdminHistory() {
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
      const list = await AdminPurchaseAPI.historyByDept(d)
      setRows(Array.isArray(list) ? list : [])
    } catch (e) { setError(e?.message || "Failed to load") }
    finally { setLoading(false) }
  }

  /* flat rows */
  const flatRows = useMemo(() => {
    const out = []
    for (const pr of rows) {
      const { label, cls } = mapStatus(pr.status)
      const items = Array.isArray(pr.items) ? pr.items : []
      if (items.length === 0) {
        out.push({ key: `${pr.id}-0`, id: pr.id, submittedBy: pr.requestedByName || pr.toName || "–",
          equipment: "–", qty: "–", requestedDate: pr.createdDate || "–",
          issuedDate: pr.issuedDate || "–", receivedDate: pr.receivedDate || "–",
          statusLabel: label, statusCls: cls, rawStatus: pr.status })
      } else {
        items.forEach((it, i) => {
          out.push({ key: `${pr.id}-${i}`, id: pr.id, submittedBy: pr.requestedByName || pr.toName || "–",
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
        String(r.submittedBy).toLowerCase().includes(q) ||
        String(r.equipment).toLowerCase().includes(q) ||
        String(r.id).includes(q)
      )
    }
    return list
  }, [flatRows, filterStatus, search])

  /* stats */
  const stats = useMemo(() => ({
    total:    rows.length,
    received: rows.filter(r => r.status === "RECEIVED_BY_HOD").length,
    issued:   rows.filter(r => r.status === "ISSUED_BY_ADMIN").length,
    rejected: rows.filter(r => r.status === "REJECTED_BY_ADMIN" || r.status === "REJECTED_BY_HOD").length,
  }), [rows])

  /* pie */
  const statusPie = useMemo(() => {
    const m = {}
    for (const r of rows) {
      const { label } = mapStatus(r.status)
      m[label] = (m[label] || 0) + 1
    }
    return Object.entries(m).map(([name, value]) => ({ name, value }))
  }, [rows])

  /* bar — top submitters (TOs) */
  const topTOs = useMemo(() => {
    const m = {}
    for (const r of rows) {
      const name = r.requestedByName || r.toName || "Unknown"
      m[name] = (m[name] || 0) + 1
    }
    return Object.entries(m)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
  }, [rows])

  return (
    <div className="dashboard-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <div className="content">

          <div className="admin-page-header">
            <div>
              <div className="admin-page-title">Purchase History</div>
              <div className="admin-page-subtitle">Complete purchase record — {dept}</div>
            </div>
            <select className="a-filter-select" value={dept} onChange={e => setDept(e.target.value)}>
              {departments.map(d => { const n = d.name||d; return <option key={n} value={n}>{n}</option> })}
            </select>
          </div>

          {error && <div className="a-alert a-alert-error">{error}</div>}

          {/* Stats */}
          <div className="admin-stat-grid">
            <div className="admin-stat-card blue">
              <div className="admin-stat-label">Total Records</div>
              <div className="admin-stat-value">{loading ? "–" : stats.total}</div>
            </div>
            <div className="admin-stat-card blue">
              <div className="admin-stat-label">Issued by Admin</div>
              <div className="admin-stat-value">{loading ? "–" : stats.issued}</div>
            </div>
            <div className="admin-stat-card green">
              <div className="admin-stat-label">Received by HOD</div>
              <div className="admin-stat-value">{loading ? "–" : stats.received}</div>
            </div>
            <div className="admin-stat-card red">
              <div className="admin-stat-label">Rejected</div>
              <div className="admin-stat-value">{loading ? "–" : stats.rejected}</div>
            </div>
          </div>

          {/* Charts */}
          {!loading && rows.length > 0 && (
            <div className="a-chart-grid-2" style={{ marginBottom: 8 }}>
              {statusPie.length > 0 && (
                <div className="a-chart-card">
                  <div className="a-chart-title">History — Status Breakdown</div>
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
              {topTOs.length > 0 && (
                <div className="a-chart-card">
                  <div className="a-chart-title">Top Submitters (Technical Officers)</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={topTOs} layout="vertical" margin={{ left: 8, right: 20, top: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#2563eb" radius={[0, 4, 4, 0]} name="Purchases" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Filters */}
          <div className="a-filter-bar">
            <div className="a-filter-wrap">
              <FaSearch size={12} />
              <input className="a-filter-input" placeholder="Search TO name, equipment, purchase ID…"
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
                  <th>#ID</th><th>Submitted By (TO)</th><th>Equipment</th><th className="tc">Qty</th>
                  <th className="tc">Submitted</th><th className="tc">Issued</th>
                  <th className="tc">Received</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr className="empty-row"><td colSpan="8">Loading…</td></tr>}
                {!loading && filtered.length === 0 && (
                  <tr className="empty-row"><td colSpan="8">No history records</td></tr>
                )}
                {!loading && filtered.map(r => (
                  <tr key={r.key}>
                    <td className="a-id">#{r.id}</td>
                    <td>{r.submittedBy}</td>
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