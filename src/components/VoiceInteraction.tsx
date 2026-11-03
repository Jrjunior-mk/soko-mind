import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Mic, MicOff, Send, Camera, Volume2 } from 'lucide-react';
import { Language } from '../types';
import { TRANSLATIONS } from '../constants';
import Waveform from './Waveform';
import { cn, readFileAsDataUrl } from '../lib/utils';
import { VoiceService, speechLangFor } from '../services/voice';

interface VoiceInteractionProps {
  onQuery: (query: string) => void;
  onImageCapture: (dataUrl: string) => void;
  lang: Language;
  isAIPresenting?: boolean;
  busy?: boolean;
}

export default function VoiceInteraction({ onQuery, lang, onImageCapture, isAIPresenting, busy }: VoiceInteractionProps) {
  const [isListening, setIsListening] = useState(false);
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  // Keep the latest callback in a ref so the recognizer isn't rebuilt on every render.
  const onQueryRef = useRef(onQuery);
  onQueryRef.current = onQuery;
  const t = TRANSLATIONS[lang];

  useEffect(() => {
    const recognition = VoiceService.getRecognition(speechLangFor(lang));
    recognitionRef.current = recognition;
    if (!recognition) return;

    recognition.onresult = (event: any) => {
      const transcript: string = event.results[0][0].transcript;
      setQuery(transcript);
      onQueryRef.current(transcript);
      setIsListening(false);
    };
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);

    return () => {
      recognition.onresult = recognition.onerror = recognition.onend = null;
      try { recognition.abort(); } catch { /* not started */ }
    };
  }, [lang]);

  const handleMicClick = () => {
    if (!recognitionRef.current) {
      setNotice(t.voiceUnsupported);
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }
    VoiceService.stop();
    setQuery('');
    setNotice(null);
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (e) {
      console.error(e);
      setIsListening(false);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = query.trim();
    if (!q || busy) return;
    onQuery(q);
    setQuery('');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow picking the same file again
    if (file) onImageCapture(await readFileAsDataUrl(file));
  };

  const tags = [
    { key: 'market', icon: '💰' },
    { key: 'weather', icon: '☀️' },
    { key: 'tips', icon: '🤝' },
    { key: 'health', icon: '🌿' },
  ] as const;

  return (
    <section className="w-full max-w-4xl mx-auto space-y-8 pt-8 md:pt-12">
      <div className="text-center space-y-3">
        <motion.h1
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-5xl md:text-7xl font-black text-brand-secondary tracking-tighter"
        >
          {t.heroTitle}
        </motion.h1>
        <p className="text-brand-primary font-bold uppercase tracking-[0.3em] text-xs md:text-base">
          {t.heroSubtitle}
        </p>
      </div>

      <div className="relative">
        <div className="absolute inset-x-0 -top-12 flex justify-center pointer-events-none">
          <Waveform isListening={isListening} isSpeaking={!!isAIPresenting} />
        </div>

        <div className="glass rounded-[2.5rem] p-2.5 md:p-4 flex items-center gap-2 md:gap-4 shadow-2xl shadow-brand-primary/10 transition-all focus-within:ring-2 ring-brand-primary/20">
          <button
            type="button"
            onClick={handleMicClick}
            aria-label={t.micLabel}
            className={cn(
              'w-12 h-12 md:w-16 md:h-16 shrink-0 rounded-full flex items-center justify-center text-white transition-all',
              isListening
                ? 'bg-brand-accent scale-110 shadow-lg shadow-brand-accent/40'
                : isAIPresenting
                ? 'bg-brand-accent animate-pulse'
                : 'bg-brand-primary hover:scale-105'
            )}
          >
            {isListening ? <MicOff size={26} /> : isAIPresenting ? <Volume2 size={26} /> : <Mic size={26} />}
          </button>

          <form onSubmit={handleSubmit} className="flex-1 min-w-0 flex items-center gap-1 md:gap-4">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isListening ? t.listening : t.textPlaceholder}
              className="flex-1 min-w-0 bg-transparent outline-none font-semibold text-base md:text-lg text-brand-secondary placeholder:text-brand-secondary/30"
            />

            <label
              title={t.attachPhoto}
              className="p-3 rounded-2xl hover:bg-brand-primary/10 text-brand-primary transition-colors cursor-pointer shrink-0"
            >
              <Camera size={20} />
              <span className="sr-only">{t.attachPhoto}</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>

            <button
              type="submit"
              aria-label={t.sendLabel}
              disabled={busy || !query.trim()}
              className="p-3 md:p-4 rounded-2xl bg-brand-secondary text-white hover:bg-brand-primary transition-all shrink-0 disabled:opacity-40 disabled:hover:bg-brand-secondary"
            >
              <Send size={20} />
            </button>
          </form>
        </div>

        <p className="text-center mt-5 text-xs md:text-sm font-bold text-brand-secondary/40 uppercase tracking-widest" aria-live="polite">
          {notice ?? (isListening ? t.analyzing : t.voicePrompt)}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {tags.map(({ key, icon }) => (
          <button
            key={key}
            disabled={busy}
            onClick={() => onQuery(t.tagQueries[key])}
            className="glass py-4 px-4 rounded-2xl text-center hover:bg-brand-primary hover:text-white transition-all group disabled:opacity-50 disabled:pointer-events-none"
          >
            <span className="block text-2xl mb-2 grayscale group-hover:grayscale-0 transition-all">{icon}</span>
            <span className="text-[11px] font-bold uppercase tracking-widest opacity-70 group-hover:opacity-100">{t.tags[key]}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
