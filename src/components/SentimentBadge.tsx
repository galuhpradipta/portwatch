export default function SentimentBadge({ score }: { score: number }) {
  const { label, className } =
    score <= 30
      ? { label: "Positive", className: "bg-green-500/20 text-green-400" }
      : score <= 60
      ? { label: "Neutral", className: "bg-yellow-500/20 text-yellow-400" }
      : score <= 80
      ? { label: "Negative", className: "bg-orange-500/20 text-orange-400" }
      : { label: "Very Negative", className: "bg-red-500/20 text-red-400" };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
