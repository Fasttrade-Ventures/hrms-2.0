"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartShell } from "./chart-shell";

const COLORS = ["#0f766e", "#2563eb", "#d97706", "#dc2626", "#7c3aed", "#0891b2", "#4b5563"];

export function VerticalBarChart({
  title,
  data,
  dataKey,
  nameKey = "name",
  onSelect,
}: {
  title: string;
  data: Array<Record<string, string | number>>;
  dataKey: string;
  nameKey?: string;
  onSelect?: (segmentKey: string, label: string) => void;
}) {
  const empty = data.length === 0 || data.every((row) => Number(row[dataKey] ?? 0) === 0);
  return (
    <ChartShell empty={empty} title={title}>
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey={nameKey} tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar
            dataKey={dataKey}
            fill={COLORS[0]}
            onClick={(entry) => {
              const payload = entry as unknown as Record<string, string | number>;
              const id = String(payload.id ?? payload[nameKey] ?? "");
              onSelect?.(id, String(payload[nameKey] ?? id));
            }}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

export function HorizontalBarChart({
  title,
  data,
  dataKey,
  nameKey = "name",
  onSelect,
}: {
  title: string;
  data: Array<Record<string, string | number>>;
  dataKey: string;
  nameKey?: string;
  onSelect?: (segmentKey: string, label: string) => void;
}) {
  const empty = data.length === 0 || data.every((row) => Number(row[dataKey] ?? 0) === 0);
  return (
    <ChartShell empty={empty} title={title}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis allowDecimals={false} type="number" tick={{ fontSize: 11 }} />
          <YAxis dataKey={nameKey} type="category" tick={{ fontSize: 11 }} width={100} />
          <Tooltip />
          <Bar
            dataKey={dataKey}
            fill={COLORS[1]}
            onClick={(entry) => {
              const payload = entry as unknown as Record<string, string | number>;
              onSelect?.(String(payload.id ?? payload[nameKey] ?? ""), String(payload[nameKey] ?? ""));
            }}
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

export function DonutChart({
  title,
  data,
  onSelect,
}: {
  title: string;
  data: Array<{ id: string; name: string; count: number }>;
  onSelect?: (segmentKey: string, label: string) => void;
}) {
  const empty = data.length === 0 || data.every((row) => row.count === 0);
  return (
    <ChartShell empty={empty} title={title}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            cx="50%"
            cy="50%"
            data={data}
            dataKey="count"
            innerRadius={55}
            nameKey="name"
            onClick={(entry) => {
              const payload = entry as unknown as { id?: string; name?: string };
              onSelect?.(String(payload.id ?? ""), String(payload.name ?? ""));
            }}
            outerRadius={90}
          >
            {data.map((entry, index) => (
              <Cell fill={COLORS[index % COLORS.length]} key={entry.id} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

export function DualLineChart({
  title,
  data,
  leftKey,
  rightKey,
  onSelect,
}: {
  title: string;
  data: Array<Record<string, string | number>>;
  leftKey: string;
  rightKey: string;
  onSelect?: (segmentKey: string, label: string) => void;
}) {
  const empty =
    data.length === 0 ||
    data.every((row) => Number(row[leftKey] ?? 0) === 0 && Number(row[rightKey] ?? 0) === 0);
  return (
    <ChartShell empty={empty} title={title}>
      <ResponsiveContainer>
        <LineChart
          data={data}
          onClick={(state) => {
            const label = String(state?.activeLabel ?? "");
            if (label) onSelect?.(`${leftKey}:${label}`, label);
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend />
          <Line dataKey={leftKey} stroke={COLORS[0]} strokeWidth={2} type="monotone" />
          <Line dataKey={rightKey} stroke={COLORS[2]} strokeWidth={2} type="monotone" />
        </LineChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

export function SingleBarChart({
  title,
  data,
  dataKey,
  onSelect,
}: {
  title: string;
  data: Array<Record<string, string | number>>;
  dataKey: string;
  onSelect?: (segmentKey: string, label: string) => void;
}) {
  const empty = data.length === 0 || data.every((row) => Number(row[dataKey] ?? 0) === 0);
  return (
    <ChartShell empty={empty} title={title}>
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar
            dataKey={dataKey}
            fill={COLORS[3]}
            onClick={(entry) => {
              const payload = entry as unknown as Record<string, string | number>;
              onSelect?.(String(payload.month ?? ""), String(payload.month ?? ""));
            }}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

export function StackedLikeBarChart({
  title,
  data,
  onSelect,
}: {
  title: string;
  data: Array<{ name: string; value: number }>;
  onSelect?: (segmentKey: string, label: string) => void;
}) {
  const empty = data.length === 0;
  return (
    <ChartShell empty={empty} title={title}>
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar
            dataKey="value"
            fill={COLORS[4]}
            onClick={(entry) => {
              const payload = entry as unknown as { name?: string };
              onSelect?.(String(payload.name ?? ""), String(payload.name ?? ""));
            }}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}
