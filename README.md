# 🐾 냥BTI 연구소 (Cat MBTI Lab) — 풀스택 상용화 스타터 패키지

사진·10초 영상 분석, 묘종 기질 보정, 집사 MBTI 케미 분석, 선호 사료·간식 성향, 사진 기반 체형(BCS)·체중 추측, 그리고 고양이 눈(Eye) 사진 건강 스크리닝을 통합한 **멀티모달 반려묘 헬스케어 & 성향 진단 서비스**의 실서비스 구축 패키지입니다.

---

## 📂 프로젝트 폴더 구조

```text
cat-mbti-lab/
├── .github/
│   └── workflows/
│       └── deploy.yml              # GitHub Actions Supabase 자동 배포 워크플로우
├── index.html                      # 냥BTI 모바일 웹앱 프론트엔드 (Vite 입력 파일, 화면 전체)
├── src/
│   ├── lib/
│   │   └── supabaseClient.ts       # Supabase 클라이언트 SDK 설정 및 TypeScript 인터페이스
│   └── services/
│       └── aiAgentService.ts       # Supabase Edge Function 호출 및 클라이언트 시뮬레이션 폴백
├── supabase/
│   ├── functions/
│   │   └── analyze-cat/
│   │       └── index.ts            # Gemini 2.5 Flash 멀티모달 AI 에이전트 Edge Function
│   └── migrations/
│       └── 20261020000000_init_cat_mbti.sql # DB 테이블(butlers, cats, assessments, health_logs) & Storage 버킷
├── .env.example                    # 환경변수 템플릿
├── package.json                    # 프로젝트 의존성 및 실행 스크립트
└── README.md                       # 배포 및 실행 가이드
```

---

## 🚀 3단계 빠른 시작 가이드 (Quick Start)

### Step 1. Supabase 프로젝트 세팅 (5분)
1. [Supabase](https://supabase.com)에 로그인 후 새 프로젝트를 생성합니다.
2. 좌측 메뉴의 **SQL Editor**로 이동합니다.
3. `supabase/migrations/20261020000000_init_cat_mbti.sql` 파일의 내용을 복사해 붙여넣고 **Run**을 실행합니다.
   - `butlers`, `cats`, `assessments`, `health_logs` 테이블이 생성되고 RLS 정책과 `cat-media` Storage 버킷이 자동 설정됩니다.

### Step 2. AI 에이전트 환경변수 설정 & Edge Function 배포
1. [Google AI Studio](https://aistudio.google.com/)에서 **Gemini API Key**를 발급받습니다.
2. Supabase 대시보드 **Project Settings > Edge Functions > Secrets**에 환경변수를 등록합니다:
   - `GEMINI_API_KEY`: 발급받은 Gemini API 키
   - `SUPABASE_URL`: 프로젝트 URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Project API keys의 service_role secret
3. 터미널에서 Edge Function을 배포합니다:
   ```bash
   npx supabase functions deploy analyze-cat
   ```

### Step 3. GitHub 레포지토리 푸시 & Vercel 배포
1. 본 프로젝트 폴더를 새 GitHub 레포지토리에 푸시합니다:
   ```bash
   git init
   git add .
   git commit -m "feat: 냥BTI 연구소 풀스택 초기 커밋"
   git branch -M main
   git remote add origin https://github.com/<내계정>/cat-mbti-lab.git
   git push -u origin main
   ```
2. [Vercel](https://vercel.com)에 로그인하고 해당 GitHub 레포지토리를 **Import**합니다.
3. 환경변수에 `VITE_SUPABASE_URL`과 `VITE_SUPABASE_ANON_KEY`를 넣고 **Deploy**를 누르면 상용 웹앱 서비스가 즉시 오픈됩니다!

---

## 💡 로컬 개발 환경 실행
```bash
npm install
npm run dev
```
브라우저에서 `http://localhost:5173`으로 접속하면 즉시 테스트할 수 있습니다.
