import "../styles/sharedPageTheme.css"
import Sidebar from "../components/Sidebar"
import Topbar from "../components/Topbar"
import { useState } from "react"
import { useNavigate } from "react-router-dom"

/* ── FAQ Data ── */
const FAQS = [
  {
    q: "How do I submit an equipment request?",
    a: "Navigate to 'New Request' from the sidebar or dashboard. Select your lab, choose a lecturer, pick the equipment you need, set the date range, and click Submit. Your request will be sent to your lecturer for approval.",
  },
  {
    q: "Who approves my equipment request?",
    a: "Requests follow a two-stage approval: first your assigned Lecturer reviews and approves or rejects the request, then the Lab Technical Officer (TO) processes the issuance from the lab.",
  },
  {
    q: "What is the difference between RETURNABLE and NON-RETURNABLE equipment?",
    a: "Returnable items (e.g. oscilloscopes, multimeters) must be handed back after use — you will need to click 'Submit Return' once you're done. Non-returnable items (e.g. resistors, wires) are consumables and do not need to be returned.",
  },
  {
    q: "How do I accept equipment that has been issued to me?",
    a: "When the TO issues your equipment, the status changes to 'Issued — Confirm?'. Go to 'My Requests', find the request, and click 'Accept Issuance' for each item (or 'Accept All'). This confirms you have physically received the equipment.",
  },
  {
    q: "How do I return equipment?",
    a: "Go to 'My Requests', find the issued request, and click 'Submit Return' on each returnable item. The TO will then physically verify the return and mark it as verified.",
  },
  {
    q: "Why is my item showing 'Waiting (TO)'?",
    a: "The Technical Officer has marked this item as temporarily unavailable (e.g. stock is insufficient or item is being serviced). A reason may be displayed. Check back later or contact the TO directly.",
  },
  {
    q: "Can I request equipment from multiple labs in one request?",
    a: "No. Each request is tied to a single lab. If you need equipment from multiple labs, you must submit separate requests for each lab.",
  },
  {
    q: "What happens if my request is rejected by the lecturer?",
    a: "The request status will show 'Rejected'. You can see this in 'History'. You may submit a new request with corrections if needed, or contact your lecturer directly for clarification.",
  },
  {
    q: "How do I change my password?",
    a: "Go to Settings (accessible from the sidebar) and use the 'Change Password' section. You will need your current password. Passwords must be at least 8 characters with uppercase, lowercase, a number, and a special character.",
  },
  {
    q: "I forgot my password. How do I recover it?",
    a: "On the login page, click 'Forgot Password'. Enter your registered email address and a reset link will be sent to your inbox.",
  },
]

/* ── Workflow Steps ── */
const REQUEST_STEPS = [
  { num: 1, color: "indigo", title: "Submit Request",         desc: "Student/Staff submits a request via 'New Request'. Lab, lecturer, equipment, and date range are selected." },
  { num: 2, color: "amber",  title: "Lecturer Review",        desc: "The assigned lecturer reviews each item and approves or rejects the request (can act on individual items)." },
  { num: 3, color: "blue",   title: "TO Issuance",            desc: "The Lab TO sees the approved request and issues the equipment from lab stock. Items may be placed on a waiting list if stock is low." },
  { num: 4, color: "indigo", title: "Student Accepts",        desc: "Student confirms physical receipt of the equipment by clicking 'Accept Issuance'. This locks the issued quantity." },
  { num: 5, color: "green",  title: "Return (if returnable)", desc: "Student clicks 'Submit Return' when done. The TO verifies the returned items and marks them as returned or damaged." },
]

/* ── Status Legend ── */
const STATUSES = [
  { pill: "pending",  cls: "pending",  label: "Pending Approval",     desc: "Request submitted and awaiting lecturer approval." },
  { pill: "approved", cls: "approved", label: "Approved",             desc: "Lecturer has approved — waiting for TO to issue." },
  { pill: "rejected", cls: "rejected", label: "Rejected",             desc: "Rejected by lecturer. Check History for details." },
  { pill: "waiting",  cls: "waiting",  label: "Waiting (TO)",         desc: "Item approved but TO has placed it on a waiting list." },
  { pill: "issued",   cls: "issued",   label: "Issued — Confirm?",    desc: "Equipment is ready. Accept issuance to confirm receipt." },
  { pill: "issued",   cls: "issued",   label: "Issued & Confirmed",   desc: "You have accepted. Equipment is in your possession." },
  { pill: "return",   cls: "return",   label: "Return Requested",     desc: "You have submitted a return — awaiting TO verification." },
  { pill: "returned", cls: "returned", label: "Returned",             desc: "Return verified by TO. Request closed." },
  { pill: "damaged",  cls: "damaged",  label: "Damaged",              desc: "TO has flagged the returned equipment as damaged." },
]

function FaqItem({ faq }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="sp-faq-item">
      <button className="sp-faq-q" onClick={() => setOpen(o => !o)}>
        <span>{faq.q}</span>
        <span className={`sp-faq-chevron${open ? " open" : ""}`}>▼</span>
      </button>
      {open && <div className="sp-faq-a">{faq.a}</div>}
    </div>
  )
}

