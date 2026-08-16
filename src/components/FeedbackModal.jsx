export default function FeedbackModal({ onClose }) {
  return (
    <div className="overlay">
      <div className="overlay-box">
        <h2>Feedback</h2>
        <textarea rows="4" placeholder="Write your feedback..." />
        <button onClick={onClose}>Submit</button>
        <p className="close-link" onClick={onClose}>Cancel</p>
      </div>
    </div>
  )
}
