import "../styles/login.css"
import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { AuthAPI } from "../api/api"
import ForgotModal from "../components/ForgotModal"

const EyeIcon = ({ open }) => open ? (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
) : (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
)

const MailIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
)

const LockIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)

const DEPTS = [
  { value: "CE",  label: "Computer Engineering" },
  { value: "EEE", label: "Electrical & Electronic Engineering" },
]

export default function LoginSignup() {
  const navigate    = useNavigate()
  const [tab, setTab]           = useState("login")
  const [showForgot, setShowForgot] = useState(false)

  // ── Login ──
  const [loginEmail,    setLoginEmail]    = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [showLoginPw,   setShowLoginPw]   = useState(false)
  const [loginError,    setLoginError]    = useState("")
  const [loginLoading,  setLoginLoading]  = useState(false)

  // ── Signup ──
  const [fullName,      setFullName]      = useState("")
  const [regNo,         setRegNo]         = useState("")
  const [department,    setDepartment]    = useState("")
  const [email,         setEmail]         = useState("")
  const [password,      setPassword]      = useState("")
  const [confirm,       setConfirm]       = useState("")
  const [showPw,        setShowPw]        = useState(false)
  const [showCPw,       setShowCPw]       = useState(false)
  const [signupError,   setSignupError]   = useState("")
  const [signupSuccess, setSignupSuccess] = useState("")
  const [signupLoading, setSignupLoading] = useState(false)

  const strongPat      = useMemo(() => /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}/, [])
  const isWeak         = password.length > 0 && !strongPat.test(password)
  const isMismatch     = confirm.length > 0 && password !== confirm

  const pwStrength = useMemo(() => {
    if (!password) return 0
    return [password.length >= 8, /[A-Z]/.test(password), /[0-9]/.test(password), /[@$!%*?&]/.test(password)]
      .filter(Boolean).length
  }, [password])

  const strColor = ["", "#ef4444", "#f97316", "#3b82f6", "#22c55e"][pwStrength]
  const strLabel = ["", "Weak", "Fair", "Good", "Strong"][pwStrength]

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoginError("")
    if (!loginEmail || !loginPassword) { setLoginError("Please fill in all fields"); return }
    try {
      setLoginLoading(true)
      const data = await AuthAPI.login(loginEmail, loginPassword)
      if (!data?.token || !data?.role) { setLoginError("Invalid response from server"); return }
      localStorage.setItem("token", data.token)
      localStorage.setItem("role", data.role.toLowerCase())
      const map = {
        student: "/student-dashboard", staff: "/instructor-dashboard",
        instructor: "/instructor-dashboard", lecturer: "/lecturer-dashboard",
        to: "/to-dashboard", hod: "/hod-my-work", admin: "/admin-dashboard",
      }
      navigate(map[data.role.toLowerCase()] || "/login")
    } catch (err) {
      setLoginError(err?.message || "Invalid email or password")
    } finally {
      setLoginLoading(false)
    }
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    setSignupError(""); setSignupSuccess("")
    if (!fullName || !regNo || !department || !email || !password || !confirm) {
      setSignupError("Please fill in all fields"); return
    }
    if (isWeak)     { setSignupError("Password does not meet the requirements"); return }
    if (isMismatch) { setSignupError("Passwords do not match"); return }
    try {
      setSignupLoading(true)
      await AuthAPI.signupStudent({ fullName, email, regNo, department, password })
      setFullName(""); setRegNo(""); setDepartment("")
      setEmail(""); setPassword(""); setConfirm("")
      setSignupSuccess("Account created! Check your university email for the verification link.")
    } catch (err) {
      setSignupError(err?.message || "Signup failed. Please check your details.")
    } finally {
      setSignupLoading(false)
    }
  }

  const switchTab = (t) => {
    setTab(t)
    setLoginError(""); setSignupError(""); setSignupSuccess("")
  }

  return (
    <div className="lp-root">
      {/* Atmospheric background */}
      <div className="lp-bg-mesh" />
      <div className="lp-bg-grid" />
      <div className="lp-orb lp-orb1" />
      <div className="lp-orb lp-orb2" />
      <div className="lp-orb lp-orb3" />

      <div className="lp-card">

        {/* ── LEFT PANEL ── */}
        <div className="lp-left">
          <div className="lp-left-content">

            <div className="lp-pill">
              <span className="lp-pill-dot" />
              Equipment Request System
            </div>

            <div className="lp-headline">
              {tab === "login"
                ? <><span>Welcome</span><br /><span className="lp-headline-accent">Back</span></>
                : <><span>Student</span><br /><span className="lp-headline-accent">Portal</span></>
              }
            </div>

            <p className="lp-tagline">
              {tab === "login"
                ? "Sign in to manage and track equipment requests across the Faculty of Engineering."
                : "Register using your university credentials to access the equipment management system."}
            </p>

            <div className="lp-features">
              {[
                { icon: "⚡", text: "Real-time request tracking" },
                { icon: "🔐", text: "Secure role-based access" },
                { icon: "📦", text: "Full inventory visibility" },
                { icon: "📊", text: "Department analytics" },
              ].map((f, i) => (
                <div key={i} className="lp-feat" style={{ animationDelay: `${0.5 + i * 0.1}s` }}>
                  <div className="lp-feat-icon">{f.icon}</div>
                  <span>{f.text}</span>
                </div>
              ))}
            </div>

          </div>

          <div className="lp-brand">
            <img src="/images/logo.png" alt="UoJ" className="lp-logo" />
            <div>
              <div className="lp-brand-uni">University of Jaffna</div>
              <div className="lp-brand-fac">Faculty of Engineering</div>
            </div>
          </div>

          <div className="lp-left-deco" />
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="lp-right">

          {/* Tab switcher */}
          <div className="lp-tabs">
            <div className="lp-tab-track">
              <div className={`lp-tab-indicator${tab === "register" ? " lp-tab-right" : ""}`} />
              <button className={`lp-tab${tab === "login" ? " lp-tab-on" : ""}`} onClick={() => switchTab("login")}>Sign In</button>
              <button className={`lp-tab${tab === "register" ? " lp-tab-on" : ""}`} onClick={() => switchTab("register")}>Register</button>
            </div>
          </div>

          {/* ── SIGN IN ── */}
          {tab === "login" && (
            <form className="lp-form" onSubmit={handleLogin} noValidate>
              <div className="lp-form-head">
                <div className="lp-form-title">Sign in to your account</div>
                <div className="lp-form-sub">Enter your credentials to continue</div>
              </div>

              <div className="lp-fld">
                <label className="lp-lbl">Email Address</label>
                <div className="lp-inp-wrap">
                  <span className="lp-inp-prefix"><MailIcon /></span>
                  <input className="lp-inp lp-inp-pl" type="email" value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    placeholder="your@email.com" autoComplete="email" disabled={loginLoading} />
                </div>
              </div>

              <div className="lp-fld">
                <label className="lp-lbl">Password</label>
                <div className="lp-inp-wrap">
                  <span className="lp-inp-prefix"><LockIcon /></span>
                  <input className="lp-inp lp-inp-pl lp-inp-pr" type={showLoginPw ? "text" : "password"}
                    value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
                    placeholder="Enter your password" autoComplete="current-password" disabled={loginLoading} />
                  <button type="button" className="lp-eye" onClick={() => setShowLoginPw(v => !v)} tabIndex={-1}
                    aria-label={showLoginPw ? "Hide password" : "Show password"}>
                    <EyeIcon open={showLoginPw} />
                  </button>
                </div>
              </div>

              {loginError && (
                <div className="lp-alert lp-alert-err">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {loginError}
                </div>
              )}

              <button type="submit" className="lp-btn" disabled={loginLoading}>
                {loginLoading && <span className="lp-spin" />}
                {loginLoading ? "Signing in…" : "Sign In"}
              </button>

              <button type="button" className="lp-forgot-btn" onClick={() => setShowForgot(true)}>
                Forgot your password?
              </button>
            </form>
          )}

          {/* ── REGISTER ── */}
          {tab === "register" && (
            <form className="lp-form" onSubmit={handleSignup} noValidate>
              <div className="lp-form-head">
                <div className="lp-form-title">Create your account</div>
                <div className="lp-form-sub">Student registration · university email required</div>
              </div>

              {signupSuccess && (
                <div className="lp-alert lp-alert-ok">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  {signupSuccess}
                </div>
              )}

              <div className="lp-row2">
                <div className="lp-fld" style={{ marginBottom: 0 }}>
                  <label className="lp-lbl">Full Name</label>
                  <input className="lp-inp" type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" disabled={signupLoading} />
                </div>
                <div className="lp-fld" style={{ marginBottom: 0 }}>
                  <label className="lp-lbl">Registration No.</label>
                  <input className="lp-inp" type="text" value={regNo} onChange={e => setRegNo(e.target.value)} placeholder="2022/E/063" disabled={signupLoading} />
                </div>
              </div>
              <div className="lp-hint">Format: 2022/E/063</div>

              <div className="lp-fld">
                <label className="lp-lbl">Department</label>
                <select className="lp-inp lp-sel" value={department} onChange={e => setDepartment(e.target.value)} disabled={signupLoading}>
                  <option value="">— Select your department —</option>
                  {DEPTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>

              <div className="lp-fld">
                <label className="lp-lbl">University Email</label>
                <div className="lp-inp-wrap">
                  <span className="lp-inp-prefix"><MailIcon /></span>
                  <input className="lp-inp lp-inp-pl" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="20##e###@eng.jfn.ac.lk" disabled={signupLoading} />
                </div>
                <div className="lp-hint">Must match your registration number</div>
              </div>

              <div className="lp-row2">
                <div className="lp-fld" style={{ marginBottom: 0 }}>
                  <label className="lp-lbl">Password</label>
                  <div className="lp-inp-wrap">
                    <input className="lp-inp lp-inp-pr" type={showPw ? "text" : "password"}
                      value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="Min 8 chars" disabled={signupLoading} />
                    <button type="button" className="lp-eye" onClick={() => setShowPw(v => !v)} tabIndex={-1}>
                      <EyeIcon open={showPw} />
                    </button>
                  </div>
                </div>
                <div className="lp-fld" style={{ marginBottom: 0 }}>
                  <label className="lp-lbl">Confirm Password</label>
                  <div className="lp-inp-wrap">
                    <input className={`lp-inp lp-inp-pr${isMismatch ? " lp-inp-err" : ""}`}
                      type={showCPw ? "text" : "password"} value={confirm}
                      onChange={e => setConfirm(e.target.value)} placeholder="Repeat password" disabled={signupLoading} />
                    <button type="button" className="lp-eye" onClick={() => setShowCPw(v => !v)} tabIndex={-1}>
                      <EyeIcon open={showCPw} />
                    </button>
                  </div>
                  {isMismatch && <div className="lp-ferr">Passwords don't match</div>}
                </div>
              </div>

              {/* Strength meter */}
              {password.length > 0 && (
                <div className="lp-strength">
                  <div className="lp-strength-bars">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="lp-sbar" style={{ background: i <= pwStrength ? strColor : "#e2e8f0", transition: "background .3s" }} />
                    ))}
                  </div>
                  <span className="lp-strength-lbl" style={{ color: strColor }}>{strLabel}</span>
                </div>
              )}
              <div className="lp-hint">8+ chars · uppercase · number · special char (@$!%*?&amp;)</div>

              {signupError && (
                <div className="lp-alert lp-alert-err">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {signupError}
                </div>
              )}

              <button type="submit" className="lp-btn" disabled={signupLoading || isWeak || isMismatch}>
                {signupLoading && <span className="lp-spin" />}
                {signupLoading ? "Creating account…" : "Create Account"}
              </button>
            </form>
          )}

        </div>
      </div>

      {showForgot && <ForgotModal onClose={() => setShowForgot(false)} />}
    </div>
  )
}