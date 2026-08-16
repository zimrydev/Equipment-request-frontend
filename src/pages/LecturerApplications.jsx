import "../styles/dashboard.css"
import "../styles/lecturerTheme.css"
import Sidebar from "../components/Sidebar"
import Topbar from "../components/Topbar"
import { useEffect, useMemo, useState } from "react"
import { LecturerRequestAPI } from "../api/api"
import { AiOutlineCheck, AiOutlineClose, AiOutlineSearch } from "react-icons/ai"
import { FaSearch } from "react-icons/fa"

/* ── The approval queue returns RequestSummaryDTO[]
   Each DTO has: requestId, status, purpose, fromDate, toDate, labName,
   requesterFullName, requesterRegNo, requesterRole, items: RequestSummaryItemDTO[]
   Each item has: requestItemId, equipmentId, equipmentName, category, itemType,
                  quantity, itemStatus, toWaitReason

   Logic:
   - Queue returns ONLY requests with status PENDING_LECTURER_APPROVAL
   - Items inside can individually have itemStatus PENDING_LECTURER_APPROVAL
   - Lecturer can approve/reject per-item OR per-request (whole request)
   - We show per-item actions so lecturer can partially approve
 ── */

function itemStatusPill(status) {
  const s = String(status || "").toUpperCase()
  if (s === "PENDING_LECTURER_APPROVAL") return { cls: "lt-sp-pending",  label: "Pending" }
  if (s === "APPROVED_BY_LECTURER")      return { cls: "lt-sp-approved", label: "Approved" }
  if (s === "REJECTED_BY_LECTURER")      return { cls: "lt-sp-rejected", label: "Rejected" }
  return { cls: "lt-sp-slate", label: s.replace(/_/g, " ") }
}

