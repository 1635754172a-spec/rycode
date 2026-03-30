import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

interface ChartDataPoint {
  date: string;
  score: number;
}

interface StatsChartProps {
  data?: ChartDataPoint[];
}

const DEFAULT_DATA = [
  { name: 'MON', value: 0 },
  { name: 'TUE', value: 0 },
  { name: 'WED', value: 0 },
  { name: 'THU', value: 0 },
  { name: 'FRI', value: 0 },
  { name: 'SAT', value: 0 },
  { name: 'SUN', value: 0 },
];

const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/** Build a 7-day scaffold (last 7 days in order) and fill in real scores */
function buildChartData(data?: ChartDataPoint[]) {
  // Generate last 7 days as date strings YYYY-MM-DD
  const days: { date: string; name: string; value: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    days.push({ date: dateStr, name: DAY_LABELS[d.getDay()], value: 0 });
  }
  // Fill in real scores
  if (data && data.length > 0) {
    for (const point of data) {
      const slot = days.find(d => d.date === point.date);
      if (slot) slot.value = Math.max(slot.value, point.score ?? 0);
    }
  }
  return days;
}

export const StatsChart: React.FC<StatsChartProps> = ({ data }) => {
  const chartData = buildChartData(data);

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
          <Tooltip
            cursor={{ fill: 'rgba(31, 43, 73, 0.4)' }}
            contentStyle={{
              backgroundColor: '#1f2b49',
              border: 'none',
              borderRadius: '8px',
              fontSize: '10px',
              color: '#dee5ff'
            }}
          />
          <Bar dataKey="value" radius={[2, 2, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.value > 80 ? '#a3a6ff' : entry.value > 50 ? '#6063ee99' : entry.value > 0 ? '#3d42b8' : '#192540'}
              />
            ))}
          </Bar>
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#a3aac4', fontSize: 10, fontFamily: 'monospace' }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
