import "../styles/hodTheme.css"
import Sidebar from "../components/Sidebar"
import Topbar from "../components/Topbar"
import { useEffect, useMemo, useState } from "react"
import { AuthAPI, HodDepartmentAPI, HodPurchaseAPI } from "../api/api"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts"
import { FaSearch } from "react-icons/fa"

function getStatusPill(s) {
  const v = String(s || "").toUpperCase()
  if (v.includes("APPROVED") || v.includes("CONFIRMED") || v.includes("VERIFIED") || v.includes("RECEIVED")) return "sp sp-green"
  if (v.includes("REJECTED") || v.includes("DAMAGED")) return "sp sp-red"
  if (v.includes("PROCESSING") || v.includes("ISSUED")) return "sp sp-blue"
  if (v.includes("PENDING") || v.includes("SUBMITTED")) return "sp sp-amber"
  return "sp sp-slate"
}
const fmtStatus = s => String(s || "–").replace(/_/g, " ")
const DONE = s => {
  const x = String(s || "").toUpperCase()
  return x.includes("RETURN") || x.includes("REJECT") || x.includes("CONFIRMED")
    || x.includes("DAMAGED") || x.includes("VERIFIED") || x.includes("RECEIVED")
}
const COLORS = ["#2563eb", "#16a34a", "#d97706", "#dc2626", "#7c3aed", "#0891b2"]

