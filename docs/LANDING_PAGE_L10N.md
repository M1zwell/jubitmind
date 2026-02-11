# JubitMind Landing Page — Localization (l10n)

4 languages: **English (en)** · **Simplified Chinese (zh-CN)** · **Japanese (ja)** · **Korean (ko)**

---

## Implementation: i18n Setup

### Option A: Lightweight (Recommended for SPA landing page)

No library needed — use a simple context + JSON map. The landing page is a single component with ~50 strings, so a full i18n library (react-i18next) is overkill.

```typescript
// src/i18n/jubitmind.ts

export type Locale = 'en' | 'zh-CN' | 'ja' | 'ko';

export function detectLocale(): Locale {
  const stored = localStorage.getItem('jubitmind-locale');
  if (stored && ['en', 'zh-CN', 'ja', 'ko'].includes(stored)) return stored as Locale;

  const nav = navigator.language || '';
  if (nav.startsWith('zh')) return 'zh-CN';
  if (nav.startsWith('ja')) return 'ja';
  if (nav.startsWith('ko')) return 'ko';
  return 'en';
}

export function setLocale(locale: Locale) {
  localStorage.setItem('jubitmind-locale', locale);
}

// Usage in component:
// const [locale, setLocale] = useState<Locale>(detectLocale());
// const t = translations[locale];
// <h1>{t.hero.headline}</h1>
```

### Option B: react-i18next (If already in project)

If the dseek.ai codebase already uses react-i18next, add a `jubitmind` namespace:

```typescript
// src/i18n/locales/en/jubitmind.json
// src/i18n/locales/zh-CN/jubitmind.json
// src/i18n/locales/ja/jubitmind.json
// src/i18n/locales/ko/jubitmind.json
```

### Language Switcher Component

```
┌──────────────────────────┐
│  🌐  EN | 中文 | 日本語 | 한국어  │
└──────────────────────────┘
```

Place in top-right corner of the landing page hero section. Style:

```typescript
const LOCALE_LABELS: Record<Locale, string> = {
  'en': 'EN',
  'zh-CN': '中文',
  'ja': '日本語',
  'ko': '한국어',
};
```

```tsx
<div className="flex items-center gap-1 text-sm">
  <Globe size={14} className="text-[var(--color-text-muted)]" />
  {(['en', 'zh-CN', 'ja', 'ko'] as Locale[]).map((loc, i) => (
    <Fragment key={loc}>
      {i > 0 && <span className="text-[var(--color-border)]">|</span>}
      <button
        onClick={() => changeLocale(loc)}
        className={`px-1.5 py-0.5 rounded transition-colors ${
          locale === loc
            ? 'text-teal-400 font-medium'
            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
        }`}
      >
        {LOCALE_LABELS[loc]}
      </button>
    </Fragment>
  ))}
</div>
```

---

## Translation Strings

### Section 1: Hero

| Key | EN | 中文 (zh-CN) | 日本語 (ja) | 한국어 (ko) |
|-----|-----|------|------|------|
| `hero.headline` | Human judgement meets AI mind. Every interaction, valued. | 人类判断力遇见AI智慧。每一次交互，皆有价值。 | 人間の判断力とAIの知性が出会う。すべての対話に、価値を。 | 인간의 판단력이 AI의 지성을 만나다. 모든 상호작용에 가치를. |
| `hero.subline` | The open-source AI interaction audit platform. Risk-score, classify, and govern every human-AI conversation across 11 coding tools. | 开源 AI 交互审计平台。跨 11 种编码工具，对每一次人机对话进行风险评分、分类与治理。 | オープンソースのAI対話監査プラットフォーム。11のコーディングツールにわたる、すべての人間-AI会話をリスクスコアリング、分類、ガバナンス。 | 오픈소스 AI 상호작용 감사 플랫폼. 11개 코딩 도구에 걸쳐 모든 인간-AI 대화를 위험 점수화, 분류 및 거버넌스. |
| `hero.version` | v0.77.0 · Open Source · Apache 2.0 | v0.77.0 · 开源 · Apache 2.0 许可证 | v0.77.0 · オープンソース · Apache 2.0 | v0.77.0 · 오픈소스 · Apache 2.0 |
| `hero.download_mac` | Download for macOS | 下载 macOS 版 | macOS版をダウンロード | macOS용 다운로드 |
| `hero.download_win` | Download for Windows | 下载 Windows 版 | Windows版をダウンロード | Windows용 다운로드 |
| `hero.github` | View on GitHub | 在 GitHub 上查看 | GitHubで見る | GitHub에서 보기 |
| `hero.mac_sublabel` | Apple Silicon (arm64) · DMG | Apple Silicon (arm64) · DMG 镜像 | Apple Silicon (arm64) · DMG | Apple Silicon (arm64) · DMG |
| `hero.win_sublabel` | 64-bit · Installer (.exe) | 64 位 · 安装程序 (.exe) | 64ビット · インストーラー (.exe) | 64비트 · 설치 프로그램 (.exe) |
| `hero.mac_zip` | ZIP Archive | ZIP 压缩包 | ZIPアーカイブ | ZIP 아카이브 |
| `hero.win_portable` | Portable (no install) | 便携版（免安装） | ポータブル版（インストール不要） | 포터블 (설치 불필요) |
| `hero.all_releases` | All releases | 所有版本 | すべてのリリース | 모든 릴리스 |

### Section 2: Problem Statement

