import "../styles/instructorTheme.css"
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import Sidebar from "../components/Sidebar"
import Topbar from "../components/Topbar"
import { StudentRequestAPI } from "../api/api"

/*
  StudentMyRequestDTO fields:
    requestId, status, purpose, fromDate, toDate, labName, lecturerName,
    items[]:
      requestItemId, equipmentId, equipmentName, quantity, itemType,
      itemStatus, toWaitReason, issuedQty, returned, damaged
    canAcceptIssue : boolean  (request-level accept — all items at once)
    canReturn      : boolean  (request-level return — all returnable items at once)

  Per-item actions:
    ISSUED_PENDING_REQUESTER_ACCEPT → acceptIssueItem(requestItemId)
    ISSUED_CONFIRMED (RETURNABLE)   → submitReturnItem(requestItemId)
*/

/* ── Status helpers ── */
function reqSpClass(s) {
  if (!s) return "inst-sp inst-sp-slate"
  switch (String(s).toUpperCase()) {
    case "PENDING_LECTURER_APPROVAL":     return "inst-sp inst-sp-pending"
    case "APPROVED_BY_LECTURER":          return "inst-sp inst-sp-approved"
    case "REJECTED_BY_LECTURER":          return "inst-sp inst-sp-rejected"
    case "TO_PROCESSING":                 return "inst-sp inst-sp-processing"
    case "ISSUED_PENDING_STUDENT_ACCEPT": return "inst-sp inst-sp-issued"
    case "ISSUED_CONFIRMED":              return "inst-sp inst-sp-confirmed"
    case "RETURNED_PENDING_TO_VERIFY":    return "inst-sp inst-sp-return-req"
    case "RETURNED_VERIFIED":             return "inst-sp inst-sp-returned"
    case "DAMAGED_REPORTED":              return "inst-sp inst-sp-damaged"
    default:                              return "inst-sp inst-sp-slate"
  }
}

function reqStatusLabel(s) {
  if (!s) return "—"
  switch (String(s).toUpperCase()) {
    case "PENDING_LECTURER_APPROVAL":     return "Pending Approval"
    case "APPROVED_BY_LECTURER":          return "Approved"
    case "REJECTED_BY_LECTURER":          return "Rejected"
    case "TO_PROCESSING":                 return "TO Processing"
    case "ISSUED_PENDING_STUDENT_ACCEPT": return "Issued — Confirm?"
    case "ISSUED_CONFIRMED":              return "Issued & Confirmed"
    case "RETURNED_PENDING_TO_VERIFY":    return "Return Pending Verify"
    case "RETURNED_VERIFIED":             return "Returned"
    case "DAMAGED_REPORTED":              return "Damaged"
    default:                              return String(s).replace(/_/g, " ")
  }
}

function itemSpClass(s) {
  if (!s) return "inst-sp inst-sp-slate"
  switch (String(s).toUpperCase()) {
    case "PENDING_LECTURER_APPROVAL":       return "inst-sp inst-sp-pending"
    case "APPROVED_BY_LECTURER":            return "inst-sp inst-sp-approved"
    case "REJECTED_BY_LECTURER":            return "inst-sp inst-sp-rejected"
    case "WAITING_TO_ISSUE":                return "inst-sp inst-sp-waiting"
    case "ISSUED_PENDING_REQUESTER_ACCEPT": return "inst-sp inst-sp-issued"
    case "ISSUED_CONFIRMED":                return "inst-sp inst-sp-confirmed"
    case "RETURN_REQUESTED":                return "inst-sp inst-sp-return-req"
    case "RETURN_VERIFIED":                 return "inst-sp inst-sp-returned"
    case "DAMAGED_REPORTED":               return "inst-sp inst-sp-damaged"
    default:                               return "inst-sp inst-sp-slate"
  }
}

function itemStatusLabel(s) {
  if (!s) return "—"
  switch (String(s).toUpperCase()) {
    case "PENDING_LECTURER_APPROVAL":       return "Pending Approval"
    case "APPROVED_BY_LECTURER":            return "Approved"
    case "REJECTED_BY_LECTURER":            return "Rejected"
    case "WAITING_TO_ISSUE":                return "Waiting (TO)"
    case "ISSUED_PENDING_REQUESTER_ACCEPT": return "Issued — Confirm?"
    case "ISSUED_CONFIRMED":                return "Issued ✓"
    case "RETURN_REQUESTED":                return "Return Requested"
    case "RETURN_VERIFIED":                 return "Returned"
    case "DAMAGED_REPORTED":                return "Damaged"
    default:                                return String(s).replace(/_/g, " ")
  }
}

/* Derive accurate overall status from item-level statuses */
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

