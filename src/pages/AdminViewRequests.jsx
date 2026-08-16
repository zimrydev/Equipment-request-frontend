import "../styles/dashboard.css"
import "../styles/adminTheme.css"
import Sidebar from "../components/Sidebar"
import Topbar from "../components/Topbar"
import { useEffect, useMemo, useState } from "react"
import { AdminAPI, AdminPurchaseAPI } from "../api/api"
import { AiOutlineCheck, AiOutlineClose, AiOutlineCalendar } from "react-icons/ai"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"

/* Purchase status → pill class */
function psp(status) {
  const s = String(status || "").toUpperCase()
  if (s === "APPROVED_BY_HOD")   return { label: "HOD Approved — Awaiting Admin", cls: "a-sp-purple" }
  if (s === "SUBMITTED_TO_HOD")  return { label: "Submitted to HOD", cls: "a-sp-amber" }
  if (s === "ISSUED_BY_ADMIN")   return { label: "Issued by Admin",  cls: "a-sp-blue" }
  if (s === "REJECTED_BY_ADMIN") return { label: "Rejected by Admin",cls: "a-sp-red" }
  if (s === "REJECTED_BY_HOD")   return { label: "Rejected by HOD",  cls: "a-sp-red" }
  if (s === "RECEIVED_BY_HOD")   return { label: "Received by HOD",  cls: "a-sp-green" }
  return { label: s.replace(/_/g, " "), cls: "a-sp-slate" }
}

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`
}

export default function AdminViewRequests() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [departments, setDepartments] = useState([])
  const [dept, setDept]               = useState("")
  const [rows, setRows]               = useState([])
  const [issuedDate, setIssuedDate]   = useState(today)
  const [loading, setLoading]         = useState(false)
  const [actionId, setActionId]       = useState(null)
  const [error, setError]             = useState("")
  const [notice, setNotice]           = useState("")

  /* load depts */
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
    setError(""); setNotice("")
    try {
      setLoading(true)
      const list = await AdminPurchaseAPI.pendingByDept(d)
      setRows(Array.isArray(list) ? list : [])
    } catch (e) { setError(e?.message || "Failed to load") }
    finally { setLoading(false) }
  }

  const showNotice = msg => { setNotice(msg); setTimeout(() => setNotice(""), 5000) }
  const showError  = msg => { setError(msg);  setTimeout(() => setError(""), 6000) }

  const approve = async (id) => {
    if (!issuedDate) return showError("Please select the issued date first")
    setActionId(id)
    try {
      await AdminPurchaseAPI.approve({ dept, id, issuedDate })
      showNotice(`Purchase #${id} approved — inventory will be updated when HOD confirms receipt`)
      await load()
    } catch (e) { showError(e?.message || "Approve failed") }
    finally { setActionId(null) }
  }

  const reject = async (id, reason = "") => {
    setActionId(id)
    try {
      await AdminPurchaseAPI.reject({ dept, id, reason })
      showNotice(`Purchase #${id} rejected`)
      await load()
    } catch (e) { showError(e?.message || "Reject failed") }
    finally { setActionId(null) }
  }

  /* only APPROVED_BY_HOD are actionable — split for clarity */
  const { pendingRows, otherRows } = useMemo(() => ({
    pendingRows: [...rows].filter(p => p.status === "APPROVED_BY_HOD").sort((a,b) => (b.id||0)-(a.id||0)),
    otherRows:   [...rows].filter(p => p.status !== "APPROVED_BY_HOD").sort((a,b) => (b.id||0)-(a.id||0)),
  }), [rows])

  /* pie */
  const pieData = useMemo(() => {
    const m = {}
    for (const p of rows) {
      const { label } = psp(p.status)
      m[label] = (m[label] || 0) + 1
    }
    return Object.entries(m).map(([name, value]) => ({ name, value }))
  }, [rows])

  const COLORS = ["#7c3aed","#d97706","#2563eb","#dc2626","#16a34a","#0891b2"]

  return (
    <div className="dashboard-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <div className="content">

          <div className="admin-page-header">
            <div>
              <div className="admin-page-title">Purchase Requests</div>
              <div className="admin-page-subtitle">
                Review and approve HOD-approved purchase requests
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <select className="a-filter-select" value={dept} onChange={e => setDept(e.target.value)}>
                {departments.map(d => { const n = d.name||d; return <option key={n} value={n}>{n}</option> })}
              </select>
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px",
                border: "1.5px solid var(--a-slate-200)", borderRadius: 8, background: "#fff", fontSize: 13 }}>
                <AiOutlineCalendar style={{ color: "var(--a-blue)" }} />
                <span style={{ fontWeight: 600, color: "var(--a-text-muted)" }}>Issued Date:</span>
                <input type="date" value={issuedDate} onChange={e => setIssuedDate(e.target.value)}
                  style={{ border: "none", outline: "none", fontSize: 13, fontFamily: "inherit", color: "var(--a-text)" }} />
              </div>
            </div>
          </div>

          {error  && <div className="a-alert a-alert-error">{error}</div>}
          {notice && <div className="a-alert a-alert-success">{notice}</div>}

          {/* Stats */}
          <div className="admin-stat-grid">
            <div className="admin-stat-card purple">
              <div className="admin-stat-label">Awaiting Action</div>
              <div className="admin-stat-value">{loading ? "–" : pendingRows.length}</div>
              <div className="admin-stat-sub">HOD approved</div>
            </div>
            <div className="admin-stat-card blue">
              <div className="admin-stat-label">Total in Dept</div>
              <div className="admin-stat-value">{loading ? "–" : rows.length}</div>
            </div>
          </div>

          {/* Overview pie */}
          {!loading && pieData.length > 0 && (
            <div className="a-chart-card" style={{ marginBottom: 20 }}>
              <div className="a-chart-title">Purchase Status Overview — {dept}</div>
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={76} dataKey="value" paddingAngle={3}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Actionable — HOD Approved */}
          <div className="admin-section-hd">
            <span className="admin-section-title">HOD Approved — Awaiting Admin ({pendingRows.length})</span>
          </div>

          {!loading && pendingRows.length === 0 && (
            <div className="a-empty"><div className="a-empty-icon">✅</div><div className="a-empty-text">No pending purchases in {dept}</div></div>
          )}

          {loading && <div className="a-empty"><div className="a-empty-icon">⏳</div><div className="a-empty-text">Loading…</div></div>}

          {!loading && pendingRows.map(p => (
            <PurchaseCard
              key={p.id} p={p} issuedDate={issuedDate}
              onApprove={approve} onReject={reject}
              isActioning={actionId === p.id}
              showActions
            />
          ))}

          {/* Other status purchases */}
          {otherRows.length > 0 && (
            <>
              <div className="admin-section-hd" style={{ marginTop: 8 }}>
                <span className="admin-section-title">Other Purchases ({otherRows.length})</span>
              </div>
              <div className="a-table-wrap">
                <table className="a-table">
                  <thead>
                    <tr><th>#ID</th><th>Requested By</th><th>First Item</th><th>Items</th><th>Date</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {otherRows.map(p => {
                      const { label, cls } = psp(p.status)
                      const items = Array.isArray(p.items) ? p.items : []
                      return (
                        <tr key={p.id}>
                          <td className="a-id">#{p.id}</td>
                          <td>{p.requestedByName || "–"}</td>
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
            </>
          )}

        </div>
      </div>
    </div>
  )
}