| Key | EN | 中文 (zh-CN) | 日本語 (ja) | 한국어 (ko) |
|-----|-----|------|------|------|
| `problem.headline` | You use AI every day. But do you know what it's doing? | 你每天都在使用 AI。但你知道它在做什么吗？ | 毎日AIを使っている。でも、AIが何をしているか知っていますか？ | 매일 AI를 사용합니다. 하지만 AI가 무엇을 하는지 알고 있나요? |
| `problem.scattered_title` | Scattered Across Tools | 工具间零散分布 | ツール間に散在 | 도구 간에 분산 |
| `problem.scattered_desc` | Your conversations live in 11 different AI tools. Good luck finding that one prompt. | 你的对话散落在 11 种不同的 AI 工具中。想找到那条特定的提示词？祝你好运。 | 会話は11種類のAIツールに散らばっている。あのプロンプトを見つけるのは至難の業。 | 대화가 11개의 서로 다른 AI 도구에 흩어져 있습니다. 그 프롬프트를 찾는 건 행운이 필요합니다. |
| `problem.risk_title` | Zero Risk Visibility | 零风险可见性 | リスク可視性ゼロ | 제로 리스크 가시성 |
| `problem.risk_desc` | Which sessions touched credentials? Ran destructive commands? You don't know. | 哪些会话涉及了凭据？执行了破坏性命令？你并不知道。 | どのセッションが認証情報に触れた？破壊的なコマンドを実行した？あなたは知らない。 | 어떤 세션이 자격 증명에 접근했나요? 파괴적인 명령을 실행했나요? 알 수 없습니다. |
| `problem.classify_title` | No Classification | 缺乏分类 | 分類なし | 분류 없음 |
| `problem.classify_desc` | Is it code generation? Security work? IP creation? Nobody tracks this. | 是代码生成？安全工作？知识产权创造？没有人在追踪这些。 | コード生成？セキュリティ作業？知的財産の創造？誰も追跡していない。 | 코드 생성인가요? 보안 작업? IP 생성? 아무도 추적하지 않습니다. |

### Section 3: Solution Overview

| Key | EN | 中文 (zh-CN) | 日本語 (ja) | 한국어 (ko) |
|-----|-----|------|------|------|
| `solution.headline` | JubitMind: Your AI governance layer. | JubitMind：你的 AI 治理层。 | JubitMind：あなたのAIガバナンスレイヤー。 | JubitMind: 당신의 AI 거버넌스 레이어. |
| `solution.feature1` | Auto-discovers all AI sessions across 11 tools and IDEs | 自动发现 11 种工具和 IDE 中的所有 AI 会话 | 11のツールとIDEにわたる全AIセッションを自動発見 | 11개 도구와 IDE에 걸쳐 모든 AI 세션을 자동 발견 |
| `solution.feature2` | Risk-scores every tool action (Critical / High / Medium / Low) | 对每个工具操作进行风险评分（严重 / 高 / 中 / 低） | すべてのツールアクションをリスクスコアリング（重大/高/中/低） | 모든 도구 작업을 위험 점수화 (심각 / 높음 / 중간 / 낮음) |
| `solution.feature3` | Auto-classifies conversations by domain and sensitivity | 按领域和敏感度自动分类对话 | ドメインと機密性で会話を自動分類 | 도메인 및 민감도별로 대화를 자동 분류 |
| `solution.feature4` | Background security auditor scans every 30 minutes | 后台安全审计员每 30 分钟扫描一次 | バックグラウンドセキュリティ監査が30分ごとにスキャン | 백그라운드 보안 감사관이 30분마다 스캔 |
| `solution.feature5` | Rich tool_use rendering with expandable I/O | 丰富的 tool_use 渲染，支持可展开的输入/输出 | 展開可能なI/Oを備えたリッチなtool_useレンダリング | 확장 가능한 I/O로 풍부한 tool_use 렌더링 |
| `solution.feature6` | 100% local — your data never leaves your machine | 100% 本地运行 — 你的数据永远不会离开你的电脑 | 100%ローカル — データはあなたのマシンから出ない | 100% 로컬 — 데이터가 컴퓨터를 떠나지 않음 |

### Section 4: Feature Grid

| Key | EN | 中文 (zh-CN) | 日本語 (ja) | 한국어 (ko) |
|-----|-----|------|------|------|
| `features.risk_title` | Risk Scoring | 风险评分 | リスクスコアリング | 리스크 스코어링 |
| `features.risk_desc` | 4 risk levels · 30+ patterns · Real-time scoring | 4 个风险等级 · 30+ 检测模式 · 实时评分 | 4段階のリスクレベル · 30+パターン · リアルタイムスコアリング | 4단계 위험 수준 · 30+ 패턴 · 실시간 점수화 |
| `features.tags_title` | Auto-Tags | 自动标签 | 自動タグ | 자동 태그 |
| `features.tags_desc` | 3 categories · 12+ auto-tags · Confidence-based · Zero config | 3 大类别 · 12+ 自动标签 · 基于置信度 · 零配置 | 3カテゴリ · 12+自動タグ · 信頼度ベース · 設定不要 | 3개 카테고리 · 12+ 자동 태그 · 신뢰도 기반 · 설정 불필요 |
| `features.tools_title` | 11 AI Tools | 11 种 AI 工具 | 11のAIツール | 11개 AI 도구 |
| `features.tools_desc` | Claude Code, Cursor, Copilot, Windsurf, Aider, Kilo & more · Auto-discovery | Claude Code、Cursor、Copilot、Windsurf、Aider、Kilo 等 · 自动发现 | Claude Code、Cursor、Copilot、Windsurf、Aider、Kiloなど · 自動検出 | Claude Code, Cursor, Copilot, Windsurf, Aider, Kilo 등 · 자동 검색 |
| `features.rendering_title` | Rich Rendering | 富文本渲染 | リッチレンダリング | 리치 렌더링 |
| `features.rendering_desc` | tool_use blocks · thinking blocks · risk-colored borders · expandable I/O | tool_use 块 · 思维块 · 风险色边框 · 可展开 I/O | tool_useブロック · thinkingブロック · リスク色ボーダー · 展開可能I/O | tool_use 블록 · thinking 블록 · 위험 색상 테두리 · 확장 가능 I/O |
| `features.auditor_title` | Auditor Agent | 审计代理 | 監査エージェント | 감사 에이전트 |
| `features.auditor_desc` | Background scanner · Every 30 minutes · Severity-ranked reports · Emergency trigger | 后台扫描器 · 每 30 分钟 · 严重性排序报告 · 紧急触发 | バックグラウンドスキャナー · 30分ごと · 重大度順レポート · 緊急トリガー | 백그라운드 스캐너 · 30분마다 · 심각도 순위 보고서 · 긴급 트리거 |
| `features.analytics_title` | Analytics | 数据分析 | アナリティクス | 분석 |
| `features.analytics_desc` | Usage trends · Risk heatmaps · Tool distribution · Cost tracking | 使用趋势 · 风险热力图 · 工具分布 · 成本追踪 | 利用トレンド · リスクヒートマップ · ツール分布 · コスト追跡 | 사용 추세 · 리스크 히트맵 · 도구 분포 · 비용 추적 |

