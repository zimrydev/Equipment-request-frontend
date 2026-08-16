import "../styles/hodTheme.css"
import Sidebar from "../components/Sidebar"
import Topbar from "../components/Topbar"
import { useEffect, useMemo, useState } from "react"
import { HodDepartmentAPI } from "../api/api"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { FaSearch } from "react-icons/fa"

function getStatusPill(s) {
  const v = String(s || "").toUpperCase()
  if (v.includes("APPROVED") || v.includes("CONFIRMED") || v.includes("VERIFIED")) return "sp sp-green"
  if (v.includes("REJECTED") || v.includes("DAMAGED")) return "sp sp-red"
  if (v.includes("PROCESSING") || v.includes("ISSUED")) return "sp sp-blue"
  if (v.includes("PENDING")) return "sp sp-amber"
  return "sp sp-slate"
}
const fmtStatus = s => String(s || "–").replace(/_/g, " ")

export default function HodInspect() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState("")
  const [requests, setRequests] = useState([])
  const [search, setSearch]     = useState("")
  const [filterStatus, setFilterStatus] = useState("")

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const list = await HodDepartmentAPI.requests()
        if (alive) setRequests(Array.isArray(list) ? list : [])
      } catch (e) {
        if (alive) setError(e?.message || "Failed to load")
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  /* flatten requests → per-item rows */
  const allRows = useMemo(() => {
    const out = []
    for (const r of requests) {
      const items = Array.isArray(r.items) ? r.items : []
      const base = {
        reqId:     r.requestId,
        requester: r.requesterName  || r.requesterEmail || "–",
        regNo:     r.requesterRegNo || "–",
        role:      r.requesterRole  || "–",
        lab:       r.labName  || "–",
        from:      r.fromDate || "–",
        to:        r.toDate   || "–",
        purpose:   r.purpose || r.purposeType || "–",
        reqStatus: r.status   || "–",
      }
      if (items.length === 0) {
        out.push({ key: `${r.requestId}-0`, ...base, equipment: "–", qty: "–", itemStatus: r.status || "–", returned: false, damaged: false })
      } else {
        items.forEach((it, i) => {
          out.push({
            key: `${r.requestId}-${it.requestItemId || i}`,
            ...base,
            equipment:  it.equipmentName || "–",
            qty:        it.quantity ?? "–",
            itemStatus: it.status || r.status || "–",
            returned:   !!it.returned,
            damaged:    !!it.damaged,
          })
        })
      }
    }
    return out.sort((a, b) => (b.reqId || 0) - (a.reqId || 0))
  }, [requests])

  const uniqueStatuses = useMemo(() => [...new Set(allRows.map(r => r.reqStatus))].filter(Boolean).sort(), [allRows])

  const filtered = useMemo(() => {
    let list = allRows
    if (filterStatus) list = list.filter(r => r.reqStatus === filterStatus)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(r =>
        String(r.requester).toLowerCase().includes(q) ||
        String(r.regNo).toLowerCase().includes(q) ||
        String(r.equipment).toLowerCase().includes(q) ||
        String(r.lab).toLowerCase().includes(q) ||
        String(r.reqId).includes(q)
      )
    }
    return list
  }, [allRows, search, filterStatus])

  /* bar — top 8 most requested equipment */
  const topEquipment = useMemo(() => {
    const m = {}
    for (const r of allRows) {
      if (r.equipment && r.equipment !== "–") m[r.equipment] = (m[r.equipment] || 0) + 1
    }
    return Object.entries(m)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  }, [allRows])

  const stats = useMemo(() => ({
    total:    requests.length,
    pending:  requests.filter(r => String(r.status || "").toUpperCase().includes("PENDING")).length,
    active:   requests.filter(r => { const v = String(r.status || "").toUpperCase(); return v.includes("ISSUED") || v.includes("PROCESSING") }).length,
    showing:  filtered.length,
  }), [requests, filtered])

  return (
    <div className="dashboard-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <div className="content">

          <div className="hod-page-header">
            <div>
              <div className="hod-page-title">Inspect Department Requests</div>
              <div className="hod-page-subtitle">Full view of all equipment requests in your department</div>
            </div>
          </div>

          {error && <div className="hod-alert hod-alert-error">{error}</div>}

          <div className="stat-grid">
            <div className="stat-card blue">
              <div className="stat-label">Total Requests</div>
              <div className="stat-value">{loading ? "–" : stats.total}</div>
            </div>
            <div className="stat-card amber">
              <div className="stat-label">Pending</div>
              <div className="stat-value">{loading ? "–" : stats.pending}</div>
            </div>
            <div className="stat-card green">
              <div className="stat-label">Active / Issued</div>
              <div className="stat-value">{loading ? "–" : stats.active}</div>
            </div>
            <div className="stat-card slate">
              <div className="stat-label">Showing Rows</div>
              <div className="stat-value">{loading ? "–" : stats.showing}</div>
            </div>
          </div>

          {/* Top equipment chart */}
          {!loading && topEquipment.length > 0 && (
            <div className="chart-card" style={{ marginBottom: 20 }}>
              <div className="chart-card-title">Top Requested Equipment</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={topEquipment} layout="vertical" margin={{ left: 8, right: 20, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={130} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#7c3aed" radius={[0, 4, 4, 0]} name="Requests" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Filter Bar */}
          <div className="filter-bar">
            <div className="filter-input-wrap">
              <FaSearch size={13} />
              <input
                className="filter-input"
                placeholder="Search requester, reg no, equipment, lab, ID…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All Statuses</option>
              {uniqueStatuses.map(s => (
                <option key={s} value={s}>{fmtStatus(s)}</option>
              ))}
            </select>
          </div>

          <div className="hod-table-wrap">
            <table className="hod-table">
              <thead>
                <tr>
                  <th>#ID</th><th>Requester</th><th>Reg No</th><th>Role</th>
                  <th>Lab</th><th>Equipment</th><th>Qty</th>
                  <th>From</th><th>To</th><th>Purpose</th>
                  <th>Status</th><th>Returned</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr className="empty-row"><td colSpan="12">Loading…</td></tr>}
                {!loading && filtered.length === 0 && (
                  <tr className="empty-row"><td colSpan="12">No records found</td></tr>
                )}
                {!loading && filtered.map(r => (
                  <tr key={r.key}>
                    <td className="req-id">#{r.reqId}</td>
                    <td>{r.requester}</td>
                    <td className="muted">{r.regNo}</td>
                    <td className="muted">{r.role}</td>
                    <td>{r.lab}</td>
                    <td>{r.equipment}</td>
                    <td className="tc">{r.qty}</td>
                    <td className="tc muted">{r.from}</td>
                    <td className="tc muted">{r.to}</td>
                    <td className="muted">{r.purpose}</td>
                    <td><span className={getStatusPill(r.reqStatus)}>{fmtStatus(r.reqStatus)}</span></td>
                    <td className="tc">
                      {r.damaged
                        ? <span className="sp sp-red">Damaged</span>
                        : r.returned
                          ? <span className="sp sp-green">Returned</span>
                          : <span className="muted">–</span>
                      }
                    </td>
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