import "../styles/dashboard.css"
import "../styles/lecturerTheme.css"
import Sidebar from "../components/Sidebar"
import Topbar from "../components/Topbar"
import { useEffect, useMemo, useState } from "react"
import { LecturerRequestAPI, StudentRequestAPI } from "../api/api"
import { AiOutlineCheck, AiOutlineRollback, AiOutlineSearch } from "react-icons/ai"
import { FaSearch } from "react-icons/fa"

/* ── LecturerRequestAPI.my() returns StudentMyRequestDTO[]
   Each DTO: requestId, status(req level), purpose, fromDate, toDate, labName,
             lecturerName, items: StudentMyRequestItemDTO[], canAcceptIssue, canReturn
   Each item: requestItemId, equipmentId, equipmentName, quantity, itemType,
              itemStatus, toWaitReason, issuedQty, returned, damaged

   Actions available to the lecturer as REQUESTER:
   - ISSUED_PENDING_REQUESTER_ACCEPT → StudentRequestAPI.acceptIssueItem(requestItemId)
   - ISSUED_CONFIRMED + RETURNABLE    → StudentRequestAPI.submitReturnItem(requestItemId)
 ── */

/* Derive accurate overall status for card header from item statuses */
function deriveOverallStatus(r, visibleItems) {
  const items = visibleItems || (Array.isArray(r?.items) ? r.items : [])
  if (!items.length) return r.status
  const statuses = items.map(it => String(it.itemStatus || "").toUpperCase())
  if (statuses.every(s => s === "RETURN_VERIFIED" || s === "DAMAGED_REPORTED"))
    return "RETURNED_VERIFIED"
  if (statuses.some(s => s === "RETURN_REQUESTED" || s === "RETURN_VERIFIED"))
    return "RETURNED_PENDING_TO_VERIFY"
  if (statuses.some(s => s === "ISSUED_PENDING_REQUESTER_ACCEPT"))
    return "ISSUED_PENDING_STUDENT_ACCEPT"
  return r.status
}

const ITEM_STATUS_OPTIONS = [
  { value: "",                              label: "All Active Statuses" },
  { value: "PENDING_LECTURER_APPROVAL",     label: "Pending Approval" },
  { value: "APPROVED_BY_LECTURER",          label: "Approved" },
  { value: "WAITING_TO_ISSUE",              label: "Waiting to Issue" },
  { value: "ISSUED_PENDING_REQUESTER_ACCEPT", label: "Issued — Awaiting Confirm" },
  { value: "ISSUED_CONFIRMED",              label: "Issued Confirmed" },
  { value: "RETURN_REQUESTED",              label: "Return Requested" },
]

/* Item statuses that belong in History, not ViewRequests */
const HISTORY_ITEM_STATUSES = new Set(["REJECTED_BY_LECTURER", "RETURN_VERIFIED", "DAMAGED_REPORTED"])

function itemStatusPill(status) {
  const s = String(status || "").toUpperCase()
  if (s === "PENDING_LECTURER_APPROVAL")       return { cls: "lt-sp-pending",    label: "Pending Approval" }
  if (s === "APPROVED_BY_LECTURER")            return { cls: "lt-sp-approved",   label: "Approved" }
  if (s === "REJECTED_BY_LECTURER")            return { cls: "lt-sp-rejected",   label: "Rejected" }
  if (s === "WAITING_TO_ISSUE")                return { cls: "lt-sp-waiting",    label: "Waiting to Issue" }
  if (s === "ISSUED_PENDING_REQUESTER_ACCEPT") return { cls: "lt-sp-issued",     label: "Issued — Confirm?" }
  if (s === "ISSUED_CONFIRMED")                return { cls: "lt-sp-confirmed",  label: "Issued Confirmed" }
  if (s === "RETURN_REQUESTED")                return { cls: "lt-sp-returned",   label: "Return Requested" }
  if (s === "RETURN_VERIFIED")                 return { cls: "lt-sp-returned",   label: "Returned" }
  if (s === "DAMAGED_REPORTED")                return { cls: "lt-sp-damaged",    label: "Damaged" }
  return { cls: "lt-sp-slate", label: s.replace(/_/g, " ") || "–" }
}

