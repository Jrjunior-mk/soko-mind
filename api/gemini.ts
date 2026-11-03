/**
 * Server-side Gemini proxy.
 *
 * Runs as a Vercel Function in production (POST/GET /api/gemini) and is mounted into the
 * Vite dev server locally (see vite.config.ts). The GEMINI_API_KEY only ever lives here,
 * on the server — it is never sent to the browser.
 */
import { GoogleGenAI, Type } from '@google/genai';
import type { Content } from '@google/genai';
import type { Language, MarketInsight, CropDiagnosis } from '../src/types';

const MODEL = 'gemini-3-flash-preview';
const MAX_TEXT = 2000;
const MAX_HISTORY = 40;

const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  sw: 'Kiswahili',
  sheng: 'Sheng (Kenyan urban slang mixing Swahili and English)',
};

class HttpError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

function getApiKey(): string | null {
  const key = process.env.GEMINI_API_KEY?.trim();
  return key && key !== 'MY_GEMINI_API_KEY' ? key : null;
}

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  const apiKey = getApiKey();
  if (!apiKey) throw new HttpError(503, 'The AI service is not configured on the server (GEMINI_API_KEY is missing).', 'missing_key');
  if (!client) client = new GoogleGenAI({ apiKey });
  return client;
}

function asLanguage(value: unknown): Language {
  return value === 'sw' || value === 'sheng' ? value : 'en';
}

function asText(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new HttpError(400, `"${field}" is required`);
  return value.slice(0, MAX_TEXT);
}

function parseJson<T>(text: string | undefined, label: string): T {
  if (!text) throw new HttpError(502, `Empty ${label} response from AI`);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new HttpError(502, `Could not read the ${label} returned by the AI`);
  }
}

async function negotiateMarket(query: string, language: Language): Promise<MarketInsight> {
  const languageName = LANGUAGE_NAMES[language];
  const prompt = `
    You are Soko Mind, a Kenyan market expert AI acting as a negotiator for a small-scale farmer.
    Farmer's query: "${query}"

    Analyze current Kenyan market trends (real or a realistic simulation) and respond with:
    - crop: name of the crop
    - bestSellingDay: the best day of the week to sell (full English day name, e.g. "Friday")
    - fairPriceRange: { min, max } in KES per 90kg bag (or the usual unit for that crop)
    - demandTrend: increasing, stable, or decreasing
    - confidenceScore: integer 0 to 100
    - negotiationScript: a few lines the farmer can say to a buyer, written in ${languageName}
    - advice: a short summary of why this is the best decision, written in ${languageName}
  `;

  const response = await getClient().models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          crop: { type: Type.STRING },
          bestSellingDay: { type: Type.STRING },
          fairPriceRange: {
            type: Type.OBJECT,
            properties: { min: { type: Type.NUMBER }, max: { type: Type.NUMBER } },
            required: ['min', 'max'],
          },
          demandTrend: { type: Type.STRING, enum: ['increasing', 'stable', 'decreasing'] },
          confidenceScore: { type: Type.NUMBER },
          negotiationScript: { type: Type.STRING },
          advice: { type: Type.STRING },
        },
        required: ['crop', 'bestSellingDay', 'fairPriceRange', 'demandTrend', 'confidenceScore', 'negotiationScript', 'advice'],
      },
    },
  });

  return parseJson<MarketInsight>(response.text, 'market insight');
}

async function diagnoseCrop(imageDataUrl: string, language: Language): Promise<CropDiagnosis> {
  const match = /^data:(image\/[\w.+-]+);base64,(.+)$/s.exec(imageDataUrl);
  if (!match) throw new HttpError(400, 'Unsupported image format');
  const [, mimeType, data] = match;

  const prompt = `
    You are a Smart Vision Crop Doctor for East African agriculture.
    Analyze this crop image and provide (write the text fields in ${LANGUAGE_NAMES[language]}):
    - condition: name of the disease or pest (or "Healthy")
    - severity: low, medium, high, or critical
    - treatment: recommended action, localized to the Kenyan context
    - description: brief explanation of what you see
    If the image is not a plant, say so in "condition" and use severity "low".
  `;

  const response = await getClient().models.generateContent({
    model: MODEL,
    contents: { parts: [{ inlineData: { mimeType, data } }, { text: prompt }] },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          condition: { type: Type.STRING },
          severity: { type: Type.STRING, enum: ['low', 'medium', 'high', 'critical'] },
          treatment: { type: Type.STRING },
          description: { type: Type.STRING },
        },
        required: ['condition', 'severity', 'treatment', 'description'],
      },
    },
  });

  return parseJson<CropDiagnosis>(response.text, 'crop diagnosis');
}

function sanitizeHistory(value: unknown): Content[] {
  if (!Array.isArray(value)) return [];
  return value.slice(-MAX_HISTORY).flatMap((item): Content[] => {
    const role = item?.role === 'model' ? 'model' : item?.role === 'user' ? 'user' : null;
    const text = item?.parts?.[0]?.text;
    if (!role || typeof text !== 'string') return [];
    return [{ role, parts: [{ text: text.slice(0, MAX_TEXT) }] }];
  });
}

async function simulateNegotiation(message: string, history: Content[], language: Language): Promise<string> {
  const systemInstruction = `
    You are "Tough Mbugua", role-playing as a tough but fair produce middleman in a Kenyan market.
    The user is a farmer trying to sell their crops.
    Respond in ${LANGUAGE_NAMES[language]}. Use Kenyan market slang where appropriate.
    Challenge the farmer on quality, current oversupply, or transport costs, but be open to a good deal.
    Keep replies short (1-3 sentences) and conversational.
  `;

  const response = await getClient().models.generateContent({
    model: MODEL,
    contents: [...history, { role: 'user', parts: [{ text: message }] }],
    config: { systemInstruction },
  });

  return response.text?.trim() || '...';
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

/** Health check: tells the app whether the AI key is configured (never reveals the key). */
export function GET(): Response {
  return json({ configured: !!getApiKey() });
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json().catch(() => {
      throw new HttpError(400, 'Invalid JSON body');
    });
    const language = asLanguage(body?.language);

    switch (body?.action) {
      case 'market':
        return json(await negotiateMarket(asText(body.query, 'query'), language));
      case 'diagnose':
        if (typeof body.image !== 'string') throw new HttpError(400, '"image" is required');
        return json(await diagnoseCrop(body.image, language));
      case 'negotiate':
        return json({ reply: await simulateNegotiation(asText(body.message, 'message'), sanitizeHistory(body.history), language) });
      default:
        throw new HttpError(400, 'Unknown action');
    }
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message, code: e.code }, e.status);
    console.error('Gemini request failed', e);
    const status = (e as { status?: number })?.status;
    if (status === 429) return json({ error: 'The AI is busy right now (rate limit reached). Please wait a minute and try again.', code: 'rate_limited' }, 429);
    return json({ error: 'The AI service failed to respond. Please try again.' }, 502);
  }
}
