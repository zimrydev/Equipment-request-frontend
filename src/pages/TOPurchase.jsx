import "../styles/toTheme.css"
import Sidebar from "../components/Sidebar"
import Topbar from "../components/Topbar"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ToPurchaseAPI } from "../api/api"

/*
  Purchase status flow (from backend PurchaseStatus enum):
    SUBMITTED_TO_HOD → APPROVED_BY_HOD / REJECTED_BY_HOD
    → ISSUED_BY_ADMIN / REJECTED_BY_ADMIN
    → RECEIVED_BY_HOD
*/
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
    case "RECEIVED_BY_HOD":   return "Received by HOD"
    default:                  return s.replace(/_/g, " ")
  }
}

export default function TOPurchase() {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const list = await ToPurchaseAPI.my()
        const sorted = (Array.isArray(list) ? list : [])
          .slice()
          .sort((a, b) => (b.id || 0) - (a.id || 0))
        setRows(sorted)
      } catch (e) {
        setError(e?.message || "Failed to load purchase requests")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const fmt = (d) => d ? String(d) : "—"

  return (
    <div className="dashboard-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <div className="content">

          <div className="to-page-header">
            <div>
              <div className="to-page-title">My Purchase Requests</div>
              <div className="to-page-subtitle">Track equipment purchase requests you submitted to HOD</div>
            </div>
            <button
              className="to-btn to-btn-primary"
              onClick={() => navigate("/to-purchase-new")}
            >
              + New Purchase
            </button>
          </div>

          {error && <div className="to-alert to-alert-error">{error}</div>}

          {loading && (
            <div className="to-empty">
              <div className="to-empty-icon">⏳</div>
              <div className="to-empty-text">Loading purchase requests…</div>
            </div>
          )}

          {!loading && rows.length === 0 && (
            <div className="to-empty">
              <div className="to-empty-icon">📦</div>
              <div className="to-empty-text">No purchase requests yet</div>
              <div style={{ marginTop: 14 }}>
                <button className="to-btn to-btn-primary" onClick={() => navigate("/to-purchase-new")}>
                  Create your first purchase request
                </button>
              </div>
            </div>
          )}

          {!loading && rows.map((p) => {
            const items = Array.isArray(p.items) ? p.items : []

            return (
              <div key={p.id} className="to-card">
                {/* Header */}
                <div className="to-card-top">
                  <div className="to-card-title">
                    <span style={{ color: "var(--to-blue)", fontWeight: 800 }}>PR #{p.id}</span>
                    <span style={{ color: "var(--to-text-muted)", fontWeight: 400, fontSize: 13 }}>·</span>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>
                      {items.length} item{items.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <span className={purchaseSpClass(p.status)}>
                    {purchaseStatusLabel(p.status)}
                  </span>
                </div>

                {/* Body */}
                <div className="to-card-body">
                  <div className="to-meta-grid" style={{ marginBottom: 12 }}>
                    <div>
                      <div className="to-mi-label">Submitted</div>
                      <div className="to-mi-value">{fmt(p.createdDate)}</div>
                    </div>
                    {p.receivedDate && (
                      <div>
                        <div className="to-mi-label">Received Date</div>
                        <div className="to-mi-value">{fmt(p.receivedDate)}</div>
                      </div>
                    )}
                    {p.hodComment && (
                      <div style={{ gridColumn: "1/-1" }}>
                        <div className="to-mi-label">HOD Comment</div>
                        <div className="to-mi-value" style={{ color: "var(--to-amber)", fontWeight: 500 }}>
                          {p.hodComment}
                        </div>
                      </div>
                    )}
                    {p.adminComment && (
                      <div style={{ gridColumn: "1/-1" }}>
                        <div className="to-mi-label">Admin Comment</div>
                        <div className="to-mi-value" style={{ color: "var(--to-purple)", fontWeight: 500 }}>
                          {p.adminComment}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Items */}
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
          })}

        </div>
      </div>
    </div>
  )
}