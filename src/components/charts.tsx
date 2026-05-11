import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const FOREST_500 = "#6B8E23";
const COPPER_500 = "#C97B4B";
const COPPER_300 = "#E8B894";

/** Verlaufs-Linie (Score über Zeit) */
export function ScoreLineChart({
  data,
}: {
  data: Array<{ label: string; score: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="copperGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COPPER_500} stopOpacity={0.4} />
            <stop offset="95%" stopColor={COPPER_500} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E6ECD9" />
        <XAxis dataKey="label" stroke="#4F6B1A" tick={{ fontSize: 11 }} />
        <YAxis stroke="#4F6B1A" tick={{ fontSize: 11 }} width={36} />
        <Tooltip
          contentStyle={{
            background: "#FFFFFF",
            border: "1px solid #E6ECD9",
            borderRadius: 12,
            fontSize: 13,
          }}
          labelStyle={{ color: "#2C3D0E", fontWeight: 600 }}
        />
        <Area type="monotone" dataKey="score" stroke={COPPER_500} fill="url(#copperGrad)" strokeWidth={2.5} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Stations-Verlauf innerhalb eines Trainings */
export function StationSparkline({
  data,
}: {
  data: Array<{ station: number; score: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={120}>
      <LineChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
        <XAxis dataKey="station" stroke="#4F6B1A" tick={{ fontSize: 10 }} />
        <YAxis hide />
        <Tooltip
          contentStyle={{ background: "#FFFFFF", border: "1px solid #E6ECD9", borderRadius: 8, fontSize: 12 }}
          formatter={((v: unknown) => [`${v} Pkt`, "Score"]) as never}
        />
        <Line type="monotone" dataKey="score" stroke={COPPER_500} strokeWidth={2} dot={{ fill: COPPER_500, r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Zonen-Verteilungs-Bars mit semantischen Farben */
const ZONE_COLORS: Record<string, string> = {
  X: "#D4A547",
  inner: "#E8B894",
  outer: "#B5C58A",
  body: "#8C9988",
  miss: "#5C5247",
  "6": "#D4A547",
  "5": "#D4A547",
  "4": "#1F2418",
  "3": "#1F2418",
  "2": "#E6ECD9",
  "1": "#E6ECD9",
  vital: "#D4A547",
  wound: "#B5C58A",
};

export function ZoneDistributionBars({
  data,
}: {
  data: Array<{ zone: string; count: number; pct?: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 32)}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 10, left: 30, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E6ECD9" />
        <XAxis type="number" stroke="#4F6B1A" tick={{ fontSize: 11 }} />
        <YAxis dataKey="zone" type="category" stroke="#4F6B1A" tick={{ fontSize: 12, fontWeight: 600 }} width={40} />
        <Tooltip
          contentStyle={{ background: "#FFFFFF", border: "1px solid #E6ECD9", borderRadius: 12, fontSize: 13 }}
          formatter={((v: unknown, _name: unknown, ctx: { payload?: { pct?: number } }) => {
            const p = ctx?.payload?.pct;
            return p !== undefined ? [`${v} Treffer (${(p * 100).toFixed(0)} %)`, "Anzahl"] : [`${v}`, "Anzahl"];
          }) as never}
        />
        <Bar dataKey="count" radius={[0, 6, 6, 0]}>
          {data.map((d) => (
            <Cell key={d.zone} fill={ZONE_COLORS[d.zone] ?? FOREST_500} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Pfeil-Position-Konsistenz */
export function ArrowConsistencyBars({
  data,
}: {
  data: Array<{ arrow: string; avg: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E6ECD9" />
        <XAxis dataKey="arrow" stroke="#4F6B1A" tick={{ fontSize: 12 }} />
        <YAxis stroke="#4F6B1A" tick={{ fontSize: 11 }} width={36} />
        <Tooltip
          contentStyle={{ background: "#FFFFFF", border: "1px solid #E6ECD9", borderRadius: 12, fontSize: 13 }}
          formatter={((v: unknown) => [`Ø ${Number(v).toFixed(2)}`, "Score"]) as never}
        />
        <Bar dataKey="avg" fill={COPPER_300} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
