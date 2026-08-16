import "../styles/hodTheme.css"
import Sidebar from "../components/Sidebar"
import Topbar from "../components/Topbar"
import { useEffect, useMemo, useState } from "react"
import { HodPurchaseAPI } from "../api/api"
import { AiOutlineCheck, AiOutlineClose, AiOutlineInbox } from "react-icons/ai"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"

function getStatusPill(s) {
  const v = String(s || "").toUpperCase()
  if (v.includes("APPROVED") || v.includes("RECEIVED")) return "sp sp-green"
  if (v.includes("REJECTED")) return "sp sp-red"
  if (v.includes("ISSUED")) return "sp sp-blue"
  if (v.includes("PENDING") || v.includes("SUBMITTED")) return "sp sp-amber"
  return "sp sp-slate"
}
const fmtStatus = s => String(s || "–").replace(/_/g, " ")
const COLORS = ["#d97706", "#2563eb", "#16a34a", "#dc2626", "#7c3aed"]

export default function HodDeptPurchase() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [pendingRows, setPendingRows] = useState([])
  const [issuedRows, setIssuedRows]   = useState([])
  const [allHistory, setAllHistory]   = useState([])
  const [loading, setLoading]   = useState(false)
  const [actionId, setActionId] = useState(null) // id currently being actioned
  const [error, setError]       = useState("")

  const load = async () => {
    setError("")
    try {
      setLoading(true)
      const [pending, all] = await Promise.all([
        HodPurchaseAPI.pending().catch(() => []),
        HodPurchaseAPI.my().catch(() => []),
      ])
      const allArr    = Array.isArray(all) ? all : []
      const pendArr   = Array.isArray(pending) ? pending : []
      setPendingRows(pendArr)
      const ISSUED_STATUSES = new Set(["ISSUED_BY_ADMIN", "APPROVED_BY_ADMIN"])
      setIssuedRows(allArr.filter(x => ISSUED_STATUSES.has(String(x.status || "").toUpperCase())))
      setAllHistory(allArr)
    } catch (e) {
      setError(e?.message || "Failed to load")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const decide = async (id, approve) => {
    setActionId(id)
    setError("")
    try {
      await HodPurchaseAPI.decision({ id, approve, comment: "" })
      await load()
    } catch (e) {
      setError(e?.message || "Action failed")
    } finally {
      setActionId(null)
    }
  }

  const receive = async (id) => {
    setActionId(id)
    setError("")
    try {
      await HodPurchaseAPI.receive(id)
      await load()
    } catch (e) {
      setError(e?.message || "Action failed")
    } finally {
      setActionId(null)
    }
  }

  /* pie — purchase status */
  const pieData = useMemo(() => {
    const m = {}
    for (const p of allHistory) {
      const k = fmtStatus(p.status)
      m[k] = (m[k] || 0) + 1
    }
    return Object.entries(m).map(([name, value]) => ({ name, value }))
  }, [allHistory])

  const sorted       = useMemo(() => [...pendingRows].sort((a, b) => (b.id || 0) - (a.id || 0)), [pendingRows])
  const sortedIssued = useMemo(() => [...issuedRows].sort((a, b) => (b.id || 0) - (a.id || 0)), [issuedRows])

  const PurchaseCard = ({ p, showApprove, showReceive }) => {
    const items = Array.isArray(p.items) ? p.items : []
    const isActioning = actionId === p.id
    // toName = Technical Officer who submitted the request
    const submittedBy = p.toName || p.requestedByName || p.submittedByName || "–"

    return (
      <div className="purchase-card">
        <div className="purchase-card-top">
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 800, fontSize: 16, color: "var(--text)" }}>Purchase #{p.id}</span>
            <span className={getStatusPill(p.status)}>{fmtStatus(p.status)}</span>
          </div>
          <div className="purchase-card-actions">
            {showApprove && (
              <>
                <button className="hod-btn hod-btn-success" onClick={() => decide(p.id, true)} disabled={isActioning || loading}>
                  <AiOutlineCheck /> Approve
                </button>
                <button className="hod-btn hod-btn-danger" onClick={() => decide(p.id, false)} disabled={isActioning || loading}>
                  <AiOutlineClose /> Reject
                </button>
              </>
            )}
            {showReceive && (
              <button className="hod-btn hod-btn-primary" onClick={() => receive(p.id)} disabled={isActioning || loading}>
                <AiOutlineInbox /> Confirm Received
              </button>
            )}
          </div>
        </div>

        <div className="purchase-card-body">
          <div className="meta-grid">
            <div className="meta-item">
              <div className="mi-label">Submitted By (TO)</div>
              <div className="mi-value">{submittedBy}</div>
            </div>
            <div className="meta-item">
              <div className="mi-label">Date Submitted</div>
              <div className="mi-value">{p.createdDate || "–"}</div>
            </div>
            {showReceive && (
              <div className="meta-item">
                <div className="mi-label">Issued Date</div>
                <div className="mi-value">{p.issuedDate || "–"}</div>
              </div>
            )}
            {p.reason && (
              <div className="meta-item" style={{ gridColumn: "1 / -1" }}>
                <div className="mi-label">Reason</div>
                <div className="mi-value muted">{p.reason}</div>
              </div>
            )}
          </div>

          <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".6px", color: "var(--text-muted)", marginBottom: 8 }}>
            Requested Items ({items.length})
          </div>
          {items.length === 0
            ? <div style={{ fontSize: 13, color: "var(--text-muted)" }}>No items</div>
            : <div className="item-chips">
                {items.map((it, i) => (
                  <div key={i} className="item-chip">
                    {it.equipmentName || it.name || "–"}
                    <span className="chip-qty">×{it.quantityRequested ?? it.quantity ?? "–"}</span>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <div className="content">

          <div className="hod-page-header">
            <div>
              <div className="hod-page-title">Department Purchase Requests</div>
              <div className="hod-page-subtitle">Approve or reject purchase requests from Technical Officers</div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span className="sp sp-amber">{sorted.length} Pending</span>
              <span className="sp sp-blue">{sortedIssued.length} Awaiting Receipt</span>
            </div>
          </div>

          {error && <div className="hod-alert hod-alert-error">{error}</div>}

          {/* Stats */}
          <div className="stat-grid">
            <div className="stat-card amber">
              <div className="stat-label">Pending Approval</div>
              <div className="stat-value">{sorted.length}</div>
            </div>
            <div className="stat-card blue">
              <div className="stat-label">Awaiting Your Receipt</div>
              <div className="stat-value">{sortedIssued.length}</div>
            </div>
            <div className="stat-card green">
              <div className="stat-label">Total Purchases</div>
              <div className="stat-value">{allHistory.length}</div>
            </div>
          </div>

          {/* Overview pie */}
          {!loading && pieData.length > 0 && (
            <div className="chart-card" style={{ marginBottom: 24 }}>
              <div className="chart-card-title">Purchase Status Overview</div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                    dataKey="value" paddingAngle={3}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Pending Approval */}
          <div className="section-hd">
            <span className="section-hd-title">Pending Your Approval</span>
          </div>

          {loading && (
            <div className="empty-block"><div className="empty-icon">⏳</div><div className="empty-text">Loading…</div></div>
          )}
          {!loading && sorted.length === 0 && (
            <div className="empty-block"><div className="empty-icon">✅</div><div className="empty-text">No pending purchase requests</div></div>
          )}
          {!loading && sorted.map(p => <PurchaseCard key={p.id} p={p} showApprove />)}

          {/* Issued — Confirm Received */}
          <div className="section-hd" style={{ marginTop: 8 }}>
            <span className="section-hd-title">Issued by Admin — Confirm Received</span>
          </div>

          {!loading && sortedIssued.length === 0 && (
            <div className="empty-block"><div className="empty-icon">📦</div><div className="empty-text">No items awaiting confirmation</div></div>
          )}
          {!loading && sortedIssued.map(p => <PurchaseCard key={`i-${p.id}`} p={p} showReceive />)}

        </div>
      </div>
    </div>
  )
}