### Section 5: Risk Scoring Visual

| Key | EN | 中文 (zh-CN) | 日本語 (ja) | 한국어 (ko) |
|-----|-----|------|------|------|
| `risk.headline` | Every AI action, scored by risk. Instantly. | 每一个 AI 操作，即时风险评分。 | すべてのAIアクション、瞬時にリスクスコアリング。 | 모든 AI 작업, 즉시 위험 점수화. |
| `risk.critical` | Critical | 严重 | 重大 | 심각 |
| `risk.critical_examples` | rm -rf, sudo, git push --force, credential access | rm -rf、sudo、git push --force、凭据访问 | rm -rf、sudo、git push --force、認証情報アクセス | rm -rf, sudo, git push --force, 자격 증명 접근 |
| `risk.high` | High | 高 | 高 | 높음 |
| `risk.high_examples` | git push, npm publish, docker, external API calls | git push、npm publish、docker、外部 API 调用 | git push、npm publish、docker、外部APIコール | git push, npm publish, docker, 외부 API 호출 |
| `risk.medium` | Medium | 中 | 中 | 중간 |
| `risk.medium_examples` | git commit, file writes/edits, builds, installs | git commit、文件写入/编辑、构建、安装 | git commit、ファイル書き込み/編集、ビルド、インストール | git commit, 파일 쓰기/편집, 빌드, 설치 |
| `risk.low` | Low | 低 | 低 | 낮음 |
| `risk.low_examples` | File reads, searches, grep (read-only operations) | 文件读取、搜索、grep（只读操作） | ファイル読み取り、検索、grep（読み取り専用操作） | 파일 읽기, 검색, grep (읽기 전용 작업) |
| `risk.patterns_note` | 30+ detection patterns across security, file system, network, and git operations. | 涵盖安全、文件系统、网络和 git 操作的 30+ 检测模式。 | セキュリティ、ファイルシステム、ネットワーク、git操作にわたる30+の検出パターン。 | 보안, 파일 시스템, 네트워크 및 git 작업에 걸쳐 30+ 탐지 패턴. |

### Section 6: Supported Tools

| Key | EN | 中文 (zh-CN) | 日本語 (ja) | 한국어 (ko) |
|-----|-----|------|------|------|
| `tools.headline` | Works with every AI coding tool you use. | 支持你使用的每一种 AI 编码工具。 | あなたが使うすべてのAIコーディングツールに対応。 | 당신이 사용하는 모든 AI 코딩 도구와 호환. |
| `tools.full_support` | Full support | 完整支持 | フルサポート | 완전 지원 |
| `tools.coming_soon` | Adapter ready (coming soon) | 适配器就绪（即将推出） | アダプター準備完了（近日公開） | 어댑터 준비 완료 (곧 출시) |

### Section 7: Download CTA

| Key | EN | 中文 (zh-CN) | 日本語 (ja) | 한국어 (ko) |
|-----|-----|------|------|------|
| `cta.headline` | Start governing your AI conversations. | 开始治理你的 AI 对话。 | AIの会話のガバナンスを始めよう。 | AI 대화 거버넌스를 시작하세요. |
| `cta.subline` | Open-source. Self-hosted. Free. | 开源。自托管。免费。 | オープンソース。セルフホスト。無料。 | 오픈소스. 셀프호스팅. 무료. |
| `cta.or_source` | Or install from source: | 或从源码安装： | またはソースからインストール： | 또는 소스에서 설치: |
| `cta.star_github` | Star on GitHub | 在 GitHub 上点星 | GitHubでスターする | GitHub에서 스타 |
| `cta.view_docs` | View Documentation | 查看文档 | ドキュメントを見る | 문서 보기 |
| `cta.docker_note` | Also available via Docker: | 也可通过 Docker 使用： | Dockerでも利用可能： | Docker로도 사용 가능: |
| `cta.copy_clipboard` | Copy to clipboard | 复制到剪贴板 | クリップボードにコピー | 클립보드에 복사 |
| `cta.copied` | Copied! | 已复制！ | コピーしました！ | 복사됨! |

### Section 8: Philosophy / About

