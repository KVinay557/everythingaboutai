import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

const axis = { fontSize: 12, fill: 'var(--muted)' };

export function ActivityChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="act" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" tick={axis} interval={4} tickLine={false} axisLine={false} />
        <YAxis allowDecimals={false} tick={axis} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8 }} />
        <Area type="monotone" dataKey="attempts" name="Submissions" stroke="var(--primary)" strokeWidth={2} fill="url(#act)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function CompletionChart({ data, xKey = 'title' }) {
  const rows = data.map((d) => ({ ...d, short: d[xKey].length > 16 ? d[xKey].slice(0, 15) + '…' : d[xKey] }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={rows} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" vertical={false} />
        <XAxis dataKey="short" tick={axis} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 100]} unit="%" tick={axis} tickLine={false} axisLine={false} />
        <Tooltip
          cursor={{ fill: 'var(--hover)' }}
          formatter={(v) => `${v}%`}
          labelFormatter={(_l, p) => p?.[0]?.payload?.[xKey]}
          contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="completionRate" name="Completion" fill="var(--primary)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="avgScore" name="Avg score" fill="var(--accent)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ScoreChart({ data }) {
  const rows = data
    .filter((d) => d.percent !== null)
    .map((d) => ({ name: d.title.length > 14 ? d.title.slice(0, 13) + '…' : d.title, full: d.title, score: d.percent }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={rows} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" vertical={false} />
        <XAxis dataKey="name" tick={axis} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 100]} unit="%" tick={axis} tickLine={false} axisLine={false} />
        <Tooltip
          cursor={{ fill: 'var(--hover)' }}
          formatter={(v) => `${v}%`}
          labelFormatter={(_l, p) => p?.[0]?.payload?.full}
          contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8 }}
        />
        <Bar dataKey="score" name="Score" fill="var(--accent)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
