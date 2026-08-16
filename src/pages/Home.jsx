import "../styles/home.css";
import Navbar from "../components/Navbar";
import FeedbackModal from "../components/FeedbackModal";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaLock, FaClipboardList, FaBolt, FaUniversity,
  FaEnvelope, FaPhone, FaMapMarkerAlt, FaArrowRight
} from "react-icons/fa";

const FEATURES = [
  {
    icon: <FaLock />,
    title: "Secure Access",
    desc: "JWT-protected login with role-based access control for every user type across the faculty.",
  },
  {
    icon: <FaClipboardList />,
    title: "Smart Requests",
    desc: "Submit multi-item equipment requests in minutes, with real-time availability checks.",
  },
  {
    icon: <FaBolt />,
    title: "Live Tracking",
    desc: "Follow every stage of your request — from lecturer approval to TO issuance and return.",
  },
  {
    icon: <FaUniversity />,
    title: "Dept-wide View",
    desc: "HODs and Admins get full visibility into departmental usage, inventory, and reports.",
  },
];

const ROLES = [
  { icon: "🎓", name: "Students & Staff", desc: "Submit equipment requests for labs, lectures, and research projects.", tag: "rt-blue",   label: "Requester"    },
  { icon: "📋", name: "Lecturer / HOD",  desc: "Review and approve requests from your students and manage department labs.", tag: "rt-green",  label: "Approver"     },
  { icon: "🔧", name: "Technical Officer", desc: "Issue, track, and verify equipment returns across your assigned labs.", tag: "rt-amber", label: "Issuer"       },
  { icon: "🛡", name: "Administrator",   desc: "Manage users, departments, purchase requests and generate reports.", tag: "rt-purple", label: "Administrator" },
];

const WORKFLOW_STEPS = [
  { title: "Submit Request",        desc: "Student selects lab, equipment, lecturer and submits a request with date/time range." },
  { title: "Lecturer Approval",     desc: "Assigned lecturer reviews and approves or rejects the request with a reason." },
  { title: "TO Processing",         desc: "Technical Officer issues equipment or flags items as waiting with a reason." },
  { title: "Student Acceptance",    desc: "Student confirms receipt of issued equipment in-app." },
  { title: "Return & Verification", desc: "Equipment is returned and the Technical Officer verifies condition, noting any damage." },
];

