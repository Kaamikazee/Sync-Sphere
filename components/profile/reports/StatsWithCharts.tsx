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
  value: number;
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
    <div className="mt-4 space-y-6">
      {/* Summary Stats */}
      <div className="flex gap-3 overflow-x-auto sm:grid sm:grid-cols-4 sm:gap-4 no-scrollbar">
        {summary.map((stat, idx) => (
          <div
            key={idx}
            className="min-w-[120px] sm:min-w-0 bg-white/5 rounded-lg p-3 flex-shrink-0 sm:flex-shrink"
          >
            <p className="text-gray-400 text-xs sm:text-sm">{stat.label}</p>
            <p className="text-base sm:text-lg font-semibold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <ChartBlock title="Focus Areas" data={focusAreaData} />
        <ChartBlock title="Activity Types" data={activityTypeData} />
      </div>
    </div>
  );
}

function ChartBlock({ title, data }: { title: string; data: ChartData[] }) {
  const normalizedData = data.map((d) => ({
    ...d,
    value: Number(d.value) || 0,
  }));

  const total = normalizedData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="bg-white/5 rounded-lg p-4 flex flex-col items-center">
      <h3 className="text-center font-medium mb-3 text-sm sm:text-base">
        {title}
      </h3>
      <div className="w-full h-60 sm:h-72">
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
              wrapperStyle={{ fontSize: "0.75rem" }}
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
  const totalSeconds = Math.round(minutes * 60);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  const hDisplay = h > 0 ? `${h}h ` : "";
  const mDisplay = m > 0 ? `${m}m ` : "";
  const sDisplay = s > 0 ? `${s}s` : "";

  return `${hDisplay}${mDisplay}${sDisplay}`.trim() || "0s";
}
