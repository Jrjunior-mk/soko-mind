export type Language = 'en' | 'sw' | 'sheng';

export interface MarketInsight {
  crop: string;
  bestSellingDay: string;
  fairPriceRange: { min: number; max: number };
  demandTrend: 'increasing' | 'stable' | 'decreasing';
  confidenceScore: number;
  negotiationScript: string;
  advice: string;
}

export interface CropDiagnosis {
  condition: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  treatment: string;
  description: string;
}

export type Tab = 'dashboard' | 'market' | 'crops' | 'sim';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isError?: boolean;
}

export interface CountyData {
  id: string;
  name: string;
  demand: number; // 0 to 100
  supply: number; // 0 to 100
  avgPrice: number;
  /** Position on the schematic map (SVG viewBox 0 0 400 500) */
  x: number;
  y: number;
}
