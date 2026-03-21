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
      <div className="h-48 flex items-center justify-center text-app-text-dim text-sm">
        No headcount data available
      </div>
    );
  }

  const data = snapshots.map((s) => ({
    month: s.recordedAt,
    headcount: s.headcount,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
        <XAxis
          dataKey="month"
          tick={{ fill: "#5f6878", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tickFormatter={formatYAxis}
          tick={{ fill: "#5f6878", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip
          contentStyle={{
            background: "#ffffff",
            border: "1px solid #d8dce6",
            borderRadius: "8px",
            color: "#1a1d27",
            fontSize: 12,
          }}
          formatter={(value) => [(value as number).toLocaleString(), "Headcount"]}
        />
        <Line
          type="monotone"
          dataKey="headcount"
          stroke="#2563eb"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
