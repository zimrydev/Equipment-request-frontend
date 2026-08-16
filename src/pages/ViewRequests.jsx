import "../styles/studentTheme.css"
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import Sidebar from "../components/Sidebar"
import Topbar from "../components/Topbar"
import { StudentRequestAPI } from "../api/api"

/*
  StudentMyRequestDTO:
    requestId, status, purpose, fromDate, toDate, labName, lecturerName,
    items[]: requestItemId, equipmentId, equipmentName, quantity, itemType,
             itemStatus, toWaitReason, issuedQty, returned, damaged
    canAcceptIssue : boolean  — request-level (all items at once)
    canReturn      : boolean  — request-level (all returnable items at once)

  Actions per item:
    ISSUED_PENDING_REQUESTER_ACCEPT  → acceptIssueItem(requestItemId)
    ISSUED_CONFIRMED + RETURNABLE    → submitReturnItem(requestItemId)

  Bulk actions on the request (shown when canAcceptIssue / canReturn):
    acceptIssue(requestId)  — accepts all pending items in one call
    submitReturn(requestId) — submits return for all ISSUED_CONFIRMED RETURNABLE items
*/

/* ── Helpers ── */
function reqSpClass(s) {
  switch (String(s || "").toUpperCase()) {
    case "PENDING_LECTURER_APPROVAL":     return "st-sp st-sp-pending"
    case "APPROVED_BY_LECTURER":          return "st-sp st-sp-approved"
    case "REJECTED_BY_LECTURER":          return "st-sp st-sp-rejected"
    case "TO_PROCESSING":                 return "st-sp st-sp-processing"
    case "ISSUED_PENDING_STUDENT_ACCEPT": return "st-sp st-sp-issued"
    case "ISSUED_CONFIRMED":              return "st-sp st-sp-confirmed"
    case "RETURNED_PENDING_TO_VERIFY":    return "st-sp st-sp-return-req"
    case "RETURNED_VERIFIED":             return "st-sp st-sp-returned"
    case "DAMAGED_REPORTED":              return "st-sp st-sp-damaged"
    default:                              return "st-sp st-sp-slate"
  }
}
function reqStatusLabel(s) {
  switch (String(s || "").toUpperCase()) {
    case "PENDING_LECTURER_APPROVAL":     return "Pending Approval"
    case "APPROVED_BY_LECTURER":          return "Approved"
    case "REJECTED_BY_LECTURER":          return "Rejected"
    case "TO_PROCESSING":                 return "TO Processing"
    case "ISSUED_PENDING_STUDENT_ACCEPT": return "Issued — Confirm?"
    case "ISSUED_CONFIRMED":              return "Issued & Confirmed"
    case "RETURNED_PENDING_TO_VERIFY":    return "Return Pending Verify"
    case "RETURNED_VERIFIED":             return "Returned"
    case "DAMAGED_REPORTED":              return "Damaged"
    default: return String(s || "").replace(/_/g, " ") || "—"
  }
}
function itemSpClass(s) {
  switch (String(s || "").toUpperCase()) {
    case "PENDING_LECTURER_APPROVAL":       return "st-sp st-sp-pending"
    case "APPROVED_BY_LECTURER":            return "st-sp st-sp-approved"
    case "REJECTED_BY_LECTURER":            return "st-sp st-sp-rejected"
    case "WAITING_TO_ISSUE":                return "st-sp st-sp-waiting"
    case "ISSUED_PENDING_REQUESTER_ACCEPT": return "st-sp st-sp-issued"
    case "ISSUED_CONFIRMED":                return "st-sp st-sp-confirmed"
    case "RETURN_REQUESTED":                return "st-sp st-sp-return-req"
    case "RETURN_VERIFIED":                 return "st-sp st-sp-returned"
    case "DAMAGED_REPORTED":                return "st-sp st-sp-damaged"
    default:                                return "st-sp st-sp-slate"
  }
}
function itemStatusLabel(s) {
  switch (String(s || "").toUpperCase()) {
    case "PENDING_LECTURER_APPROVAL":       return "Pending Approval"
    case "APPROVED_BY_LECTURER":            return "Approved"
    case "REJECTED_BY_LECTURER":            return "Rejected"
    case "WAITING_TO_ISSUE":                return "Waiting (TO)"
    case "ISSUED_PENDING_REQUESTER_ACCEPT": return "Issued — Confirm?"
    case "ISSUED_CONFIRMED":                return "Issued ✓"
    case "RETURN_REQUESTED":                return "Return Requested"
    case "RETURN_VERIFIED":                 return "Returned"
    case "DAMAGED_REPORTED":                return "Damaged"
    default: return String(s || "").replace(/_/g, " ") || "—"
  }
}

