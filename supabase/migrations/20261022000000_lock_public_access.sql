-- =========================================================
-- 냥BTI 연구소 - 공개 접근 잠금 (2026-10-22)
-- 화면(index.html)은 DB·Storage를 쓰지 않는다. 초기 마이그레이션의
-- "누구나 읽기·쓰기" 정책을 모두 제거해 익명 접근을 막는다.
-- RLS는 켜진 채로 두므로 정책이 없으면 anon/authenticated는 접근 불가,
-- 서버(service_role)만 접근 가능하다. 나중에 공유 링크 기능을 붙일 때
-- 필요한 정책만 다시 추가한다.
-- =========================================================

DROP POLICY IF EXISTS "Public can view shared assessment by slug" ON public.assessments;
DROP POLICY IF EXISTS "Public can insert assessments" ON public.assessments;
DROP POLICY IF EXISTS "Public can insert cats" ON public.cats;
DROP POLICY IF EXISTS "Public can view cats" ON public.cats;
DROP POLICY IF EXISTS "Public can insert health logs" ON public.health_logs;
DROP POLICY IF EXISTS "Public can view health logs" ON public.health_logs;

DROP POLICY IF EXISTS "Allow public read access to cat media" ON storage.objects;
DROP POLICY IF EXISTS "Allow public upload to cat media" ON storage.objects;

-- 공개 버킷은 정책과 무관하게 공개 URL로 파일을 읽을 수 있으므로 비공개로 바꾼다
UPDATE storage.buckets SET public = false WHERE id IN ('cat-media', 'result-cards');
