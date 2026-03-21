import { useState } from "react";

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

const PALETTE = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f59e0b",
  "#10b981", "#3b82f6", "#ef4444", "#14b8a6",
];

function pickColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

type Props = {
  id: string;
  name: string;
  size?: number;
  className?: string;
};

export default function CompanyLogo({ id, name, size = 32, className = "" }: Props) {
  const [failed, setFailed] = useState(false);

  const base = `flex-shrink-0 rounded-lg overflow-hidden ${className}`;

  if (!failed) {
    return (
      <img
        src={`/api/logos/${id}`}
        alt={`${name} logo`}
        width={size}
        height={size}
        loading="lazy"
        style={{ width: size, height: size }}
        className={`${base} object-contain bg-white p-0.5`}
        onError={() => setFailed(true)}
      />
    );
  }

  const initials = getInitials(name);
  const color = pickColor(name);

  return (
    <div
      role="img"
      aria-label={`${name} logo`}
      style={{
        width: size,
        height: size,
        backgroundColor: `${color}22`,
        color,
        fontSize: size < 32 ? 10 : 13,
      }}
      className={`${base} flex items-center justify-center font-semibold`}
    >
      {initials}
    </div>
  );
}
