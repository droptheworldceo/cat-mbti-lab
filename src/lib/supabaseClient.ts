import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface CatProfile {
  id?: string;
  name: string;
  breedId: string;
  ageGroup: 'kitten' | 'adult' | 'senior';
  coatType?: string;
  foodPref: 'dry' | 'wet' | 'topping' | 'all';
  treatPref: 'churu' | 'freeze' | 'crunchy' | 'catnip';
  bcsType: 'slim' | 'ideal' | 'chubby' | 'chonky';
}

export interface AssessmentResult {
  id?: string;
  catId?: string;
  shareSlug: string;
  mbtiCode: string;
  mbtiNickname: string;
  mbtiQuote: string;
  axisScores: {
    E: number; I: number;
    S: number; N: number;
    T: number; F: number;
    J: number; P: number;
  };
  chemistryScore: number;
  chemistryTag: string;
  playPrescription: string;
  stressTip: string;
  foodTreatAdvice: string;
}

export interface HealthLog {
  bcsScore: string;
  estWeightMin: number;
  estWeightMax: number;
  eyeScore: number;
  eyeClarity: number;
  eyeRednessSafe: number;
  eyeAdvice: string;
}