/*
 * FIX BUG 5 / 6 / 7 — Role-aware route resolution.
 *
 * Problem: Quick Navigation buttons all hard-coded STUDENT routes:
 *   /new-request, /view-requests, /history
 * Help page is shared by ALL roles. A TO, HOD, Lecturer, Admin clicking
 * "Submit New Request" would land on the student page (wrong) or get a blank
 * page / 404 because those routes don't exist for their role.
 *
 * Fix: Read role from localStorage (set at login) and resolve the correct
 * role-specific route for each action. Roles that don't have a concept
 * (e.g. TO has no "new request") get null, and the button is hidden.
 */
function useRoleRoutes() {
  const role = (localStorage.getItem("role") || "student").toLowerCase()

  const routes = {
    student: {
      newRequest:   "/new-request",
      viewRequests: "/view-requests",
      history:      "/history",
      dashboard:    "/student-dashboard",
    },
    instructor: {
      newRequest:   "/instructor-new-request",
      viewRequests: "/instructor-view-requests",
      history:      "/instructor-history",
      dashboard:    "/instructor-dashboard",
    },
    staff: {
      newRequest:   "/instructor-new-request",
      viewRequests: "/instructor-view-requests",
      history:      "/instructor-history",
      dashboard:    "/instructor-dashboard",
    },
    lecturer: {
      newRequest:   "/lecturer-new-request",
      viewRequests: "/lecturer-view-requests",
      history:      "/lecturer-history",
      dashboard:    "/lecturer-dashboard",
    },
    to: {
      newRequest:   null,                // TO does not submit equipment requests
      viewRequests: "/to-approval-queue",
      history:      "/to-history",
      dashboard:    "/to-dashboard",
    },
    hod: {
      newRequest:   null,                // HOD does not submit equipment requests
      viewRequests: "/hod-my-work",
      history:      "/hod-history",
      dashboard:    "/hod-dashboard",
    },
    admin: {
      newRequest:   null,                // Admin does not submit equipment requests
      viewRequests: "/admin-view-requests",
      history:      "/admin-history",
      dashboard:    "/admin-dashboard",
    },
  }

  return routes[role] || routes.student
}

