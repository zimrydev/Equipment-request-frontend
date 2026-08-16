import "../styles/toTheme.css"
import Sidebar from "../components/Sidebar"
import Topbar from "../components/Topbar"
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ToRequestAPI, ToPurchaseAPI, AuthAPI } from "../api/api"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts"

/* ── Item status → display label ── */
function itemStatusLabel(s) {
  if (!s) return "Other"
  switch (s) {
    case "APPROVED_BY_LECTURER":           return "Ready to Issue"
    case "WAITING_TO_ISSUE":               return "Waiting"
    case "ISSUED_PENDING_REQUESTER_ACCEPT":return "Pending Accept"
    case "ISSUED_CONFIRMED":               return "Confirmed"
    case "RETURN_REQUESTED":               return "Return Req."
    case "RETURN_VERIFIED":                return "Returned"
    case "DAMAGED_REPORTED":               return "Damaged"
    default:                               return s.replace(/_/g, " ")
  }
}

/* ── Request-level statuses that are "active" for the TO ── */
const ACTIVE_REQ_STATUSES = new Set([
  "APPROVED_BY_LECTURER",
  "TO_PROCESSING",
  "ISSUED_PENDING_STUDENT_ACCEPT",
  "ISSUED_CONFIRMED",
  "RETURNED_PENDING_TO_VERIFY",
])

/* ── Item-level statuses that are "active" ── */
const ACTIVE_ITEM_STATUSES = new Set([
  "APPROVED_BY_LECTURER",
  "WAITING_TO_ISSUE",
  "ISSUED_PENDING_REQUESTER_ACCEPT",
  "ISSUED_CONFIRMED",
  "RETURN_REQUESTED",
])

const PIE_COLORS = ["#f59e0b", "#3b82f6", "#7c3aed", "#16a34a", "#ef4444", "#0891b2"]

function statusPillClass(s) {
  if (!s) return "to-sp to-sp-slate"
  switch (s) {
    case "APPROVED_BY_LECTURER":            return "to-sp to-sp-approved"
    case "WAITING_TO_ISSUE":                return "to-sp to-sp-waiting"
    case "ISSUED_PENDING_REQUESTER_ACCEPT": return "to-sp to-sp-issued"
    case "ISSUED_CONFIRMED":                return "to-sp to-sp-confirmed"
    case "RETURN_REQUESTED":                return "to-sp to-sp-return-req"
    case "TO_PROCESSING":                   return "to-sp to-sp-processing"
    case "RETURNED_PENDING_TO_VERIFY":      return "to-sp to-sp-return-req"
    default:                                return "to-sp to-sp-slate"
  }
}

