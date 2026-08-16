import "../styles/toTheme.css"
import Sidebar from "../components/Sidebar"
import Topbar from "../components/Topbar"
import { useEffect, useMemo, useState } from "react"
import { ToPurchaseAPI, ToRequestAPI } from "../api/api"
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts"

/* ── Purchase status helpers ── */
function purchaseSpClass(s) {
  if (!s) return "to-sp to-sp-slate"
  switch (s) {
    case "SUBMITTED_TO_HOD":  return "to-sp to-sp-submitted"
    case "APPROVED_BY_HOD":   return "to-sp to-sp-hod-approved"
    case "REJECTED_BY_HOD":   return "to-sp to-sp-hod-rejected"
    case "ISSUED_BY_ADMIN":   return "to-sp to-sp-admin-issued"
    case "REJECTED_BY_ADMIN": return "to-sp to-sp-rejected"
    case "RECEIVED_BY_HOD":   return "to-sp to-sp-received"
    default:                  return "to-sp to-sp-slate"
  }
}
function purchaseStatusLabel(s) {
  if (!s) return "—"
  switch (s) {
    case "SUBMITTED_TO_HOD":  return "Submitted to HOD"
    case "APPROVED_BY_HOD":   return "HOD Approved"
    case "REJECTED_BY_HOD":   return "HOD Rejected"
    case "ISSUED_BY_ADMIN":   return "Issued by Admin"
    case "REJECTED_BY_ADMIN": return "Admin Rejected"
    case "RECEIVED_BY_HOD":   return "Received"
    default:                  return s.replace(/_/g, " ")
  }
}

/* ── Request item status helpers ── */
function itemSpClass(s) {
  if (!s) return "to-sp to-sp-slate"
  switch (s) {
    case "RETURN_VERIFIED":   return "to-sp to-sp-returned"
    case "DAMAGED_REPORTED":  return "to-sp to-sp-damaged"
    case "REJECTED_BY_LECTURER": return "to-sp to-sp-rejected"
    default:                  return "to-sp to-sp-slate"
  }
}
function itemStatusLabel(s) {
  if (!s) return "—"
  switch (s) {
    case "RETURN_VERIFIED":   return "Returned & Verified"
    case "DAMAGED_REPORTED":  return "Damaged"
    case "REJECTED_BY_LECTURER": return "Rejected by Lecturer"
    default:                  return s.replace(/_/g, " ")
  }
}

/* History item statuses to show */
const HISTORY_ITEM_STATUSES = new Set(["RETURN_VERIFIED", "DAMAGED_REPORTED"])

const PIE_COLORS_P = ["#2563eb", "#16a34a", "#dc2626", "#0891b2", "#7c3aed", "#d97706"]
const PIE_COLORS_R = ["#16a34a", "#dc2626"]

const TABS = [
  { id: "purchases",   label: "My Purchases" },
  { id: "students",    label: "Student / Instructor History" },
  { id: "lecturers",   label: "Lecturer History" },
]

