import { useEffect, useState } from "react";
import type { LogoStatus } from "../shared/types.ts";

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
  name: string;
  logoStatus: LogoStatus;
  logoSrc: string;
  size?: number;
  className?: string;
  priority?: boolean;
};

export default function CompanyLogo({
  name,
  logoStatus,
  logoSrc,
  size = 32,
  className = "",
  priority = false,
}: Props) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [logoSrc, logoStatus]);

  const base = `flex-shrink-0 rounded-lg overflow-hidden ${className}`;

  if (logoStatus === "ready" && logoSrc && !failed) {
    return (
      <img
        src={logoSrc}
        alt={`${name} logo`}
        width={size}
        height={size}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
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