| Key | EN | 中文 (zh-CN) | 日本語 (ja) | 한국어 (ko) |
|-----|-----|------|------|------|
| `about.philosophy` | We value the finest humanity and the working with AI brains for better life. | 我们珍视最优秀的人性，并与 AI 智慧协作，共创更好的生活。 | 人間の最も優れた部分を大切にし、AIの頭脳と共により良い生活を目指す。 | 인류의 가장 뛰어난 가치를 소중히 여기며, AI 두뇌와 함께 더 나은 삶을 만들어갑니다. |
| `about.body` | Every prompt you craft, every decision you make, every solution you co-create with AI — these are records of human intelligence amplified by artificial minds. JubitMind helps you value, protect, and govern that collaboration. | 你编写的每一个提示词、做出的每一个决定、与 AI 共同创造的每一个解决方案 — 这些都是人类智慧被人工智能放大的记录。JubitMind 帮助你珍视、保护和治理这种协作。 | あなたが作るすべてのプロンプト、すべての決断、AIと共に生み出すすべてのソリューション — これらは人工知能によって増幅された人間の知性の記録です。JubitMindはその協働を大切にし、保護し、ガバナンスする手助けをします。 | 당신이 작성하는 모든 프롬프트, 내리는 모든 결정, AI와 함께 만드는 모든 솔루션 — 이것은 인공 지능에 의해 증폭된 인간 지성의 기록입니다. JubitMind는 그 협업을 소중히 여기고, 보호하고, 거버넌스하도록 돕습니다. |
| `about.ecosystem` | Part of the Jubit AI ecosystem. | Jubit AI 生态系统的一部分。 | Jubit AIエコシステムの一部。 | Jubit AI 생태계의 일부. |
| `about.copyright` | Built by Jubit AI · Apache 2.0 License · Copyright © 2025-2026 | 由 Jubit AI 构建 · Apache 2.0 许可证 · 版权所有 © 2025-2026 | Jubit AI制作 · Apache 2.0ライセンス · Copyright © 2025-2026 | Jubit AI 제작 · Apache 2.0 라이선스 · Copyright © 2025-2026 |

### Section 9: Footer

| Key | EN | 中文 (zh-CN) | 日本語 (ja) | 한국어 (ko) |
|-----|-----|------|------|------|
| `footer.documentation` | Documentation | 文档 | ドキュメント | 문서 |
| `footer.privacy` | Privacy Policy | 隐私政策 | プライバシーポリシー | 개인정보 처리방침 |
| `footer.terms` | Terms of Service | 服务条款 | 利用規約 | 이용약관 |
| `footer.trademarks` | Trademarks | 商标 | 商標 | 상표 |

### Common / Shared

| Key | EN | 中文 (zh-CN) | 日本語 (ja) | 한국어 (ko) |
|-----|-----|------|------|------|
| `common.learn_more` | Learn more | 了解更多 | 詳細を見る | 더 알아보기 |
| `common.get_started` | Get Started | 开始使用 | 始める | 시작하기 |
| `common.download` | Download | 下载 | ダウンロード | 다운로드 |
| `common.open_source` | Open Source | 开源 | オープンソース | 오픈소스 |
| `common.free` | Free | 免费 | 無料 | 무료 |
| `common.also_available_for` | Also available for | 也可用于 | こちらでも利用可能 | 다음에서도 사용 가능 |
| `common.first_launch_note` | First launch: A setup wizard will guide you through tool detection and configuration. | 首次启动：设置向导将引导你完成工具检测和配置。 | 初回起動：セットアップウィザードがツール検出と設定をガイドします。 | 첫 실행: 설정 마법사가 도구 감지 및 구성을 안내합니다. |

---

## JSON Export Format

For direct use in code, export as a nested JSON structure:

