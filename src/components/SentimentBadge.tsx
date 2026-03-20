export default function SentimentBadge({ score }: { score: number }) {
  const { label, className } =
    score <= 30
      ? { label: "Positive", className: "bg-green-50 text-green-700" }
      : score <= 60
      ? { label: "Neutral", className: "bg-yellow-50 text-yellow-700" }
      : score <= 80
      ? { label: "Negative", className: "bg-orange-50 text-orange-700" }
      : { label: "Very Negative", className: "bg-red-50 text-red-700" };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
