import "../styles/dashboard.css"
import "../styles/lecturerTheme.css"
import Sidebar from "../components/Sidebar"
import Topbar from "../components/Topbar"
import { useEffect, useMemo, useState } from "react"
import { LecturerRequestAPI } from "../api/api"
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts"
import { FaSearch } from "react-icons/fa"

/* ── History: show ALL statuses so the lecturer can see the complete record.
   The old code only showed RETURN_VERIFIED + DAMAGED_REPORTED which was too narrow.
   History = LecturerRequestAPI.my() (same endpoint as ViewRequests but shown differently).
   Filter by terminal or near-terminal statuses to keep history meaningful.
 ── */

const HISTORY_STATUSES = new Set([
  "RETURN_VERIFIED",
  "DAMAGED_REPORTED",
  "REJECTED_BY_LECTURER",
  "ISSUED_CONFIRMED",
])

const ALL_ITEM_STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "RETURN_VERIFIED",   label: "Returned" },
  { value: "ISSUED_CONFIRMED",  label: "Issued Confirmed" },
  { value: "DAMAGED_REPORTED",  label: "Damaged" },
  { value: "REJECTED_BY_LECTURER", label: "Rejected" },
]

const PIE_COLORS = ["#16a34a","#2563eb","#dc2626","#d97706","#7c3aed","#0891b2"]

function itemStatusPill(status) {
  const s = String(status || "").toUpperCase()
  if (s === "ISSUED_CONFIRMED")    return { cls: "lt-sp-confirmed", label: "Issued Confirmed" }
  if (s === "RETURN_VERIFIED")     return { cls: "lt-sp-returned",  label: "Returned" }
  if (s === "DAMAGED_REPORTED")    return { cls: "lt-sp-damaged",   label: "Damaged" }
  if (s === "REJECTED_BY_LECTURER") return { cls: "lt-sp-rejected", label: "Rejected" }
  return { cls: "lt-sp-slate", label: s.replace(/_/g, " ") || "–" }
}

