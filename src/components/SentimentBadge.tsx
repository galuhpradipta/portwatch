export default function SentimentBadge({ score }: { score: number }) {
  const { label, className } =
    score <= 30
      ? { label: "Positive", className: "companies-sentiment-positive" }
      : score <= 60
      ? { label: "Neutral", className: "companies-sentiment-neutral" }
      : score <= 80
      ? { label: "Negative", className: "companies-sentiment-negative" }
      : { label: "Very Negative", className: "companies-sentiment-critical" };

  return (
    <span className={`companies-sentiment-badge ${className}`}>
      {label}
      <span className="opacity-70">({score.toFixed(0)})</span>
    </span>
  );
}
