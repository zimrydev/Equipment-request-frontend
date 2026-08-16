import "../styles/hodTheme.css"
import Sidebar from "../components/Sidebar"
import Topbar from "../components/Topbar"
import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { AuthAPI, CommonAPI, HodDepartmentAPI, HodPurchaseAPI } from "../api/api"
import { buildLabReportData, generateHodLabReportPdf } from "../utils/hodReportPdf"
import { FaArrowLeft, FaFilePdf } from "react-icons/fa"

function getStatusPill(s) {
  const v = String(s || "").toUpperCase()
  if (v.includes("APPROVED") || v.includes("CONFIRMED") || v.includes("VERIFIED")) return "sp sp-green"
  if (v.includes("REJECTED") || v.includes("DAMAGED")) return "sp sp-red"
  if (v.includes("PROCESSING") || v.includes("ISSUED")) return "sp sp-blue"
  if (v.includes("PENDING")) return "sp sp-amber"
  return "sp sp-slate"
}
const fmtStatus = s => String(s || "–").replace(/_/g, " ")

export default function HodReportLab() {
  const { labId } = useParams()
  const navigate  = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState("")
  const [requests, setRequests] = useState([])
  const [purchases, setPurchases] = useState([])
  const [labEqNames, setLabEqNames] = useState([])
  const [me, setMe] = useState(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [profile, reqList, purchList, eqList] = await Promise.all([
          AuthAPI.me(),
          HodDepartmentAPI.requests(),
          HodPurchaseAPI.my(),
          CommonAPI.equipmentByLab(labId),
        ])
        if (!alive) return
        setMe(profile)
        setRequests(Array.isArray(reqList) ? reqList : [])
        setPurchases(Array.isArray(purchList) ? purchList : [])
        setLabEqNames(Array.isArray(eqList) ? eqList.map(e => e?.name).filter(Boolean) : [])
      } catch (e) {
        if (alive) setError(e?.message || "Failed to load")
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [labId])

  const { labName, studentRows, purchaseRows, summary } = useMemo(
    () => buildLabReportData(requests, purchases, labId, labEqNames),
    [requests, purchases, labId, labEqNames]
  )

  const handlePdf = () => {
    try { generateHodLabReportPdf({ labName, studentRows, purchaseRows, summary, department: me?.department || "", hodName: me?.fullName || "" }) }
    catch (e) { setError(e?.message || "Failed to generate PDF") }
  }

  return (
    <div className="dashboard-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <div className="content">

          <div className="hod-page-header">
            <div>
              <div className="hod-page-title">{labName || `Lab Report`}</div>
              <div className="hod-page-subtitle">Equipment requests and purchase history for this lab</div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="hod-btn hod-btn-ghost" onClick={() => navigate("/hod-report")}>
                <FaArrowLeft size={12} /> Back
              </button>
              <button className="hod-btn hod-btn-primary" onClick={handlePdf}>
                <FaFilePdf size={13} /> Generate PDF
              </button>
            </div>
          </div>

          {error && <div className="hod-alert hod-alert-error">{error}</div>}

          {/* Summary */}
          <div className="stat-grid">
            <div className="stat-card blue">
              <div className="stat-label">Total Records</div>
              <div className="stat-value">{loading ? "–" : studentRows.length}</div>
            </div>
            <div className="stat-card green">
              <div className="stat-label">Returned</div>
              <div className="stat-value">{loading ? "–" : (summary?.returnedCount ?? 0)}</div>
            </div>
            <div className="stat-card amber">
              <div className="stat-label">Not Returned</div>
              <div className="stat-value">{loading ? "–" : (summary?.nonReturnedCount ?? 0)}</div>
            </div>
            <div className="stat-card slate">
              <div className="stat-label">Purchases</div>
              <div className="stat-value">{loading ? "–" : purchaseRows.length}</div>
            </div>
          </div>

          {/* Requester Table */}
          <div className="section-hd">
            <span className="section-hd-title">Requester Details</span>
          </div>
          <div className="hod-table-wrap" style={{ marginBottom: 24 }}>
            <table className="hod-table">
              <thead>
                <tr>
                  <th>Requester Name</th><th>Reg No</th><th>Equipment</th>
                  <th>Qty</th><th>Status</th><th>Returned</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr className="empty-row"><td colSpan="6">Loading…</td></tr>}
                {!loading && studentRows.length === 0 && <tr className="empty-row"><td colSpan="6">No records for this lab</td></tr>}
                {!loading && studentRows.map(r => (
                  <tr key={r.key}>
                    <td>{r.requesterName || "–"}</td>
                    <td className="muted">{r.regNo || "–"}</td>
                    <td>{r.equipment || "–"}</td>
                    <td className="tc">{r.quantity ?? "–"}</td>
                    <td><span className={getStatusPill(r.status)}>{fmtStatus(r.status)}</span></td>
                    <td className="tc">
                      {r.returned === "Returned"
                        ? <span className="sp sp-green">Returned</span>
                        : <span className="muted">Not returned</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Purchase Table */}
          <div className="section-hd">
            <span className="section-hd-title">Purchase List</span>
          </div>
          <div className="hod-table-wrap">
            <table className="hod-table">
              <thead>
                <tr><th>Equipment</th><th>Qty</th><th>Submitted Date</th><th>Received Date</th><th>Status</th></tr>
              </thead>
              <tbody>
                {!loading && purchaseRows.length === 0 && <tr className="empty-row"><td colSpan="5">No purchase records for this lab</td></tr>}
                {purchaseRows.map((p, i) => (
                  <tr key={`${p.equipment}-${i}`}>
                    <td>{p.equipment}</td>
                    <td className="tc">{p.quantity ?? "–"}</td>
                    <td className="tc muted">{p.requestedDate}</td>
                    <td className="tc muted">{p.receivedDate}</td>
                    <td><span className={getStatusPill(p.status)}>{fmtStatus(p.status)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  )
}