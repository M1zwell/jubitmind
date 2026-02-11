<p align="center">
  <strong>JubitMind</strong><br/>
  <em>사람의 판단과 AI의 지성이 만나는 곳. 모든 상호작용에 가치를.</em>
</p>

<p align="center">
  <a href="./README.md">English</a> ·
  <a href="./README.zh-CN.md">简体中文</a> ·
  <a href="./README.ja.md">日本語</a>
</p>

<p align="center">
  <a href="https://github.com/M1zwell/jubitmind/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg" alt="License"></a>
  <img src="https://img.shields.io/badge/TypeScript-5.6-blue" alt="TypeScript">
  <img src="https://img.shields.io/badge/React-18-61dafb" alt="React">
  <img src="https://img.shields.io/badge/Node.js-20+-339933" alt="Node.js">
  <img src="https://img.shields.io/badge/Python-3.10+-3776AB" alt="Python">
  <img src="https://img.shields.io/badge/Electron-34-47848f" alt="Electron">
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED" alt="Docker">
  <img src="https://img.shields.io/badge/LangExtract-Integrated-FF6F00" alt="LangExtract">
</p>

---

**JubitMind**는 로컬 우선(local-first) 오픈소스 AI 상호작용 감사 및 거버넌스 플랫폼입니다. 11개 AI 코딩 도구에서 발생하는 모든 사람-AI 대화를 캡처, 분류, 위험도 평가 및 분석하며, [Google LangExtract](https://github.com/google/langextract)를 활용한 구조화된 엔티티 추출 기능을 제공합니다. 모든 대화 데이터는 사용자의 컴퓨터를 벗어나지 않습니다.

*[Jubit AI](https://jubit.ai) / [dseek](https://dseek.ai) 생태계의 일부입니다.*

## JubitMind를 사용해야 하는 이유

사람과 AI의 모든 상호작용에는 가치가 있습니다 -- 작성하는 프롬프트, 내리는 결정, 함께 만드는 코드 모두. JubitMind는 다음을 도와줍니다:

- **감사(Audit)** 단일 대시보드에서 모든 AI 도구 상호작용을 감사
- **추출(Extract)** 출처 추적이 가능한 구조화된 엔티티를 대화에서 추출
- **탐색(Explore)** 세션 전체의 모든 상호작용을 탐색 -- 모델, 도구, 위험 등급, 카테고리별 필터링
- **분석(Analyze)** AI 기반 인사이트로 프롬프트 패턴, 도구 사용 추세, 모델 비용을 분석
- **위험 평가(Score risk)** 모든 도구 사용(파일 쓰기, 셸 명령, git push)에 대해 위험도를 평가
- **내보내기(Export)** 인사이트 보고서를 Markdown, PDF 또는 PNG 데이터보드로 내보내기
- **데이터 소유권 확보** -- 모든 것이 로컬에서 실행되며, 프라이버시를 보장하는 설계

## 주요 기능

### LangExtract 통합

[Google LangExtract](https://github.com/google/langextract)를 활용한 AI 대화의 심층 구조화 추출:

```
Sessions (JSONL) → JubitMind Server → LangExtract Sidecar (FastAPI)
                                           ↓
                                     Ollama / Gemini / OpenAI
                                           ↓
                                     Structured Extractions
                                           ↓
                                     Insights Dashboard + Explorer
```

**LangExtract + JubitMind를 함께 사용하는 이유**

| LangExtract 제공 기능 | JubitMind 제공 기능 |
|-----------------------|-------------------|
| 정밀한 출처 기반 추출 | 멀티 도구 세션 수집 |
| 구조화된 출력 스키마 | 위험 평가 및 자동 태깅 |
| 장문서 청크 분할 | 세션 간 통합 집계 |
| 다중 패스 추출 | 인터랙티브 시각화 |
| 유연한 LLM 지원 | 로컬 우선 배포 |

**AI 감사를 위한 추출 스키마:**

| 클래스 | 감지 대상 |
|-------|---------|
| `permission-grant` | 사용자가 승인한 도구 실행 |
| `risk-event` | 위험한 명령, 외부 API 호출 |
| `intent-shift` | 세션 내 주제 변경 |
| `code-artifact` | 생성 또는 수정된 파일과 경로 |
| `thinking-insight` | 모델 사고 블록의 핵심 추론 |
| `architecture-decision` | 시스템 설계 결정 및 트레이드오프 |

**기본적으로 로컬 우선**: Ollama가 추출 모델을 로컬에서 실행하므로 API 키가 필요 없고, 데이터가 외부로 나가지 않습니다. 클라우드 모델(Gemini, OpenAI)은 선택적 터보 모드로 사용할 수 있습니다.

### 상호작용 탐색기(Interaction Explorer)

단일 페이지에서 모든 세션의 상호작용을 탐색할 수 있습니다:

- **카테고리 탭**: User Prompts | Planning & Thinking | Tool Calls | Tool Results | Model Outputs
- **필터 사이드바**: 검색, 도구 이름, 모델 패밀리, 위험 등급, 프로젝트, 날짜 범위
- **75,000개 이상의 상호작용**을 인메모리로 인덱싱 및 검색 가능
- **확장 가능한 카드**로 전체 내용을 온디맨드로 조회
- "세션에서 열기" 내비게이션으로 맥락 확인

### 인사이트 에이전트(Insights Agent)

백그라운드 분석 에이전트가 주기적으로 보고서를 생성합니다(매 시간):

- **프롬프트 패턴**: 공통 주제, 반복 요청, 평균 프롬프트 길이
- **도구 사용 추세**: 가장 많이 사용된 도구, 시간별 위험 노출(Recharts 차트)
- **모델 비교**: 모델 패밀리별 세션, 토큰, 예상 비용
- **추천 사항**: 사용 패턴 기반의 실행 가능한 인사이트
- **온디맨드 실행**: "지금 실행" 클릭으로 즉시 분석

### 보고서 내보내기

인사이트 보고서를 세 가지 형식으로 내보낼 수 있습니다:

| 형식 | 설명 |
|--------|-------------|
| **Markdown** | 테이블, 주제, 추천 사항이 포함된 `.md` 파일 |
| **PDF** | 렌더링된 차트가 포함된 스타일링된 A4 문서 |
| **PNG** | 공유용 고해상도 2x 데이터보드 이미지 |

### 세션 분류(Session Classification)

모든 세션은 시작 시 자동으로 분류됩니다:

- **사용된 모델**: opus, sonnet, haiku, gpt-4o, gemini, deepseek 등
- **사용된 도구**: 위험 등급 포함(critical/high/medium/low)
- **메시지 구성**: 사용자 프롬프트, 어시스턴트 텍스트, 사고 블록, 도구 호출
- **주요 카테고리**: 도구 중심, 기획 중심, 프롬프트 중심, 균형형
- **패싯 필터링**: 실시간 카운트가 포함된 다중 선택 드롭다운

### 멀티 도구 어댑터 시스템

JubitMind는 통합 어댑터 인터페이스를 통해 **11개 AI 코딩 도구**의 세션을 탐색하고 읽어들입니다:

| 도구 | 상태 | 데이터 소스 |
|------|--------|------------|
| Claude Code CLI | 자동 탐색 | `~/.claude/projects/` JSONL sessions |
| Claude VS Code | 자동 탐색 | VS Code extension storage |
| Cursor | 자동 탐색 | `~/Library/Application Support/Cursor/` SQLite |
| Windsurf | 스텁 준비됨 | `~/Library/Application Support/Windsurf/` |
| GitHub Copilot | 스텁 준비됨 | VS Code Copilot extension |
| Continue.dev | 스텁 준비됨 | `~/.continue/sessions/` |
| Aider | 스텁 준비됨 | `~/.aider.chat.history.md` |
| OpenAI Codex CLI | 스텁 준비됨 | `~/.codex/` |
| Kilo Code | 스텁 준비됨 | VS Code extension storage |
| Kimi CLI | 스텁 준비됨 | `~/.kimi/` |
| Antigravity | 스텁 준비됨 | `~/.antigravity/` |

### 위험 평가 엔진(Risk Scoring Engine)

모든 대화의 도구 사용에 대해 위험도를 평가합니다:

| 수준 | 점수 | 예시 |
|-------|-------|----------|
| **치명적(Critical)** | 4 | `rm -rf`, `sudo`, `git push --force`, credential access |
| **높음(High)** | 3 | `git push`, `npm publish`, `docker`, external API calls |
| **보통(Medium)** | 2 | `git commit`, file writes/edits, builds, installs |
| **낮음(Low)** | 1 | File reads, searches, grep (read-only operations) |

보안, 파일 시스템, 네트워크, git 작업 전반에 걸쳐 30개 이상의 탐지 패턴을 갖추고 있습니다.

### 감사 에이전트(Auditor Agent)

30분마다 실행되는 백그라운드 보안 스캐너:

- 탐색된 모든 세션에서 보안 위험을 검사
- 과대 세션, 성능 이슈, 과금 이상 감지
- 심각도 순위별 구조화된 보고서 생성
- UI에서 긴급 감사 트리거 가능

### 에이전트 설정 감사(Agent Config Auditor)

9개 AI 도구의 **17가지 설정 파일 형식**을 탐색하고 감사합니다:

- 유출된 API 키 감지(`sk-`, `sk-ant-`, `ghp_`, `xai-`)
- 위험한 셸 명령, 권한 우회, 안전 설정 무시 플래그 탐지
- 구문 강조 기능이 포함된 인라인 Monaco 에디터로 직접 편집 가능

### 추가 기능

- **LiteLLM 라우팅 대시보드** -- 모델 라우팅, 지출 추적, API 키 모니터링
- **세션 분석** -- LLM 기반의 개별 세션 심층 분석
- **아카이브** -- 장기 세션 저장 및 조회
- **애널리틱스** -- 사용 추세, 도구 분포, 위험도 히트맵(Recharts)
- **MCP 서버** -- Model Context Protocol 서버 관리
- **Skills / Commands / Memory** -- Claude Code 지식 베이스 브라우저
- **풍부한 메시지 렌더링** -- 도구 사용 블록, 사고 블록, 메시지 타입 필터링
- **다크 테마** -- zinc/slate 팔레트 기반의 완전한 다크 모드 UI

## 빠른 시작

### 사전 요구 사항

- Node.js 20+
- npm 9+

### 개발 환경

```bash
git clone https://github.com/M1zwell/jubitmind.git
cd jubitmind

npm install
npm run dev

# Client: http://localhost:8081
# API:    http://localhost:3001
```

### 프로덕션

```bash
npm run build
npm start
# Serves on http://localhost:3000
```

### Docker

```bash
docker build -t jubitmind .
docker run -p 3000:3000 -v ~/.claude:/data/.claude:ro jubitmind

# Or with Docker Compose
docker compose up -d
```

### 데스크톱 앱 (macOS / Windows)

```bash
# Development
npm run electron:dev

# Build for macOS (.dmg)
npm run electron:build:mac

# Build for Windows (.exe)
npm run electron:build:win
```

원클릭 설치. 터미널 불필요. 실행 시 세션을 자동으로 탐색합니다.

## 아키텍처

```
jubitmind/
├── server/
│   ├── index.ts                    # 서버 엔트리, 라우트 마운팅, 시작 체인
│   ├── routes/
│   │   ├── conversations.ts        # 세션, 메시지, 패싯, 분류
│   │   ├── explorer.ts             # 세션 간 상호작용 탐색
│   │   ├── insights.ts             # AI 인사이트 보고서
│   │   ├── auditor.ts              # 보안 감사기
│   │   ├── adapters.ts             # AI 도구 어댑터
│   │   ├── agent-configs.ts        # 설정 탐색 및 편집
│   │   ├── litellm.ts              # LiteLLM 프록시
│   │   └── ...                     # analysis, archives, cli, config, mcp 등
│   └── services/
│       ├── adapters/               # 11개 AI 도구 어댑터 + 레지스트리
│       ├── session-classifier.ts   # 모델/도구/카테고리 분류
│       ├── interaction-index.ts    # 인메모리 세션 간 인덱스 (75K+ 항목)
│       ├── insights-agent.ts       # 백그라운드 인사이트 분석
│       ├── auditor-agent.ts        # 백그라운드 보안 스캐너
│       ├── risk-scorer.ts          # 위험 평가 엔진 (30+ 패턴)
│       ├── auto-tagger.ts          # 자동 분류 엔진
│       ├── session-cache.ts        # 분류 포함 세션 메타데이터 캐시
│       └── ...
├── src/
│   ├── App.tsx                     # 20개 이상의 라우트를 가진 라우터
│   ├── pages/
│   │   ├── InteractionExplorerPage.tsx  # 세션 간 탐색기
│   │   └── InsightsPage.tsx             # 차트가 포함된 인사이트 대시보드
│   ├── components/
│   │   ├── layout/Sidebar.tsx      # 7개 섹션 내비게이션
│   │   ├── conversations/          # 세션 목록, 메시지 스레드, 필터
│   │   ├── auditor/                # 감사 보고서 UI
│   │   ├── config/                 # 에이전트 설정 + Monaco 에디터
│   │   ├── litellm/                # LiteLLM 라우팅 대시보드
│   │   └── ...
│   ├── hooks/                      # React Query 훅
│   └── lib/
│       ├── api.ts                  # API 클라이언트 (adapters, conversations, explorer, insights)
│       ├── export-insights.ts      # MD/PDF/PNG 내보내기 유틸리티
│       └── types.ts                # 공유 TypeScript 타입
├── electron/                       # 데스크톱 앱 (macOS + Windows)
├── Dockerfile                      # 멀티 스테이지 프로덕션 빌드
├── docker-compose.yml              # 컨테이너 오케스트레이션
└── package.json
```

## API 레퍼런스

### Explorer

| 메서드 | 경로 | 설명 |
|--------|------|-------------|
| GET | `/api/explorer/interactions` | 상호작용 조회 (category, tool, model, risk, search) |
| GET | `/api/explorer/interactions/:id/content` | 온디맨드 전체 내용 조회 |
| GET | `/api/explorer/facets` | 탐색기 전체 패싯 카운트 |
| GET | `/api/explorer/stats` | 인덱스 통계 |

### Insights

| 메서드 | 경로 | 설명 |
|--------|------|-------------|
| GET | `/api/insights/status` | 에이전트 실행 상태 |
| GET | `/api/insights/reports/latest` | 최신 인사이트 보고서 |
| GET | `/api/insights/reports` | 보고서 이력 |
| POST | `/api/insights/run` | 온디맨드 분석 트리거 |

### Conversations

| 메서드 | 경로 | 설명 |
|--------|------|-------------|
| GET | `/api/conversations/sessions` | 세션 목록 (model, tools, category, hasThinking 필터) |
| GET | `/api/conversations/sessions/:id/messages` | 페이지네이션된 메시지 |
| GET | `/api/conversations/sessions/:id/risk` | 위험 점수 + 자동 태그 |
| GET | `/api/conversations/facets` | 모델/도구/카테고리 패싯 카운트 |
| GET | `/api/conversations/classification-status` | 분류 진행 상황 |
| POST | `/api/conversations/sessions/:id/classify` | 온디맨드 분류 |

### Adapters

| 메서드 | 경로 | 설명 |
|--------|------|-------------|
| GET | `/api/adapters` | 모든 어댑터 및 사용 가능 여부 조회 |
| GET | `/api/adapters/:id/sessions` | 특정 도구의 세션 |
| GET | `/api/adapters/:id/stats` | 도구별 집계 통계 |

### Auditor

| 메서드 | 경로 | 설명 |
|--------|------|-------------|
| GET | `/api/auditor/status` | 감사기 상태 |
| GET | `/api/auditor/reports/latest` | 최신 감사 보고서 |
| POST | `/api/auditor/run` | 긴급 감사 트리거 |

### LiteLLM

| 메서드 | 경로 | 설명 |
|--------|------|-------------|
| GET | `/api/litellm/models` | 설정된 모델 |
| GET | `/api/litellm/spend` | 모델/일별 비용 |
| GET | `/api/litellm/usage` | 요청 볼륨 |

## 로드맵

### LangExtract 심층 통합

| 단계 | 설명 | 상태 |
|-------|-------------|--------|
| 1 | Python sidecar (FastAPI bridge) + 추출 서비스 | 예정 |
| 2 | 비주얼 추출 템플릿 빌더 (제로코드 UI) | 예정 |
| 3 | 메시지 스레드 내 인라인 추출 주석 | 예정 |
| 4 | 커뮤니티 추출 템플릿 마켓플레이스 | 예정 |

### 데스크톱 앱

| 단계 | 설명 | 상태 |
|-------|-------------|--------|
| 1 | Electron 데스크톱 앱 (macOS + Windows) | 완료 |
| 2 | Tauri 마이그레이션 (5-15MB vs 150MB+) | 예정 |
| 3 | PyInstaller 번들 LangExtract sidecar | 예정 |
| 4 | 원클릭 설치 프로그램 및 자동 업데이트 | 예정 |

### 플랫폼

| 기능 | 상태 |
|---------|--------|
| 세션 분류 + 패싯 필터 | 완료 |
| 상호작용 탐색기 (75K+ 인덱싱) | 완료 |
| 백그라운드 분석이 포함된 인사이트 에이전트 | 완료 |
| 보고서 내보내기 (MD/PDF/PNG) | 완료 |
| 멀티 도구 어댑터 시스템 (11개 도구) | 완료 (3개 활성, 8개 스텁) |
| LiteLLM 라우팅 대시보드 | 완료 |
| Ollama 로컬 LLM 지원 | 예정 |
| 커뮤니티 추출 템플릿 | 예정 |

## 환경 변수

| 변수 | 필수 | 설명 |
|----------|----------|-------------|
| `PORT` | 아니오 | 서버 포트 (기본값: 개발 3001, 프로덕션 3000) |
| `CLAUDE_HOME` | 아니오 | Claude 데이터 디렉토리 재정의 (기본값: `~/.claude`) |
| `LITELLM_DB_URL` | 아니오 | LiteLLM 지출 추적용 PostgreSQL 연결 |
| `SUPABASE_URL` | 아니오 | Supabase 프로젝트 URL (클라우드 기능용) |
| `SUPABASE_ANON_KEY` | 아니오 | Supabase 익명 키 |

모든 환경 변수는 선택 사항입니다. JubitMind는 로컬 파일 시스템 접근만으로 완전한 오프라인 작동이 가능합니다.

## 기술 스택

| 계층 | 기술 |
|-------|-----------|
| 프론트엔드 | React 18, TypeScript, Vite 5, Tailwind CSS 3 |
| 백엔드 | Express 4, TypeScript, Node.js 20+ |
| 추출 | Google LangExtract, Python 3.10+, FastAPI |
| 상태 관리 | TanStack React Query v5 |
| 차트 | Recharts 3 |
| 에디터 | Monaco Editor |
| 아이콘 | Lucide React |
| 데스크톱 | Electron 34 (Tauri 마이그레이션 예정) |
| 컨테이너 | Docker (node:20-alpine multi-stage) |
| 로컬 LLM | Ollama (추출 기본값으로 예정) |

## 스크립트

| 스크립트 | 설명 |
|--------|-------------|
| `npm run dev` | 개발 모드에서 클라이언트 + 서버 시작 |
| `npm run dev:client` | Vite 개발 서버 (port 8081) |
| `npm run dev:server` | 핫 리로드 포함 Express 서버 |
| `npm run build` | 프로덕션 빌드 (Vite + TypeScript) |
| `npm start` | 프로덕션 서버 실행 (port 3000) |
| `npm run docker:build` | Docker 이미지 빌드 |
| `npm run docker:run` | Docker 컨테이너 실행 |
| `npm run docker:compose` | Docker Compose로 시작 |
| `npm run electron:dev` | Electron 앱 빌드 + 실행 |
| `npm run electron:build:mac` | macOS 설치 프로그램 빌드 (.dmg) |
| `npm run electron:build:win` | Windows 설치 프로그램 빌드 (.exe) |

## 기여 방법

기여를 환영합니다. 다음 절차를 따라주세요:

1. 저장소를 포크합니다
2. 기능 브랜치를 생성합니다 (`git checkout -b feature/my-feature`)
3. Conventional Commit 메시지로 커밋합니다 (`feat:`, `fix:`, `docs:` 등)
4. 푸시하고 Pull Request를 엽니다

포크를 배포할 계획이라면 `TRADEMARKS.md`의 네이밍 가이드라인을 참조하세요.

## 라이선스

**Apache License 2.0**으로 라이선스됩니다 -- 전문은 [LICENSE](LICENSE)를 참조하세요.

```
Copyright 2025-2026 Jubit AI (jubit.ai)
```

### 상표

**Jubit**, **Jubit AI**, **JubitMind**, **ChatAB**, **ChatLab**이라는 명칭은 Jubit AI의 상표이며 Apache 2.0 라이선스에 **포함되지 않습니다**. 출처 표기(예: "JubitMind 기반")에는 사용할 수 있으나, 파생 제품의 브랜드명으로는 사용할 수 없습니다. 전체 정책은 [TRADEMARKS.md](TRADEMARKS.md)를 참조하세요.

---

<p align="center">
  <a href="https://jubit.ai">Jubit AI</a>가 만들었습니다
</p>
