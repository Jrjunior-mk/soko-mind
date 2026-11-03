import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sprout, AlertCircle, CheckCircle2, FlaskConical, Info } from 'lucide-react';
import { CropDiagnosis, Language } from '../types';
import { TRANSLATIONS } from '../constants';
import { cn } from '../lib/utils';

interface CropDoctorModalProps {
  diagnosis: CropDiagnosis | null;
  onClose: () => void;
  lang: Language;
  loading?: boolean;
}

const SEVERITY_STYLES: Record<CropDiagnosis['severity'], string> = {
  critical: 'bg-red-500 text-white',
  high: 'bg-orange-500 text-white',
  medium: 'bg-yellow-400 text-brand-secondary',
  low: 'bg-green-500 text-white',
};

export default function CropDoctorModal({ diagnosis, onClose, lang, loading }: CropDoctorModalProps) {
  const t = TRANSLATIONS[lang];
  const open = !!diagnosis || !!loading;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const severe = diagnosis && (diagnosis.severity === 'critical' || diagnosis.severity === 'high');

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="crop-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-brand-secondary/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="crop-modal-title"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
          >
            <div className="p-6 md:p-8 flex items-center justify-between border-b border-brand-primary/5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-brand-primary flex items-center justify-center text-white">
                  <Sprout size={24} />
                </div>
                <div>
                  <p className="font-bold text-[10px] uppercase tracking-[0.3em] text-brand-primary leading-none mb-1">
                    {t.cropDoctor}
                  </p>
                  <h2 id="crop-modal-title" className="text-xl md:text-2xl font-black text-brand-secondary">{t.doctor.result}</h2>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label={t.doctor.close}
                className="p-3 rounded-2xl hover:bg-red-500/10 text-brand-secondary transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 md:p-8">
              {!diagnosis ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div className="w-16 h-16 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
                  <p className="font-bold text-brand-primary uppercase tracking-widest text-sm text-center animate-pulse">{t.doctor.analyzing}</p>
                </div>
              ) : (
                <div className="space-y-6 md:space-y-8">
                  <div className={cn('p-6 md:p-8 rounded-[2rem] flex flex-col items-center text-center gap-4', SEVERITY_STYLES[diagnosis.severity])}>
                    <div className="p-4 rounded-full bg-white/20">
                      {severe ? <AlertCircle size={44} /> : <CheckCircle2 size={44} />}
                    </div>
                    <div>
                      <h3 className="text-3xl md:text-4xl font-black tracking-tight mb-3">{diagnosis.condition}</h3>
                      <div className="px-4 py-1 rounded-full bg-white/25 text-[10px] font-bold uppercase tracking-widest w-fit mx-auto">
                        {t.doctor.severity}: {t.doctor.levels[diagnosis.severity] ?? diagnosis.severity}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div className="p-6 bg-brand-light rounded-3xl space-y-2">
                      <div className="flex items-center gap-2 text-brand-primary">
                        <Info size={18} />
                        <span className="font-bold text-xs uppercase tracking-widest">{t.doctor.observations}</span>
                      </div>
                      <p className="text-sm font-medium leading-relaxed text-brand-secondary/80">{diagnosis.description}</p>
                    </div>

                    <div className="p-6 bg-brand-primary/10 border border-brand-primary/10 rounded-3xl space-y-2">
                      <div className="flex items-center gap-2 text-brand-primary">
                        <FlaskConical size={18} />
                        <span className="font-bold text-xs uppercase tracking-widest">{t.doctor.action}</span>
                      </div>
                      <p className="text-sm font-bold leading-relaxed text-brand-primary">{diagnosis.treatment}</p>
                    </div>
                  </div>

                  <div className="flex flex-col-reverse md:flex-row items-center justify-between gap-4 pt-2">
                    <div className="text-[10px] font-bold uppercase tracking-widest opacity-40">{t.doctor.generatedBy}</div>
                    <button className="w-full md:w-auto px-8 py-4 bg-brand-primary text-white rounded-2xl font-bold hover:bg-brand-primary/90 transition-all shadow-lg shadow-brand-primary/20">
                      {t.doctor.connect}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