function PurchaseCard({ p, issuedDate, onApprove, onReject, isActioning, showActions }) {
  const [rejectReason, setRejectReason]   = useState("")
  const [showRejectBox, setShowRejectBox] = useState(false)
  const items = Array.isArray(p.items) ? p.items : []
  const { label, cls } = psp(p.status)

  return (
    <div className="a-purchase-card">
      <div className="a-purchase-top">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontWeight: 800, fontSize: 15, color: "var(--a-text)" }}>Purchase #{p.id}</span>
          <span className={`a-sp ${cls}`}>{label}</span>
        </div>
        {showActions && (
          <div className="a-purchase-actions">
            <button className="a-btn a-btn-success" onClick={() => onApprove(p.id)} disabled={isActioning}>
              <AiOutlineCheck /> Issue (Approve)
            </button>
            <button className="a-btn a-btn-danger" onClick={() => setShowRejectBox(v => !v)} disabled={isActioning}>
              <AiOutlineClose /> Reject
            </button>
          </div>
        )}
      </div>

      <div className="a-purchase-body">
        <div className="a-meta-grid">
          <div>
            <div className="a-mi-label">Submitted By (TO)</div>
            <div className="a-mi-value">{p.requestedByName || "–"}</div>
          </div>
          <div>
            <div className="a-mi-label">HOD (Approved)</div>
            <div className="a-mi-value">{p.hodName || p.requestedByName || "–"}</div>
          </div>
          <div>
            <div className="a-mi-label">Submitted Date</div>
            <div className="a-mi-value">{p.createdDate || "–"}</div>
          </div>
          <div>
            <div className="a-mi-label">Issued Date (to set)</div>
            <div className="a-mi-value" style={{ color: "var(--a-blue)" }}>{issuedDate || "–"}</div>
          </div>
          {p.reason && (
            <div style={{ gridColumn: "1 / -1" }}>
              <div className="a-mi-label">Reason</div>
              <div className="a-mi-value muted">{p.reason}</div>
            </div>
          )}
        </div>

        <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".6px", color: "var(--a-text-muted)", marginBottom: 8 }}>
          Items ({items.length})
        </div>
        {items.length === 0
          ? <div style={{ fontSize: 13, color: "var(--a-text-muted)" }}>No items listed</div>
          : <div className="a-chips">
              {items.map((it, i) => (
                <div key={i} className="a-chip">
                  {it.equipmentName || it.name || "–"}
                  <span className="a-chip-qty">×{it.quantityRequested ?? it.quantity ?? "–"}</span>
                </div>
              ))}
            </div>
        }

        {showRejectBox && (
          <div style={{ marginTop: 14, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input className="a-input" style={{ flex: 1, minWidth: 200 }}
              placeholder="Optional rejection reason"
              value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
            <button className="a-btn a-btn-danger" disabled={isActioning}
              onClick={() => { setShowRejectBox(false); onReject(p.id, rejectReason) }}>
              Confirm Reject
            </button>
            <button className="a-btn a-btn-ghost" onClick={() => setShowRejectBox(false)}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  )
}