```typescript
// src/i18n/jubitmind-strings.ts

export const translations = {
  en: {
    hero: {
      headline: 'Human judgement meets AI mind. Every interaction, valued.',
      subline: 'The open-source AI interaction audit platform. Risk-score, classify, and govern every human-AI conversation across 11 coding tools.',
      version: 'v0.77.0 · Open Source · Apache 2.0',
      download_mac: 'Download for macOS',
      download_win: 'Download for Windows',
      github: 'View on GitHub',
      mac_sublabel: 'Apple Silicon (arm64) · DMG',
      win_sublabel: '64-bit · Installer (.exe)',
      mac_zip: 'ZIP Archive',
      win_portable: 'Portable (no install)',
      all_releases: 'All releases',
    },
    problem: {
      headline: "You use AI every day. But do you know what it's doing?",
      scattered_title: 'Scattered Across Tools',
      scattered_desc: 'Your conversations live in 11 different AI tools. Good luck finding that one prompt.',
      risk_title: 'Zero Risk Visibility',
      risk_desc: "Which sessions touched credentials? Ran destructive commands? You don't know.",
      classify_title: 'No Classification',
      classify_desc: 'Is it code generation? Security work? IP creation? Nobody tracks this.',
    },
    solution: {
      headline: 'JubitMind: Your AI governance layer.',
      feature1: 'Auto-discovers all AI sessions across 11 tools and IDEs',
      feature2: 'Risk-scores every tool action (Critical / High / Medium / Low)',
      feature3: 'Auto-classifies conversations by domain and sensitivity',
      feature4: 'Background security auditor scans every 30 minutes',
      feature5: 'Rich tool_use rendering with expandable I/O',
      feature6: '100% local — your data never leaves your machine',
    },
    features: {
      risk_title: 'Risk Scoring',
      risk_desc: '4 risk levels · 30+ patterns · Real-time scoring',
      tags_title: 'Auto-Tags',
      tags_desc: '3 categories · 12+ auto-tags · Confidence-based · Zero config',
      tools_title: '11 AI Tools',
      tools_desc: 'Claude Code, Cursor, Copilot, Windsurf, Aider, Kilo & more · Auto-discovery',
      rendering_title: 'Rich Rendering',
      rendering_desc: 'tool_use blocks · thinking blocks · risk-colored borders · expandable I/O',
      auditor_title: 'Auditor Agent',
      auditor_desc: 'Background scanner · Every 30 minutes · Severity-ranked reports · Emergency trigger',
      analytics_title: 'Analytics',
      analytics_desc: 'Usage trends · Risk heatmaps · Tool distribution · Cost tracking',
    },
    risk: {
      headline: 'Every AI action, scored by risk. Instantly.',
      critical: 'Critical',
      critical_examples: 'rm -rf, sudo, git push --force, credential access',
      high: 'High',
      high_examples: 'git push, npm publish, docker, external API calls',
      medium: 'Medium',
      medium_examples: 'git commit, file writes/edits, builds, installs',
      low: 'Low',
      low_examples: 'File reads, searches, grep (read-only operations)',
      patterns_note: '30+ detection patterns across security, file system, network, and git operations.',
    },
    tools: {
      headline: 'Works with every AI coding tool you use.',
      full_support: 'Full support',
      coming_soon: 'Adapter ready (coming soon)',
    },
    cta: {
      headline: 'Start governing your AI conversations.',
      subline: 'Open-source. Self-hosted. Free.',
      or_source: 'Or install from source:',
      star_github: 'Star on GitHub',
      view_docs: 'View Documentation',
      docker_note: 'Also available via Docker:',
      copy_clipboard: 'Copy to clipboard',
      copied: 'Copied!',
    },
    about: {
      philosophy: 'We value the finest humanity and the working with AI brains for better life.',
      body: 'Every prompt you craft, every decision you make, every solution you co-create with AI — these are records of human intelligence amplified by artificial minds. JubitMind helps you value, protect, and govern that collaboration.',
      ecosystem: 'Part of the Jubit AI ecosystem.',
      copyright: 'Built by Jubit AI · Apache 2.0 License · Copyright © 2025-2026',
    },
    footer: {
      documentation: 'Documentation',
      privacy: 'Privacy Policy',
      terms: 'Terms of Service',
      trademarks: 'Trademarks',
    },
    common: {
      learn_more: 'Learn more',
      get_started: 'Get Started',
      download: 'Download',
      open_source: 'Open Source',
      free: 'Free',
      also_available_for: 'Also available for',
      first_launch_note: 'First launch: A setup wizard will guide you through tool detection and configuration.',
    },
  },

  'zh-CN': {
    hero: {
      headline: '人类判断力遇见AI智慧。每一次交互，皆有价值。',
      subline: '开源 AI 交互审计平台。跨 11 种编码工具，对每一次人机对话进行风险评分、分类与治理。',
      version: 'v0.77.0 · 开源 · Apache 2.0 许可证',
      download_mac: '下载 macOS 版',
      download_win: '下载 Windows 版',
      github: '在 GitHub 上查看',
      mac_sublabel: 'Apple Silicon (arm64) · DMG 镜像',
      win_sublabel: '64 位 · 安装程序 (.exe)',
      mac_zip: 'ZIP 压缩包',
      win_portable: '便携版（免安装）',
      all_releases: '所有版本',
    },
    problem: {
      headline: '你每天都在使用 AI。但你知道它在做什么吗？',
      scattered_title: '工具间零散分布',
      scattered_desc: '你的对话散落在 11 种不同的 AI 工具中。想找到那条特定的提示词？祝你好运。',
      risk_title: '零风险可见性',
      risk_desc: '哪些会话涉及了凭据？执行了破坏性命令？你并不知道。',
      classify_title: '缺乏分类',
      classify_desc: '是代码生成？安全工作？知识产权创造？没有人在追踪这些。',
    },
    solution: {
      headline: 'JubitMind：你的 AI 治理层。',
      feature1: '自动发现 11 种工具和 IDE 中的所有 AI 会话',
      feature2: '对每个工具操作进行风险评分（严重 / 高 / 中 / 低）',
      feature3: '按领域和敏感度自动分类对话',
      feature4: '后台安全审计员每 30 分钟扫描一次',
      feature5: '丰富的 tool_use 渲染，支持可展开的输入/输出',
      feature6: '100% 本地运行 — 你的数据永远不会离开你的电脑',
    },
    features: {
      risk_title: '风险评分',
      risk_desc: '4 个风险等级 · 30+ 检测模式 · 实时评分',
      tags_title: '自动标签',
      tags_desc: '3 大类别 · 12+ 自动标签 · 基于置信度 · 零配置',
      tools_title: '11 种 AI 工具',
      tools_desc: 'Claude Code、Cursor、Copilot、Windsurf、Aider、Kilo 等 · 自动发现',
      rendering_title: '富文本渲染',
      rendering_desc: 'tool_use 块 · 思维块 · 风险色边框 · 可展开 I/O',
      auditor_title: '审计代理',
      auditor_desc: '后台扫描器 · 每 30 分钟 · 严重性排序报告 · 紧急触发',
      analytics_title: '数据分析',
      analytics_desc: '使用趋势 · 风险热力图 · 工具分布 · 成本追踪',
    },
    risk: {
      headline: '每一个 AI 操作，即时风险评分。',
      critical: '严重',
      critical_examples: 'rm -rf、sudo、git push --force、凭据访问',
      high: '高',
      high_examples: 'git push、npm publish、docker、外部 API 调用',
      medium: '中',
      medium_examples: 'git commit、文件写入/编辑、构建、安装',
      low: '低',
      low_examples: '文件读取、搜索、grep（只读操作）',
      patterns_note: '涵盖安全、文件系统、网络和 git 操作的 30+ 检测模式。',
    },
    tools: {
      headline: '支持你使用的每一种 AI 编码工具。',
      full_support: '完整支持',
      coming_soon: '适配器就绪（即将推出）',
    },
    cta: {
      headline: '开始治理你的 AI 对话。',
      subline: '开源。自托管。免费。',
      or_source: '或从源码安装：',
      star_github: '在 GitHub 上点星',
      view_docs: '查看文档',
      docker_note: '也可通过 Docker 使用：',
      copy_clipboard: '复制到剪贴板',
      copied: '已复制！',
    },
    about: {
      philosophy: '我们珍视最优秀的人性，并与 AI 智慧协作，共创更好的生活。',
      body: '你编写的每一个提示词、做出的每一个决定、与 AI 共同创造的每一个解决方案 — 这些都是人类智慧被人工智能放大的记录。JubitMind 帮助你珍视、保护和治理这种协作。',
      ecosystem: 'Jubit AI 生态系统的一部分。',
      copyright: '由 Jubit AI 构建 · Apache 2.0 许可证 · 版权所有 © 2025-2026',
    },
    footer: {
      documentation: '文档',
      privacy: '隐私政策',
      terms: '服务条款',
      trademarks: '商标',
    },
    common: {
      learn_more: '了解更多',
      get_started: '开始使用',
      download: '下载',
      open_source: '开源',
      free: '免费',
      also_available_for: '也可用于',
      first_launch_note: '首次启动：设置向导将引导你完成工具检测和配置。',
    },
  },

  ja: {
    hero: {
      headline: '人間の判断力とAIの知性が出会う。すべての対話に、価値を。',
      subline: 'オープンソースのAI対話監査プラットフォーム。11のコーディングツールにわたる、すべての人間-AI会話をリスクスコアリング、分類、ガバナンス。',
      version: 'v0.77.0 · オープンソース · Apache 2.0',
      download_mac: 'macOS版をダウンロード',
      download_win: 'Windows版をダウンロード',
      github: 'GitHubで見る',
      mac_sublabel: 'Apple Silicon (arm64) · DMG',
      win_sublabel: '64ビット · インストーラー (.exe)',
      mac_zip: 'ZIPアーカイブ',
      win_portable: 'ポータブル版（インストール不要）',
      all_releases: 'すべてのリリース',
    },
    problem: {
      headline: '毎日AIを使っている。でも、AIが何をしているか知っていますか？',
      scattered_title: 'ツール間に散在',
      scattered_desc: '会話は11種類のAIツールに散らばっている。あのプロンプトを見つけるのは至難の業。',
      risk_title: 'リスク可視性ゼロ',
      risk_desc: 'どのセッションが認証情報に触れた？破壊的なコマンドを実行した？あなたは知らない。',
      classify_title: '分類なし',
      classify_desc: 'コード生成？セキュリティ作業？知的財産の創造？誰も追跡していない。',
    },
    solution: {
      headline: 'JubitMind：あなたのAIガバナンスレイヤー。',
      feature1: '11のツールとIDEにわたる全AIセッションを自動発見',
      feature2: 'すべてのツールアクションをリスクスコアリング（重大/高/中/低）',
      feature3: 'ドメインと機密性で会話を自動分類',
      feature4: 'バックグラウンドセキュリティ監査が30分ごとにスキャン',
      feature5: '展開可能なI/Oを備えたリッチなtool_useレンダリング',
      feature6: '100%ローカル — データはあなたのマシンから出ない',
    },
    features: {
      risk_title: 'リスクスコアリング',
      risk_desc: '4段階のリスクレベル · 30+パターン · リアルタイムスコアリング',
      tags_title: '自動タグ',
      tags_desc: '3カテゴリ · 12+自動タグ · 信頼度ベース · 設定不要',
      tools_title: '11のAIツール',
      tools_desc: 'Claude Code、Cursor、Copilot、Windsurf、Aider、Kiloなど · 自動検出',
      rendering_title: 'リッチレンダリング',
      rendering_desc: 'tool_useブロック · thinkingブロック · リスク色ボーダー · 展開可能I/O',
      auditor_title: '監査エージェント',
      auditor_desc: 'バックグラウンドスキャナー · 30分ごと · 重大度順レポート · 緊急トリガー',
      analytics_title: 'アナリティクス',
      analytics_desc: '利用トレンド · リスクヒートマップ · ツール分布 · コスト追跡',
    },
    risk: {
      headline: 'すべてのAIアクション、瞬時にリスクスコアリング。',
      critical: '重大',
      critical_examples: 'rm -rf、sudo、git push --force、認証情報アクセス',
      high: '高',
      high_examples: 'git push、npm publish、docker、外部APIコール',
      medium: '中',
      medium_examples: 'git commit、ファイル書き込み/編集、ビルド、インストール',
      low: '低',
      low_examples: 'ファイル読み取り、検索、grep（読み取り専用操作）',
      patterns_note: 'セキュリティ、ファイルシステム、ネットワーク、git操作にわたる30+の検出パターン。',
    },
    tools: {
      headline: 'あなたが使うすべてのAIコーディングツールに対応。',
      full_support: 'フルサポート',
      coming_soon: 'アダプター準備完了（近日公開）',
    },
    cta: {
      headline: 'AIの会話のガバナンスを始めよう。',
      subline: 'オープンソース。セルフホスト。無料。',
      or_source: 'またはソースからインストール：',
      star_github: 'GitHubでスターする',
      view_docs: 'ドキュメントを見る',
      docker_note: 'Dockerでも利用可能：',
      copy_clipboard: 'クリップボードにコピー',
      copied: 'コピーしました！',
    },
    about: {
      philosophy: '人間の最も優れた部分を大切にし、AIの頭脳と共により良い生活を目指す。',
      body: 'あなたが作るすべてのプロンプト、すべての決断、AIと共に生み出すすべてのソリューション — これらは人工知能によって増幅された人間の知性の記録です。JubitMindはその協働を大切にし、保護し、ガバナンスする手助けをします。',
      ecosystem: 'Jubit AIエコシステムの一部。',
      copyright: 'Jubit AI制作 · Apache 2.0ライセンス · Copyright © 2025-2026',
    },
    footer: {
      documentation: 'ドキュメント',
      privacy: 'プライバシーポリシー',
      terms: '利用規約',
      trademarks: '商標',
    },
    common: {
      learn_more: '詳細を見る',
      get_started: '始める',
      download: 'ダウンロード',
      open_source: 'オープンソース',
      free: '無料',
      also_available_for: 'こちらでも利用可能',
      first_launch_note: '初回起動：セットアップウィザードがツール検出と設定をガイドします。',
    },
  },

  ko: {
    hero: {
      headline: '인간의 판단력이 AI의 지성을 만나다. 모든 상호작용에 가치를.',
      subline: '오픈소스 AI 상호작용 감사 플랫폼. 11개 코딩 도구에 걸쳐 모든 인간-AI 대화를 위험 점수화, 분류 및 거버넌스.',
      version: 'v0.77.0 · 오픈소스 · Apache 2.0',
      download_mac: 'macOS용 다운로드',
      download_win: 'Windows용 다운로드',
      github: 'GitHub에서 보기',
      mac_sublabel: 'Apple Silicon (arm64) · DMG',
      win_sublabel: '64비트 · 설치 프로그램 (.exe)',
      mac_zip: 'ZIP 아카이브',
      win_portable: '포터블 (설치 불필요)',
      all_releases: '모든 릴리스',
    },
    problem: {
      headline: '매일 AI를 사용합니다. 하지만 AI가 무엇을 하는지 알고 있나요?',
      scattered_title: '도구 간에 분산',
      scattered_desc: '대화가 11개의 서로 다른 AI 도구에 흩어져 있습니다. 그 프롬프트를 찾는 건 행운이 필요합니다.',
      risk_title: '제로 리스크 가시성',
      risk_desc: '어떤 세션이 자격 증명에 접근했나요? 파괴적인 명령을 실행했나요? 알 수 없습니다.',
      classify_title: '분류 없음',
      classify_desc: '코드 생성인가요? 보안 작업? IP 생성? 아무도 추적하지 않습니다.',
    },
    solution: {
      headline: 'JubitMind: 당신의 AI 거버넌스 레이어.',
      feature1: '11개 도구와 IDE에 걸쳐 모든 AI 세션을 자동 발견',
      feature2: '모든 도구 작업을 위험 점수화 (심각 / 높음 / 중간 / 낮음)',
      feature3: '도메인 및 민감도별로 대화를 자동 분류',
      feature4: '백그라운드 보안 감사관이 30분마다 스캔',
      feature5: '확장 가능한 I/O로 풍부한 tool_use 렌더링',
      feature6: '100% 로컬 — 데이터가 컴퓨터를 떠나지 않음',
    },
    features: {
      risk_title: '리스크 스코어링',
      risk_desc: '4단계 위험 수준 · 30+ 패턴 · 실시간 점수화',
      tags_title: '자동 태그',
      tags_desc: '3개 카테고리 · 12+ 자동 태그 · 신뢰도 기반 · 설정 불필요',
      tools_title: '11개 AI 도구',
      tools_desc: 'Claude Code, Cursor, Copilot, Windsurf, Aider, Kilo 등 · 자동 검색',
      rendering_title: '리치 렌더링',
      rendering_desc: 'tool_use 블록 · thinking 블록 · 위험 색상 테두리 · 확장 가능 I/O',
      auditor_title: '감사 에이전트',
      auditor_desc: '백그라운드 스캐너 · 30분마다 · 심각도 순위 보고서 · 긴급 트리거',
      analytics_title: '분석',
      analytics_desc: '사용 추세 · 리스크 히트맵 · 도구 분포 · 비용 추적',
    },
    risk: {
      headline: '모든 AI 작업, 즉시 위험 점수화.',
      critical: '심각',
      critical_examples: 'rm -rf, sudo, git push --force, 자격 증명 접근',
      high: '높음',
      high_examples: 'git push, npm publish, docker, 외부 API 호출',
      medium: '중간',
      medium_examples: 'git commit, 파일 쓰기/편집, 빌드, 설치',
      low: '낮음',
      low_examples: '파일 읽기, 검색, grep (읽기 전용 작업)',
      patterns_note: '보안, 파일 시스템, 네트워크 및 git 작업에 걸쳐 30+ 탐지 패턴.',
    },
    tools: {
      headline: '당신이 사용하는 모든 AI 코딩 도구와 호환.',
      full_support: '완전 지원',
      coming_soon: '어댑터 준비 완료 (곧 출시)',
    },
    cta: {
      headline: 'AI 대화 거버넌스를 시작하세요.',
      subline: '오픈소스. 셀프호스팅. 무료.',
      or_source: '또는 소스에서 설치:',
      star_github: 'GitHub에서 스타',
      view_docs: '문서 보기',
      docker_note: 'Docker로도 사용 가능:',
      copy_clipboard: '클립보드에 복사',
      copied: '복사됨!',
    },
    about: {
      philosophy: '인류의 가장 뛰어난 가치를 소중히 여기며, AI 두뇌와 함께 더 나은 삶을 만들어갑니다.',
      body: '당신이 작성하는 모든 프롬프트, 내리는 모든 결정, AI와 함께 만드는 모든 솔루션 — 이것은 인공 지능에 의해 증폭된 인간 지성의 기록입니다. JubitMind는 그 협업을 소중히 여기고, 보호하고, 거버넌스하도록 돕습니다.',
      ecosystem: 'Jubit AI 생태계의 일부.',
      copyright: 'Jubit AI 제작 · Apache 2.0 라이선스 · Copyright © 2025-2026',
    },
    footer: {
      documentation: '문서',
      privacy: '개인정보 처리방침',
      terms: '이용약관',
      trademarks: '상표',
    },
    common: {
      learn_more: '더 알아보기',
      get_started: '시작하기',
      download: '다운로드',
      open_source: '오픈소스',
      free: '무료',
      also_available_for: '다음에서도 사용 가능',
      first_launch_note: '첫 실행: 설정 마법사가 도구 감지 및 구성을 안내합니다.',
    },
  },
} as const;

export type TranslationKeys = typeof translations['en'];
```

