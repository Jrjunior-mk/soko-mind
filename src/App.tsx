import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, CloudRain, Sun, Zap, TrendingUp, AlertCircle, ArrowUpRight, Camera, Upload, X, KeyRound } from 'lucide-react';
import { Language, MarketInsight, CropDiagnosis, Tab } from './types';
import { TRANSLATIONS, MOCK_COUNTIES } from './constants';
import { cn, formatCurrency, readFileAsDataUrl } from './lib/utils';
import Navigation from './components/Navigation';
import VoiceInteraction from './components/VoiceInteraction';
import MarketInsightsCard from './components/MarketInsightsCard';
import KenyaHeatmap from './components/KenyaHeatmap';
import PredictiveChart from './components/PredictiveChart';
import CropDoctorModal from './components/CropDoctorModal';
import NegotiationSim from './components/NegotiationSim';
import { GeminiService, describeError, hasApiKey } from './services/gemini';
import { VoiceService, speechLangFor } from './services/voice';

const LANGUAGES: Language[] = ['en', 'sw', 'sheng'];
const LANGUAGE_LABELS: Record<Language, string> = { en: 'EN', sw: 'SW', sheng: 'Sh' };

const pageMotion = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.2 },
};

export default function App() {
  const [lang, setLang] = useState<Language>('en');
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [insight, setInsight] = useState<MarketInsight | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [diagnosis, setDiagnosis] = useState<CropDiagnosis | null>(null);
  const [diagnosisLoading, setDiagnosisLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAIPresenting, setIsAIPresenting] = useState(false);
  const [keyBannerDismissed, setKeyBannerDismissed] = useState(false);
  // Lets us ignore a diagnosis that arrives after the farmer closed the modal.
  const diagnosisRequest = useRef(0);

  const t = TRANSLATIONS[lang];
  const aiReady = hasApiKey();

  const changeTab = (tab: Tab) => {
    VoiceService.stop();
    setIsAIPresenting(false);
    setActiveTab(tab);
  };

  const handleQuery = useCallback(async (query: string) => {
    setInsightLoading(true);
    setInsight(null);
    setError(null);
    setActiveTab('dashboard');
    try {
      const result = await GeminiService.negotiateMarket(query, lang);
      setInsight(result);

      const presentation = `${result.crop}: ${result.advice}. ${formatCurrency(result.fairPriceRange.min)} - ${formatCurrency(result.fairPriceRange.max)}.`;
      setIsAIPresenting(true);
      VoiceService.speak(presentation, speechLangFor(lang), () => setIsAIPresenting(false));

      setTimeout(() => {
        document.getElementById('insight-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    } catch (e) {
      console.error(e);
      setError(describeError(e));
    } finally {
      setInsightLoading(false);
    }
  }, [lang]);

  const handleImageCapture = useCallback(async (dataUrl: string) => {
    const requestId = ++diagnosisRequest.current;
    setDiagnosis(null);
    setDiagnosisLoading(true);
    setError(null);
    setActiveTab('crops');
    try {
      const result = await GeminiService.diagnoseCrop(dataUrl, lang);
      if (requestId === diagnosisRequest.current) setDiagnosis(result);
    } catch (e) {
      console.error(e);
      if (requestId === diagnosisRequest.current) setError(describeError(e));
    } finally {
      if (requestId === diagnosisRequest.current) setDiagnosisLoading(false);
    }
  }, [lang]);

  const closeDiagnosis = useCallback(() => {
    diagnosisRequest.current++;
    setDiagnosis(null);
    setDiagnosisLoading(false);
  }, []);

  const onFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow the same photo to be picked again
    if (file) handleImageCapture(await readFileAsDataUrl(file));
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-brand-light font-sans">
      <Navigation currentTab={activeTab} setTab={changeTab} lang={lang} />
      <Navigation currentTab={activeTab} setTab={changeTab} lang={lang} mobile />

      <main className="flex-1 min-w-0 flex flex-col pb-24 md:pb-8 relative z-10">
        {/* Top Header */}
        <header className="h-16 md:h-20 lg:h-24 px-4 md:px-6 lg:px-12 flex items-center justify-between gap-3 sticky top-0 z-40 glass">
          <div className="flex items-center gap-3 min-w-0">
            <div className="md:hidden w-9 h-9 shrink-0 rounded-xl bg-brand-primary flex items-center justify-center text-white font-bold">S</div>
            <div className="min-w-0">
              <h2 className="text-xs md:text-sm font-black text-brand-primary uppercase tracking-[0.2em] truncate">{t.welcome}</h2>
              <p className="hidden sm:block text-[10px] md:text-xs font-bold text-brand-secondary/40 uppercase tracking-widest leading-none mt-1 truncate">{t.lastSync}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-4 shrink-0">
            <div className="bg-white/60 p-1 rounded-2xl flex items-center gap-1 border border-brand-primary/5" role="group" aria-label="Language">
              {LANGUAGES.map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  aria-pressed={lang === l}
                  title={l === 'en' ? 'English' : l === 'sw' ? 'Kiswahili' : 'Sheng'}
                  className={cn(
                    'px-2.5 lg:px-3 py-1.5 rounded-xl text-[10px] lg:text-xs font-bold uppercase tracking-widest transition-all',
                    lang === l ? 'bg-brand-primary text-white shadow-md' : 'text-brand-secondary/50 hover:text-brand-primary'
                  )}
                >
                  {LANGUAGE_LABELS[l]}
                </button>
              ))}
            </div>

            <button aria-label="Notifications" className="hidden sm:flex w-10 h-10 lg:w-12 lg:h-12 rounded-2xl bg-white/60 items-center justify-center text-brand-secondary hover:bg-white transition-all relative">
              <Bell size={20} />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-brand-accent ring-2 ring-white" />
            </button>

            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-2xl bg-brand-secondary flex items-center justify-center text-white font-black text-sm border-2 border-brand-primary/10" aria-label="Profile">
              FK
            </div>
          </div>
        </header>

        <div className="flex-1 px-4 md:px-6 lg:px-12 py-6 md:py-8 max-w-7xl mx-auto w-full space-y-6">
          {/* Setup / error banners */}
          {!aiReady && !keyBannerDismissed && (
            <Banner tone="info" icon={<KeyRound size={18} />} onClose={() => setKeyBannerDismissed(true)} closeLabel={t.dismiss}>
              <strong>{t.offline}.</strong> Add <code className="px-1.5 py-0.5 rounded bg-white/70 font-mono text-xs">GEMINI_API_KEY</code> to a <code className="px-1.5 py-0.5 rounded bg-white/70 font-mono text-xs">.env.local</code> file and restart the dev server to enable AI answers, crop scans, and the negotiation sim.
            </Banner>
          )}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <Banner tone="error" icon={<AlertCircle size={18} />} onClose={() => setError(null)} closeLabel={t.dismiss}>
                  <strong>{t.errorTitle}:</strong> {error}
                </Banner>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div key="dashboard" {...pageMotion} className="space-y-10 md:space-y-12">
                <VoiceInteraction
                  onQuery={handleQuery}
                  lang={lang}
                  onImageCapture={handleImageCapture}
                  isAIPresenting={isAIPresenting}
                  busy={insightLoading}
                />

                {/* Quick Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  <InfoTile
                    icon={<Sun size={30} />}
                    iconClass="bg-brand-accent/20 text-brand-accent"
                    label={t.weather}
                    title={t.weatherValue}
                    sub={t.location}
                    subClass="text-brand-secondary/40"
                    decor={<CloudRain className="absolute -right-4 -bottom-4 w-20 h-20 text-brand-primary/5 rotate-12" />}
                  />
                  <InfoTile
                    icon={<Zap size={30} />}
                    iconClass="bg-brand-primary/20 text-brand-primary"
                    label={t.smartAlerts}
                    title={t.priceSpike}
                    sub={t.nairobiMkt}
                    subClass="text-green-600"
                    decor={<TrendingUp className="absolute -right-4 -bottom-4 w-20 h-20 text-brand-primary/5 rotate-12" />}
                  />
                  <InfoTile
                    icon={<AlertCircle size={30} />}
                    iconClass="bg-red-400/20 text-red-500"
                    label={t.riskWarning}
                    labelClass="text-red-600"
                    title={t.armyworm}
                    sub={t.kiambuCentral}
                    subClass="text-red-500"
                    className="md:col-span-2 lg:col-span-1"
                  />
                </div>

                {/* AI Result Section */}
                {insightLoading && (
                  <div className="py-16 flex flex-col items-center justify-center gap-6" role="status">
                    <div className="w-16 h-16 border-4 border-brand-primary/10 border-t-brand-primary rounded-full animate-spin" />
                    <div className="text-center space-y-2">
                      <p className="text-lg md:text-xl font-bold text-brand-secondary animate-pulse italic">{t.connecting}</p>
                      <p className="text-xs font-bold uppercase tracking-widest text-brand-primary/50">{t.fetching}</p>
                    </div>
                  </div>
                )}

                {insight && (
                  <div id="insight-result" className="scroll-mt-28">
                    <MarketInsightsCard insight={insight} lang={lang} />
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 md:gap-8">
                  <div className="lg:col-span-3">
                    <PredictiveChart lang={lang} />
                  </div>
                  <div className="lg:col-span-2 glass rounded-[2rem] p-6 md:p-8 flex flex-col justify-center relative overflow-hidden">
                    <ArrowUpRight size={48} className="absolute top-6 right-6 text-brand-primary/10" />
                    <h3 className="text-2xl md:text-3xl font-black text-brand-secondary leading-tight mb-4 tracking-tighter pr-12">{t.knowledgeBase}</h3>
                    <p className="text-brand-secondary/60 font-medium leading-relaxed mb-8">{t.knowledgeDesc}</p>
                    <button
                      onClick={() => handleQuery(t.knowledgeDesc)}
                      disabled={insightLoading}
                      className="w-full py-4 bg-brand-secondary text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-brand-primary transition-all disabled:opacity-50"
                    >
                      {t.readReport}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'market' && (
              <motion.div key="market" {...pageMotion} className="space-y-6 md:space-y-8">
                <section className="lg:h-[600px]">
                  <KenyaHeatmap lang={lang} />
                </section>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                  {['nairobi', 'mombasa', 'nakuru'].map((id) => {
                    const county = MOCK_COUNTIES.find((c) => c.id === id)!;
                    const high = county.demand >= county.supply;
                    return (
                      <div key={id} className="glass p-6 rounded-[2rem]">
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-2">{county.name} {t.hubs.hub}</p>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-2xl font-black italic">{formatCurrency(county.avgPrice)}</span>
                          <span className={cn(
                            'px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap',
                            high ? 'bg-green-500' : 'bg-red-400'
                          )}>
                            {high ? t.hubs.high : t.hubs.low}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {activeTab === 'sim' && (
              <motion.div key="sim" {...pageMotion} className="max-w-4xl mx-auto w-full md:pt-4">
                <NegotiationSim lang={lang} />
              </motion.div>
            )}

            {activeTab === 'crops' && (
              <motion.div key="crops" {...pageMotion} className="max-w-4xl mx-auto w-full text-center py-10 md:py-20 space-y-10 md:space-y-12">
                <div className="w-40 h-40 md:w-48 md:h-48 rounded-[3rem] bg-brand-primary/10 mx-auto flex items-center justify-center text-brand-primary relative">
                  <div className="absolute inset-0 rounded-[3rem] border-4 border-brand-primary/20 animate-pulse" />
                  <Camera size={64} strokeWidth={1.5} />
                </div>

                <div className="space-y-4">
                  <h2 className="text-3xl md:text-4xl font-black text-brand-secondary tracking-tighter">{t.readyScan}</h2>
                  <p className="text-brand-secondary/60 max-w-sm mx-auto font-medium">{t.scanDesc}</p>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                  <label className="w-full md:w-auto px-10 py-5 bg-brand-secondary text-white rounded-[2rem] font-bold text-lg hover:scale-105 transition-all shadow-xl shadow-brand-secondary/20 flex items-center justify-center gap-3 cursor-pointer">
                    <Camera /> {t.openCamera}
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onFilePicked} />
                  </label>
                  <label className="w-full md:w-auto px-10 py-5 bg-white text-brand-secondary border border-brand-primary/10 rounded-[2rem] font-bold text-lg hover:bg-brand-primary/5 transition-all flex items-center justify-center gap-3 cursor-pointer">
                    <Upload /> {t.uploadFile}
                    <input type="file" accept="image/*" className="hidden" onChange={onFilePicked} />
                  </label>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <CropDoctorModal diagnosis={diagnosis} onClose={closeDiagnosis} lang={lang} loading={diagnosisLoading} />
      </main>

      {/* Background Decor */}
      <div className="fixed -top-24 -left-24 w-96 h-96 rounded-full bg-brand-primary/10 blur-[120px] pointer-events-none" />
      <div className="fixed -bottom-24 -right-24 w-96 h-96 rounded-full bg-brand-accent/10 blur-[120px] pointer-events-none" />
    </div>
  );
}

function InfoTile({ icon, iconClass, label, labelClass, title, sub, subClass, decor, className }: {
  icon: React.ReactNode;
  iconClass: string;
  label: string;
  labelClass?: string;
  title: string;
  sub: string;
  subClass?: string;
  decor?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('glass rounded-[2rem] p-5 md:p-6 flex items-center gap-5 relative overflow-hidden group', className)}>
      <div className={cn('w-14 h-14 md:w-16 md:h-16 shrink-0 rounded-[1.25rem] flex items-center justify-center transition-transform group-hover:scale-110', iconClass)}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className={cn('text-[10px] font-bold uppercase tracking-[0.2em] text-brand-primary/70', labelClass)}>{label}</p>
        <h4 className="text-lg md:text-xl font-black text-brand-secondary leading-tight mt-1">{title}</h4>
        <p className={cn('text-xs font-semibold mt-1 uppercase tracking-tight', subClass)}>{sub}</p>
      </div>
      {decor}
    </div>
  );
}

function Banner({ tone, icon, children, onClose, closeLabel }: {
  tone: 'info' | 'error';
  icon: React.ReactNode;
  children: React.ReactNode;
  onClose: () => void;
  closeLabel: string;
}) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-3 p-4 rounded-2xl border text-sm leading-relaxed',
        tone === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-amber-50 border-amber-200 text-amber-900'
      )}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="flex-1">{children}</div>
      <button onClick={onClose} aria-label={closeLabel} className="shrink-0 p-1 rounded-lg hover:bg-black/5">
        <X size={16} />
      </button>
    </div>
  );
}
