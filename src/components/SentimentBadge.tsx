export default function SentimentBadge({ score }: { score: number }) {
  const { label, className } =
    score <= 30
      ? { label: "Positive", className: "bg-green-500/10 text-app-green border border-green-500/20" }
      : score <= 60
      ? { label: "Neutral", className: "bg-yellow-500/10 text-app-yellow border border-yellow-500/20" }
      : score <= 80
      ? { label: "Negative", className: "bg-orange-500/10 text-app-orange border border-orange-500/20" }
      : { label: "Very Negative", className: "bg-red-500/10 text-app-red border border-red-500/20" };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium inline-flex items-center gap-1 ${className}`}>
      {label}
      <span className="opacity-70">({score.toFixed(0)})</span>
    </span>
  );
}
