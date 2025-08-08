"use client";

import { useChartData } from "@/lib/useChartData";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type SummaryStat = {
  label: string;
  value: string;
};

type ChartData = {
  name: string;
  value: number; // duration in minutes or seconds
  color: string;
};

interface Props {
  summary: SummaryStat[];
  focusAreaData: ChartData[];
  activityTypeData: ChartData[];
  userId: string;
}

export function StatsWithCharts({
  summary,
  focusAreaData,
  activityTypeData,
  userId,
}: Props) {

  const { data: stats } = useChartData(userId);
  console.log("stats:", stats);

  return (
    <div className="mt-6 space-y-8">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
        {summary.map((stat, idx) => (
          <div key={idx} className="bg-white/5 rounded-lg p-3">
            <p className="text-gray-400 text-sm">{stat.label}</p>
            <p className="text-lg font-semibold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
        <ChartBlock title="Focus Areas" data={focusAreaData} />
        <ChartBlock title="Activity Types" data={activityTypeData} />
      </div>
    </div>
  );
}

function ChartBlock({ title, data }: { title: string; data: ChartData[] }) {
  // Ensure all values are numbers
  const normalizedData = data.map((d) => ({
    ...d,
    value: Number(d.value) || 0,
  }));

  // Calculate total once
  const total = normalizedData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="bg-white/5 rounded-lg p-4">
      <h3 className="text-center font-medium mb-4">{title}</h3>
      <div className="h-64">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={normalizedData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius="80%"
              fill="#8884d8"
              dataKey="value"
              label={({ name, value }) => {
                const percent = total > 0 ? (value! / total) * 100 : 0;
                return `${name} ${percent.toFixed(0)}%`;
              }}
            >
              {normalizedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => formatDuration(Number(value))} />
            <Legend
            
              formatter={(value) => {
                const found = normalizedData.find((d) => d.name === value);
                return `${value} (${formatDuration(found?.value || 0)})`;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}


function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}
