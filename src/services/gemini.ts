import { GoogleGenAI, Type } from '@google/genai';
import type { Content } from '@google/genai';
import { Language, MarketInsight, CropDiagnosis } from '../types';

const MODEL = 'gemini-3-flash-preview';

const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  sw: 'Kiswahili',
  sheng: 'Sheng (Kenyan urban slang mixing Swahili and English)',
};

export class MissingApiKeyError extends Error {
  constructor() {
    super('GEMINI_API_KEY is not set. Add it to .env.local and restart the dev server.');
    this.name = 'MissingApiKeyError';
  }
}

let client: GoogleGenAI | null = null;

/** Created lazily so the app still loads (and shows a helpful message) without a key. */
function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') throw new MissingApiKeyError();
  if (!client) client = new GoogleGenAI({ apiKey });
  return client;
}

export function hasApiKey(): boolean {
  const apiKey = process.env.GEMINI_API_KEY;
  return !!apiKey && apiKey !== 'MY_GEMINI_API_KEY';
}

function parseJson<T>(text: string | undefined, label: string): T {
  if (!text) throw new Error(`Empty ${label} response from AI`);
  try {
    return JSON.parse(text) as T;
  } catch (e) {
    console.error(`Failed to parse ${label}`, e, text);
    throw new Error(`Could not read the ${label} returned by the AI`);
  }
}

/** Splits a data URL ("data:image/png;base64,....") into its MIME type and base64 payload. */
function splitDataUrl(dataUrl: string): { mimeType: string; data: string } {
  const match = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl);
  if (!match) throw new Error('Unsupported image format');
  return { mimeType: match[1], data: match[2] };
}

export class GeminiService {
  static async negotiateMarket(query: string, language: Language): Promise<MarketInsight> {
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
              properties: {
                min: { type: Type.NUMBER },
                max: { type: Type.NUMBER },
              },
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

  static async diagnoseCrop(imageDataUrl: string, language: Language): Promise<CropDiagnosis> {
    const { mimeType, data } = splitDataUrl(imageDataUrl);
    const languageName = LANGUAGE_NAMES[language];
    const prompt = `
      You are a Smart Vision Crop Doctor for East African agriculture.
      Analyze this crop image and provide (write the text fields in ${languageName}):
      - condition: name of the disease or pest (or "Healthy")
      - severity: low, medium, high, or critical
      - treatment: recommended action, localized to the Kenyan context
      - description: brief explanation of what you see
      If the image is not a plant, say so in "condition" and use severity "low".
    `;

    const response = await getClient().models.generateContent({
      model: MODEL,
      contents: {
        parts: [{ inlineData: { mimeType, data } }, { text: prompt }],
      },
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

  static async simulateNegotiation(message: string, history: Content[], language: Language): Promise<string> {
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
}

export function describeError(e: unknown): string {
  if (e instanceof MissingApiKeyError) return e.message;
  if (e instanceof Error) return e.message;
  return 'Something went wrong. Please try again.';
}
