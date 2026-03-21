import { useState } from "react";

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function getDomain(website: string) {
  try {
    return new URL(website).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function formatLogoId(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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

type Stage = "direct" | "logohub" | "favicon" | "initials";

type Props = {
  name: string;
  website?: string | null;
  logoUrl?: string | null;
  size?: number;
  className?: string;
};

export default function CompanyLogo({ name, website, logoUrl: directUrl, size = 32, className = "" }: Props) {
  const [stage, setStage] = useState<Stage>(directUrl ? "direct" : "logohub");
  const [prevDirectUrl, setPrevDirectUrl] = useState(directUrl);

  if (directUrl !== prevDirectUrl) {
    setPrevDirectUrl(directUrl);
    setStage(directUrl ? "direct" : "logohub");
  }

  const domain = website ? getDomain(website) : null;
  const initials = getInitials(name);
  const color = pickColor(name);

  const base = `flex-shrink-0 rounded-lg overflow-hidden ${className}`;

  function handleError() {
    if (stage === "direct") {
      setStage(domain ? "favicon" : "initials");
    } else if (stage === "logohub" && domain) {
      setStage("favicon");
    } else {
      setStage("initials");
    }
  }

  const logoUrl =
    stage === "direct"
      ? directUrl!
      : stage === "logohub"
      ? `https://logohub.dev/api/v1/logos/${formatLogoId(name)}`
      : stage === "favicon" && domain
      ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
      : null;

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={`${name} logo`}
        width={size}
        height={size}
        loading="lazy"
        style={{ width: size, height: size }}
        className={`${base} object-contain bg-white p-0.5`}
        onError={handleError}
      />
    );
  }

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