export default function Home() {
  const [showFeedback, setShowFeedback] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="home-page">
      <Navbar onFeedback={() => setShowFeedback(true)} />

      {/* ── Hero ── */}
      <section className="hero" id="home">
        <div className="hero-orb hero-orb-1" />
        <div className="hero-orb hero-orb-2" />
        <div className="hero-orb hero-orb-3" />

        <div className="hero-content fade-in">
          {/* Left: text */}
          <div className="hero-text">
            <div className="hero-eyebrow">
              Faculty of Engineering · University of Jaffna
            </div>
            <h1>
              Equipment Request<br />
              <span className="accent">Management System</span>
            </h1>
            <p className="hero-subtitle">
              A unified platform for requesting, approving, and managing
              laboratory equipment across all departments.
            </p>
            <p className="hero-tagline">
              From student to admin — one system, every step of the workflow.
            </p>

            <div className="hero-button-container">
              <button className="cta-btn" onClick={() => navigate("/login")}>
                Get Started <FaArrowRight style={{ fontSize: 12 }} />
              </button>
              <a href="#features" className="cta-btn-secondary">
                Learn More
              </a>
            </div>

            <div className="hero-stats">
              <div>
                <div className="hero-stat-value">6</div>
                <div className="hero-stat-label">User Roles</div>
              </div>
              <div>
                <div className="hero-stat-value">5</div>
                <div className="hero-stat-label">Request Stages</div>
              </div>
              <div>
                <div className="hero-stat-value">2</div>
                <div className="hero-stat-label">Departments</div>
              </div>
            </div>
          </div>

          {/* Right: visual card */}
          <div className="hero-visual">
            <div className="hero-card-stack">
              <div className="hero-card">
                <div className="hero-card-title">Request Workflow</div>
                <div className="hero-flow">
                  {[
                    { num:"01", text:"Submit Request", sub:"Student selects equipment & dates", badge:"badge-blue", bl:"Pending" },
                    { num:"02", text:"Lecturer Approval", sub:"HOD/Lecturer reviews & approves", badge:"badge-green", bl:"Approved" },
                    { num:"03", text:"TO Issues Equipment", sub:"Technical Officer confirms issuance", badge:"badge-amber", bl:"Issued" },
                    { num:"04", text:"Return & Verify", sub:"Student returns, TO confirms status", badge:"badge-purple", bl:"Returned" },
                  ].map(s => (
                    <div className="hero-flow-step" key={s.num}>
                      <div className="hero-flow-num">{s.num}</div>
                      <div style={{ flex: 1 }}>
                        <div className="hero-flow-text">{s.text}</div>
                        <div className="hero-flow-sub">{s.sub}</div>
                      </div>
                      <span className={`hero-flow-badge ${s.badge}`}>{s.bl}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="hero-scroll-hint">Scroll</div>
      </section>

      {/* ── Features ── */}
      <section className="features" id="features">
        <div className="features-header">
          <div className="section-eyebrow">What We Offer</div>
          <h2 className="section-heading">Built for the Faculty</h2>
          <p className="section-subheading">
            Streamlined tools designed for every person in the equipment
            request chain — from first submission to final return.
          </p>
        </div>
        <div className="feature-box">
          {FEATURES.map((f, i) => (
            <article className="card" key={i}>
              <div className="icon">{f.icon}</div>
              <p className="feature-title">{f.title}</p>
              <p className="feature-desc">{f.desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── Workflow + Roles ── */}
      <section className="workflow" id="workflow">
        <div className="workflow-inner">
          <div>
            <div className="section-eyebrow">How It Works</div>
            <h2 className="section-heading">The Request Journey</h2>
            <p className="section-subheading" style={{ marginBottom: 36 }}>
              Every equipment request moves through a clear, audited workflow
              with notifications at each stage.
            </p>
            <div className="workflow-steps">
              {WORKFLOW_STEPS.map((s, i) => (
                <div className="workflow-step" key={i}>
                  <div className="workflow-step-num">{String(i+1).padStart(2,"0")}</div>
                  <div>
                    <div className="workflow-step-title">{s.title}</div>
                    <div className="workflow-step-desc">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="section-eyebrow">User Roles</div>
            <h2 className="section-heading">Everyone Has a Role</h2>
            <div className="workflow-role-grid" style={{ marginTop: 32 }}>
              {ROLES.map((r, i) => (
                <div className="role-card" key={i}>
                  <div className="role-icon">{r.icon}</div>
                  <div className="role-name">{r.name}</div>
                  <div className="role-desc">{r.desc}</div>
                  <span className={`role-tag ${r.tag}`}>{r.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── About ── */}
      <section className="about" id="about">
        <div className="about-inner">
          <div className="about-text">
            <div className="section-eyebrow">About the System</div>
            <h2 className="section-heading">Designed for Real Lab Management</h2>
            <p className="section-subheading">
              The ERMS was built to eliminate paper-based equipment lending and
              bring transparency, accountability, and speed to every department.
            </p>
            <div className="about-highlights">
              {[
                "Role-based access for Students, Staff, Lecturers, HOD, TO, and Admin",
                "Real-time notifications at every stage of the workflow",
                "Purchase request tracking from TO through HOD to Admin",
                "Lab-level equipment inventory with availability tracking",
                "Department reports and historical request analysis",
              ].map((h, i) => (
                <div className="about-hl" key={i}>{h}</div>
              ))}
            </div>
          </div>
          <div>
            <div className="about-quote-card">
              <div className="about-quote-text">
                Streamlining laboratory management so students and faculty
                can focus on what matters — learning and research.
              </div>
              <div className="about-quote-author">
                Faculty of Engineering · University of Jaffna
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Contact ── */}
      <section className="contact" id="contact">
        <div className="contact-inner">
          <div className="section-eyebrow">Get in Touch</div>
          <h2 className="section-heading">Contact Us</h2>
          <p className="section-subheading">
            For technical support or enquiries regarding the system, reach out
            through the details below.
          </p>
          <div className="contact-cards">
            <div className="contact-card">
              <div className="contact-card-icon">📧</div>
              <div className="contact-card-label">Email</div>
              <div className="contact-card-value">
                <a href="mailto:2022e063@eng.jfn.ac.lk">2022e063@eng.jfn.ac.lk</a>
              </div>
            </div>
            <div className="contact-card">
              <div className="contact-card-icon">🏛</div>
              <div className="contact-card-label">Faculty</div>
              <div className="contact-card-value">Faculty of Engineering<br />University of Jaffna</div>
            </div>
            <div className="contact-card">
              <div className="contact-card-icon">📍</div>
              <div className="contact-card-label">Location</div>
              <div className="contact-card-value">Ariviyal Nagar,<br />Kilinochchi, Sri Lanka</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="footer">
        <div className="footer-left">
          <img src="/images/logo.png" alt="UoJ Logo" className="footer-logo" />
          <span className="footer-brand">ERMS · Faculty of Engineering, University of Jaffna</span>
        </div>
        <span className="footer-copy">© 2026 Equipment Request Management System</span>
      </footer>

      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
    </div>
  );
}