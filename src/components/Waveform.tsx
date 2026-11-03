import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface WaveformProps {
  isSpeaking: boolean;
  isListening: boolean;
  className?: string;
}

// Fixed per-bar durations so the animation doesn't restart with new random values on every render.
const DURATIONS = [0.62, 0.81, 0.55, 0.93, 0.7, 0.58, 0.88, 0.66, 0.97, 0.6, 0.77, 0.85];

export default function Waveform({ isSpeaking, isListening, className }: WaveformProps) {
  if (!isSpeaking && !isListening) return null;

  return (
    <div className={cn('flex items-center justify-center gap-1 h-12', className)} aria-hidden="true">
      {DURATIONS.map((duration, i) => (
        <motion.div
          key={i}
          className="w-1.5 bg-brand-accent rounded-full"
          animate={{ height: isListening ? [10, 40, 10] : [10, 30, 20, 40, 10] }}
          transition={{ duration, repeat: Infinity, delay: i * 0.05 }}
        />
      ))}
    </div>
  );
}