/* Derive a "display" overall status for a request that has multiple items */
function deriveOverallStatus(r) {
  const items = Array.isArray(r?.items) ? r.items : []
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

/* True if request is fully completed (all items returned/verified) */
function isFullyCompleted(r) {
  const items = Array.isArray(r?.items) ? r.items : []
  if (!items.length) {
    const u = String(r.status || "").toUpperCase()
    return u === "RETURNED_VERIFIED" || u === "DAMAGED_REPORTED"
  }
  return items.every(it => {
    const s = String(it.itemStatus || "").toUpperCase()
    return s === "RETURN_VERIFIED" || s === "DAMAGED_REPORTED"
  })
}

const STATUS_FILTERS = [
  { value: "all",                           label: "All Active Statuses" },
  { value: "PENDING_LECTURER_APPROVAL",     label: "Pending Approval" },
  { value: "APPROVED_BY_LECTURER",          label: "Approved" },
  { value: "TO_PROCESSING",                 label: "TO Processing" },
  { value: "ISSUED_PENDING_STUDENT_ACCEPT", label: "Issued (Confirm?)" },
  { value: "ISSUED_CONFIRMED",              label: "Issued & Confirmed" },
  { value: "RETURNED_PENDING_TO_VERIFY",    label: "Return Pending" },
]

export default function ViewRequests() {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [rows,         setRows]        = useState([])
  const [loading,      setLoading]     = useState(true)
  const [error,        setError]       = useState("")
  const [search,       setSearch]      = useState("")
  const [statusFilter, setStatusFilter]= useState("all")

  /* Per-item action state */
  const [itemBusy,  setItemBusy]  = useState({})   // requestItemId → bool
  const [itemError, setItemError] = useState({})   // requestItemId → string
  /* Request-level action state */
  const [reqBusy,   setReqBusy]   = useState({})   // requestId → bool
  const [reqError,  setReqError]  = useState({})   // requestId → string

  const load = async () => {
    setError("")
    try {
      setLoading(true)
      const list = await StudentRequestAPI.my()
      setRows(Array.isArray(list) ? list : [])
    } catch (e) {
      setError(e?.message || "Failed to load requests")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  /* ── Per-item accept issue ── */
  const acceptIssueItem = async (requestItemId) => {
    setItemBusy(p => ({ ...p, [requestItemId]: true }))
    setItemError(p => ({ ...p, [requestItemId]: "" }))
    try {
      await StudentRequestAPI.acceptIssueItem(requestItemId)
      await load()
    } catch (e) {
      setItemError(p => ({ ...p, [requestItemId]: e?.message || "Accept failed" }))
    } finally {
      setItemBusy(p => ({ ...p, [requestItemId]: false }))
    }
  }

  /* ── Per-item return ── */
  const returnItem = async (requestItemId) => {
    setItemBusy(p => ({ ...p, [requestItemId]: true }))
    setItemError(p => ({ ...p, [requestItemId]: "" }))
    try {
      await StudentRequestAPI.submitReturnItem(requestItemId)
      await load()
    } catch (e) {
      setItemError(p => ({ ...p, [requestItemId]: e?.message || "Return failed" }))
    } finally {
      setItemBusy(p => ({ ...p, [requestItemId]: false }))
    }
  }

  /* ── Bulk accept all ── */
  const acceptAllIssue = async (requestId) => {
    setReqBusy(p => ({ ...p, [requestId]: true }))
    setReqError(p => ({ ...p, [requestId]: "" }))
    try {
      await StudentRequestAPI.acceptIssue(requestId)
      await load()
    } catch (e) {
      setReqError(p => ({ ...p, [requestId]: e?.message || "Bulk accept failed" }))
    } finally {
      setReqBusy(p => ({ ...p, [requestId]: false }))
    }
  }

  /* ── Bulk return all ── */
  const returnAll = async (requestId) => {
    setReqBusy(p => ({ ...p, [requestId]: true }))
    setReqError(p => ({ ...p, [requestId]: "" }))
    try {
      await StudentRequestAPI.submitReturn(requestId)
      await load()
    } catch (e) {
      setReqError(p => ({ ...p, [requestId]: e?.message || "Bulk return failed" }))
    } finally {
      setReqBusy(p => ({ ...p, [requestId]: false }))
    }
  }

  /* ── Filter ── */
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return rows.filter(r => {
      const u = String(r.status || "").toUpperCase()
      // Always exclude rejected and fully returned — those belong in History
      if (u === "REJECTED_BY_LECTURER") return false
      if (isFullyCompleted(r)) return false

      const matchStatus = statusFilter === "all" || String(r.status || "") === statusFilter
      const matchSearch = !q ||
        String(r.requestId).includes(q) ||
        (r.labName || "").toLowerCase().includes(q) ||
        (r.lecturerName || "").toLowerCase().includes(q) ||
        (r.purpose || "").toLowerCase().includes(q) ||
        (Array.isArray(r.items) && r.items.some(it =>
          (it.equipmentName || "").toLowerCase().includes(q)
        ))
      return matchStatus && matchSearch
    })
  }, [rows, search, statusFilter])

  /* Does any item in request need student action? */
  const hasAction = (r) => {
    if (r.canAcceptIssue || r.canReturn) return true
    return Array.isArray(r.items) && r.items.some(it => {
      const u = String(it.itemStatus || "").toUpperCase()
      return u === "ISSUED_PENDING_REQUESTER_ACCEPT" ||
             (u === "ISSUED_CONFIRMED" && String(it.itemType || "").toUpperCase() === "RETURNABLE")
    })
  }

  return (
    <div className="dashboard-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <div className="content">

          {/* Page Header */}
          <div className="st-page-header">
            <div className="st-page-header-left">
              <div className="st-page-title">My Requests</div>
              <div className="st-page-subtitle">
                Active requests only — rejected and returned items are in History
              </div>
            </div>
            <div className="st-page-actions">
              <button className="st-btn st-btn-primary" onClick={() => navigate("/new-request")}>
                + New Request
              </button>
            </div>
          </div>

          {error && <div className="st-alert st-alert-error">{error}</div>}

          {/* Filter Bar */}
          <div className="st-filter-bar">
            <div className="st-filter-wrap">
              <span className="st-filter-icon">🔍</span>
              <input
                className="st-filter-input"
                placeholder="Search by ID, lab, lecturer, equipment…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select
              className="st-filter-select"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              {STATUS_FILTERS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <span style={{ fontSize: 13, color: "var(--st-text-muted)", fontWeight: 600 }}>
              {filtered.length} request{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Loading */}
          {loading && (
            <div className="st-empty">
              <div className="st-empty-icon">⏳</div>
              <div className="st-empty-text">Loading your requests…</div>
            </div>
          )}

          {/* Empty */}
          {!loading && filtered.length === 0 && (
            <div className="st-empty">
              <div className="st-empty-icon">📭</div>
              <div className="st-empty-text">
                {search || statusFilter !== "all"
                  ? "No requests match the current filters"
                  : "No requests yet — submit your first equipment request"
                }
              </div>
              {!search && statusFilter === "all" && (
                <div style={{ marginTop: 14 }}>
                  <button className="st-btn st-btn-primary" onClick={() => navigate("/new-request")}>
                    + New Request
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Request Cards */}
          {!loading && filtered.map(r => {
            const items  = Array.isArray(r.items) ? r.items : []
            const rBusy  = reqBusy[r.requestId]
            const rErr   = reqError[r.requestId]
            const actionHighlight = hasAction(r)

            return (
              <div
                key={r.requestId}
                className="st-card"
                style={actionHighlight ? { borderColor: "var(--st-indigo-bd)", boxShadow: "0 0 0 2px var(--st-indigo-pale), var(--st-shadow-sm)" } : undefined}
              >
                {/* Card Header */}
                <div className="st-card-top">
                  <div className="st-card-title">
                    <span style={{ color: "var(--st-indigo)", fontWeight: 800 }}>#{r.requestId}</span>
                    <span style={{ color: "var(--st-text-muted)", fontWeight: 400 }}>·</span>
                    <span>{r.labName || "—"}</span>
                    {r.purpose && (
                      <span className={`st-purpose ${String(r.purpose).toLowerCase()}`}>
                        {r.purpose}
                      </span>
                    )}
                    {actionHighlight && (
                      <span style={{
                        fontSize: 10.5, fontWeight: 700, color: "#fff",
                        background: "var(--st-indigo)", padding: "2px 8px", borderRadius: 20,
                      }}>
                        ACTION NEEDED
                      </span>
                    )}
                  </div>
                  <span className={reqSpClass(deriveOverallStatus(r))}>
                    {reqStatusLabel(deriveOverallStatus(r))}
                  </span>
                </div>

                {/* Card Body */}
                <div className="st-card-body">
                  {/* Meta */}
                  <div className="st-meta-grid">
                    <div>
                      <div className="st-mi-label">Lecturer</div>
                      <div className="st-mi-value">{r.lecturerName || "—"}</div>
                    </div>
                    <div>
                      <div className="st-mi-label">From</div>
                      <div className="st-mi-value muted">{r.fromDate || "—"}</div>
                    </div>
                    <div>
                      <div className="st-mi-label">To</div>
                      <div className="st-mi-value muted">{r.toDate || "—"}</div>
                    </div>
                    <div>
                      <div className="st-mi-label">Items</div>
                      <div className="st-mi-value">{items.length}</div>
                    </div>
                  </div>

                  {/* Per-item rows */}
                  {items.map(it => {
                    const iid   = it.requestItemId
                    const iBusy = itemBusy[iid]
                    const iErr  = itemError[iid]
                    const u     = String(it.itemStatus || "").toUpperCase()
                    const canAccept = u === "ISSUED_PENDING_REQUESTER_ACCEPT"
                    const canReturn = u === "ISSUED_CONFIRMED" &&
                                      String(it.itemType || "").toUpperCase() === "RETURNABLE"

                    return (
                      <div key={iid} className="st-item-row">
                        <div style={{ flex: 1, minWidth: 160 }}>
                          <div className="st-item-name">
                            {it.equipmentName || `Equipment #${it.equipmentId}`}
                          </div>
                          <div className="st-item-meta" style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
                            <span>Requested: <strong>{it.quantity}</strong></span>
                            {it.issuedQty != null && it.issuedQty > 0 && (
                              <span>Issued: <strong>{it.issuedQty}</strong></span>
                            )}
                            {it.itemType && (
                              <span style={{
                                padding: "1px 7px", borderRadius: 4,
                                background: String(it.itemType).toUpperCase() === "RETURNABLE"
                                  ? "var(--st-green-pale)" : "var(--st-amber-pale)",
                                color: String(it.itemType).toUpperCase() === "RETURNABLE"
                                  ? "var(--st-green)" : "var(--st-amber)",
                                fontWeight: 700, fontSize: 10.5, textTransform: "uppercase",
                              }}>
                                {it.itemType}
                              </span>
                            )}
                          </div>
                          {it.toWaitReason && (
                            <div style={{
                              marginTop: 4, fontSize: 12, color: "var(--st-purple)",
                              fontStyle: "italic", fontFamily: "Plus Jakarta Sans, sans-serif",
                            }}>
                              ⏸ Wait reason: {it.toWaitReason}
                            </div>
                          )}
                          {it.returned && (
                            <div style={{ marginTop: 4, fontSize: 12, color: "var(--st-green)", fontFamily: "Plus Jakarta Sans, sans-serif" }}>
                              ✓ Returned{it.damaged ? " (damaged)" : ""}
                            </div>
                          )}
                        </div>

                        {/* Item right: status + actions */}
                        <div className="st-item-right">
                          <span className={itemSpClass(it.itemStatus)}>
                            {itemStatusLabel(it.itemStatus)}
                          </span>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {canAccept && (
                              <button
                                className="st-btn st-btn-success st-btn-sm"
                                onClick={() => acceptIssueItem(iid)}
                                disabled={iBusy}
                              >
                                {iBusy ? "…" : "✓ Accept Issuance"}
                              </button>
                            )}
                            {canReturn && (
                              <button
                                className="st-btn st-btn-amber st-btn-sm"
                                onClick={() => returnItem(iid)}
                                disabled={iBusy}
                              >
                                {iBusy ? "…" : "↩ Submit Return"}
                              </button>
                            )}
                          </div>
                          {iErr && (
                            <div style={{ fontSize: 11.5, color: "var(--st-red)", fontFamily: "Plus Jakarta Sans, sans-serif" }}>
                              {iErr}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}

                  {rErr && <div className="st-alert st-alert-error" style={{ marginTop: 8 }}>{rErr}</div>}

                  {/* Bulk request-level actions */}
                  {(r.canAcceptIssue || r.canReturn) && (
                    <div className="st-card-actions" style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--st-slate-100)" }}>
                      {r.canAcceptIssue && (
                        <button
                          className="st-btn st-btn-success st-btn-sm"
                          onClick={() => acceptAllIssue(r.requestId)}
                          disabled={rBusy}
                        >
                          {rBusy ? "Processing…" : "✓ Accept All Issued Items"}
                        </button>
                      )}
                      {r.canReturn && (
                        <button
                          className="st-btn st-btn-amber st-btn-sm"
                          onClick={() => returnAll(r.requestId)}
                          disabled={rBusy}
                        >
                          {rBusy ? "Processing…" : "↩ Return All Returnable Items"}
                        </button>
                      )}
                      <span style={{ fontSize: 11.5, color: "var(--st-text-muted)", fontFamily: "Plus Jakarta Sans, sans-serif" }}>
                        Applies to all eligible items in this request
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

        </div>
      </div>
    </div>
  )
}