/* Single application card — per-item approve/reject */
function AppCard({ r, onApproveItem, onRejectItem, onApproveAll, onRejectAll, actioning }) {
  const [rejectItemId, setRejectItemId] = useState(null)
  const [rejectReason, setRejectReason] = useState("")
  const [showRejectAll, setShowRejectAll] = useState(false)
  const [rejectAllReason, setRejectAllReason] = useState("")

  const items = Array.isArray(r.items) ? r.items : []
  const pendingItems = items.filter(i => i.itemStatus === "PENDING_LECTURER_APPROVAL")
  const allPending = pendingItems.length === items.length

  return (
    <div className="lt-app-card">
      <div className="lt-app-card-top">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontWeight: 800, fontSize: 15, color: "var(--lt-text)" }}>
            Request #{r.requestId}
          </span>
          <span className="lt-sp lt-sp-pending">Pending Approval</span>
          <span className="lt-sp lt-sp-slate">{r.requesterRole || "–"}</span>
          {r.priorityScore != null && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700,
              background: r.priorityScore >= 80 ? "rgba(220,38,38,.12)"
                        : r.priorityScore >= 60 ? "rgba(217,119,6,.12)"
                        : r.priorityScore >= 40 ? "rgba(37,99,235,.12)"
                        : "rgba(100,116,139,.12)",
              color: r.priorityScore >= 80 ? "#dc2626"
                   : r.priorityScore >= 60 ? "#d97706"
                   : r.priorityScore >= 40 ? "#2563eb"
                   : "#64748b"
            }}>
              🎯 {r.priorityScore >= 80 ? "Critical" : r.priorityScore >= 60 ? "High" : r.priorityScore >= 40 ? "Medium" : "Low"} · {r.priorityScore}
            </span>
          )}
        </div>
        {/* Approve / reject whole request */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="lt-btn lt-btn-success lt-btn-sm"
            onClick={() => onApproveAll(r.requestId)}
            disabled={actioning === `all-approve-${r.requestId}`}>
            <AiOutlineCheck /> Approve All
          </button>
          <button className="lt-btn lt-btn-danger lt-btn-sm"
            onClick={() => setShowRejectAll(v => !v)}
            disabled={!!actioning}>
            <AiOutlineClose /> Reject All
          </button>
        </div>
      </div>

      <div className="lt-app-card-body">
        <div className="lt-meta-grid">
          <div>
            <div className="lt-mi-label">Requester</div>
            <div className="lt-mi-value">{r.requesterFullName || "–"}</div>
          </div>
          <div>
            <div className="lt-mi-label">Reg No</div>
            <div className="lt-mi-value muted">{r.requesterRegNo || "–"}</div>
          </div>
          <div>
            <div className="lt-mi-label">Lab</div>
            <div className="lt-mi-value">{r.labName || "–"}</div>
          </div>
          <div>
            <div className="lt-mi-label">Purpose</div>
            <div className="lt-mi-value muted">{r.purpose || "–"}</div>
          </div>
          <div>
            <div className="lt-mi-label">From Date</div>
            <div className="lt-mi-value muted">{r.fromDate || "–"}</div>
          </div>
          <div>
            <div className="lt-mi-label">To Date</div>
            <div className="lt-mi-value muted">{r.toDate || "–"}</div>
          </div>
        </div>

        {/* Per-item actions */}
        <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".6px", color: "var(--lt-text-muted)", marginBottom: 10, paddingTop: 4, borderTop: "1px solid var(--lt-slate-100)" }}>
          Equipment Items ({items.length})
        </div>

        {items.map(it => {
          const { cls, label } = itemStatusPill(it.itemStatus)
          const isPending = it.itemStatus === "PENDING_LECTURER_APPROVAL"
          const isRejectingThis = rejectItemId === it.requestItemId

          return (
            <div key={it.requestItemId} style={{
              display: "flex", alignItems: "flex-start", justifyContent: "space-between",
              gap: 12, flexWrap: "wrap", padding: "10px 0",
              borderBottom: "1px solid var(--lt-slate-100)"
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, fontSize: 13.5 }}>{it.equipmentName || `Equipment #${it.equipmentId}`}</span>
                  <span className={`lt-sp ${cls}`}>{label}</span>
                  {it.itemType && <span className="lt-sp lt-sp-slate">{it.itemType}</span>}
                </div>
                <div style={{ fontSize: 12, color: "var(--lt-text-muted)", marginTop: 3 }}>
                  Qty: {it.quantity} · Category: {it.category || "–"}
                </div>
                {it.toWaitReason && (
                  <div style={{ fontSize: 12, color: "#92400e", marginTop: 3 }}>Wait reason: {it.toWaitReason}</div>
                )}
              </div>

              {isPending && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  <button className="lt-btn lt-btn-success lt-btn-sm"
                    onClick={() => onApproveItem(it.requestItemId)}
                    disabled={!!actioning}>
                    <AiOutlineCheck /> Approve
                  </button>
                  <button className="lt-btn lt-btn-danger lt-btn-sm"
                    onClick={() => { setRejectItemId(isRejectingThis ? null : it.requestItemId); setRejectReason("") }}
                    disabled={!!actioning}>
                    <AiOutlineClose /> Reject
                  </button>
                </div>
              )}

              {/* Inline reject reason for this item */}
              {isRejectingThis && (
                <div className="lt-reject-panel" style={{ width: "100%" }}>
                  <input className="lt-reject-input" placeholder="Rejection reason (optional)"
                    value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
                  <button className="lt-btn lt-btn-danger lt-btn-sm"
                    disabled={!!actioning}
                    onClick={() => { setRejectItemId(null); onRejectItem(it.requestItemId, rejectReason) }}>
                    Confirm Reject
                  </button>
                  <button className="lt-btn lt-btn-ghost lt-btn-sm" onClick={() => setRejectItemId(null)}>
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {/* Reject all panel */}
        {showRejectAll && (
          <div className="lt-reject-panel" style={{ marginTop: 14 }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>Reject entire request?</span>
            <input className="lt-reject-input" placeholder="Rejection reason (optional)"
              value={rejectAllReason} onChange={e => setRejectAllReason(e.target.value)} />
            <button className="lt-btn lt-btn-danger lt-btn-sm"
              disabled={!!actioning}
              onClick={() => { setShowRejectAll(false); onRejectAll(r.requestId, rejectAllReason) }}>
              Confirm Reject All
            </button>
            <button className="lt-btn lt-btn-ghost lt-btn-sm" onClick={() => setShowRejectAll(false)}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function LecturerApplications() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState("")
  const [notice,  setNotice]  = useState("")
  const [actioning, setActioning] = useState(null) // e.g. "item-123" | "all-approve-456"
  const [search,  setSearch]  = useState("")

  const load = async () => {
    setError("")
    try {
      setLoading(true)
      const list = await LecturerRequestAPI.queue()
      const sorted = (Array.isArray(list) ? list : [])
        .sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0))
      setRows(sorted)
    } catch (e) { setError(e?.message || "Failed to load approval queue") }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const showNotice = msg => { setNotice(msg); setTimeout(() => setNotice(""), 5000) }
  const showError  = msg => { setError(msg);  setTimeout(() => setError(""), 6000) }

  const handleApproveItem = async (requestItemId) => {
    setActioning(`item-${requestItemId}`)
    try {
      await LecturerRequestAPI.approveItem(requestItemId)
      showNotice("Item approved successfully")
      await load()
    } catch (e) { showError(e?.message || "Approve failed") }
    finally { setActioning(null) }
  }

  const handleRejectItem = async (requestItemId, reason) => {
    setActioning(`item-${requestItemId}`)
    try {
      await LecturerRequestAPI.rejectItem(requestItemId, reason)
      showNotice("Item rejected")
      await load()
    } catch (e) { showError(e?.message || "Reject failed") }
    finally { setActioning(null) }
  }

  const handleApproveAll = async (requestId) => {
    setActioning(`all-approve-${requestId}`)
    try {
      await LecturerRequestAPI.approve(requestId)
      showNotice(`Request #${requestId} approved — all items sent to TO`)
      await load()
    } catch (e) { showError(e?.message || "Approve all failed") }
    finally { setActioning(null) }
  }

  const handleRejectAll = async (requestId, reason) => {
    setActioning(`all-reject-${requestId}`)
    try {
      await LecturerRequestAPI.reject(requestId, reason)
      showNotice(`Request #${requestId} rejected`)
      await load()
    } catch (e) { showError(e?.message || "Reject all failed") }
    finally { setActioning(null) }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return [...rows].sort((a, b) => (b.requestId || 0) - (a.requestId || 0))
    return [...rows]
      .filter(r =>
        String(r.requesterFullName || "").toLowerCase().includes(q) ||
        String(r.requesterRegNo   || "").toLowerCase().includes(q) ||
        String(r.labName          || "").toLowerCase().includes(q) ||
        String(r.requestId        || "").includes(q)
      )
      .sort((a, b) => (b.requestId || 0) - (a.requestId || 0))
  }, [rows, search])

  return (
    <div className="dashboard-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <div className="content">

          <div className="lt-page-header">
            <div>
              <div className="lt-page-title">Pending Applications</div>
              <div className="lt-page-subtitle">Review and approve student / staff equipment requests</div>
            </div>
            {rows.length > 0 && (
              <span style={{ background:"#fef3c7", color:"#92400e", padding:"6px 14px", borderRadius:20, fontSize:13, fontWeight:700, border:"1px solid #fde68a" }}>
                {rows.length} pending
              </span>
            )}
          </div>

          {error  && <div className="lt-alert lt-alert-error">{error}</div>}
          {notice && <div className="lt-alert lt-alert-success">{notice}</div>}

          {/* Search */}
          {rows.length > 0 && (
            <div className="lt-filter-bar">
              <div className="lt-filter-wrap">
                <FaSearch className="lt-filter-icon" />
                <input className="lt-filter-input"
                  placeholder="Search requester name, reg no, lab, request ID…"
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
          )}

          {loading && (
            <div className="lt-empty">
              <div className="lt-empty-icon">⏳</div>
              <div className="lt-empty-text">Loading applications…</div>
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="lt-empty">
              <div className="lt-empty-icon">✅</div>
              <div className="lt-empty-text">
                {rows.length === 0 ? "No pending applications — all caught up!" : "No results match your search."}
              </div>
            </div>
          )}

          {!loading && filtered.map(r => (
            <AppCard
              key={r.requestId}
              r={r}
              actioning={actioning}
              onApproveItem={handleApproveItem}
              onRejectItem={handleRejectItem}
              onApproveAll={handleApproveAll}
              onRejectAll={handleRejectAll}
            />
          ))}

        </div>
      </div>
    </div>
  )
}