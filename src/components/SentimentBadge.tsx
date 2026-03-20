export default function SentimentBadge({ score }: { score: number }) {
  const { label, className } =
    score <= 30
      ? { label: "Positive", className: "bg-green-500/10 text-app-green" }
      : score <= 60
      ? { label: "Neutral", className: "bg-yellow-500/10 text-app-yellow" }
      : score <= 80
      ? { label: "Negative", className: "bg-orange-500/10 text-app-orange" }
      : { label: "Very Negative", className: "bg-red-500/10 text-app-red" };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