---

## Marketing Page Translations

### Page Title & Meta (per locale)

| Locale | `<title>` | `meta description` |
|--------|-----------|-------------------|
| en | JubitMind — AI Interaction Audit & Governance Platform \| Download Free | Download JubitMind — the open-source desktop app that risk-scores, classifies, and governs every human-AI conversation across 11 coding tools. Free for macOS and Windows. |
| zh-CN | JubitMind — AI 交互审计与治理平台 \| 免费下载 | 下载 JubitMind — 开源桌面应用，跨 11 种编码工具对每一次人机对话进行风险评分、分类与治理。支持 macOS 和 Windows，完全免费。 |
| ja | JubitMind — AI対話監査・ガバナンスプラットフォーム \| 無料ダウンロード | JubitMindをダウンロード — 11のコーディングツールにわたるすべての人間-AI会話をリスクスコアリング、分類、ガバナンスするオープンソースデスクトップアプリ。macOS・Windows対応、無料。 |
| ko | JubitMind — AI 상호작용 감사 및 거버넌스 플랫폼 \| 무료 다운로드 | JubitMind 다운로드 — 11개 코딩 도구에 걸쳐 모든 인간-AI 대화를 위험 점수화, 분류 및 거버넌스하는 오픈소스 데스크톱 앱. macOS 및 Windows 무료. |

