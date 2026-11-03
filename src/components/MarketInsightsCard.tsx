import { useState } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Calendar, Zap, CheckCircle2, Copy, Check, MessageSquare } from 'lucide-react';
import { MarketInsight, Language } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { TRANSLATIONS } from '../constants';

interface MarketInsightsCardProps {
  insight: MarketInsight;
  lang: Language;
}

export default function MarketInsightsCard({ insight, lang }: MarketInsightsCardProps) {
  const t = TRANSLATIONS[lang];
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(insight.negotiationScript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Clipboard unavailable', e);
    }
  };

  const confidence = Math.round(Math.max(0, Math.min(100, insight.confidenceScore)));
  const trendLabel = t.insight.trend[insight.demandTrend] ?? insight.demandTrend;

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-[2rem] p-6 md:p-8 space-y-8"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full bg-brand-primary text-white text-[10px] font-bold uppercase tracking-widest">
              {insight.crop}
            </span>
            <div className="flex items-center gap-1 text-xs font-bold text-brand-primary">
              <Zap size={14} className="text-brand-accent fill-brand-accent" />
              <span>{t.confidence}: {confidence}%</span>
            </div>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-brand-secondary tracking-tight">{t.insight.title}</h2>
        </div>

        <div className="w-16 h-16 shrink-0 rounded-3xl bg-brand-light border-4 border-brand-primary/10 flex flex-col items-center justify-center">
          <span className="text-[10px] font-bold text-brand-primary uppercase leading-none">{t.insight.day}</span>
          <span className="text-xl font-black text-brand-secondary">{insight.bestSellingDay.slice(0, 3)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 bg-brand-primary rounded-[1.5rem] text-white space-y-2 relative overflow-hidden">
          <TrendingUp className="absolute -right-4 -bottom-4 w-24 h-24 text-white/10" />
          <p className="text-xs font-bold uppercase tracking-widest text-white/60">{t.insight.targetRange}</p>
          <p className="text-2xl md:text-3xl font-black italic">
            {formatCurrency(insight.fairPriceRange.min)} – {formatCurrency(insight.fairPriceRange.max)}
          </p>
          <div className="flex items-center gap-2 text-xs font-semibold bg-white/10 w-fit px-3 py-1 rounded-full">
            <div className={cn('w-2 h-2 rounded-full animate-pulse',
              insight.demandTrend === 'increasing' ? 'bg-green-400' :
              insight.demandTrend === 'decreasing' ? 'bg-red-400' : 'bg-yellow-400'
            )} />
            <span>{t.insight.demand}: {trendLabel}</span>
          </div>
        </div>

        <div className="p-6 bg-brand-secondary rounded-[1.5rem] text-white space-y-2 relative overflow-hidden">
          <Calendar className="absolute -right-4 -bottom-4 w-24 h-24 text-white/5" />
          <p className="text-xs font-bold uppercase tracking-widest text-white/60">{t.sellingWindow}</p>
          <p className="text-2xl font-bold tracking-tight">{insight.bestSellingDay}, {t.insight.thisWeek}</p>
          <p className="text-xs text-white/50 font-medium">{t.insight.morningRush}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-accent/20 flex items-center justify-center text-brand-accent">
            <MessageSquare size={20} />
          </div>
          <h3 className="font-bold text-lg text-brand-secondary">{t.insight.script}</h3>
        </div>

        <div className="relative">
          <blockquote className="p-6 pr-16 bg-white/50 border border-brand-primary/10 rounded-3xl italic text-brand-secondary/80 leading-relaxed whitespace-pre-line">
            “{insight.negotiationScript}”
          </blockquote>
          <button
            onClick={handleCopy}
            title={copied ? t.insight.copied : t.insight.copy}
            aria-label={copied ? t.insight.copied : t.insight.copy}
            className={cn(
              'absolute top-4 right-4 p-2 rounded-xl border transition-all shadow-sm',
              copied
                ? 'bg-brand-primary text-white border-brand-primary'
                : 'bg-white border-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-white'
            )}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>
      </div>

      <div className="p-6 bg-brand-light rounded-3xl border border-brand-primary/5 flex gap-4 items-start">
        <CheckCircle2 className="text-brand-primary mt-1 shrink-0" size={20} />
        <div>
          <h4 className="font-bold text-sm uppercase tracking-widest text-brand-primary mb-1">{t.insight.advice}</h4>
          <p className="text-sm text-brand-secondary/70 leading-relaxed font-semibold">{insight.advice}</p>
        </div>
      </div>
    </motion.article>
  );
}
