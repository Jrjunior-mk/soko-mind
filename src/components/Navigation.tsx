import { LayoutDashboard, TrendingUp, Sprout, MessageSquare } from 'lucide-react';
import { cn } from '../lib/utils';
import { Language, Tab } from '../types';
import { TRANSLATIONS } from '../constants';
import { hasApiKey } from '../services/gemini';

interface NavigationProps {
  currentTab: Tab;
  setTab: (tab: Tab) => void;
  lang: Language;
  mobile?: boolean;
}

export default function Navigation({ currentTab, setTab, lang, mobile }: NavigationProps) {
  const t = TRANSLATIONS[lang];
  const aiReady = hasApiKey();

  const items: { id: Tab; icon: typeof LayoutDashboard; label: string }[] = [
    { id: 'dashboard', icon: LayoutDashboard, label: t.nav.dashboard },
    { id: 'market', icon: TrendingUp, label: t.nav.market },
    { id: 'crops', icon: Sprout, label: t.nav.crops },
    { id: 'sim', icon: MessageSquare, label: t.nav.sim },
  ];

  if (mobile) {
    return (
      <nav className="fixed bottom-0 inset-x-0 glass-dark z-50 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-center justify-around md:hidden">
        {items.map(({ id, icon: Icon, label }) => {
          const isActive = currentTab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all min-w-16',
                isActive ? 'text-brand-accent' : 'text-white/60 hover:text-white'
              )}
            >
              <Icon size={20} />
              <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
            </button>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="hidden md:flex flex-col gap-4 w-64 shrink-0 p-6 glass h-screen sticky top-0 z-30">
      <div className="flex items-center gap-3 mb-8 px-2">
        <div className="w-10 h-10 rounded-xl bg-brand-primary flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-brand-primary/20">
          S
        </div>
        <div>
          <h1 className="font-bold text-xl tracking-tight leading-none text-brand-secondary">Soko Mind</h1>
          <p className="text-[10px] uppercase font-bold tracking-widest text-brand-primary/70 mt-1">{t.tagline}</p>
        </div>
      </div>

      <div className="space-y-2">
        {items.map(({ id, icon: Icon, label }) => {
          const isActive = currentTab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all group',
                isActive
                  ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20'
                  : 'text-brand-secondary/60 hover:bg-brand-primary/10 hover:text-brand-primary'
              )}
            >
              <Icon size={20} className={cn('transition-transform group-active:scale-90', isActive && 'text-brand-accent')} />
              <span className="font-semibold text-sm">{label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-auto">
        <div className="p-4 bg-brand-earth/10 rounded-3xl border border-brand-earth/20">
          <p className="text-xs font-bold text-brand-earth uppercase tracking-widest mb-1">{t.status}</p>
          <div className="flex items-center gap-2">
            <div className={cn('w-2 h-2 rounded-full', aiReady ? 'bg-green-500 animate-pulse' : 'bg-brand-accent')} />
            <span className="text-xs font-semibold">{aiReady ? t.online : t.offline}</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
