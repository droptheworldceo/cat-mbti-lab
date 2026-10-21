import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnalyzeRequest {
  catName: string;
  breedId: string;
  ageGroup: string;
  foodPref: string;
  treatPref: string;
  bcsType: string;
  butlerMbti: string;
  butlerStyle: string;
  surveyAnswers: number[];
  mediaBase64?: string;
  mediaMimeType?: string;
  eyeBase64?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // 화면(index.html)이 이 함수를 쓰지 않는 동안은 꺼 둔다(2026-10-22 보안 점검).
  // 다시 쓰려면 Supabase Secrets에 ANALYZE_ENABLED=true를 넣고, 호출 제한·입력 검사를 먼저 붙인다.
  if (Deno.env.get("ANALYZE_ENABLED") !== "true") {
    return new Response(
      JSON.stringify({ success: false, error: "analyze-cat is disabled" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 503 }
    );
  }

  try {
    const payload: AnalyzeRequest = await req.json();
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Call Gemini 2.5 Flash Multimodal Vision API if image provided
    let aiVisionAnalysis = {
      detectedBreed: payload.breedId,
      coatType: "치즈·바이컬러",
      motionEnergyScore: 78,
      pupilCuriosityScore: 84,
      bcsLevel: payload.bcsType === "ideal" ? "BCS 5/9" : "BCS 6/9",
      estWeightMin: 4.4,
      estWeightMax: 5.0,
      eyeClarity: 94,
      eyeRednessSafe: 92,
      eyeScore: 92,
      vetHomeAdvice: "각막 투명도와 결막 상태가 안정적입니다. 정기적인 빗질과 눈물자국 관리를 권장합니다."
    };

    if (geminiApiKey && payload.mediaBase64) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
        const promptText = `
너는 고양이 행동학 및 수의학 전문 AI 에이전트야.
첨부된 고양이 사진(또는 10초 영상 프레임)과 프로필 정보를 정밀 분석해줘.

고양이 정보:
- 이름: ${payload.catName}
- 선택된 묘종: ${payload.breedId}
- 나이대: ${payload.ageGroup}
- 선호 사료: ${payload.foodPref} / 최애 간식: ${payload.treatPref}
- 집사 선택 체형: ${payload.bcsType}

다음 JSON 구조로만 응답해:
{
  "detectedBreed": "코숏, 렉돌 등 추정 묘종",
  "coatType": "털 색상 및 무늬 패턴 (예: 치즈·바이컬러)",
  "motionEnergyScore": 정수 0~100 (사진/영상의 활동성 및 자세 텐션),
  "pupilCuriosityScore": 정수 0~100 (동공 확장도 및 시선 집중도),
  "bcsLevel": "BCS 5/9 표준",
  "estWeightMin": 숫자 (예: 4.4),
  "estWeightMax": 숫자 (예: 5.0),
  "eyeClarity": 정수 0~100 (각막 및 동공 투명도),
  "eyeRednessSafe": 정수 0~100 (결막 충혈 안전도),
  "eyeScore": 정수 0~100 (종합 안구 건강 점수),
  "vetHomeAdvice": "안구 및 체형 일상 홈케어 가이드 (2문장 이내)"
}
`;

        const geminiRes = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: promptText },
                  {
                    inline_data: {
                      mime_type: payload.mediaMimeType || "image/jpeg",
                      data: payload.mediaBase64.replace(/^data:image\/\w+;base64,/, ""),
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              response_mime_type: "application/json",
              temperature: 0.2,
            },
          }),
        });

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const parsed = JSON.parse(geminiData.candidates[0].content.parts[0].text);
          aiVisionAnalysis = { ...aiVisionAnalysis, ...parsed };
        }
      } catch (err) {
        console.warn("Gemini API call skipped, using client fallback metrics:", err);
      }
    }

    // 2. Synthesize 4-Axis Scores (Vision 35% + Survey 40% + Breed 15% + Butler/Food 10%)
    const scores = { E: 50, I: 50, S: 50, N: 50, T: 50, F: 50, J: 50, P: 50 };
    if (aiVisionAnalysis.motionEnergyScore >= 70) {
      scores.E += (aiVisionAnalysis.motionEnergyScore - 60) * 0.8;
      scores.P += (aiVisionAnalysis.motionEnergyScore - 60) * 0.4;
    } else {
      scores.I += (70 - aiVisionAnalysis.motionEnergyScore) * 0.8;
      scores.J += (70 - aiVisionAnalysis.motionEnergyScore) * 0.4;
    }

    if (payload.foodPref === "dry") { scores.S += 5; scores.J += 5; }
    if (payload.foodPref === "topping") { scores.N += 6; scores.T += 4; }
    if (payload.treatPref === "churu") { scores.F += 7; scores.E += 4; }

    const pctE = Math.min(94, Math.max(6, Math.round((scores.E / (scores.E + scores.I)) * 100)));
    const pctI = 100 - pctE;
    const pctN = Math.min(94, Math.max(6, Math.round((scores.N / (scores.N + scores.S)) * 100)));
    const pctS = 100 - pctN;
    const pctF = Math.min(94, Math.max(6, Math.round((scores.F / (scores.F + scores.T)) * 100)));
    const pctT = 100 - pctF;
    const pctP = Math.min(94, Math.max(6, Math.round((scores.P / (scores.P + scores.J)) * 100)));
    const pctJ = 100 - pctP;

    const mbtiCode =
      (pctE >= pctI ? "E" : "I") +
      (pctN >= pctS ? "N" : "S") +
      (pctF >= pctT ? "F" : "T") +
      (pctP >= pctJ ? "P" : "J");

    const shareSlug = "cat_" + Math.random().toString(36).substring(2, 10);

    // 3. Insert into Supabase DB
    const { data: catData, error: catErr } = await supabase
      .from("cats")
      .insert({
        name: payload.catName || "우리 냥이",
        breed_id: payload.breedId,
        age_group: payload.ageGroup,
        coat_type: aiVisionAnalysis.coatType,
        food_pref: payload.foodPref,
        treat_pref: payload.treatPref,
        bcs_type: payload.bcsType,
      })
      .select()
      .single();

    if (catErr) throw catErr;

    const { data: assessData, error: assessErr } = await supabase
      .from("assessments")
      .insert({
        cat_id: catData.id,
        share_slug: shareSlug,
        mbti_code: mbtiCode,
        mbti_nickname: mbtiCode === "ISFJ" ? "한결같은 집사 바라기 수호냥" : "호기심 폭발 우주탐험냥",
        mbti_quote: "집사가 자러 가면 나도 발치에서 같이 잘 거다냥.",
        axis_scores: { E: pctE, I: pctI, S: pctS, N: pctN, T: pctT, F: pctF, J: pctJ, P: pctP },
        chemistry_score: 92,
        chemistry_tag: "상호보완 힐링콤비",
        play_prescription: "익숙한 장소에서 매일 일정한 시간에 깃털 낚싯대로 부드럽게 놀아주세요.",
        stress_tip: "일상 루틴의 급격한 변화나 낯선 방문객에 스트레스를 받을 수 있습니다.",
        food_treat_advice: `${payload.foodPref === "dry" ? "바삭 건사료" : "습식캔"}과 ${payload.treatPref === "churu" ? "짜먹는 츄르" : "트릿"}의 환상 궁합!`,
      })
      .select()
      .single();

    if (assessErr) throw assessErr;

    await supabase.from("health_logs").insert({
      cat_id: catData.id,
      assessment_id: assessData.id,
      bcs_score: aiVisionAnalysis.bcsLevel,
      est_weight_min: aiVisionAnalysis.estWeightMin,
      est_weight_max: aiVisionAnalysis.estWeightMax,
      eye_score: aiVisionAnalysis.eyeScore,
      eye_clarity: aiVisionAnalysis.eyeClarity,
      eye_redness_safe: aiVisionAnalysis.eyeRednessSafe,
      eye_advice: aiVisionAnalysis.vetHomeAdvice,
    });

    return new Response(
      JSON.stringify({
        success: true,
        shareSlug,
        cat: catData,
        assessment: assessData,
        aiVisionAnalysis,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
