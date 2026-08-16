import "../styles/instructorTheme.css"
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import Sidebar from "../components/Sidebar"
import Topbar from "../components/Topbar"
import { AuthAPI, CommonAPI, StudentRequestAPI } from "../api/api"

const PURPOSE_OPTIONS = ["LABS", "LECTURE", "RESEARCH", "PROJECT", "PERSONAL"]

export default function InstructorNewRequest() {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const [me,   setMe]   = useState(null)
  const [dept, setDept] = useState("")

  const [labs,        setLabs]        = useState([])
  const [labId,       setLabId]       = useState("")
  const [labsLoading, setLabsLoading] = useState(true)

  const [lecturers,  setLecturers]  = useState([])
  const [lecturerId, setLecturerId] = useState("")

  const [equipOptions, setEquipOptions] = useState([])
  const [equipmentId,  setEquipmentId]  = useState("")
  const [eqLoading,    setEqLoading]    = useState(false)
  const [qty,          setQty]          = useState("1")

  const [purpose,     setPurpose]     = useState("")
  const [purposeNote, setPurposeNote] = useState("")
  const [fromDate,    setFromDate]    = useState("")
  const [fromTime,    setFromTime]    = useState("")   // NEW
  const [toDate,      setToDate]      = useState("")
  const [toTime,      setToTime]      = useState("")   // NEW

  const [items, setItems] = useState([])

  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState("")
  const [success,    setSuccess]    = useState("")

  useEffect(() => {
    const init = async () => {
      try {
        setLabsLoading(true)
        const user = await AuthAPI.me()
        setMe(user)
        const department = user.department || ""
        setDept(department)
        const [allLabs, allLec] = await Promise.all([
          CommonAPI.labs(department),
          CommonAPI.lecturers(department),
        ])
        setLabs(Array.isArray(allLabs) ? allLabs : [])
        setLecturers(Array.isArray(allLec) ? allLec : [])
        if (Array.isArray(allLec) && allLec.length) setLecturerId(String(allLec[0].id))
      } catch (e) {
        setError(e?.message || "Failed to load form data")
      } finally {
        setLabsLoading(false)
      }
    }
    init()
  }, [])

  useEffect(() => {
    if (!labId) { setEquipOptions([]); setEquipmentId(""); return }
    const loadEquip = async () => {
      try {
        setEqLoading(true); setEquipOptions([]); setEquipmentId("")
        const list = (await CommonAPI.equipmentByLab(labId)) || []
        const active = list.filter(e => e.active !== false)
        setEquipOptions(active)
        if (active.length) setEquipmentId(String(active[0].id))
      } catch (e) {
        setError(e?.message || "Failed to load equipment")
      } finally {
        setEqLoading(false)
      }
    }
    loadEquip()
  }, [labId])

  const selectedEquip = useMemo(
    () => equipOptions.find(e => String(e.id) === String(equipmentId)),
    [equipOptions, equipmentId]
  )

  const addToCart = () => {
    setError("")
    if (!equipmentId) return setError("Please select equipment")
    const q = parseInt(qty, 10)
    if (!q || q <= 0) return setError("Quantity must be a positive number")
    setItems(prev => {
      const existing = prev.find(it => String(it.equipmentId) === String(equipmentId))
      if (existing) return prev.map(it => String(it.equipmentId) === String(equipmentId) ? { ...it, quantity: it.quantity + q } : it)
      return [...prev, {
        equipmentId:   Number(equipmentId),
        equipmentName: selectedEquip?.name || `Equipment #${equipmentId}`,
        itemType:      selectedEquip?.itemType || "",
        quantity:      q,
      }]
    })
    setQty("1")
  }

  const removeItem = (eid) => setItems(prev => prev.filter(it => String(it.equipmentId) !== String(eid)))
  const updateItemQty = (eid, newQty) => {
    const q = parseInt(newQty, 10)
    if (!q || q <= 0) return
    setItems(prev => prev.map(it => String(it.equipmentId) === String(eid) ? { ...it, quantity: q } : it))
  }

  const validate = () => {
    if (!labId)       return "Please select a lab."
    if (!lecturerId)  return "Please select a lecturer."
    if (!purpose)     return "Please select a purpose."
    if (!fromDate)    return "From date is required."
    if (!fromTime)    return "From time is required."
    if (!toDate)      return "To date is required."
    if (!toTime)      return "To time is required."
    if (new Date(`${fromDate}T${fromTime}`) >= new Date(`${toDate}T${toTime}`))
      return "To date/time must be after From date/time."
    if (items.length === 0) return "Add at least one equipment item."
    return ""
  }

  const canSubmit = useMemo(() => {
    if (!labId || !lecturerId || !purpose || !fromDate || !fromTime || !toDate || !toTime) return false
    if (new Date(`${fromDate}T${fromTime}`) >= new Date(`${toDate}T${toTime}`)) return false
    return items.length > 0
  }, [labId, lecturerId, purpose, fromDate, fromTime, toDate, toTime, items])

  const handleSubmit = async () => {
    setError(""); setSuccess("")
    const msg = validate()
    if (msg) return setError(msg)
    try {
      setSubmitting(true)
      await StudentRequestAPI.create({
        labId:       Number(labId),
        lecturerId:  Number(lecturerId),
        purpose,
        purposeNote: purposeNote.trim() || null,
        fromDate,
        fromTime: fromTime || null,
        toDate,
        toTime:   toTime   || null,
        items: items.map(it => ({ equipmentId: it.equipmentId, quantity: it.quantity })),
      })
      setSuccess("Request submitted successfully! Awaiting lecturer approval.")
      setItems([])
      setPurpose(""); setPurposeNote("")
      setFromDate(""); setFromTime(""); setToDate(""); setToTime(""); setQty("1")
    } catch (e) {
      setError(e?.message || "Failed to submit request")
    } finally {
      setSubmitting(false)
    }
  }

  const disabled = submitting || labsLoading

  return (
    <div className="dashboard-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <div className="content">

          <div className="inst-page-header">
            <div className="inst-page-header-left">
              <div className="inst-page-title">New Equipment Request</div>
              <div className="inst-page-subtitle">
                {me ? `${me.fullName} · ${dept || ""}` : "Submit an equipment request to your lecturer for approval"}
              </div>
            </div>
            <div className="inst-page-actions">
              <button className="inst-btn inst-btn-ghost" onClick={() => navigate("/instructor-dashboard")}>← Dashboard</button>
            </div>
          </div>

          {error   && <div className="inst-alert inst-alert-error">{error}</div>}
          {success && (
            <div className="inst-alert inst-alert-success">
              {success}
              <button className="inst-btn inst-btn-success inst-btn-sm" style={{ marginLeft:12 }}
                onClick={() => navigate("/instructor-view-requests")}>
                View My Requests
              </button>
            </div>
          )}

          {labsLoading ? (
            <div className="inst-empty">
              <div className="inst-empty-icon">⏳</div>
              <div className="inst-empty-text">Loading form data…</div>
            </div>
          ) : (
            <>
              {/* Section 1: Lab & Lecturer */}
              <div className="inst-form-card">
                <div className="inst-form-section-title">Lab &amp; Lecturer</div>
                <div className="inst-form-grid inst-form-grid-2">
                  <div className="inst-form-group">
                    <label className="inst-label">Lab *</label>
                    <select className="inst-select" value={labId}
                      onChange={e => setLabId(e.target.value)} disabled={disabled}>
                      <option value="">— Select Lab —</option>
                      {labs.map(l => <option key={l.id} value={String(l.id)}>{l.name}</option>)}
                    </select>
                  </div>
                  <div className="inst-form-group">
                    <label className="inst-label">Lecturer *</label>
                    <select className="inst-select" value={lecturerId}
                      onChange={e => setLecturerId(e.target.value)} disabled={disabled}>
                      <option value="">— Select Lecturer —</option>
                      {lecturers.map(l => (
                        <option key={l.id} value={String(l.id)}>
                          {l.fullName}{l.email ? ` (${l.email})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Request Details */}
              <div className="inst-form-card">
                <div className="inst-form-section-title">Request Details</div>
                <div className="inst-form-grid inst-form-grid-2">
                  <div className="inst-form-group">
                    <label className="inst-label">Purpose *</label>
                    <select className="inst-select" value={purpose}
                      onChange={e => setPurpose(e.target.value)} disabled={disabled}>
                      <option value="">— Select Purpose —</option>
                      {PURPOSE_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="inst-form-group">
                    <label className="inst-label">Purpose Note (optional)</label>
                    <input className="inst-input" value={purposeNote}
                      onChange={e => setPurposeNote(e.target.value)}
                      placeholder="Any additional context…" disabled={disabled} />
                  </div>

                  <div className="inst-form-group">
                    <label className="inst-label">From Date *</label>
                    <input className="inst-input" type="date" value={fromDate}
                      onChange={e => setFromDate(e.target.value)} disabled={disabled} />
                  </div>
                  <div className="inst-form-group">
                    <label className="inst-label">From Time *</label>
                    <input className="inst-input" type="time" value={fromTime}
                      onChange={e => setFromTime(e.target.value)} disabled={disabled} />
                  </div>

                  <div className="inst-form-group">
                    <label className="inst-label">To Date *</label>
                    <input className="inst-input" type="date" value={toDate}
                      min={fromDate || undefined}
                      onChange={e => setToDate(e.target.value)} disabled={disabled} />
                  </div>
                  <div className="inst-form-group">
                    <label className="inst-label">To Time *</label>
                    <input className="inst-input" type="time" value={toTime}
                      onChange={e => setToTime(e.target.value)} disabled={disabled} />
                  </div>
                </div>
              </div>

              {/* Section 3: Equipment */}
              <div className="inst-form-card">
                <div className="inst-form-section-title">Add Equipment</div>
                <div className="inst-form-grid inst-form-grid-3" style={{ alignItems:"flex-end" }}>
                  <div className="inst-form-group">
                    <label className="inst-label">Equipment *</label>
                    <select className="inst-select" value={equipmentId}
                      onChange={e => setEquipmentId(e.target.value)}
                      disabled={disabled || !labId || eqLoading || equipOptions.length === 0}>
                      {!labId && <option value="">Select a lab first</option>}
                      {labId && eqLoading && <option>Loading…</option>}
                      {labId && !eqLoading && equipOptions.length === 0 && <option value="">No equipment in this lab</option>}
                      {equipOptions.map(e => (
                        <option key={e.id} value={String(e.id)}>
                          {e.name}{e.availableQty != null ? ` (Avail: ${e.availableQty})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="inst-form-group">
                    <label className="inst-label">Quantity *</label>
                    <input className="inst-input" type="number" min="1" value={qty}
                      onChange={e => setQty(e.target.value)} disabled={disabled || !equipmentId} />
                  </div>
                  <div className="inst-form-group">
                    <button className="inst-btn inst-btn-primary" onClick={addToCart}
                      disabled={disabled || !equipmentId || !labId} style={{ alignSelf:"flex-end" }}>
                      + Add to Cart
                    </button>
                  </div>
                </div>
                {selectedEquip && (
                  <div style={{ marginTop:12, padding:"10px 14px", background:"var(--inst-teal-pale)",
                    border:"1px solid var(--inst-teal-bd)", borderRadius:"var(--inst-r-sm)",
                    fontSize:13, color:"var(--inst-teal)" }}>
                    <strong>{selectedEquip.name}</strong>
                    {selectedEquip.category && <span style={{ marginLeft:10, opacity:.8 }}>· {selectedEquip.category}</span>}
                    {selectedEquip.itemType  && <span style={{ marginLeft:10, opacity:.8 }}>· {selectedEquip.itemType}</span>}
                    {selectedEquip.availableQty != null && <span style={{ marginLeft:10, opacity:.8 }}>· Available: {selectedEquip.availableQty}</span>}
                  </div>
                )}
              </div>

              {/* Cart */}
              <div className="inst-section-hd">
                <div className="inst-section-title">
                  Request Cart
                  <span style={{ marginLeft:8, fontSize:11, fontWeight:700,
                    background: items.length ? "var(--inst-teal-pale)" : "var(--inst-slate-100)",
                    color: items.length ? "var(--inst-teal)" : "var(--inst-slate-500)",
                    padding:"2px 8px", borderRadius:10 }}>
                    {items.length} item{items.length !== 1 ? "s" : ""}
                  </span>
                </div>
                {items.length > 0 && (
                  <button className="inst-btn inst-btn-ghost inst-btn-sm"
                    onClick={() => setItems([])} disabled={submitting}>
                    Clear All
                  </button>
                )}
              </div>

              <div className="inst-item-list">
                <div className="inst-item-list-hd">Equipment · Quantity · Actions</div>
                {items.length === 0 && (
                  <div className="inst-item-empty">No items added — select equipment above and click "Add to Cart"</div>
                )}
                {items.map(it => (
                  <div key={it.equipmentId} className="inst-item-row">
                    <div>
                      <div className="inst-item-name">{it.equipmentName}</div>
                      {it.itemType && <div className="inst-item-meta">{it.itemType}</div>}
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <input className="inst-input" type="number" min="1" value={it.quantity}
                        onChange={e => updateItemQty(it.equipmentId, e.target.value)}
                        style={{ width:72 }} disabled={submitting} />
                      <span className="inst-muted" style={{ fontSize:13 }}>units</span>
                      <button className="inst-btn inst-btn-ghost inst-btn-sm"
                        onClick={() => removeItem(it.equipmentId)} disabled={submitting}>
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {items.length > 0 && (
                <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:8 }}>
                  <button className="inst-btn inst-btn-ghost"
                    onClick={() => navigate("/instructor-dashboard")} disabled={submitting}>
                    Cancel
                  </button>
                  <button className="inst-btn inst-btn-primary" onClick={handleSubmit}
                    disabled={!canSubmit || submitting}>
                    {submitting ? "Submitting…" : `Submit Request (${items.length} item${items.length !== 1 ? "s" : ""})`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}