/* True if ALL items in the request are fully returned/verified */
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
  { value: "all",                            label: "All Active Statuses" },
  { value: "PENDING_LECTURER_APPROVAL",      label: "Pending Approval" },
  { value: "APPROVED_BY_LECTURER",           label: "Approved" },
  { value: "TO_PROCESSING",                  label: "TO Processing" },
  { value: "ISSUED_PENDING_STUDENT_ACCEPT",  label: "Issued (Confirm?)" },
  { value: "ISSUED_CONFIRMED",               label: "Issued & Confirmed" },
  { value: "RETURNED_PENDING_TO_VERIFY",     label: "Return Pending" },
]

export default function InstructorViewRequests() {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [rows,        setRows]        = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState("")
  const [search,      setSearch]      = useState("")
  const [statusFilter,setStatusFilter]= useState("all")

  /* Per-item action state */
  const [itemBusy,    setItemBusy]    = useState({})  // requestItemId → true
  const [itemError,   setItemError]   = useState({})  // requestItemId → string
  const [reqBusy,     setReqBusy]     = useState({})  // requestId → true
  const [reqError,    setReqError]    = useState({})  // requestId → string

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

  /* ── Request-level accept all ── */
  const acceptAllIssue = async (requestId) => {
    setReqBusy(p => ({ ...p, [requestId]: true }))
    setReqError(p => ({ ...p, [requestId]: "" }))
    try {
      await StudentRequestAPI.acceptIssue(requestId)
      await load()
    } catch (e) {
      setReqError(p => ({ ...p, [requestId]: e?.message || "Accept all failed" }))
    } finally {
      setReqBusy(p => ({ ...p, [requestId]: false }))
    }
  }

  /* ── Request-level return all ── */
  const returnAll = async (requestId) => {
    setReqBusy(p => ({ ...p, [requestId]: true }))
    setReqError(p => ({ ...p, [requestId]: "" }))
    try {
      await StudentRequestAPI.submitReturn(requestId)
      await load()
    } catch (e) {
      setReqError(p => ({ ...p, [requestId]: e?.message || "Return all failed" }))
    } finally {
      setReqBusy(p => ({ ...p, [requestId]: false }))
    }
  }

  /* ── Filter ── */
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return rows.filter(r => {
      const u = String(r.status || "").toUpperCase()
      // Exclude rejected and fully returned — those belong in History
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

  return (
    <div className="dashboard-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <div className="content">

          {/* Page Header */}
          <div className="inst-page-header">
            <div className="inst-page-header-left">
              <div className="inst-page-title">My Requests</div>
              <div className="inst-page-subtitle">Active requests only — rejected and returned items are in History</div>
            </div>
            <div className="inst-page-actions">
              <button className="inst-btn inst-btn-primary" onClick={() => navigate("/instructor-new-request")}>
                + New Request
              </button>
            </div>
          </div>

          {error && <div className="inst-alert inst-alert-error">{error}</div>}

          {/* Filter Bar */}
          <div className="inst-filter-bar">
            <div className="inst-filter-wrap">
              <span className="inst-filter-icon">🔍</span>
              <input
                className="inst-filter-input"
                placeholder="Search by ID, lab, lecturer, equipment…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select
              className="inst-filter-select"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              {STATUS_FILTERS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <span style={{ fontSize: 13, color: "var(--inst-text-muted)", fontWeight: 600 }}>
              {filtered.length} request{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Loading */}
          {loading && (
            <div className="inst-empty">
              <div className="inst-empty-icon">⏳</div>
              <div className="inst-empty-text">Loading requests…</div>
            </div>
          )}

          {/* Empty */}
          {!loading && filtered.length === 0 && (
            <div className="inst-empty">
              <div className="inst-empty-icon">📭</div>
              <div className="inst-empty-text">
                {search || statusFilter !== "all"
                  ? "No requests match the current filters"
                  : "No requests yet — submit your first request"
                }
              </div>
              {!search && statusFilter === "all" && (
                <div style={{ marginTop: 14 }}>
                  <button className="inst-btn inst-btn-primary" onClick={() => navigate("/instructor-new-request")}>
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

            return (
              <div key={r.requestId} className="inst-card">
                {/* Card Header */}
                <div className="inst-card-top">
                  <div className="inst-card-title">
                    <span style={{ color: "var(--inst-teal)", fontWeight: 800 }}>#{r.requestId}</span>
                    <span style={{ color: "var(--inst-text-muted)", fontWeight: 400 }}>·</span>
                    <span>{r.labName || "—"}</span>
                    {r.purpose && (
                      <span className={`inst-purpose ${String(r.purpose).toLowerCase()}`}>
                        {r.purpose}
                      </span>
                    )}
                  </div>
                  <span className={reqSpClass(deriveOverallStatus(r))}>
                    {reqStatusLabel(deriveOverallStatus(r))}
                  </span>
                </div>

                {/* Card Body */}
                <div className="inst-card-body">

                  {/* Meta info */}
                  <div className="inst-meta-grid">
                    <div>
                      <div className="inst-mi-label">Lecturer</div>
                      <div className="inst-mi-value">{r.lecturerName || "—"}</div>
                    </div>
                    <div>
                      <div className="inst-mi-label">From</div>
                      <div className="inst-mi-value muted">{r.fromDate || "—"}</div>
                    </div>
                    <div>
                      <div className="inst-mi-label">To</div>
                      <div className="inst-mi-value muted">{r.toDate || "—"}</div>
                    </div>
                    <div>
                      <div className="inst-mi-label">Items</div>
                      <div className="inst-mi-value">{items.length}</div>
                    </div>
                  </div>

                  {/* Items list */}
                  {items.length > 0 && (
                    <div style={{ marginTop: 4, marginBottom: 10 }}>
                      {items.map(it => {
                        const iid  = it.requestItemId
                        const iBusy = itemBusy[iid]
                        const iErr  = itemError[iid]
                        const canAccept = String(it.itemStatus || "").toUpperCase() === "ISSUED_PENDING_REQUESTER_ACCEPT"
                        const canReturn = String(it.itemStatus || "").toUpperCase() === "ISSUED_CONFIRMED" &&
                                          String(it.itemType || "").toUpperCase() === "RETURNABLE"

                        return (
                          <div key={iid} style={{
                            display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap",
                            padding: "10px 14px",
                            background: "var(--inst-slate-50)",
                            border: "1px solid var(--inst-slate-200)",
                            borderRadius: "var(--inst-r-sm)",
                            marginBottom: 8,
                          }}>
                            {/* Equipment info */}
                            <div style={{ flex: 1, minWidth: 160 }}>
                              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--inst-text)", fontFamily: "Plus Jakarta Sans, sans-serif" }}>
                                {it.equipmentName || `Equipment #${it.equipmentId}`}
                              </div>
                              <div style={{ fontSize: 12, color: "var(--inst-text-muted)", marginTop: 3, display: "flex", gap: 10, flexWrap: "wrap", fontFamily: "Plus Jakarta Sans, sans-serif" }}>
                                <span>Requested: <strong>{it.quantity}</strong></span>
                                {it.issuedQty != null && it.issuedQty > 0 && (
                                  <span>Issued: <strong>{it.issuedQty}</strong></span>
                                )}
                                {it.itemType && (
                                  <span style={{
                                    padding: "1px 7px", borderRadius: 4,
                                    background: it.itemType === "RETURNABLE" ? "var(--inst-green-pale)" : "var(--inst-amber-pale)",
                                    color: it.itemType === "RETURNABLE" ? "var(--inst-green)" : "var(--inst-amber)",
                                    fontWeight: 700, fontSize: 10.5, textTransform: "uppercase",
                                  }}>
                                    {it.itemType}
                                  </span>
                                )}
                              </div>
                              {it.toWaitReason && (
                                <div style={{ fontSize: 12, color: "var(--inst-purple)", marginTop: 4, fontStyle: "italic", fontFamily: "Plus Jakarta Sans, sans-serif" }}>
                                  ⏸ Wait reason: {it.toWaitReason}
                                </div>
                              )}
                            </div>

                            {/* Item status + actions */}
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                              <span className={itemSpClass(it.itemStatus)}>
                                {itemStatusLabel(it.itemStatus)}
                              </span>
                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                {canAccept && (
                                  <button
                                    className="inst-btn inst-btn-success inst-btn-sm"
                                    onClick={() => acceptIssueItem(iid)}
                                    disabled={iBusy}
                                  >
                                    ✓ Accept Issuance
                                  </button>
                                )}
                                {canReturn && (
                                  <button
                                    className="inst-btn inst-btn-amber inst-btn-sm"
                                    onClick={() => returnItem(iid)}
                                    disabled={iBusy}
                                  >
                                    ↩ Submit Return
                                  </button>
                                )}
                              </div>
                              {iErr && (
                                <div style={{ fontSize: 11.5, color: "var(--inst-red)", fontFamily: "Plus Jakarta Sans, sans-serif" }}>
                                  {iErr}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {rErr && <div className="inst-alert inst-alert-error" style={{ marginBottom: 8 }}>{rErr}</div>}

                  {/* Request-level bulk actions */}
                  {(r.canAcceptIssue || r.canReturn) && (
                    <div className="inst-card-actions">
                      {r.canAcceptIssue && (
                        <button
                          className="inst-btn inst-btn-success inst-btn-sm"
                          onClick={() => acceptAllIssue(r.requestId)}
                          disabled={rBusy}
                        >
                          ✓ Accept All Issuance
                        </button>
                      )}
                      {r.canReturn && (
                        <button
                          className="inst-btn inst-btn-amber inst-btn-sm"
                          onClick={() => returnAll(r.requestId)}
                          disabled={rBusy}
                        >
                          ↩ Return All Items
                        </button>
                      )}
                      <span style={{ fontSize: 11.5, color: "var(--inst-text-muted)", fontFamily: "Plus Jakarta Sans, sans-serif" }}>
                        Bulk action for all eligible items
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