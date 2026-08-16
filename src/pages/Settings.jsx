import "../styles/sharedPageTheme.css"
import Sidebar from "../components/Sidebar"
import Topbar from "../components/Topbar"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { AuthAPI } from "../api/api"

/* ── Password strength ── */
function pwdStrength(v) {
  if (!v) return { score: 0, label: "", cls: "" }
  let s = 0
  if (v.length >= 8)                s++
  if (/[A-Z]/.test(v))              s++
  if (/[a-z]/.test(v))              s++
  if (/\d/.test(v))                 s++
  if (/[@$!%*?&#^()_\-+=]/.test(v)) s++
  if (s <= 2) return { score: s, label: "Weak",   cls: "weak" }
  if (s <= 3) return { score: s, label: "Fair",   cls: "fair" }
  return        { score: s, label: "Strong", cls: "strong" }
}

function isStrongPwd(v) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(v || "")
}

function avatarInitials(name) {
  if (!name) return "?"
  const parts = name.trim().split(" ")
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase()
}

function roleLabel(role) {
  const map = {
    STUDENT: "Student", STAFF: "Staff / Instructor",
    LECTURER: "Lecturer", HOD: "Head of Department",
    TO: "Technical Officer", ADMIN: "Administrator",
  }
  return map[String(role || "").toUpperCase()] || role || "—"
}

function roleEmoji(role) {
  const map = {
    STUDENT: "🎓", STAFF: "🔬", LECTURER: "📚",
    HOD: "🏛", TO: "🔧", ADMIN: "🛡",
  }
  return map[String(role || "").toUpperCase()] || "👤"
}

/*
 * FIX BUG 1 — PwdField MUST live outside the Settings component.
 *
 * Problem: When defined inside as `const PwdField = ...`, React sees a brand-new
 * component type on every render. That causes React to UNMOUNT + REMOUNT the input
 * on every single keystroke, so the input immediately loses focus after each character.
 *
 * Fix: Declare PwdField as a named function at module scope so its reference is
 * stable across renders.
 */
function PwdField({ label, value, onChange, show, onToggle, hint, disabled }) {
  return (
    <div className="sp-form-group">
      <label className="sp-label">{label}</label>
      <div style={{ position: "relative" }}>
        <input
          className="sp-input"
          type={show ? "text" : "password"}
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{ paddingRight: 40 }}
          disabled={disabled}
          autoComplete="off"
        />
        <button
          type="button"
          onClick={onToggle}
          style={{
            position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
            background: "none", border: "none", cursor: "pointer",
            color: "var(--sp-text-muted)", fontSize: 15, padding: 2,
          }}
          tabIndex={-1}
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? "🙈" : "👁"}
        </button>
      </div>
      {hint && (
        <div className="sp-input-hint" style={{ color: "var(--sp-red)", fontWeight: 600, marginTop: 4 }}>
          {hint}
        </div>
      )}
    </div>
  )
}

