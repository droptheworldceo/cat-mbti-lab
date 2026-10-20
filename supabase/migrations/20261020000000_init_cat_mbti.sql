-- =========================================================
-- 냥BTI 연구소 (Cat MBTI Lab) - Supabase PostgreSQL Initial Migration
-- =========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. BUTLERS TABLE (집사 프로필)
CREATE TABLE IF NOT EXISTS public.butlers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nickname VARCHAR(64) DEFAULT '집사님',
    mbti_code VARCHAR(4) NOT NULL DEFAULT 'INFP',
    care_style VARCHAR(32) NOT NULL DEFAULT 'doting',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. CATS TABLE (반려묘 프로필)
CREATE TABLE IF NOT EXISTS public.cats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    butler_id UUID REFERENCES public.butlers(id) ON DELETE SET NULL,
    name VARCHAR(32) NOT NULL DEFAULT '코코',
    breed_id VARCHAR(32) NOT NULL DEFAULT 'ksh',
    age_group VARCHAR(16) NOT NULL DEFAULT 'adult', -- kitten, adult, senior
    coat_type VARCHAR(64) DEFAULT '치즈·바이컬러',
    food_pref VARCHAR(32) DEFAULT 'dry', -- dry, wet, topping, all
    treat_pref VARCHAR(32) DEFAULT 'churu', -- churu, freeze, crunchy, catnip
    bcs_type VARCHAR(16) DEFAULT 'ideal', -- slim, ideal, chubby, chonky
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. ASSESSMENTS TABLE (냥BTI 진단 결과)
CREATE TABLE IF NOT EXISTS public.assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cat_id UUID REFERENCES public.cats(id) ON DELETE CASCADE,
    share_slug VARCHAR(32) UNIQUE NOT NULL,
    mbti_code VARCHAR(4) NOT NULL,
    mbti_nickname VARCHAR(64) NOT NULL,
    mbti_quote TEXT,
    axis_scores JSONB NOT NULL, -- { E: 44, I: 56, S: 57, N: 43, T: 50, F: 50, J: 54, P: 46 }
    chemistry_score INT NOT NULL DEFAULT 90,
    chemistry_tag VARCHAR(64) DEFAULT '상호보완 힐링콤비',
    play_prescription TEXT,
    stress_tip TEXT,
    food_treat_advice TEXT,
    media_url TEXT,
    media_type VARCHAR(16) DEFAULT 'image', -- image, video
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. HEALTH_LOGS TABLE (체형/체중 & 안구 건강 시계열 로그)
CREATE TABLE IF NOT EXISTS public.health_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cat_id UUID REFERENCES public.cats(id) ON DELETE CASCADE,
    assessment_id UUID REFERENCES public.assessments(id) ON DELETE CASCADE,
    bcs_score VARCHAR(16) DEFAULT 'BCS 5/9',
    est_weight_min NUMERIC(4,1) NOT NULL,
    est_weight_max NUMERIC(4,1) NOT NULL,
    actual_weight NUMERIC(4,1),
    eye_score INT NOT NULL DEFAULT 92,
    eye_clarity INT DEFAULT 94,
    eye_redness_safe INT DEFAULT 92,
    eye_tear_clean INT DEFAULT 90,
    eye_advice TEXT,
    eye_image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- =========================================================
-- INDEXES & PERFORMANCE
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_cats_butler ON public.cats(butler_id);
CREATE INDEX IF NOT EXISTS idx_assessments_cat ON public.assessments(cat_id);
CREATE INDEX IF NOT EXISTS idx_assessments_slug ON public.assessments(share_slug);
CREATE INDEX IF NOT EXISTS idx_health_logs_cat ON public.health_logs(cat_id);

-- =========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================
ALTER TABLE public.butlers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_logs ENABLE ROW LEVEL SECURITY;

-- Allow public read of assessment results via share_slug (Viral Sharing)
CREATE POLICY "Public can view shared assessment by slug"
    ON public.assessments FOR SELECT
    USING (true);

-- Allow public/anonymous insert for viral test submissions
CREATE POLICY "Public can insert assessments"
    ON public.assessments FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Public can insert cats"
    ON public.cats FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Public can view cats"
    ON public.cats FOR SELECT
    USING (true);

CREATE POLICY "Public can insert health logs"
    ON public.health_logs FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Public can view health logs"
    ON public.health_logs FOR SELECT
    USING (true);

-- =========================================================
-- STORAGE BUCKETS SETUP
-- =========================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('cat-media', 'cat-media', true, 20971520, ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']),
    ('result-cards', 'result-cards', true, 10485760, ARRAY['image/png', 'image/jpeg'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow public read access to cat media"
    ON storage.objects FOR SELECT
    USING (bucket_id IN ('cat-media', 'result-cards'));

CREATE POLICY "Allow public upload to cat media"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id IN ('cat-media', 'result-cards'));