### Open Graph (per locale)

| Locale | `og:title` | `og:description` |
|--------|-----------|-------------------|
| en | JubitMind — AI Interaction Audit Platform | Risk-score, classify, and govern every human-AI conversation. Download free for macOS and Windows. |
| zh-CN | JubitMind — AI 交互审计平台 | 对每一次人机对话进行风险评分、分类与治理。免费下载，支持 macOS 和 Windows。 |
| ja | JubitMind — AI対話監査プラットフォーム | すべての人間-AI会話をリスクスコアリング、分類、ガバナンス。macOS・Windows対応、無料ダウンロード。 |
| ko | JubitMind — AI 상호작용 감사 플랫폼 | 모든 인간-AI 대화를 위험 점수화, 분류 및 거버넌스. macOS 및 Windows 무료 다운로드. |

---

## URL Strategy

| Domain | URL | Behavior |
|--------|-----|----------|
| dseek.ai | `/jubitmind` | Default locale: English. Switcher available. |
| dseek.ai | `/jubitmind?lang=zh-CN` | Force Chinese locale via query param. |
| dseek.ai | `/jubitmind?lang=ja` | Force Japanese locale via query param. |
| dseek.ai | `/jubitmind?lang=ko` | Force Korean locale via query param. |
| jubit.ai | `/jubitmind` | Same component. Auto-detect from `navigator.language`. |

