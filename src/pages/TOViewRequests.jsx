import "../styles/toTheme.css"
import Sidebar from "../components/Sidebar"
import Topbar from "../components/Topbar"
import { useEffect, useMemo, useState } from "react"
import { ToRequestAPI } from "../api/api"

/* ── Status helpers ── */
function itemSpClass(s) {
  if (!s) return "to-sp to-sp-slate"
  switch (s) {
    case "PENDING_LECTURER_APPROVAL":       return "to-sp to-sp-pending"
    case "APPROVED_BY_LECTURER":            return "to-sp to-sp-approved"
    case "REJECTED_BY_LECTURER":            return "to-sp to-sp-rejected"
    case "WAITING_TO_ISSUE":                return "to-sp to-sp-waiting"
    case "ISSUED_PENDING_REQUESTER_ACCEPT": return "to-sp to-sp-issued"
    case "ISSUED_CONFIRMED":                return "to-sp to-sp-confirmed"
    case "RETURN_REQUESTED":                return "to-sp to-sp-return-req"
    case "RETURN_VERIFIED":                 return "to-sp to-sp-returned"
    case "DAMAGED_REPORTED":                return "to-sp to-sp-damaged"
    default:                                return "to-sp to-sp-slate"
  }
}

function itemStatusLabel(s) {
  if (!s) return "—"
  switch (s) {
    case "PENDING_LECTURER_APPROVAL":       return "Pending Approval"
    case "APPROVED_BY_LECTURER":            return "Approved"
    case "REJECTED_BY_LECTURER":            return "Rejected"
    case "WAITING_TO_ISSUE":                return "Waiting"
    case "ISSUED_PENDING_REQUESTER_ACCEPT": return "Issued (Pending Accept)"
    case "ISSUED_CONFIRMED":                return "Issued & Confirmed"
    case "RETURN_REQUESTED":                return "Return Requested"
    case "RETURN_VERIFIED":                 return "Returned"
    case "DAMAGED_REPORTED":                return "Damaged"
    default:                                return s.replace(/_/g, " ")
  }
}

const ALL_STATUS_OPTIONS = [
  { value: "all",                            label: "All Statuses" },
  { value: "APPROVED_BY_LECTURER",           label: "Approved" },
  { value: "WAITING_TO_ISSUE",               label: "Waiting" },
  { value: "ISSUED_PENDING_REQUESTER_ACCEPT",label: "Issued (Pending Accept)" },
  { value: "ISSUED_CONFIRMED",               label: "Confirmed" },
  { value: "RETURN_REQUESTED",               label: "Return Requested" },
  { value: "RETURN_VERIFIED",                label: "Returned" },
  { value: "DAMAGED_REPORTED",               label: "Damaged" },
  { value: "REJECTED_BY_LECTURER",           label: "Rejected" },
]

const ROLE_OPTIONS = [
  { value: "all",        label: "All Roles" },
  { value: "STUDENT",    label: "Student" },
  { value: "LECTURER",   label: "Lecturer" },
  { value: "INSTRUCTOR", label: "Instructor" },
  { value: "STAFF",      label: "Staff" },
]

export default function TOViewRequests() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [roleFilter, setRoleFilter] = useState("all")

  const load = async () => {
    setError("")
    try {
      setLoading(true)
      const list = await ToRequestAPI.all()
      setRows(Array.isArray(list) ? list : [])
    } catch (e) {
      setError(e?.message || "Failed to load requests")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  /* Flatten all items */
  const flatRows = useMemo(() => {
    const out = []
    for (const r of rows) {
      for (const it of (r.items || [])) {
        out.push({ ...r, _item: it })
      }
    }
    return out.sort((a, b) => (b.requestId || 0) - (a.requestId || 0))
  }, [rows])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return flatRows.filter(r => {
      const matchSearch = !q ||
        String(r.requestId).includes(q) ||
        (r.requesterFullName || "").toLowerCase().includes(q) ||
        (r.requesterRegNo || "").toLowerCase().includes(q) ||
        (r.labName || "").toLowerCase().includes(q) ||
        (r._item.equipmentName || "").toLowerCase().includes(q)
      const matchStatus = statusFilter === "all" || r._item.itemStatus === statusFilter
      const matchRole = roleFilter === "all" || (r.requesterRole || "").toUpperCase() === roleFilter
      return matchSearch && matchStatus && matchRole
    })
  }, [flatRows, search, statusFilter, roleFilter])

  return (
    <div className="dashboard-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <div className="content">

          <div className="to-page-header">
            <div>
              <div className="to-page-title">All Requests</div>
              <div className="to-page-subtitle">View all equipment requests assigned to your labs</div>
            </div>
            <div style={{ fontSize: 13, color: "var(--to-text-muted)", fontWeight: 600 }}>
              {filtered.length} of {flatRows.length} items
            </div>
          </div>

          {error && <div className="to-alert to-alert-error">{error}</div>}

          {/* Filters */}
          <div className="to-filter-bar">
            <div className="to-filter-wrap">
              <span className="to-filter-icon">🔍</span>
              <input
                className="to-filter-input"
                placeholder="Search by request ID, requester, lab, equipment…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select
              className="to-filter-select"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              {ALL_STATUS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <select
              className="to-filter-select"
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
            >
              {ROLE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {loading && (
            <div className="to-empty">
              <div className="to-empty-icon">⏳</div>
              <div className="to-empty-text">Loading requests…</div>
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="to-empty">
              <div className="to-empty-icon">📭</div>
              <div className="to-empty-text">No items match the current filters</div>
            </div>
          )}

          {!loading && (
            <div className="to-table-wrap">
              <table className="to-table">
                <thead>
                  <tr>
                    <th>Req #</th>
                    <th>Requester</th>
                    <th>Role</th>
                    <th>Lab</th>
                    <th>Equipment</th>
                    <th className="tc">Qty</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Item Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr className="empty-row"><td colSpan="9">No results</td></tr>
                  )}
                  {filtered.map((r) => {
                    const it = r._item
                    return (
                      <tr key={`${r.requestId}-${it.requestItemId}`}>
                        <td className="to-id">#{r.requestId}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{r.requesterFullName || "—"}</div>
                          <div className="to-muted">{r.requesterRegNo || ""}</div>
                        </td>
                        <td className="to-muted">{r.requesterRole || "—"}</td>
                        <td>{r.labName || "—"}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{it.equipmentName || "—"}</div>
                          {it.itemType && <div className="to-muted">{it.itemType}</div>}
                        </td>
                        <td className="tc">{it.quantity ?? "—"}</td>
                        <td className="to-muted">{r.fromDate || "—"}</td>
                        <td className="to-muted">{r.toDate || "—"}</td>
                        <td>
                          <span className={itemSpClass(it.itemStatus)}>
                            {itemStatusLabel(it.itemStatus)}
                          </span>
                        </td>
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