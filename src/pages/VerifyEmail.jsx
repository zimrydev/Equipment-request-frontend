import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { AuthAPI } from "../api/api"
import "../styles/dashboard.css"

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get("token")

  const [status, setStatus] = useState("loading") // loading | success | error
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!token) {
      setStatus("error")
      setMessage("No verification token found. Please use the link from your email.")
      return
    }

    const verify = async () => {
      try {
        const data = await AuthAPI.verifyEmail(token)
        setMessage(data?.message || "Email verified successfully!")
        setStatus("success")
      } catch (err) {
        setMessage(err?.message || "This verification link is invalid or has expired.")
        setStatus("error")
      }
    }

    verify()
  }, [token])

  return (
    <div className="verify-page">
      <div className="verify-card">
        {status === "loading" && (
          <>
            <div className="verify-icon">⏳</div>
            <h2 className="verify-title">Verifying your email…</h2>
            <p className="verify-msg">Please wait a moment.</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="verify-icon">✅</div>
            <h2 className="verify-title">Email Verified!</h2>
            <p className="verify-msg">{message}</p>
            <button
              className="btn-primary"
              onClick={() => navigate("/login")}
              style={{ margin: "0 auto" }}
            >
              Go to Login
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <div className="verify-icon">❌</div>
            <h2 className="verify-title">Verification Failed</h2>
            <p className="verify-msg">{message}</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <button className="btn-primary" onClick={() => navigate("/login")}>
                Back to Login
              </button>
              <button className="btn-outline" onClick={() => navigate("/signup")}>
                Try Again
              </button>
            </div>
          </>
        )}

        <p style={{ marginTop: 24, fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}>
          Faculty of Engineering · University of Jaffna<br />
          Equipment Request Management System
        </p>
      </div>
    </div>
  )
}