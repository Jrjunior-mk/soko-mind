import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { MOCK_PRICES, TRANSLATIONS } from '../constants';
import { Language } from '../types';
import { formatCurrency } from '../lib/utils';

const PRIMARY = '#2d6a4f';

export default function PredictiveChart({ lang }: { lang: Language }) {
  const t = TRANSLATIONS[lang];

  return (
    <div className="w-full h-full min-h-72 glass rounded-[2rem] p-6 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-sm uppercase tracking-widest text-brand-primary">
          {t.predictiveEngine} (KES)
        </h3>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-brand-accent" />
          <span className="text-[10px] font-bold uppercase tracking-tight opacity-60">{t.forecast}</span>
        </div>
      </div>

      <div className="flex-1 min-h-52">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={MOCK_PRICES} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={PRIMARY} stopOpacity={0.3} />
                <stop offset="95%" stopColor={PRIMARY} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={`${PRIMARY}20`} />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              interval={0}
              padding={{ left: 12, right: 12 }}
              tick={{ fontSize: 11, fontWeight: 700, fill: `${PRIMARY}99` }}
            />
            <YAxis hide domain={['dataMin - 400', 'dataMax + 200']} />
            <Tooltip
              formatter={(value) => [formatCurrency(Number(value)), 'Price']}
              cursor={{ stroke: `${PRIMARY}40` }}
              contentStyle={{
                backgroundColor: '#081c15',
                border: 'none',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '12px',
              }}
              itemStyle={{ color: '#fff' }}
              labelStyle={{ color: '#ffffff99' }}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke={PRIMARY}
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorPrice)"
              isAnimationActive={false}
              activeDot={{ r: 5, fill: '#ff9f1c', stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
