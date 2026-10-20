import { supabase, CatProfile, AssessmentResult, HealthLog } from '../lib/supabaseClient';

export interface AnalysisInput {
  cat: CatProfile;
  butlerMbti: string;
  butlerStyle: string;
  surveyAnswers: number[];
  mediaFile?: File | null;
  eyeFile?: File | null;
}

export async function requestCatAssessment(input: AnalysisInput): Promise<{
  shareSlug: string;
  assessment: AssessmentResult;
  health: HealthLog;
}> {
  // Convert media to base64 if present
  let mediaBase64: string | undefined = undefined;
  if (input.mediaFile) {
    mediaBase64 = await fileToBase64(input.mediaFile);
  }

  // Call Supabase Edge Function 'analyze-cat'
  const { data, error } = await supabase.functions.invoke('analyze-cat', {
    body: {
      catName: input.cat.name,
      breedId: input.cat.breedId,
      ageGroup: input.cat.ageGroup,
      foodPref: input.cat.foodPref,
      treatPref: input.cat.treatPref,
      bcsType: input.cat.bcsType,
      butlerMbti: input.butlerMbti,
      butlerStyle: input.butlerStyle,
      surveyAnswers: input.surveyAnswers,
      mediaBase64,
      mediaMimeType: input.mediaFile?.type,
    },
  });

  if (error || !data?.success) {
    throw new Error(error?.message || data?.error || 'AI 분석 호출에 실패했습니다.');
  }

  return {
    shareSlug: data.shareSlug,
    assessment: data.assessment,
    health: {
      bcsScore: data.aiVisionAnalysis.bcsLevel,
      estWeightMin: data.aiVisionAnalysis.estWeightMin,
      estWeightMax: data.aiVisionAnalysis.estWeightMax,
      eyeScore: data.aiVisionAnalysis.eyeScore,
      eyeClarity: data.aiVisionAnalysis.eyeClarity,
      eyeRednessSafe: data.aiVisionAnalysis.eyeRednessSafe,
      eyeAdvice: data.aiVisionAnalysis.vetHomeAdvice,
    },
  };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
  });
}
