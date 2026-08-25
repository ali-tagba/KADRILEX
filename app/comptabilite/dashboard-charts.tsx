"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function DashboardCharts({ data }: { data: any[] }) {
  return (
    <div className="h-[300px] w-full flex flex-col">
      <div className="flex items-center gap-4 justify-end pr-6 mb-1">
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-[#6B7280]">
          <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: '#c8772f' }} />
          Encaissements
        </span>
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-[#6B7280]">
          <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: '#83746b' }} />
          Décaissements
        </span>
      </div>
      <div className="flex-1 min-h-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          barGap={4}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
          <XAxis 
            dataKey="month" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#6B7280', fontSize: 12 }} 
            dy={10} 
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#6B7280', fontSize: 12 }} 
            tickFormatter={(value) => `${value}k`}
            dx={-10}
          />
          <Tooltip 
            cursor={{ fill: '#F3F4F6' }}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
          />
          <Bar dataKey="encaissement" fill="#c8772f" radius={[4, 4, 0, 0]} maxBarSize={40} />
          <Bar dataKey="decaissement" fill="#83746b" radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
