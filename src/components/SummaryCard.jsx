import React from "react"

export default function SummaryCard({ title, value, className, icon }) {
  return (
    <div className={`summary-card ${className || ""}`}>
      {icon && <div className="card-icon">{icon}</div>}
      <div className="card-info">
        <h4>{title}</h4>
        <p>{value}</p>
      </div>
    </div>
  )
}