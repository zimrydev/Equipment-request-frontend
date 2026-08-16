import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "../styles/home.css";

export default function Navbar({ onFeedback }) {
  const [open,     setOpen]     = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // add scrolled class for extra shadow on scroll
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const handleFeedback = () => {
    setOpen(false);
    onFeedback();
  };

  const close = () => setOpen(false);

  return (
    <nav
      className="navbar"
      role="navigation"
      style={scrolled ? { boxShadow: "0 4px 24px rgba(0,0,0,.35)" } : undefined}
    >
      {/* Logo */}
      <div className="logo-container">
        <img
          src="/images/logo.png"
          alt="University of Jaffna"
          className="logo-img"
        />
        <span className="logo-text">Equipment Request Management System</span>
      </div>

      {/* Nav links */}
      <div className="nav-container">
        <ul className={`nav-links${open ? " active" : ""}`} aria-expanded={open}>
          <li><a href="#home"     onClick={close}>Home</a></li>
          <li><a href="#features" onClick={close}>Features</a></li>
          <li><a href="#workflow" onClick={close}>How It Works</a></li>
          <li><a href="#about"    onClick={close}>About</a></li>
          <li><a href="#contact"  onClick={close}>Contact</a></li>
          <li>
            <button className="nav-btn" onClick={handleFeedback}>
              Feedback
            </button>
          </li>
        </ul>

        <Link to="/login" className="login-btn">
          Sign In →
        </Link>
      </div>

      {/* Mobile toggle */}
      <button
        className="menu-toggle"
        onClick={() => setOpen(o => !o)}
        aria-label={open ? "Close menu" : "Open menu"}
        style={{ background: "none", border: "none", cursor: "pointer" }}
      >
        {open ? "✕" : "☰"}
      </button>
    </nav>
  );
}