export default function HodHistory() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState("")
  const [me, setMe]             = useState(null)
  const [deptReqs, setDeptReqs] = useState([])
  const [purchases, setPurchases] = useState([])
  const [tab, setTab]           = useState("requests")
  const [search, setSearch]     = useState("")

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const profile = await AuthAPI.me()
        const [reqs, purch] = await Promise.all([
          HodDepartmentAPI.requests().catch(() => []),
          HodPurchaseAPI.my().catch(() => []),
        ])
        if (!alive) return
        setMe(profile)
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

  /* request history rows — completed only */
  const reqRows = useMemo(() => {
    const out = []
    for (const r of deptReqs) {
      if (!DONE(r.status)) continue
      const items = Array.isArray(r.items) ? r.items : []
      const base = {
        reqId:     r.requestId,
        requester: r.requesterName  || r.requesterEmail || "–",
        regNo:     r.requesterRegNo || "–",
        role:      r.requesterRole  || "–",
        lab:       r.labName  || "–",
        from:      r.fromDate || "–",
        to:        r.toDate   || "–",
      }
      if (items.length === 0) {
        out.push({ key: `${r.requestId}-0`, ...base, equipment: "–", qty: "–", status: r.status || "–", returned: false, damaged: false })
      } else {
        items.forEach((it, i) => {
          out.push({
            key: `${r.requestId}-${it.requestItemId || i}`,
            ...base,
            equipment: it.equipmentName || "–",
            qty:       it.quantity ?? "–",
            status:    it.status || r.status || "–",
            returned:  !!it.returned,
            damaged:   !!it.damaged,
          })
        })
      }
    }
    return out.sort((a, b) => (b.reqId || 0) - (a.reqId || 0))
  }, [deptReqs])

  /* purchase history rows */
  const purchRows = useMemo(() => {
    const DONE_P = s => ["REJECTED_BY_HOD","REJECTED_BY_ADMIN","ISSUED_BY_ADMIN","RECEIVED_BY_HOD","APPROVED_BY_ADMIN"].includes(String(s || "").toUpperCase())
    const out = []
    for (const p of purchases) {
      if (!DONE_P(p.status)) continue
      const submittedBy = p.toName || p.requestedByName || "–"
      const items = Array.isArray(p.items) ? p.items : []
      if (items.length === 0) {
        out.push({ key: `${p.id}-0`, id: p.id, submittedBy, equipment: "–", qty: "–", created: p.createdDate || "–", issued: p.issuedDate || "–", received: p.receivedDate || "–", status: p.status || "–" })
      } else {
        items.forEach((it, i) => {
          out.push({
            key:         `${p.id}-${it.id || i}`,
            id:          p.id,
            submittedBy,
            equipment:   it.equipmentName || it.name || "–",
            qty:         it.quantityRequested ?? it.quantity ?? "–",
            created:     p.createdDate  || "–",
            issued:      p.issuedDate   || "–",
            received:    p.receivedDate || "–",
            status:      p.status       || "–",
          })
        })
      }
    }
    return out.sort((a, b) => (b.id || 0) - (a.id || 0))
  }, [purchases])

  /* filter */
  const filteredReq = useMemo(() => {
    if (!search.trim()) return reqRows
    const q = search.toLowerCase()
    return reqRows.filter(r =>
      String(r.requester).toLowerCase().includes(q) ||
      String(r.regNo).toLowerCase().includes(q) ||
      String(r.equipment).toLowerCase().includes(q) ||
      String(r.lab).toLowerCase().includes(q)
    )
  }, [reqRows, search])

  const filteredPurch = useMemo(() => {
    if (!search.trim()) return purchRows
    const q = search.toLowerCase()
    return purchRows.filter(r =>
      String(r.submittedBy).toLowerCase().includes(q) ||
      String(r.equipment).toLowerCase().includes(q)
    )
  }, [purchRows, search])

  /* chart — req status pie */
  const reqStatusPie = useMemo(() => {
    const m = {}
    for (const r of reqRows) { const k = fmtStatus(r.status); m[k] = (m[k] || 0) + 1 }
    return Object.entries(m).map(([name, value]) => ({ name, value }))
  }, [reqRows])

  /* chart — purchase status bar */
  const purchStatusBar = useMemo(() => {
    const m = {}
    for (const p of purchRows) { const k = fmtStatus(p.status); m[k] = (m[k] || 0) + 1 }
    return Object.entries(m).map(([name, count]) => ({ name, count }))
  }, [purchRows])

  const summary = useMemo(() => ({
    reqRecords:  reqRows.length,
    returned:    reqRows.filter(r => r.returned).length,
    damaged:     reqRows.filter(r => r.damaged).length,
    purchRecords: purchRows.length,
    received:    purchRows.filter(p => String(p.status).toUpperCase() === "RECEIVED_BY_HOD").length,
  }), [reqRows, purchRows])

  return (
    <div className="dashboard-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <div className="content">

          <div className="hod-page-header">
            <div>
              <div className="hod-page-title">History</div>
              <div className="hod-page-subtitle">Dept: {me?.department || "–"} &nbsp;·&nbsp; Completed requests & purchase records</div>
            </div>
          </div>

          {error && <div className="hod-alert hod-alert-error">{error}</div>}

          {/* Stats */}
          <div className="stat-grid">
            <div className="stat-card blue">
              <div className="stat-label">Request Records</div>
              <div className="stat-value">{loading ? "–" : summary.reqRecords}</div>
            </div>
            <div className="stat-card green">
              <div className="stat-label">Items Returned</div>
              <div className="stat-value">{loading ? "–" : summary.returned}</div>
            </div>
            <div className="stat-card red">
              <div className="stat-label">Items Damaged</div>
              <div className="stat-value">{loading ? "–" : summary.damaged}</div>
            </div>
            <div className="stat-card slate">
              <div className="stat-label">Purchase Records</div>
              <div className="stat-value">{loading ? "–" : summary.purchRecords}</div>
            </div>
          </div>

          {/* Charts */}
          {!loading && (
            <div className="chart-grid-2" style={{ marginBottom: 8 }}>
              {reqStatusPie.length > 0 && tab === "requests" && (
                <div className="chart-card">
                  <div className="chart-card-title">Request History — Status Breakdown</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={reqStatusPie} cx="50%" cy="50%" innerRadius={50} outerRadius={78} dataKey="value" paddingAngle={3}>
                        {reqStatusPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip /><Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              {purchStatusBar.length > 0 && tab === "purchases" && (
                <div className="chart-card">
                  <div className="chart-card-title">Purchase History — Status Breakdown</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={purchStatusBar} layout="vertical" margin={{ left: 8, right: 20, top: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={140} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#16a34a" radius={[0, 4, 4, 0]} name="Count" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Tabs */}
          <div className="tab-bar">
            <button className={`tab-item${tab === "requests" ? " active" : ""}`} onClick={() => { setTab("requests"); setSearch("") }}>
              Equipment Requests ({reqRows.length})
            </button>
            <button className={`tab-item${tab === "purchases" ? " active" : ""}`} onClick={() => { setTab("purchases"); setSearch("") }}>
              Purchase List ({purchRows.length})
            </button>
          </div>

          {/* Search */}
          <div className="filter-bar">
            <div className="filter-input-wrap">
              <FaSearch size={13} />
              <input
                className="filter-input"
                placeholder={tab === "requests" ? "Search requester, reg no, equipment, lab…" : "Search TO name, equipment…"}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Request Table */}
          {tab === "requests" && (
            <div className="hod-table-wrap">
              <table className="hod-table">
                <thead>
                  <tr><th>#ID</th><th>Requester</th><th>Reg No</th><th>Role</th><th>Lab</th><th>Equipment</th><th>Qty</th><th>From</th><th>To</th><th>Status</th><th>Returned</th></tr>
                </thead>
                <tbody>
                  {loading && <tr className="empty-row"><td colSpan="11">Loading…</td></tr>}
                  {!loading && filteredReq.length === 0 && <tr className="empty-row"><td colSpan="11">No completed request records</td></tr>}
                  {!loading && filteredReq.map(r => (
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
                      <td><span className={getStatusPill(r.status)}>{fmtStatus(r.status)}</span></td>
                      <td className="tc">
                        {r.damaged ? <span className="sp sp-red">Damaged</span>
                          : r.returned ? <span className="sp sp-green">Returned</span>
                          : <span className="muted">–</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Purchase Table */}
          {tab === "purchases" && (
            <div className="hod-table-wrap">
              <table className="hod-table">
                <thead>
                  <tr><th>#ID</th><th>Submitted By (TO)</th><th>Equipment</th><th>Qty</th><th>Submitted</th><th>Issued</th><th>Received</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {loading && <tr className="empty-row"><td colSpan="8">Loading…</td></tr>}
                  {!loading && filteredPurch.length === 0 && <tr className="empty-row"><td colSpan="8">No purchase records</td></tr>}
                  {!loading && filteredPurch.map(p => (
                    <tr key={p.key}>
                      <td className="req-id">#{p.id}</td>
                      <td>{p.submittedBy}</td>
                      <td>{p.equipment}</td>
                      <td className="tc">{p.qty}</td>
                      <td className="tc muted">{p.created}</td>
                      <td className="tc muted">{p.issued !== "–" ? p.issued : <span className="muted">–</span>}</td>
                      <td className="tc muted">{p.received !== "–" ? p.received : <span className="muted">–</span>}</td>
                      <td><span className={getStatusPill(p.status)}>{fmtStatus(p.status)}</span></td>
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