export default function TODashboard() {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [rows, setRows] = useState([])
  const [purchases, setPurchases] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const load = async () => {
      try {
        const [list, pList, me] = await Promise.all([
          ToRequestAPI.all(),
          ToPurchaseAPI.my().catch(() => []),
          AuthAPI.me(),
        ])
        setRows(Array.isArray(list) ? list : [])
        setPurchases(Array.isArray(pList) ? pList : [])
        setUser(me)
      } catch (e) {
        setError(e?.message || "Failed to load dashboard data")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  /* Flatten active item rows for the dashboard table */
  const activeItemRows = useMemo(() => {
    const out = []
    for (const r of rows) {
      if (!ACTIVE_REQ_STATUSES.has(r.status)) continue
      for (const it of (r.items || [])) {
        if (!ACTIVE_ITEM_STATUSES.has(it.itemStatus)) continue
        out.push({ ...r, _item: it })
      }
    }
    return out.sort((a, b) => (b.requestId || 0) - (a.requestId || 0))
  }, [rows])

  const counts = useMemo(() => ({
    activeItems:    activeItemRows.length,
    readyToIssue:   activeItemRows.filter(r => r._item.itemStatus === "APPROVED_BY_LECTURER").length,
    pendingReturn:  activeItemRows.filter(r => r._item.itemStatus === "RETURN_REQUESTED").length,
    myPurchases:    purchases.length,
  }), [activeItemRows, purchases])

  /* Pie: breakdown of active item statuses */
  const pieData = useMemo(() => {
    const map = {}
    for (const { _item } of activeItemRows) {
      const label = itemStatusLabel(_item?.itemStatus)
      map[label] = (map[label] || 0) + 1
    }
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [activeItemRows])

  /* Bar: total requests per lab */
  const labBarData = useMemo(() => {
    const map = {}
    for (const r of rows) {
      const lab = r.labName || "Unknown"
      map[lab] = (map[lab] || 0) + 1
    }
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 7)
      .map(([name, count]) => ({
        name: name.length > 13 ? name.slice(0, 13) + "…" : name,
        count,
      }))
  }, [rows])

  return (
    <div className="dashboard-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <div className="content">

          {/* Welcome Banner */}
          <div className="to-welcome-banner">
            <div className="to-welcome-name">
              Welcome, {user?.fullName || "Technical Officer"}!
            </div>
            <div className="to-welcome-sub">
              {user?.department ? `${user.department} · ` : ""}Technical Officer · Faculty of Engineering, University of Jaffna
            </div>
            <div className="to-welcome-badge">🔧 TECHNICAL OFFICER</div>
          </div>

          {error && <div className="to-alert to-alert-error">{error}</div>}

          {/* Stat Cards */}
          <div className="to-stat-grid">
            <div className="to-stat-card blue">
              <div className="to-stat-label">Active Items</div>
              <div className="to-stat-value">{loading ? "—" : counts.activeItems}</div>
              <div className="to-stat-sub">Under TO management</div>
            </div>
            <div className="to-stat-card amber">
              <div className="to-stat-label">Ready to Issue</div>
              <div className="to-stat-value">{loading ? "—" : counts.readyToIssue}</div>
              <div className="to-stat-sub">Awaiting issuance</div>
            </div>
            <div className="to-stat-card orange">
              <div className="to-stat-label">Pending Return</div>
              <div className="to-stat-value">{loading ? "—" : counts.pendingReturn}</div>
              <div className="to-stat-sub">Return requested</div>
            </div>
            <div className="to-stat-card purple">
              <div className="to-stat-label">My Purchases</div>
              <div className="to-stat-value">{loading ? "—" : counts.myPurchases}</div>
              <div className="to-stat-sub">All time</div>
            </div>
          </div>

          {/* Charts */}
          {(pieData.length > 0 || labBarData.length > 0) && (
            <div className="to-chart-grid-2" style={{ marginBottom: 28 }}>
              {pieData.length > 0 && (
                <div className="to-chart-card">
                  <div className="to-chart-title">Active Item Status Breakdown</div>
                  <ResponsiveContainer width="100%" height={210}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" outerRadius={78} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend iconSize={10} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              {labBarData.length > 0 && (
                <div className="to-chart-card">
                  <div className="to-chart-title">All Requests by Lab</div>
                  <ResponsiveContainer width="100%" height={210}>
                    <BarChart data={labBarData} layout="vertical" margin={{ top: 4, right: 20, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fontFamily: "Plus Jakarta Sans" }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fontFamily: "Plus Jakarta Sans" }} width={90} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#2563eb" radius={[0, 4, 4, 0]} name="Requests" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Quick Actions */}
          <div className="to-section-hd">
            <div className="to-section-title">Quick Actions</div>
          </div>
          <div className="to-qa-grid">
            <div className="to-qa-card to-qa-blue" onClick={() => navigate("/to-approval-requests")}>
              <div className="to-qa-icon">📋</div>
              <div className="to-qa-label">Approval Requests</div>
            </div>
            <div className="to-qa-card to-qa-green" onClick={() => navigate("/to-purchase-new")}>
              <div className="to-qa-icon">🛒</div>
              <div className="to-qa-label">New Purchase</div>
            </div>
            <div className="to-qa-card to-qa-purple" onClick={() => navigate("/to-purchase")}>
              <div className="to-qa-icon">📦</div>
              <div className="to-qa-label">My Purchases</div>
            </div>
            <div className="to-qa-card to-qa-slate" onClick={() => navigate("/to-history")}>
              <div className="to-qa-icon">📜</div>
              <div className="to-qa-label">History</div>
            </div>
          </div>

          {/* Active Items Table */}
          <div className="to-section-hd">
            <div className="to-section-title">Active Equipment Items</div>
          </div>
          <div className="to-table-wrap">
            <table className="to-table">
              <thead>
                <tr>
                  <th>Req #</th>
                  <th>Requester</th>
                  <th>Role</th>
                  <th>Lab</th>
                  <th>Equipment</th>
                  <th>Qty</th>
                  <th>Date</th>
                  <th>Item Status</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan="8" style={{ textAlign: "center", padding: "32px", color: "var(--to-text-muted)" }}>Loading…</td></tr>
                )}
                {!loading && activeItemRows.length === 0 && (
                  <tr className="empty-row"><td colSpan="8">No active equipment items</td></tr>
                )}
                {!loading && activeItemRows.slice(0, 10).map((r) => {
                  const it = r._item
                  return (
                    <tr key={`${r.requestId}-${it.requestItemId}`}>
                      <td className="to-id">#{r.requestId}</td>
                      <td>{r.requesterFullName || r.requesterRegNo || "—"}</td>
                      <td className="to-muted">{r.requesterRole || "—"}</td>
                      <td>{r.labName || "—"}</td>
                      <td style={{ fontWeight: 600 }}>{it.equipmentName || "—"}</td>
                      <td className="tc">{it.quantity ?? "—"}</td>
                      <td className="to-muted">{r.fromDate || "—"}</td>
                      <td>
                        <span className={statusPillClass(it.itemStatus)}>
                          {itemStatusLabel(it.itemStatus)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {activeItemRows.length > 10 && (
            <div style={{ textAlign: "center", marginTop: 8 }}>
              <button className="to-btn to-btn-outline" onClick={() => navigate("/to-approval-requests")}>
                View all {activeItemRows.length} active items →
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}