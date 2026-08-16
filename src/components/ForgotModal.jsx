import { useState } from "react"
import { AuthAPI } from "../api/api"

export default function ForgotModal({ onClose }) {
  const [email,   setEmail]   = useState("")
  const [status,  setStatus]  = useState("") // success message
  const [error,   setError]   = useState("")
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)

  const handleSend = async () => {
    setError("")
    setStatus("")
    const e = (email || "").trim()
    if (!e) {
      setError("Please enter your email address")
      return
    }
    try {
      setLoading(true)
      // POST /api/auth/forgot-password  { email }
      // Backend always returns 200 with same message (security by design — doesn't reveal if email exists)
      await AuthAPI.forgotPassword(e)
      setStatus("If this email exists in our system, a password reset link has been sent. Please check your inbox.")
      setSent(true)
    } catch (err) {
      setError(err?.message || "Could not send reset link. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="overlay">
      <div className="overlay-box" style={{ maxWidth: 460 }}>
        <h2>Forgot Password</h2>
        <p style={{ marginTop: -4, marginBottom: 16, fontSize: 13, opacity: 0.7, lineHeight: 1.5 }}>
          Enter your registered email address and we will send you a password reset link.
        </p>

        {!sent ? (
          <>
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              disabled={loading}
              onKeyDown={e => e.key === "Enter" && handleSend()}
            />

            {error  && <p style={{ color: "red",     fontSize: 12, marginTop: 8 }}>{error}</p>}

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button onClick={handleSend} disabled={loading} style={{ flex: 1 }}>
                {loading ? "Sending…" : "Send Reset Link"}
              </button>
              <button onClick={onClose} className="btn-cancel" type="button" style={{ flex: 1 }}>
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{
              padding: "14px 16px", background: "#f0fdf4", border: "1px solid #bbf7d0",
              borderRadius: 8, fontSize: 13, color: "#15803d", lineHeight: 1.6, marginBottom: 16,
            }}>
              ✓ {status}
            </div>
            <p style={{ fontSize: 13, color: "#64748b" }}>
              Open the link in the email to set a new password. The link expires in 1 hour.
            </p>
            <button onClick={onClose} style={{ marginTop: 14, width: "100%" }}>
              Close
            </button>
          </>
        )}
      </div>
    </div>
  )
}