Locale priority:
1. `?lang=` query parameter (explicit)
2. `localStorage` preference (returning visitor)
3. `navigator.language` (auto-detect)
4. Fallback: `en`

```typescript
function resolveLocale(): Locale {
  // 1. Query param
  const params = new URLSearchParams(window.location.search);
  const langParam = params.get('lang');
  if (langParam && ['en', 'zh-CN', 'ja', 'ko'].includes(langParam)) {
    return langParam as Locale;
  }
  // 2. localStorage
  const stored = localStorage.getItem('jubitmind-locale');
  if (stored && ['en', 'zh-CN', 'ja', 'ko'].includes(stored)) {
    return stored as Locale;
  }
  // 3. Browser language
  const nav = navigator.language || '';
  if (nav.startsWith('zh')) return 'zh-CN';
  if (nav.startsWith('ja')) return 'ja';
  if (nav.startsWith('ko')) return 'ko';
  // 4. Default
  return 'en';
}
```

---

## Notes

- All translations are provided as-is. Have a native speaker review before launch, especially for Japanese keigo (politeness level) and Korean formality level (currently using formal/polite 해요체).
- Technical terms (tool_use, risk scoring, auto-tags) are kept in English across all locales for consistency — these are product-specific terms.
- Command examples (rm -rf, git push, etc.) remain in English in all locales — they're universal terminal commands.
- The language switcher should persist selection in `localStorage` so returning visitors see their preferred language.
