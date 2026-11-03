import { Language } from '../types';

/** Browser speech codes for each app language. Sheng has no voice of its own, so it uses Swahili. */
export function speechLangFor(lang: Language): string {
  return lang === 'en' ? 'en-US' : 'sw-KE';
}

export class VoiceService {
  static isSpeechSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  static isRecognitionSupported(): boolean {
    return typeof window !== 'undefined' &&
      !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  /** Speaks text aloud. `onEnd` fires when speech finishes, is cancelled, or is unsupported. */
  static speak(text: string, lang: string = 'en-US', onEnd?: () => void) {
    if (!this.isSpeechSupported()) {
      onEnd?.();
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    if (onEnd) {
      utterance.onend = onEnd;
      utterance.onerror = onEnd;
    }

    window.speechSynthesis.speak(utterance);
  }

  static stop() {
    if (this.isSpeechSupported()) window.speechSynthesis.cancel();
  }

  static getRecognition(lang: string = 'en-US') {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = lang;

    return recognition;
  }
}
