import "../styles/dashboard.css"
import "../styles/lecturerTheme.css"
import Sidebar from "../components/Sidebar"
import Topbar from "../components/Topbar"
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { CommonAPI, StudentRequestAPI, AuthAPI } from "../api/api"
import { AiOutlinePlus, AiOutlineDelete, AiOutlineArrowLeft } from "react-icons/ai"

const PURPOSE_OPTIONS = [
  { label: "Labs",     value: "LABS"     },
  { label: "Lecture",  value: "LECTURE"  },
  { label: "Research", value: "RESEARCH" },
  { label: "Project",  value: "PROJECT"  },
  { label: "Personal", value: "PERSONAL" },
]

export default function LecturerNewRequest() {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const [me, setMe] = useState(null)
  const department  = me?.department || ""

  const [labs,         setLabs]         = useState([])
  const [labsLoading,  setLabsLoading]  = useState(false)
  const [labId,        setLabId]        = useState("")

  const [equipList,    setEquipList]    = useState([])
  const [equipLoading, setEquipLoading] = useState(false)
  const [equipId,      setEquipId]      = useState("")

  const [quantity,     setQuantity]     = useState("")
  const [purpose,      setPurpose]      = useState("")
  const [fromDate,     setFromDate]     = useState("")
  const [fromTime,     setFromTime]     = useState("")   // NEW
  const [toDate,       setToDate]       = useState("")
  const [toTime,       setToTime]       = useState("")   // NEW
  const [description,  setDescription]  = useState("")
  const [items,        setItems]        = useState([])
  const [error,        setError]        = useState("")
  const [submitting,   setSubmitting]   = useState(false)
  const [success,      setSuccess]      = useState(false)

  useEffect(() => { AuthAPI.me().then(setMe).catch(() => {}) }, [])

  useEffect(() => {
    if (!department) return
    setLabsLoading(true)
    setLabs([]); setLabId(""); setEquipList([]); setEquipId("")
    CommonAPI.labs(department)
      .then(list => setLabs(Array.isArray(list) ? list : []))
      .catch(() => setLabs([]))
      .finally(() => setLabsLoading(false))
  }, [department])

  useEffect(() => {
    if (!labId) { setEquipList([]); setEquipId(""); return }
    setEquipLoading(true)
    CommonAPI.equipmentByLab(labId)
      .then(list => setEquipList(Array.isArray(list) ? list : []))
      .catch(() => setEquipList([]))
      .finally(() => setEquipLoading(false))
  }, [labId])

  const labMap   = useMemo(() => new Map((labs   || []).map(l => [String(l.id), l.name])),             [labs])
  const equipMap = useMemo(() => new Map((equipList || []).map(e => [String(e.id), e])),               [equipList])

  const handleAddItem = () => {
    setError("")
    if (!department) return setError("Department not detected — please re-login.")
    if (!labId)      return setError("Please select a lab first.")
    if (!equipId)    return setError("Please select equipment.")
    if (!purpose)    return setError("Please select a purpose.")
    const qty = Number(quantity)
    if (!qty || !Number.isInteger(qty) || qty < 1) return setError("Quantity must be a positive whole number.")
    const eqObj = equipMap.get(String(equipId))
    const eqName = eqObj?.name || `Equipment #${equipId}`
    const availQty = eqObj?.availableQty
    if (availQty !== undefined && availQty !== null && qty > Number(availQty))
      return setError(`Only ${availQty} unit(s) available for ${eqName}.`)
    if (items.length > 0 && String(items[0].labId) !== String(labId))
      return setError("All items must be from the same lab. Remove existing items first to switch labs.")
    setItems(prev => {
      const idx = prev.findIndex(i => String(i.equipmentId) === String(equipId))
      if (idx >= 0) { const copy = [...prev]; copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + qty }; return copy }
      return [...prev, { equipmentId: String(equipId), equipmentName: eqName, quantity: qty,
        labId: String(labId), labName: labMap.get(String(labId)) || "–", purpose }]
    })
    setEquipId(""); setQuantity("")
  }

  const removeItem = idx => setItems(prev => prev.filter((_, i) => i !== idx))

  const validate = () => {
    if (items.length === 0)   return "Add at least one equipment item."
    if (!fromDate)            return "From date is required."
    if (!fromTime)            return "From time is required."
    if (!toDate)              return "To date is required."
    if (!toTime)              return "To time is required."
    const from = new Date(`${fromDate}T${fromTime}`)
    const to   = new Date(`${toDate}T${toTime}`)
    if (isNaN(from) || isNaN(to)) return "Invalid date/time values."
    if (from >= to)           return "To date/time must be after From date/time."
    if (description.length > 400) return "Description must be ≤ 400 characters."
    return ""
  }

  const handleSubmit = async () => {
    const msg = validate()
    if (msg) { setError(msg); return }
    setSubmitting(true); setError("")
    try {
      await StudentRequestAPI.create({
        labId:       Number(items[0].labId),
        purpose:     items[0].purpose,
        purposeNote: description.trim(),
        fromDate,
        fromTime: fromTime || null,
        toDate,
        toTime:   toTime   || null,
        items: items.map(i => ({ equipmentId: Number(i.equipmentId), quantity: i.quantity })),
      })
      setSuccess(true)
    } catch (e) { setError(e?.message || "Submission failed") }
    finally { setSubmitting(false) }
  }

  if (success) {
    return (
      <div className="dashboard-container">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="main-content">
          <Topbar onMenuClick={() => setSidebarOpen(true)} />
          <div className="content">
            <div style={{ maxWidth:480, margin:"60px auto", textAlign:"center" }}>
              <div style={{ fontSize:52, marginBottom:16 }}>✅</div>
              <div style={{ fontSize:20, fontWeight:800, color:"var(--lt-text)", fontFamily:"'Plus Jakarta Sans',sans-serif", marginBottom:10 }}>
                Request Submitted!
              </div>
              <div style={{ fontSize:13.5, color:"var(--lt-text-muted)", marginBottom:24 }}>
                As a lecturer, your request is auto-approved and directly forwarded to the Technical Officer for processing.
              </div>
              <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
                <button className="lt-btn lt-btn-primary" onClick={() => navigate("/lecturer-view-requests")}>View My Requests</button>
                <button className="lt-btn lt-btn-ghost" onClick={() => { setSuccess(false); setItems([]); setFromDate(""); setFromTime(""); setToDate(""); setToTime(""); setDescription("") }}>
                  New Request
                </button>
              </div>
            </div>
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

          <div className="lt-page-header">
            <div>
              <div className="lt-page-title">New Equipment Request</div>
              <div className="lt-page-subtitle">
                As a lecturer, your request is auto-approved and goes directly to the Technical Officer.
              </div>
            </div>
            <button className="lt-btn lt-btn-ghost" onClick={() => navigate(-1)}>
              <AiOutlineArrowLeft /> Back
            </button>
          </div>

          {error && <div className="lt-alert lt-alert-error">{error}</div>}
          {!department && !me && <div className="lt-alert lt-alert-info">Loading your department info…</div>}

          <div style={{ maxWidth:720 }}>

            {/* Section 1: Add items */}
            <div style={{ background:"var(--lt-white)", borderRadius:"var(--lt-r)", border:"1px solid var(--lt-slate-200)", overflow:"hidden", marginBottom:20, boxShadow:"var(--lt-shadow-sm)" }}>
              <div style={{ padding:"14px 20px", background:"var(--lt-slate-50)", borderBottom:"1px solid var(--lt-slate-200)", fontSize:13, fontWeight:700, color:"var(--lt-text)", fontFamily:"'Plus Jakarta Sans',sans-serif", textTransform:"uppercase", letterSpacing:".4px" }}>
                Step 1 — Add Equipment Items
              </div>
              <div style={{ padding:"20px" }}>
                <div className="lt-form-grid lt-form-grid-2">
                  <div className="lt-form-group">
                    <label className="lt-label">Lab / Location <span className="lt-req">*</span></label>
                    <select className="lt-select" value={labId}
                      onChange={e => setLabId(e.target.value)} disabled={labsLoading || !department}>
                      <option value="">{labsLoading ? "Loading labs…" : "— Select Lab —"}</option>
                      {labs.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                  <div className="lt-form-group">
                    <label className="lt-label">Equipment <span className="lt-req">*</span></label>
                    <select className="lt-select" value={equipId}
                      onChange={e => setEquipId(e.target.value)} disabled={!labId || equipLoading}>
                      <option value="">{equipLoading ? "Loading…" : "— Select Equipment —"}</option>
                      {equipList.map(eq => (
                        <option key={eq.id} value={eq.id}>
                          {eq.name}{eq.availableQty !== undefined ? ` (Avail: ${eq.availableQty})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="lt-form-group">
                    <label className="lt-label">Quantity <span className="lt-req">*</span></label>
                    <input className="lt-input" type="number" min="1" value={quantity}
                      onChange={e => setQuantity(e.target.value)} placeholder="e.g. 2" />
                  </div>
                  <div className="lt-form-group">
                    <label className="lt-label">Purpose <span className="lt-req">*</span></label>
                    <select className="lt-select" value={purpose} onChange={e => setPurpose(e.target.value)}>
                      <option value="">— Select Purpose —</option>
                      {PURPOSE_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display:"flex", justifyContent:"flex-end", marginTop:4 }}>
                  <button className="lt-btn lt-btn-primary" onClick={handleAddItem} type="button">
                    <AiOutlinePlus /> Add Item
                  </button>
                </div>
                <div className="lt-item-list" style={{ marginTop:16 }}>
                  <div className="lt-item-list-hd">
                    Request List — {items.length} item{items.length !== 1 ? "s" : ""}
                    {items.length > 0 && (
                      <span style={{ marginLeft:8, color:"var(--lt-blue)", fontWeight:600 }}>
                        · {labMap.get(items[0]?.labId) || ""}
                      </span>
                    )}
                  </div>
                  {items.length === 0
                    ? <div className="lt-item-empty">No items added yet.</div>
                    : items.map((it, idx) => (
                      <div key={`${it.equipmentId}-${idx}`} className="lt-item-row">
                        <div>
                          <div className="lt-item-name">{it.equipmentName}</div>
                          <div className="lt-item-meta">
                            Qty: {it.quantity} · {it.labName} · {PURPOSE_OPTIONS.find(p => p.value === it.purpose)?.label || it.purpose}
                          </div>
                        </div>
                        <button className="lt-btn lt-btn-danger lt-btn-sm lt-btn-icon"
                          onClick={() => removeItem(idx)} type="button">
                          <AiOutlineDelete />
                        </button>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>

            {/* Section 2: Date, Time & Notes */}
            <div style={{ background:"var(--lt-white)", borderRadius:"var(--lt-r)", border:"1px solid var(--lt-slate-200)", overflow:"hidden", marginBottom:20, boxShadow:"var(--lt-shadow-sm)" }}>
              <div style={{ padding:"14px 20px", background:"var(--lt-slate-50)", borderBottom:"1px solid var(--lt-slate-200)", fontSize:13, fontWeight:700, color:"var(--lt-text)", fontFamily:"'Plus Jakarta Sans',sans-serif", textTransform:"uppercase", letterSpacing:".4px" }}>
                Step 2 — Date, Time &amp; Notes
              </div>
              <div style={{ padding:"20px" }}>
                <div className="lt-form-grid lt-form-grid-2">
                  <div className="lt-form-group">
                    <label className="lt-label">From Date <span className="lt-req">*</span></label>
                    <input className="lt-input" type="date" value={fromDate}
                      onChange={e => setFromDate(e.target.value)} />
                  </div>
                  <div className="lt-form-group">
                    <label className="lt-label">From Time <span className="lt-req">*</span></label>
                    <input className="lt-input" type="time" value={fromTime}
                      onChange={e => setFromTime(e.target.value)} />
                  </div>
                  <div className="lt-form-group">
                    <label className="lt-label">To Date <span className="lt-req">*</span></label>
                    <input className="lt-input" type="date" value={toDate}
                      onChange={e => setToDate(e.target.value)} min={fromDate || undefined} />
                  </div>
                  <div className="lt-form-group">
                    <label className="lt-label">To Time <span className="lt-req">*</span></label>
                    <input className="lt-input" type="time" value={toTime}
                      onChange={e => setToTime(e.target.value)} />
                  </div>
                </div>
                <div className="lt-form-group">
                  <label className="lt-label">Description / Notes</label>
                  <textarea className="lt-textarea" rows={3} value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Optional additional notes for the Technical Officer…" />
                  <div style={{ fontSize:11, color:"var(--lt-text-muted)", textAlign:"right" }}>{description.length}/400</div>
                </div>
              </div>
            </div>

            {/* Submit */}
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <button className="lt-btn lt-btn-ghost" onClick={() => navigate(-1)} type="button">Cancel</button>
              <button className="lt-btn lt-btn-primary" onClick={handleSubmit}
                disabled={submitting || items.length === 0} type="button">
                {submitting ? "Submitting…" : "Submit Request"}
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}