export default function Settings() {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  /* Profile */
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [profErr, setProfErr] = useState("")

  /* Change Password */
  const [currentPwd, setCurrentPwd] = useState("")
  const [newPwd,     setNewPwd]     = useState("")
  const [confirmPwd, setConfirmPwd] = useState("")
  const [pwdBusy,    setPwdBusy]    = useState(false)
  const [pwdError,   setPwdError]   = useState("")
  const [pwdSuccess, setPwdSuccess] = useState("")
  const [showCur,    setShowCur]    = useState(false)
  const [showNew,    setShowNew]    = useState(false)
  const [showCon,    setShowCon]    = useState(false)

  const strength = pwdStrength(newPwd)

  /* ── Load user ── */
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const me = await AuthAPI.me()
        if (alive) setUser(me)
      } catch (e) {
        if (alive) setProfErr(e?.message || "Failed to load profile")
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  /* ── Change Password ──
   *
   * FIX BUG 2 — The backend does NOT yet have POST /api/auth/change-password.
   * (api.js itself has a comment confirming this: "NOTE: does NOT exist in the backend.")
   * Previously, clicking "Update Password" would always throw a confusing server error.
   *
   * Fix: catch 404 / 405 explicitly and give the user a clear, actionable message
   * telling them to use the Forgot Password email flow instead.
   */
  const handleChangePwd = async () => {
    setPwdError(""); setPwdSuccess("")

    if (!currentPwd || !newPwd || !confirmPwd)
      return setPwdError("Please fill in all password fields.")
    if (!isStrongPwd(newPwd))
      return setPwdError("New password must be 8+ characters with uppercase, lowercase, number and special character (@$!%*?&).")
    if (newPwd !== confirmPwd)
      return setPwdError("New password and confirmation do not match.")
    if (newPwd === currentPwd)
      return setPwdError("New password must be different from your current password.")

    try {
      setPwdBusy(true)
      await AuthAPI.changePassword({ currentPassword: currentPwd, newPassword: newPwd })
      setPwdSuccess("Password changed successfully! Please use your new password next time you log in.")
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("")
    } catch (e) {
      if (e?.status === 404 || e?.status === 405) {
        // Backend endpoint not deployed yet — guide the user to the email reset flow
        setPwdError(
          "In-app password change is not available yet. Please use the 'Forgot Password' link on the login page to reset your password via email."
        )
      } else {
        setPwdError(e?.message || "Password change failed. Please check your current password and try again.")
      }
    } finally {
      setPwdBusy(false)
    }
  }

  /* FIX BUG 4 — also block submit when new === current (handled in validation too, but
     disabling the button early gives immediate visual feedback) */
  const canSubmitPwd =
    currentPwd && newPwd && confirmPwd &&
    newPwd === confirmPwd &&
    isStrongPwd(newPwd) &&
    newPwd !== currentPwd &&
    !pwdBusy

  const clearPwd = () => {
    setCurrentPwd(""); setNewPwd(""); setConfirmPwd("")
    setPwdError(""); setPwdSuccess("")
    setShowCur(false); setShowNew(false); setShowCon(false)
  }

  return (
    <div className="dashboard-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <div className="content">

          {/* Page Header */}
          <div className="sp-page-header">
            <div className="sp-page-icon teal">⚙️</div>
            <div>
              <div className="sp-page-title">Settings</div>
              <div className="sp-page-subtitle">
                Manage your account, profile information, and security settings
              </div>
            </div>
          </div>

          {profErr && <div className="sp-alert sp-alert-error">{profErr}</div>}

          {/* ── Profile Banner ── */}
          <div className="sp-profile-banner">
            <div className="sp-avatar">
              {loading ? "…" : avatarInitials(user?.fullName)}
            </div>
            <div className="sp-profile-info">
              {loading ? (
                <>
                  <div className="sp-skeleton" style={{ width: 180, height: 22, marginBottom: 8 }} />
                  <div className="sp-skeleton" style={{ width: 220, height: 14 }} />
                </>
              ) : (
                <>
                  <div className="sp-profile-name">{user?.fullName || "—"}</div>
                  <div className="sp-profile-sub">
                    {user?.email || "—"}
                    {user?.regNo ? ` · ${user.regNo}` : ""}
                    {user?.department ? ` · ${user.department}` : ""}
                  </div>
                  <div className="sp-profile-badge">
                    {roleEmoji(user?.role)} {roleLabel(user?.role)}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── Account Information ── */}
          <div className="sp-section">
            <div className="sp-section-hd">
              <div className="sp-section-icon blue">👤</div>
              <div>
                <div className="sp-section-title">Account Information</div>
                <div className="sp-section-sub">Your profile details from the university system</div>
              </div>
            </div>
            <div className="sp-section-body">
              {loading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[160, 220, 140, 180].map((w, i) => (
                    <div key={i} className="sp-skeleton" style={{ width: w, height: 16 }} />
                  ))}
                </div>
              ) : (
                <div className="sp-info-grid">
                  <div className="sp-info-item">
                    <div className="sp-info-label">Full Name</div>
                    <div className="sp-info-value">{user?.fullName || "—"}</div>
                  </div>
                  <div className="sp-info-item">
                    <div className="sp-info-label">Email Address</div>
                    <div className="sp-info-value muted">{user?.email || "—"}</div>
                  </div>
                  <div className="sp-info-item">
                    <div className="sp-info-label">Registration No.</div>
                    <div className="sp-info-value">{user?.regNo || "—"}</div>
                  </div>
                  <div className="sp-info-item">
                    <div className="sp-info-label">Department</div>
                    <div className="sp-info-value">{user?.department || "—"}</div>
                  </div>
                  <div className="sp-info-item">
                    <div className="sp-info-label">Role</div>
                    <div className="sp-info-value">{roleLabel(user?.role)}</div>
                  </div>
                  <div className="sp-info-item">
                    <div className="sp-info-label">Account Status</div>
                    <div className="sp-info-value" style={{ color: user?.enabled !== false ? "var(--sp-green)" : "var(--sp-red)" }}>
                      {user?.enabled !== false ? "✓ Active" : "✗ Disabled"}
                    </div>
                  </div>
                </div>
              )}
              <div style={{
                marginTop: 14, padding: "10px 14px",
                background: "var(--sp-amber-pale)", border: "1px solid var(--sp-amber-bd)",
                borderRadius: "var(--sp-r-sm)", fontSize: 12.5, color: "var(--sp-amber)",
                lineHeight: 1.55, fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}>
                <strong>Note:</strong> Profile details (name, email, department) are managed by the system administrator.
                Contact <a href="mailto:ERMS@eng.jfn.ac.lk" style={{ color: "inherit" }}>ERMS@eng.jfn.ac.lk</a> to request changes.
              </div>
            </div>
          </div>

          {/* ── Change Password ── */}
          <div className="sp-section">
            <div className="sp-section-hd">
              <div className="sp-section-icon red">🔒</div>
              <div>
                <div className="sp-section-title">Change Password</div>
                <div className="sp-section-sub">Update your login password — you will need your current password</div>
              </div>
            </div>
            <div className="sp-section-body">

              {pwdError   && <div className="sp-alert sp-alert-error">⚠ {pwdError}</div>}
              {pwdSuccess && <div className="sp-alert sp-alert-success">✓ {pwdSuccess}</div>}

              <div style={{ maxWidth: 440 }}>

                <PwdField
                  label="Current Password *"
                  value={currentPwd}
                  onChange={setCurrentPwd}
                  show={showCur}
                  onToggle={() => setShowCur(p => !p)}
                  disabled={pwdBusy}
                />

                <PwdField
                  label="New Password *"
                  value={newPwd}
                  onChange={v => { setNewPwd(v); setPwdError(""); setPwdSuccess("") }}
                  show={showNew}
                  onToggle={() => setShowNew(p => !p)}
                  disabled={pwdBusy}
                />

                {/* FIX BUG 3 — strength meter has clean spacing, no negative margin overlap */}
                {newPwd && (
                  <div style={{ marginTop: -8, marginBottom: 16 }}>
                    <div className="sp-pwd-bars">
                      {[1,2,3,4,5].map(i => (
                        <div
                          key={i}
                          className={`sp-pwd-bar${i <= strength.score ? ` ${strength.cls}` : ""}`}
                        />
                      ))}
                    </div>
                    <div className={`sp-pwd-label ${strength.cls}`}>
                      {strength.label} password
                      {strength.cls !== "strong" && " — add uppercase, number & special character"}
                    </div>
                  </div>
                )}

                <PwdField
                  label="Confirm New Password *"
                  value={confirmPwd}
                  onChange={setConfirmPwd}
                  show={showCon}
                  onToggle={() => setShowCon(p => !p)}
                  hint={confirmPwd && newPwd !== confirmPwd ? "⚠ Passwords do not match" : ""}
                  disabled={pwdBusy}
                />

                {/* Inline same-password warning */}
                {currentPwd && newPwd && currentPwd === newPwd && (
                  <div style={{
                    marginTop: -8, marginBottom: 14, padding: "8px 12px",
                    background: "var(--sp-amber-pale)", border: "1px solid var(--sp-amber-bd)",
                    borderRadius: "var(--sp-r-sm)", fontSize: 12.5, color: "var(--sp-amber)",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}>
                    ⚠ New password must be different from your current password.
                  </div>
                )}

                <div style={{
                  padding: "10px 14px",
                  background: "var(--sp-slate-50)",
                  border: "1px solid var(--sp-slate-200)",
                  borderRadius: "var(--sp-r-sm)",
                  fontSize: 12, color: "var(--sp-text-muted)",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  marginBottom: 16, lineHeight: 1.6,
                }}>
                  <strong style={{ color: "var(--sp-text-2)" }}>Password requirements:</strong>
                  {" "}8+ characters · uppercase & lowercase · at least one number · at least one special character (@$!%*?&)
                </div>

                <div className="sp-btn-row" style={{ marginTop: 0 }}>
                  <button
                    className="sp-btn sp-btn-primary"
                    onClick={handleChangePwd}
                    disabled={!canSubmitPwd}
                  >
                    {pwdBusy ? "Updating…" : "🔒 Update Password"}
                  </button>
                  {(currentPwd || newPwd || confirmPwd) && (
                    <button
                      className="sp-btn sp-btn-ghost"
                      onClick={clearPwd}
                      disabled={pwdBusy}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Security Tips ── */}
          <div className="sp-section">
            <div className="sp-section-hd">
              <div className="sp-section-icon purple">🛡️</div>
              <div>
                <div className="sp-section-title">Security Recommendations</div>
                <div className="sp-section-sub">Keep your account safe</div>
              </div>
            </div>
            <div className="sp-section-body">
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { icon: "🔑", text: "Use a unique password that you don't use on other websites." },
                  { icon: "🚫", text: "Never share your login credentials with anyone, including lab staff." },
                  { icon: "💻", text: "Always log out when using a shared or public computer." },
                  { icon: "🔄", text: "Change your password regularly, especially if you suspect it's been compromised." },
                  { icon: "📧", text: "If you receive a suspicious email about your ERMS account, report it to ERMS@eng.jfn.ac.lk." },
                ].map((tip, i) => (
                  <div key={i} style={{
                    display: "flex", gap: 12, padding: "10px 14px",
                    background: "var(--sp-slate-50)", border: "1px solid var(--sp-slate-200)",
                    borderRadius: "var(--sp-r-sm)", alignItems: "flex-start",
                  }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{tip.icon}</span>
                    <span style={{ fontSize: 13, color: "var(--sp-text-muted)", lineHeight: 1.55, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {tip.text}
                    </span>
                  </div>
                ))}
              </div>

              <div className="sp-divider" />

              <div style={{
                display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center",
                padding: "12px 14px", background: "var(--sp-indigo-pale)",
                border: "1px solid var(--sp-indigo-bd)", borderRadius: "var(--sp-r-sm)",
              }}>
                <span style={{ fontSize: 13, color: "var(--sp-indigo)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  <strong>Forgot your password?</strong> Use the reset link on the login page to receive a reset email.
                </span>
                <button
                  className="sp-btn sp-btn-ghost sp-btn-sm"
                  style={{ marginLeft: "auto" }}
                  onClick={() => navigate("/login")}
                >
                  Go to Login →
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}