import { useEffect, useState } from 'react';
import type { Content } from '@google/genai';
import { Language, MarketInsight, CropDiagnosis } from '../types';

/**
 * Browser-side client for the Soko Mind AI.
 * All Gemini calls go through our own server endpoint (/api/gemini) so the API key
 * never ships to the browser.
 */
const ENDPOINT = '/api/gemini';

export class AiError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'AiError';
  }
}

async function callAi<T>(payload: Record<string, unknown>): Promise<T> {
  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new AiError('Could not reach the server. Check your internet connection and try again.');
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 413) throw new AiError('That photo is too large. Please try a smaller image.');
    throw new AiError(data?.error || `Request failed (${res.status})`, data?.code);
  }
  return data as T;
}

/** Shrinks large photos before upload (server functions reject bodies over ~4.5 MB). */
async function compressImage(dataUrl: string, maxSide = 1280, quality = 0.85): Promise<string> {
  try {
    const img = new Image();
    img.src = dataUrl;
    await img.decode();
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    if (scale === 1 && dataUrl.length < 1_500_000) return dataUrl;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', quality);
  } catch {
    return dataUrl; // e.g. a format the browser can't decode; let the server decide
  }
}

export class GeminiService {
  static negotiateMarket(query: string, language: Language): Promise<MarketInsight> {
    return callAi<MarketInsight>({ action: 'market', query, language });
  }

  static async diagnoseCrop(imageDataUrl: string, language: Language): Promise<CropDiagnosis> {
    const image = await compressImage(imageDataUrl);
    return callAi<CropDiagnosis>({ action: 'diagnose', image, language });
  }

  static async simulateNegotiation(message: string, history: Content[], language: Language): Promise<string> {
    const { reply } = await callAi<{ reply: string }>({ action: 'negotiate', message, history, language });
    return reply;
  }
}

export function describeError(e: unknown): string {
  if (e instanceof Error) return e.message;
  return 'Something went wrong. Please try again.';
}

// ---- AI availability status (asks the server whether a key is configured) ----

export type AiStatus = 'checking' | 'ready' | 'missing';

let aiStatus: AiStatus = 'checking';
let statusPromise: Promise<AiStatus> | null = null;

function fetchStatus(): Promise<AiStatus> {
  statusPromise ??= fetch(ENDPOINT)
    .then((r) => r.json())
    .then((d) => (aiStatus = d?.configured ? 'ready' : 'missing'))
    .catch(() => (aiStatus = 'missing'));
  return statusPromise;
}

export function useAiStatus(): AiStatus {
  const [status, setStatus] = useState<AiStatus>(aiStatus);
  useEffect(() => {
    let alive = true;
    fetchStatus().then((s) => alive && setStatus(s));
    return () => { alive = false; };
  }, []);
  return status;
}
