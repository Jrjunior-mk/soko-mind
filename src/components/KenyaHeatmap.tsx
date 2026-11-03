import { useState } from 'react';
import { motion } from 'motion/react';
import { MapPin, TrendingUp } from 'lucide-react';
import { KENYA_OUTLINE, MOCK_COUNTIES, TRANSLATIONS } from '../constants';
import { formatCurrency, cn } from '../lib/utils';
import { CountyData, Language } from '../types';

function demandColor(demand: number) {
  if (demand > 80) return 'fill-green-500';
  if (demand > 60) return 'fill-green-300';
  if (demand > 40) return 'fill-yellow-400';
  return 'fill-red-400';
}

export default function KenyaHeatmap({ lang }: { lang: Language }) {
  const [activeCounty, setActiveCounty] = useState<CountyData>(MOCK_COUNTIES[0]);
  const t = TRANSLATIONS[lang].heatmap;

  return (
    <div className="glass rounded-[2rem] p-6 md:p-8 h-full flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h3 className="font-bold text-sm uppercase tracking-widest text-brand-primary leading-none mb-1">{t.title}</h3>
          <p className="text-2xl font-bold tracking-tight text-brand-secondary">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <span>{t.low}</span>
          </div>
          <div className="w-10 h-2 rounded-full bg-gradient-to-r from-red-400 via-yellow-400 to-green-500" />
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>{t.high}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 lg:gap-8 min-h-0">
        <div className="flex-1 relative min-h-[360px] bg-brand-primary/5 rounded-3xl border border-brand-primary/5 overflow-hidden">
          <svg viewBox="0 0 400 500" className="absolute inset-0 w-full h-full p-6" role="img" aria-label={t.title}>
            <path d={KENYA_OUTLINE} className="fill-brand-secondary/5 stroke-brand-secondary/20" strokeWidth={1.5} strokeLinejoin="round" />
            {MOCK_COUNTIES.map((county) => {
              const isSelected = activeCounty.id === county.id;
              return (
                <g
                  key={county.id}
                  className="cursor-pointer outline-none"
                  tabIndex={0}
                  role="button"
                  aria-label={county.name}
                  aria-pressed={isSelected}
                  onClick={() => setActiveCounty(county)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setActiveCounty(county)}
                >
                  {isSelected && (
                    <circle cx={county.x} cy={county.y} r={22} className={cn(demandColor(county.demand), 'opacity-25 animate-pulse')} />
                  )}
                  <motion.circle
                    cx={county.x}
                    cy={county.y}
                    className={cn(demandColor(county.demand), 'stroke-white')}
                    strokeWidth={isSelected ? 3 : 2}
                    initial={{ r: 0 }}
                    animate={{ r: isSelected ? 13 : 8 }}
                    whileHover={{ r: 12 }}
                  />
                  <text
                    x={county.x}
                    y={county.y - (isSelected ? 22 : 15)}
                    textAnchor="middle"
                    className={cn('text-[11px] font-bold fill-brand-secondary pointer-events-none select-none', !isSelected && 'opacity-50')}
                  >
                    {county.name}
                  </text>
                </g>
              );
            })}
          </svg>

          <div className="absolute bottom-4 left-4 glass p-4 rounded-2xl">
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-1">{t.active}</p>
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-brand-primary" />
              <span className="font-bold text-sm">{activeCounty.name}</span>
            </div>
          </div>
          <p className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-widest text-brand-secondary/40">{t.hint}</p>
        </div>

        <div className="w-full lg:w-56 grid grid-cols-2 lg:grid-cols-1 gap-4 content-start">
          <StatBar label={t.demand} value={activeCounty.demand} barClass="bg-green-500" />
          <StatBar label={t.supply} value={activeCounty.supply} barClass="bg-red-400" />

          <div className="col-span-2 lg:col-span-1 p-4 rounded-2xl bg-brand-secondary text-white">
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">{t.avgPrice}</span>
            <p className="text-xl font-black mt-1 italic">{formatCurrency(activeCounty.avgPrice)}</p>
            <div className="flex items-center gap-1 mt-2 text-[10px] font-bold text-green-400">
              <TrendingUp size={12} strokeWidth={3} />
              <span>{t.trend}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBar({ label, value, barClass }: { label: string; value: number; barClass: string }) {
  return (
    <div className="p-4 rounded-2xl bg-white/50 border border-brand-primary/5">
      <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">{label}</span>
      <div className="h-2 w-full bg-brand-primary/10 rounded-full mt-2 overflow-hidden">
        <motion.div className={cn('h-full', barClass)} initial={{ width: 0 }} animate={{ width: `${value}%` }} />
      </div>
      <p className="text-lg font-black mt-1">{value}%</p>
    </div>
  );
}