export default function Help() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()

  // FIX BUG 5/6/7: resolve correct routes for the logged-in role
  const roleRoutes = useRoleRoutes()
  const role = (localStorage.getItem("role") || "student").toLowerCase()

  // Role-specific labels for the quick links
  const viewRequestsLabel = {
    to:      "View Approval Queue",
    hod:     "View My Work",
    admin:   "View All Requests",
    lecturer:"View My Requests & Approval Queue",
  }[role] || "View My Active Requests & Accept Issuance"

  const historyLabel = {
    to:    "View Issuance & Return History",
    hod:   "View Department History",
    admin: "View All Request History",
  }[role] || "View Completed / Returned Request History"

  return (
    <div className="dashboard-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <div className="content">

          {/* Page Header */}
          <div className="sp-page-header">
            <div className="sp-page-icon indigo">❓</div>
            <div>
              <div className="sp-page-title">Help & Support</div>
              <div className="sp-page-subtitle">
                Equipment Request Management System — University of Jaffna · Faculty of Engineering
              </div>
            </div>
          </div>

          {/* Quick Navigation */}
          <div className="sp-section" style={{ marginBottom: 20 }}>
            <div className="sp-section-hd">
              <div className="sp-section-icon indigo">⚡</div>
              <div>
                <div className="sp-section-title">Quick Navigation</div>
                <div className="sp-section-sub">Jump to common tasks</div>
              </div>
            </div>
            <div className="sp-section-body" style={{ padding: "14px 22px" }}>
              <div className="sp-quick-links">

                {/* FIX BUG 5: Only show "New Request" for roles that can submit requests */}
                {roleRoutes.newRequest && (
                  <div className="sp-quick-link" onClick={() => navigate(roleRoutes.newRequest)}>
                    <span className="sp-quick-link-icon">📋</span>
                    <span>Submit a New Equipment Request</span>
                    <span className="sp-quick-link-arrow">→</span>
                  </div>
                )}

                {/* FIX BUG 6: Navigate to the correct "view requests" route for this role */}
                {roleRoutes.viewRequests && (
                  <div className="sp-quick-link" onClick={() => navigate(roleRoutes.viewRequests)}>
                    <span className="sp-quick-link-icon">🔍</span>
                    <span>{viewRequestsLabel}</span>
                    <span className="sp-quick-link-arrow">→</span>
                  </div>
                )}

                {/* FIX BUG 7: Navigate to the correct history route for this role */}
                {roleRoutes.history && (
                  <div className="sp-quick-link" onClick={() => navigate(roleRoutes.history)}>
                    <span className="sp-quick-link-icon">📜</span>
                    <span>{historyLabel}</span>
                    <span className="sp-quick-link-arrow">→</span>
                  </div>
                )}

                {/* Settings — same route for all roles */}
                <div className="sp-quick-link" onClick={() => navigate("/settings")}>
                  <span className="sp-quick-link-icon">⚙️</span>
                  <span>Change Password or Update Account Settings</span>
                  <span className="sp-quick-link-arrow">→</span>
                </div>

              </div>
            </div>
          </div>

          <div className="sp-two-col">

            {/* Left Column */}
            <div>

              {/* How it Works */}
              <div className="sp-section">
                <div className="sp-section-hd">
                  <div className="sp-section-icon blue">🔄</div>
                  <div>
                    <div className="sp-section-title">How the Request Process Works</div>
                    <div className="sp-section-sub">Step-by-step workflow</div>
                  </div>
                </div>
                <div className="sp-section-body">
                  <div className="sp-steps">
                    {REQUEST_STEPS.map(s => (
                      <div key={s.num} className="sp-step">
                        <div className={`sp-step-num ${s.color}`}>{s.num}</div>
                        <div>
                          <div className="sp-step-title">{s.title}</div>
                          <div className="sp-step-desc">{s.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Status Legend */}
              <div className="sp-section">
                <div className="sp-section-hd">
                  <div className="sp-section-icon amber">🏷️</div>
                  <div>
                    <div className="sp-section-title">Request Status Guide</div>
                    <div className="sp-section-sub">What each status means</div>
                  </div>
                </div>
                <div className="sp-section-body">
                  <div className="sp-status-grid">
                    {STATUSES.map((s, i) => (
                      <div key={i} className="sp-status-row">
                        <span className={`sp-status-pill ${s.cls}`}>{s.label}</span>
                        <span className="sp-status-desc">{s.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column */}
            <div>

              {/* FAQ */}
              <div className="sp-section">
                <div className="sp-section-hd">
                  <div className="sp-section-icon indigo">💬</div>
                  <div>
                    <div className="sp-section-title">Frequently Asked Questions</div>
                    <div className="sp-section-sub">Click a question to expand</div>
                  </div>
                </div>
                <div className="sp-section-body">
                  {FAQS.map((faq, i) => <FaqItem key={i} faq={faq} />)}
                </div>
              </div>

              {/* Contact */}
              <div className="sp-section">
                <div className="sp-section-hd">
                  <div className="sp-section-icon green">📞</div>
                  <div>
                    <div className="sp-section-title">Contact & Support</div>
                    <div className="sp-section-sub">Reach the right person</div>
                  </div>
                </div>
                <div className="sp-section-body">
                  <div className="sp-contact-card">
                    <div className="sp-contact-icon blue">✉️</div>
                    <div>
                      <div className="sp-contact-name">System Support Email</div>
                      <div className="sp-contact-value">
                        <a href="mailto:ERMS@eng.jfn.ac.lk">ERMS@eng.jfn.ac.lk</a>
                      </div>
                    </div>
                  </div>
                  <div className="sp-contact-card">
                    <div className="sp-contact-icon green">🏛️</div>
                    <div>
                      <div className="sp-contact-name">Faculty of Engineering</div>
                      <div className="sp-contact-value">University of Jaffna, Sri Lanka</div>
                    </div>
                  </div>
                  <div className="sp-contact-card">
                    <div className="sp-contact-icon purple">🔧</div>
                    <div>
                      <div className="sp-contact-name">Lab Technical Officer</div>
                      <div className="sp-contact-value">Contact your department's TO directly for lab-related issues</div>
                    </div>
                  </div>

                  <div className="sp-divider" />

                  <div style={{
                    padding: "14px 16px",
                    background: "var(--sp-indigo-pale)",
                    border: "1px solid var(--sp-indigo-bd)",
                    borderRadius: "var(--sp-r-sm)",
                    fontSize: 13,
                    color: "var(--sp-indigo)",
                    lineHeight: 1.6,
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}>
                    <strong>💡 Tip:</strong> For urgent equipment issues during lab sessions, contact your Lab Technical Officer directly. For account access problems, email the support address above.
                  </div>
                </div>
              </div>

              {/* System Info */}
              <div className="sp-section">
                <div className="sp-section-hd">
                  <div className="sp-section-icon slate">ℹ️</div>
                  <div>
                    <div className="sp-section-title">System Information</div>
                    <div className="sp-section-sub">About ERMS</div>
                  </div>
                </div>
                <div className="sp-section-body">
                  <div className="sp-info-grid">
                    <div className="sp-info-item">
                      <div className="sp-info-label">System</div>
                      <div className="sp-info-value">ERMS v1.0</div>
                    </div>
                    <div className="sp-info-item">
                      <div className="sp-info-label">Institution</div>
                      <div className="sp-info-value muted">University of Jaffna</div>
                    </div>
                    <div className="sp-info-item">
                      <div className="sp-info-label">Faculty</div>
                      <div className="sp-info-value muted">Engineering</div>
                    </div>
                    <div className="sp-info-item">
                      <div className="sp-info-label">Support</div>
                      <div className="sp-info-value muted">ERMS@eng.jfn.ac.lk</div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  )
}