function reqStatusPill(status) {
  const s = String(status || "").toUpperCase()
  if (s === "PENDING_LECTURER_APPROVAL") return { cls: "lt-sp-pending",    label: "Pending Approval" }
  if (s === "APPROVED_BY_LECTURER")      return { cls: "lt-sp-approved",   label: "Approved" }
  if (s === "REJECTED_BY_LECTURER")      return { cls: "lt-sp-rejected",   label: "Rejected" }
  if (s === "TO_PROCESSING")             return { cls: "lt-sp-processing", label: "TO Processing" }
  if (s === "ISSUED_CONFIRMED")          return { cls: "lt-sp-confirmed",  label: "Issued" }
  if (s === "RETURN_VERIFIED")           return { cls: "lt-sp-returned",   label: "Completed" }
  return { cls: "lt-sp-slate", label: s.replace(/_/g, " ") || "–" }
}

export default function LecturerViewRequests() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [rows,        setRows]        = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState("")
  const [notice,      setNotice]      = useState("")
  const [search,      setSearch]      = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [actioning,   setActioning]   = useState(null)

  const load = async () => {
    setError("")
    try { setLoading(true); const list = await LecturerRequestAPI.my(); setRows(Array.isArray(list) ? list : []) }
    catch (e) { setError(e?.message || "Failed to load requests") }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const showNotice = msg => { setNotice(msg); setTimeout(() => setNotice(""), 5000) }
  const showError  = msg => { setError(msg);  setTimeout(() => setError(""), 6000) }

  const handleAccept = async (requestItemId) => {
    setActioning(`accept-${requestItemId}`)
    try {
      await StudentRequestAPI.acceptIssueItem(requestItemId)
      showNotice("Receipt confirmed!")
      await load()
    } catch (e) { showError(e?.message || "Failed") }
    finally { setActioning(null) }
  }

  const handleReturn = async (requestItemId) => {
    setActioning(`return-${requestItemId}`)
    try {
      await StudentRequestAPI.submitReturnItem(requestItemId)
      showNotice("Return submitted — TO will verify.")
      await load()
    } catch (e) { showError(e?.message || "Failed") }
    finally { setActioning(null) }
  }

  /* Flatten to per-item rows for filtering — exclude history-only statuses by default */
  const flatItems = useMemo(() => {
    const out = []
    for (const r of rows) {
      for (const it of (Array.isArray(r.items) ? r.items : [])) {
        const s = String(it?.itemStatus || "")
        // If no explicit filter active, skip items that belong in History
        if (!statusFilter && HISTORY_ITEM_STATUSES.has(s)) continue
        out.push({ ...r, _item: it, _itemStatus: s })
      }
    }
    return out
  }, [rows, statusFilter])

  const filtered = useMemo(() => {
    let list = flatItems
    if (statusFilter) list = list.filter(r => r._itemStatus === statusFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(r =>
        String(r.labName    || "").toLowerCase().includes(q) ||
        String(r.purpose    || "").toLowerCase().includes(q) ||
        String(r._item?.equipmentName || "").toLowerCase().includes(q) ||
        String(r.requestId  || "").includes(q)
      )
    }
    return list.sort((a, b) => (b.requestId || 0) - (a.requestId || 0))
  }, [flatItems, statusFilter, search])

  /* Group by requestId for card display */
  const groupedByRequest = useMemo(() => {
    const m = new Map()
    for (const row of filtered) {
      if (!m.has(row.requestId)) m.set(row.requestId, { req: row, items: [] })
      m.get(row.requestId).items.push(row._item)
    }
    return [...m.values()].sort((a, b) => (b.req.requestId || 0) - (a.req.requestId || 0))
  }, [filtered])

  return (
    <div className="dashboard-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <div className="content">

          <div className="lt-page-header">
            <div>
              <div className="lt-page-title">My Requests</div>
              <div className="lt-page-subtitle">Active requests only — rejected and returned items are in History</div>
            </div>
          </div>

          {error  && <div className="lt-alert lt-alert-error">{error}</div>}
          {notice && <div className="lt-alert lt-alert-success">{notice}</div>}

          {/* Filters */}
          <div className="lt-filter-bar">
            <div className="lt-filter-wrap">
              <FaSearch className="lt-filter-icon" />
              <input className="lt-filter-input"
                placeholder="Search lab, equipment, purpose, request ID…"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="lt-filter-select" value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}>
              {ITEM_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {loading && (
            <div className="lt-empty"><div className="lt-empty-icon">⏳</div><div className="lt-empty-text">Loading requests…</div></div>
          )}

          {!loading && groupedByRequest.length === 0 && (
            <div className="lt-empty">
              <div className="lt-empty-icon">📦</div>
              <div className="lt-empty-text">{rows.length === 0 ? "No requests yet." : "No results for current filter."}</div>
            </div>
          )}

          {!loading && groupedByRequest.map(({ req, items }) => {
            const derivedStatus = deriveOverallStatus(req, items)
            const { cls: rCls, label: rLabel } = reqStatusPill(derivedStatus)
            return (
              <div key={req.requestId} className="lt-req-card">
                <div className="lt-req-card-top">
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontWeight: 800, fontSize: 15, color: "var(--lt-text)" }}>Request #{req.requestId}</span>
                    <span className={`lt-sp ${rCls}`}>{rLabel}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--lt-text-muted)" }}>
                    {req.fromDate || "–"} → {req.toDate || "–"}
                  </div>
                </div>

                <div className="lt-req-card-body">
                  <div className="lt-meta-grid">
                    <div><div className="lt-mi-label">Lab</div><div className="lt-mi-value">{req.labName || "–"}</div></div>
                    <div><div className="lt-mi-label">Purpose</div><div className="lt-mi-value muted">{req.purpose || "–"}</div></div>
                    {req.lecturerName && (
                      <div><div className="lt-mi-label">Lecturer</div><div className="lt-mi-value">{req.lecturerName}</div></div>
                    )}
                  </div>

                  {/* Per-item detail */}
                  <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".6px", color: "var(--lt-text-muted)", marginBottom: 10, paddingTop: 8, borderTop: "1px solid var(--lt-slate-100)" }}>
                    Items ({items.length})
                  </div>
                  {items.map(it => {
                    const { cls, label } = itemStatusPill(it.itemStatus)
                    const isReturnSubmitted = it.itemStatus === "RETURN_REQUESTED"
                    return (
                      <div key={it.requestItemId} style={{
                        display: "flex", alignItems: "flex-start", justifyContent: "space-between",
                        gap: 12, flexWrap: "wrap", padding: "10px 0",
                        borderBottom: "1px solid var(--lt-slate-100)"
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ fontWeight: 700, fontSize: 13.5 }}>{it.equipmentName || "–"}</span>
                            <span className={`lt-sp ${cls}`}>{label}</span>
                            {it.itemType && <span className="lt-sp lt-sp-slate">{it.itemType}</span>}
                          </div>
                          <div style={{ fontSize: 12, color: "var(--lt-text-muted)", marginTop: 3 }}>
                            Requested: {it.quantity}
                            {it.issuedQty != null && it.issuedQty !== it.quantity && ` · Issued: ${it.issuedQty}`}
                          </div>
                          {it.toWaitReason && (
                            <div style={{ fontSize: 12, color: "#92400e", marginTop: 3 }}>
                              Wait reason: {it.toWaitReason}
                            </div>
                          )}
                        </div>

                        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                          {/* Confirm receipt */}
                          {it.itemStatus === "ISSUED_PENDING_REQUESTER_ACCEPT" && (
                            <button className="lt-btn lt-btn-success lt-btn-sm"
                              disabled={actioning === `accept-${it.requestItemId}`}
                              onClick={() => handleAccept(it.requestItemId)}>
                              <AiOutlineCheck />
                              {actioning === `accept-${it.requestItemId}` ? "Confirming…" : "Confirm Receipt"}
                            </button>
                          )}
                          {/* Submit return (only RETURNABLE items) */}
                          {it.itemStatus === "ISSUED_CONFIRMED" && it.itemType === "RETURNABLE" && (
                            <button className="lt-btn lt-btn-amber lt-btn-sm"
                              disabled={actioning === `return-${it.requestItemId}`}
                              onClick={() => handleReturn(it.requestItemId)}>
                              <AiOutlineRollback />
                              {actioning === `return-${it.requestItemId}` ? "Submitting…" : "Submit Return"}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

        </div>
      </div>
    </div>
  )
}