export default function TOHistory() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [tab, setTab] = useState("purchases")
  const [purchaseRows, setPurchaseRows] = useState([])
  const [requestRows, setRequestRows]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState("")

  useEffect(() => {
    const load = async () => {
      setError("")
      try {
        setLoading(true)
        const [pList, rList] = await Promise.all([
          ToPurchaseAPI.my(),
          ToRequestAPI.all(),
        ])
        setPurchaseRows(Array.isArray(pList) ? pList : [])
        setRequestRows(Array.isArray(rList) ? rList : [])
      } catch (e) {
        setError(e?.message || "Failed to load history")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  /* ── Flattened history items ── */
  const historyFlat = useMemo(() => {
    const out = []
    for (const r of requestRows) {
      for (const it of (r.items || [])) {
        if (!HISTORY_ITEM_STATUSES.has(it.itemStatus)) continue
        out.push({ ...r, _item: it })
      }
    }
    return out.sort((a, b) => (b.requestId || 0) - (a.requestId || 0))
  }, [requestRows])

  const studentHistory = useMemo(() =>
    historyFlat.filter(r => ["STUDENT", "INSTRUCTOR", "STAFF"].includes((r.requesterRole || "").toUpperCase())),
  [historyFlat])

  const lecturerHistory = useMemo(() =>
    historyFlat.filter(r => (r.requesterRole || "").toUpperCase() === "LECTURER"),
  [historyFlat])

  /* ── Pie: purchase status breakdown ── */
  const purchasePieData = useMemo(() => {
    const map = {}
    for (const p of purchaseRows) {
      const label = purchaseStatusLabel(p.status)
      map[label] = (map[label] || 0) + 1
    }
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [purchaseRows])

  /* ── Pie: return outcome breakdown ── */
  const returnPieData = useMemo(() => {
    const map = {}
    for (const { _item } of historyFlat) {
      const label = itemStatusLabel(_item.itemStatus)
      map[label] = (map[label] || 0) + 1
    }
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [historyFlat])

  /* ── Bar: top equipment returned ── */
  const equipBarData = useMemo(() => {
    const map = {}
    for (const { _item } of historyFlat) {
      const name = _item.equipmentName || "Unknown"
      map[name] = (map[name] || 0) + 1
    }
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, count]) => ({
        name: name.length > 13 ? name.slice(0, 13) + "…" : name,
        count,
      }))
  }, [historyFlat])

  const fmt = (d) => d ? String(d) : "—"

  /* ── Purchase Card ── */
  const PurchaseCard = ({ p }) => {
    const items = Array.isArray(p.items) ? p.items : []
    return (
      <div className="to-card">
        <div className="to-card-top">
          <div className="to-card-title">
            <span style={{ color: "var(--to-blue)", fontWeight: 800 }}>PR #{p.id}</span>
            <span style={{ color: "var(--to-text-muted)", fontWeight: 400, fontSize: 13 }}>·</span>
            <span style={{ fontSize: 13, fontWeight: 500 }}>{items.length} item{items.length !== 1 ? "s" : ""}</span>
          </div>
          <span className={purchaseSpClass(p.status)}>{purchaseStatusLabel(p.status)}</span>
        </div>
        <div className="to-card-body">
          <div className="to-meta-grid">
            <div>
              <div className="to-mi-label">Submitted</div>
              <div className="to-mi-value">{fmt(p.createdDate)}</div>
            </div>
            {p.receivedDate && (
              <div>
                <div className="to-mi-label">Received</div>
                <div className="to-mi-value">{fmt(p.receivedDate)}</div>
              </div>
            )}
            {p.hodComment && (
              <div style={{ gridColumn: "1/-1" }}>
                <div className="to-mi-label">HOD Comment</div>
                <div className="to-mi-value" style={{ color: "var(--to-amber)", fontWeight: 500 }}>{p.hodComment}</div>
              </div>
            )}
          </div>
          {items.length > 0 && (
            <div className="to-item-chips">
              {items.map((it, idx) => (
                <div key={idx} className="to-item-chip">
                  {it.equipmentName || `Equipment #${it.equipmentId}`}
                  <span className="chip-qty">×{it.quantityRequested ?? it.quantity}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  /* ── Request History Card ── */
  const RequestCard = ({ r }) => {
    const it = r._item
    return (
      <div className="to-card">
        <div className="to-card-top">
          <div className="to-card-title">
            <span style={{ color: "var(--to-blue)", fontWeight: 800 }}>#{r.requestId}</span>
            <span style={{ color: "var(--to-text-muted)", fontWeight: 400 }}>·</span>
            <span>{it.equipmentName || `Equipment #${it.equipmentId}`}</span>
          </div>
          <span className={itemSpClass(it.itemStatus)}>{itemStatusLabel(it.itemStatus)}</span>
        </div>
        <div className="to-card-body">
          <div className="to-meta-grid">
            <div>
              <div className="to-mi-label">Requester</div>
              <div className="to-mi-value">{r.requesterFullName || "—"}</div>
            </div>
            <div>
              <div className="to-mi-label">Reg / ID</div>
              <div className="to-mi-value muted">{r.requesterRegNo || "—"}</div>
            </div>
            <div>
              <div className="to-mi-label">Role</div>
              <div className="to-mi-value muted">{r.requesterRole || "—"}</div>
            </div>
            <div>
              <div className="to-mi-label">Lab</div>
              <div className="to-mi-value">{r.labName || "—"}</div>
            </div>
            <div>
              <div className="to-mi-label">Period</div>
              <div className="to-mi-value">{r.fromDate || "—"} → {r.toDate || "—"}</div>
            </div>
            <div>
              <div className="to-mi-label">Qty / Issued</div>
              <div className="to-mi-value">
                {it.quantity ?? "—"}
                {it.issuedQty != null && ` / ${it.issuedQty} issued`}
              </div>
            </div>
            {it.damaged != null && (
              <div>
                <div className="to-mi-label">Damaged</div>
                <div className="to-mi-value" style={{ color: it.damaged ? "var(--to-red)" : "var(--to-green)" }}>
                  {it.damaged ? "Yes" : "No"}
                </div>
              </div>
            )}
          </div>
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

          <div className="to-page-header">
            <div>
              <div className="to-page-title">History</div>
              <div className="to-page-subtitle">Purchase requests and completed equipment transactions</div>
            </div>
          </div>

          {error && <div className="to-alert to-alert-error">{error}</div>}

          {loading && (
            <div className="to-empty">
              <div className="to-empty-icon">⏳</div>
              <div className="to-empty-text">Loading history…</div>
            </div>
          )}

          {!loading && (
            <>
              {/* Summary Charts */}
              {(purchasePieData.length > 0 || returnPieData.length > 0) && (
                <div className="to-chart-grid-2" style={{ marginBottom: 28 }}>
                  {purchasePieData.length > 0 && (
                    <div className="to-chart-card">
                      <div className="to-chart-title">Purchase Status Breakdown</div>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie data={purchasePieData} cx="50%" cy="50%" outerRadius={72} dataKey="value">
                            {purchasePieData.map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS_P[i % PIE_COLORS_P.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend iconSize={10} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  {equipBarData.length > 0 && (
                    <div className="to-chart-card">
                      <div className="to-chart-title">Most Returned Equipment</div>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={equipBarData} layout="vertical" margin={{ top: 4, right: 20, left: 0, bottom: 4 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                          <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#16a34a" radius={[0, 4, 4, 0]} name="Returns" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              )}

              {/* Tabs */}
              <div className="to-tab-bar">
                {TABS.map(t => (
                  <button
                    key={t.id}
                    className={`to-tab-item${tab === t.id ? " active" : ""}`}
                    onClick={() => setTab(t.id)}
                  >
                    {t.label}
                    <span style={{
                      marginLeft: 6, fontSize: 11, fontWeight: 700,
                      background: tab === t.id ? "var(--to-blue-pale)" : "var(--to-slate-200)",
                      color: tab === t.id ? "var(--to-blue)" : "var(--to-slate-600)",
                      padding: "1px 6px", borderRadius: 10,
                    }}>
                      {t.id === "purchases" ? purchaseRows.length : t.id === "students" ? studentHistory.length : lecturerHistory.length}
                    </span>
                  </button>
                ))}
              </div>

              {/* Tab Content: Purchases */}
              {tab === "purchases" && (
                <>
                  {purchaseRows.length === 0 ? (
                    <div className="to-empty">
                      <div className="to-empty-icon">📦</div>
                      <div className="to-empty-text">No purchase requests found</div>
                    </div>
                  ) : (
                    purchaseRows.map(p => <PurchaseCard key={p.id} p={p} />)
                  )}
                </>
              )}

              {/* Tab Content: Student / Instructor History */}
              {tab === "students" && (
                <>
                  {studentHistory.length === 0 ? (
                    <div className="to-empty">
                      <div className="to-empty-icon">📋</div>
                      <div className="to-empty-text">No completed student / instructor transactions</div>
                    </div>
                  ) : (
                    studentHistory.map(r => (
                      <RequestCard key={`${r.requestId}-${r._item.requestItemId}`} r={r} />
                    ))
                  )}
                </>
              )}

              {/* Tab Content: Lecturer History */}
              {tab === "lecturers" && (
                <>
                  {lecturerHistory.length === 0 ? (
                    <div className="to-empty">
                      <div className="to-empty-icon">🎓</div>
                      <div className="to-empty-text">No completed lecturer transactions</div>
                    </div>
                  ) : (
                    lecturerHistory.map(r => (
                      <RequestCard key={`${r.requestId}-${r._item.requestItemId}`} r={r} />
                    ))
                  )}
                </>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  )
}