export default function LecturerHistory() {
  const [sidebarOpen,  setSidebarOpen]  = useState(false)
  const [rows,         setRows]         = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState("")
  const [search,       setSearch]       = useState("")
  const [statusFilter, setStatusFilter] = useState("")

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        const list = await LecturerRequestAPI.my()
        if (!alive) return
        setRows(Array.isArray(list) ? list : [])
      } catch (e) {
        if (alive) setError(e?.message || "Failed to load history")
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  /* Flatten to per-item rows, keeping only history-relevant statuses */
  const historyItems = useMemo(() => {
    const out = []
    for (const r of rows) {
      for (const it of (Array.isArray(r.items) ? r.items : [])) {
        const s = String(it.itemStatus || "").toUpperCase()
        if (!HISTORY_STATUSES.has(s)) continue
        out.push({ ...r, _item: it, _itemStatus: s })
      }
    }
    return out.sort((a, b) => (b.requestId || 0) - (a.requestId || 0))
  }, [rows])

  const filtered = useMemo(() => {
    let list = historyItems
    if (statusFilter) list = list.filter(r => r._itemStatus === statusFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(r =>
        String(r.labName  || "").toLowerCase().includes(q) ||
        String(r.purpose  || "").toLowerCase().includes(q) ||
        String(r._item?.equipmentName || "").toLowerCase().includes(q) ||
        String(r.requestId || "").includes(q)
      )
    }
    return list
  }, [historyItems, statusFilter, search])

  /* Pie: by status */
  const statusPie = useMemo(() => {
    const m = {}
    for (const r of historyItems) {
      const { label } = itemStatusPill(r._itemStatus)
      m[label] = (m[label] || 0) + 1
    }
    return Object.entries(m).map(([name, value]) => ({ name, value }))
  }, [historyItems])

  /* Bar: top equipment in history */
  const topEquip = useMemo(() => {
    const m = {}
    for (const r of historyItems) {
      const n = r._item?.equipmentName || "Unknown"
      m[n] = (m[n] || 0) + (r._item?.quantity || 1)
    }
    return Object.entries(m).sort(([,a],[,b]) => b-a).slice(0, 7)
      .map(([name, count]) => ({ name: name.length > 16 ? name.slice(0,16)+"…" : name, count }))
  }, [historyItems])

  /* Stats */
  const stats = useMemo(() => ({
    total:    historyItems.length,
    returned: historyItems.filter(r => r._itemStatus === "RETURN_VERIFIED").length,
    issued:   historyItems.filter(r => r._itemStatus === "ISSUED_CONFIRMED").length,
    damaged:  historyItems.filter(r => r._itemStatus === "DAMAGED_REPORTED").length,
    rejected: historyItems.filter(r => r._itemStatus === "REJECTED_BY_LECTURER").length,
  }), [historyItems])

  return (
    <div className="dashboard-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <div className="content">

          <div className="lt-page-header">
            <div>
              <div className="lt-page-title">My History</div>
              <div className="lt-page-subtitle">
                Completed, returned, rejected and damaged equipment item records
              </div>
            </div>
          </div>

          {error && <div className="lt-alert lt-alert-error">{error}</div>}

          {/* Stats */}
          <div className="lt-stat-grid">
            <div className="lt-stat-card blue">
              <div className="lt-stat-label">Total Records</div>
              <div className="lt-stat-value">{loading ? "–" : stats.total}</div>
            </div>
            <div className="lt-stat-card green">
              <div className="lt-stat-label">Returned</div>
              <div className="lt-stat-value">{loading ? "–" : stats.returned}</div>
            </div>
            <div className="lt-stat-card cyan">
              <div className="lt-stat-label">Still Issued</div>
              <div className="lt-stat-value">{loading ? "–" : stats.issued}</div>
            </div>
            <div className="lt-stat-card red">
              <div className="lt-stat-label">Damaged</div>
              <div className="lt-stat-value">{loading ? "–" : stats.damaged}</div>
            </div>
            <div className="lt-stat-card amber">
              <div className="lt-stat-label">Rejected</div>
              <div className="lt-stat-value">{loading ? "–" : stats.rejected}</div>
            </div>
          </div>

          {/* Charts */}
          {!loading && historyItems.length > 0 && (
            <div className="lt-chart-grid-2">
              {statusPie.length > 0 && (
                <div className="lt-chart-card">
                  <div className="lt-chart-title">History — Status Breakdown</div>
                  <ResponsiveContainer width="100%" height={210}>
                    <PieChart>
                      <Pie data={statusPie} cx="50%" cy="50%" innerRadius={52} outerRadius={80}
                        dataKey="value" paddingAngle={3}>
                        {statusPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              {topEquip.length > 0 && (
                <div className="lt-chart-card">
                  <div className="lt-chart-title">Top Equipment Requested (History)</div>
                  <ResponsiveContainer width="100%" height={210}>
                    <BarChart data={topEquip} layout="vertical" margin={{ top:4, right:20, bottom:4, left:0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#2563eb" radius={[0,4,4,0]} name="Total Qty" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Filters */}
          <div className="lt-filter-bar">
            <div className="lt-filter-wrap">
              <FaSearch className="lt-filter-icon" />
              <input className="lt-filter-input"
                placeholder="Search equipment, lab, purpose, request ID…"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="lt-filter-select" value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}>
              {ALL_ITEM_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {loading && (
            <div className="lt-empty"><div className="lt-empty-icon">⏳</div><div className="lt-empty-text">Loading history…</div></div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="lt-empty">
              <div className="lt-empty-icon">📂</div>
              <div className="lt-empty-text">
                {historyItems.length === 0 ? "No history records yet." : "No results for current filter."}
              </div>
            </div>
          )}

          {/* History table */}
          {!loading && filtered.length > 0 && (
            <div className="lt-table-wrap">
              <table className="lt-table">
                <thead>
                  <tr>
                    <th>#ID</th>
                    <th>Equipment</th>
                    <th>Type</th>
                    <th className="tc">Qty</th>
                    <th>Lab</th>
                    <th>Purpose</th>
                    <th className="tc">From</th>
                    <th className="tc">To</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, idx) => {
                    const { cls, label } = itemStatusPill(r._itemStatus)
                    return (
                      <tr key={`${r.requestId}-${r._item?.requestItemId}-${idx}`}>
                        <td className="lt-id">#{r.requestId}</td>
                        <td style={{ fontWeight: 600 }}>{r._item?.equipmentName || "–"}</td>
                        <td><span className="lt-sp lt-sp-slate">{r._item?.itemType || "–"}</span></td>
                        <td className="tc">{r._item?.quantity || "–"}</td>
                        <td>{r.labName || "–"}</td>
                        <td className="lt-muted">{r.purpose || "–"}</td>
                        <td className="lt-muted tc">{r.fromDate || "–"}</td>
                        <td className="lt-muted tc">{r.toDate || "–"}</td>
                        <td><span className={`lt-sp ${cls}`}>{label}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}