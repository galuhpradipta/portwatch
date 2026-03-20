import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { HeadcountSnapshot } from "../../shared/types.ts";

function formatYAxis(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
  return String(value);
}

export default function HeadcountChart({ snapshots }: { snapshots: HeadcountSnapshot[] }) {
  if (snapshots.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-white/30 text-sm">
        No headcount data available
      </div>
    );
  }

  const data = snapshots.map((s) => ({
    month: s.recordedAt,
    headcount: s.headcount,
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis
          dataKey="month"
          tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tickFormatter={formatYAxis}
          tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip
          contentStyle={{
            background: "#1a1a24",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "8px",
            color: "#fff",
            fontSize: 12,
          }}
          formatter={(value) => [(value as number).toLocaleString(), "Headcount"]}
        />
        <Line
          type="monotone"
          dataKey="headcount"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
