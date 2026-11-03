import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { Content } from '@google/genai';
import { Send, User, AlertTriangle, ShieldCheck, RotateCcw } from 'lucide-react';
import { Language, ChatMessage } from '../types';
import { GeminiService, describeError } from '../services/gemini';
import { TRANSLATIONS } from '../constants';
import { VoiceService, speechLangFor } from '../services/voice';
import { cn } from '../lib/utils';

function greeting(lang: Language): ChatMessage {
  return { role: 'assistant', content: TRANSLATIONS[lang].sim.initialMsg, timestamp: Date.now() };
}

/** Converts the visible chat into Gemini history. Failed turns are skipped so roles keep alternating. */
function toHistory(messages: ChatMessage[]): Content[] {
  const history: Content[] = [
    // Gemini expects the conversation to open with a user turn, so set the scene before the buyer's greeting.
    { role: 'user', parts: [{ text: '(The farmer walks up to your stall at the market.)' }] },
  ];
  for (const m of messages) {
    if (m.isError) continue;
    history.push({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] });
  }
  return history;
}

export default function NegotiationSim({ lang }: { lang: Language }) {
  const t = TRANSLATIONS[lang].sim;
  const [messages, setMessages] = useState<ChatMessage[]>(() => [greeting(lang)]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // If the farmer switches language before saying anything, greet them again in the new language.
  useEffect(() => {
    setMessages((prev) => (prev.length <= 1 ? [greeting(lang)] : prev));
  }, [lang]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => () => VoiceService.stop(), []);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: Date.now() };
    const history = toHistory(messages);
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const reply = await GeminiService.simulateNegotiation(text, history, lang);
      setMessages((prev) => [...prev, { role: 'assistant', content: reply, timestamp: Date.now() }]);
      VoiceService.speak(reply, speechLangFor(lang));
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev.map((m) => (m === userMsg ? { ...m, isError: true } : m)),
        { role: 'assistant', content: describeError(err), timestamp: Date.now(), isError: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const restart = () => {
    VoiceService.stop();
    setMessages([greeting(lang)]);
    setInput('');
  };

  return (
    <div className="glass rounded-[2.5rem] p-5 md:p-8 h-[calc(100dvh-14rem)] min-h-[480px] md:h-[640px] flex flex-col">
      <div className="flex items-center justify-between gap-3 mb-4 pb-4 md:mb-6 md:pb-6 border-b border-brand-primary/10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 shrink-0 rounded-xl bg-brand-accent flex items-center justify-center text-white">
            <User size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-xs uppercase tracking-widest text-brand-primary leading-none mb-1">{t.title}</h3>
            <p className="text-lg md:text-xl font-bold tracking-tight text-brand-secondary truncate">{t.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-yellow-500/10 text-yellow-700 rounded-full text-[10px] font-bold uppercase tracking-widest">
            <AlertTriangle size={14} />
            <span>{t.mode}</span>
          </div>
          <div className="relative group">
            <div className="w-9 h-9 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary cursor-help" tabIndex={0}>
              <ShieldCheck size={16} />
            </div>
            <div className="absolute top-full right-0 mt-2 w-56 bg-white shadow-xl p-4 rounded-2xl opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none z-10">
              <p className="text-[10px] font-bold text-brand-primary uppercase tracking-widest mb-1">{t.booster}</p>
              <p className="text-xs leading-relaxed text-brand-secondary/70">{t.boosterDesc}</p>
            </div>
          </div>
          <button
            onClick={restart}
            title={t.restart}
            aria-label={t.restart}
            className="w-9 h-9 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary hover:bg-brand-primary hover:text-white transition-all"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1 md:pr-3" ref={scrollRef} aria-live="polite">
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div
              key={m.timestamp + m.role}
              initial={{ opacity: 0, x: m.role === 'user' ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn('max-w-[85%] md:max-w-[75%] flex flex-col gap-1', m.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start')}
            >
              <div
                className={cn(
                  'px-5 py-4 rounded-3xl font-medium text-sm leading-relaxed whitespace-pre-line',
                  m.role === 'user'
                    ? 'bg-brand-primary text-white rounded-tr-md'
                    : m.isError
                    ? 'bg-red-50 border border-red-200 text-red-700 rounded-tl-md'
                    : 'bg-white border border-brand-primary/5 text-brand-secondary rounded-tl-md shadow-sm',
                  m.role === 'user' && m.isError && 'opacity-60'
                )}
              >
                {m.content}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-30 px-2">
                {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-1.5 px-5 py-4 bg-white rounded-3xl rounded-tl-md w-fit shadow-sm">
            <div className="w-2 h-2 bg-brand-primary rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-brand-primary rounded-full animate-bounce [animation-delay:0.2s]" />
            <div className="w-2 h-2 bg-brand-primary rounded-full animate-bounce [animation-delay:0.4s]" />
          </motion.div>
        )}
      </div>

      <form onSubmit={handleSend} className="mt-4 pt-4 md:mt-6 md:pt-6 border-t border-brand-primary/10 relative">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t.placeholder}
          className="w-full bg-brand-light rounded-2xl py-4 pl-5 pr-14 font-semibold text-sm outline-none focus:ring-2 ring-brand-primary/20 placeholder:text-brand-secondary/30"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          aria-label={TRANSLATIONS[lang].sendLabel}
          className="absolute right-2 bottom-2 w-10 h-10 rounded-xl bg-brand-secondary text-white flex items-center justify-center hover:bg-brand-primary transition-all disabled:opacity-40 disabled:hover:bg-brand-secondary"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
