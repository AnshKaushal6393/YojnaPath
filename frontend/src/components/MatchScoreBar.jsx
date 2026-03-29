export default function MatchScoreBar({ scoreLabel, targetWidth = "72%" }) {
  return (
    <div className="match-score">
      <div className="match-score__header">
        <span className="type-label">Match score</span>
        <span className="type-label">{scoreLabel}</span>
      </div>
      <div
        className="match-score__track"
        role="img"
        aria-label={`Match score: ${scoreLabel.replace("%", "")} percent`}
      >
        <div className="match-score__fill score-fill" style={{ "--target": targetWidth }} />
      </div>
    </div>
  );
}
