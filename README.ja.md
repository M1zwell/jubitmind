<p align="center">
  <strong>JubitMind</strong><br/>
  <em>人の判断とAIの知性が出会う場所。すべてのインタラクションに、価値がある。</em>
</p>

<p align="center">
  <a href="./README.md">English</a> ·
  <a href="./README.zh-CN.md">简体中文</a> ·
  <a href="./README.ko.md">한국어</a>
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

**JubitMind** は、ローカルファーストのオープンソース AI インタラクション監査・ガバナンスプラットフォームです。11種類の AI コーディングツールにおける人間と AI の会話を記録・分類・リスクスコアリング・分析します。構造化エンティティ抽出には [Google LangExtract](https://github.com/google/langextract) を活用しています。会話データはすべてローカルに保持され、外部に送信されることはありません。

*[Jubit AI](https://jubit.ai) / [dseek](https://dseek.ai) エコシステムの一部です。*

## なぜ JubitMind なのか？

人間と AI のインタラクションには価値があります。あなたが作成したプロンプト、下した判断、AI と共同で書いたコード、そのすべてに。JubitMind は次のことを可能にします：

- **監査** — 単一のダッシュボードからすべての AI ツールのインタラクションを監査
- **抽出** — ソース根拠付きの構造化エンティティを会話から抽出
- **探索** — セッション横断ですべてのインタラクションを閲覧。モデル、ツール、リスク階層、カテゴリでフィルタリング
- **分析** — プロンプトのパターン、ツール使用トレンド、モデルコストを AI による洞察で分析
- **リスクスコアリング** — ファイル書き込み、シェルコマンド、git push などすべてのツール使用をスコアリング
- **エクスポート** — インサイトレポートを Markdown、PDF、PNG データボードとしてエクスポート
- **データの所有権** — すべてローカルで動作し、プライバシーを設計思想から保護

## 機能

### LangExtract 連携

[Google LangExtract](https://github.com/google/langextract) を使用した AI 会話からの高度な構造化抽出：

```
Sessions (JSONL) → JubitMind Server → LangExtract Sidecar (FastAPI)
                                           ↓
                                     Ollama / Gemini / OpenAI
                                           ↓
                                     Structured Extractions
                                           ↓
                                     Insights Dashboard + Explorer
```

**なぜ LangExtract + JubitMind なのか？**

| LangExtract の提供機能 | JubitMind の提供機能 |
|-----------------------|-------------------|
| 精密なソースグラウンディング | マルチツールセッション取り込み |
| 構造化出力スキーマ | リスクスコアリングと自動タグ付け |
| 長文ドキュメントのチャンク処理 | セッション横断の集約 |
| マルチパス抽出 | インタラクティブな可視化 |
| 柔軟な LLM サポート | ローカルファーストデプロイ |

**AI 監査向け抽出スキーマ：**

| クラス | 検出対象 |
|-------|---------|
| `permission-grant` | ユーザーが承認したツール実行 |
| `risk-event` | 危険なコマンド、外部 API 呼び出し |
| `intent-shift` | セッション内のトピック変更 |
| `code-artifact` | パス付きで作成・変更されたファイル |
| `thinking-insight` | モデルの思考ブロックからの重要な推論 |
| `architecture-decision` | システム設計の選択とトレードオフ |

**デフォルトでローカルファースト**：Ollama がローカルで抽出モデルを実行するため、API キー不要でデータが外部に送信されることはありません。クラウドモデル（Gemini、OpenAI）はオプションのターボモードとして利用可能です。

### インタラクション エクスプローラー

すべてのセッションのインタラクションを一つのページから閲覧：

- **カテゴリタブ**: User Prompts | Planning & Thinking | Tool Calls | Tool Results | Model Outputs
- **フィルターサイドバー**: 検索、ツール名、モデルファミリー、リスク階層、プロジェクト、日付範囲
- **75,000 件以上のインタラクション**をインメモリでインデックス化・検索可能
- **展開可能なカード**で完全なコンテンツをオンデマンド取得
- 「セッションで開く」ナビゲーションでコンテキスト確認

### インサイトエージェント

定期レポート（毎時）を生成するバックグラウンド分析エージェント：

- **プロンプトパターン**: 共通テーマ、頻出リクエスト、平均プロンプト長
- **ツール使用トレンド**: 最も使用されたツール、リスク推移（Recharts チャート）
- **モデル比較**: モデルファミリーごとのセッション数、トークン数、推定コスト
- **レコメンデーション**: 使用パターンに基づく実用的なインサイト
- **オンデマンド実行**: 「Run Now」クリックで即座に分析

### レポートエクスポート

インサイトレポートを3つの形式でエクスポート：

| 形式 | 説明 |
|------|------|
| **Markdown** | テーブル、テーマ、レコメンデーション付きの `.md` フォーマット |
| **PDF** | チャート描画付きのスタイル付き A4 ドキュメント |
| **PNG** | 共有用の高解像度 2x データボード画像 |

### セッション分類

すべてのセッションは起動時に自動分類されます：

- **使用モデル**: opus, sonnet, haiku, gpt-4o, gemini, deepseek など
- **使用ツール**: リスク階層付き（critical/high/medium/low）
- **メッセージ内訳**: ユーザープロンプト、アシスタントテキスト、思考ブロック、ツール呼び出し
- **主要カテゴリ**: ツール集中型、計画集中型、プロンプト集中型、バランス型
- **ファセットフィルタリング**: ライブカウント付きマルチセレクトドロップダウン

### マルチツール アダプターシステム

JubitMind は統一アダプターインターフェースを通じて **11種類の AI コーディングツール**からセッションを検出・読み取りします：

| ツール | ステータス | データソース |
|------|--------|------------|
| Claude Code CLI | 自動検出 | `~/.claude/projects/` JSONL sessions |
| Claude VS Code | 自動検出 | VS Code extension storage |
| Cursor | 自動検出 | `~/Library/Application Support/Cursor/` SQLite |
| Windsurf | スタブ準備済み | `~/Library/Application Support/Windsurf/` |
| GitHub Copilot | スタブ準備済み | VS Code Copilot extension |
| Continue.dev | スタブ準備済み | `~/.continue/sessions/` |
| Aider | スタブ準備済み | `~/.aider.chat.history.md` |
| OpenAI Codex CLI | スタブ準備済み | `~/.codex/` |
| Kilo Code | スタブ準備済み | VS Code extension storage |
| Kimi CLI | スタブ準備済み | `~/.kimi/` |
| Antigravity | スタブ準備済み | `~/.antigravity/` |

### リスクスコアリングエンジン

すべての会話のツール使用にスコアが付与されます：

| レベル | スコア | 例 |
|-------|-------|----------|
| **Critical** | 4 | `rm -rf`, `sudo`, `git push --force`, 認証情報アクセス |
| **High** | 3 | `git push`, `npm publish`, `docker`, 外部 API 呼び出し |
| **Medium** | 2 | `git commit`, ファイル書き込み/編集, ビルド, インストール |
| **Low** | 1 | ファイル読み取り, 検索, grep（読み取り専用操作） |

セキュリティ、ファイルシステム、ネットワーク、git 操作にわたる 30 以上の検出パターン。

### 監査エージェント

30分ごとに実行されるバックグラウンドセキュリティスキャナー：

- 検出されたすべてのセッションをセキュリティリスクについてスキャン
- 過大なセッション、パフォーマンス問題、課金異常を検出
- 重要度順にランク付けされた構造化レポートを生成
- UI からの緊急監査トリガー

### エージェント設定監査

9種類の AI ツールにわたる **17種類の設定ファイル形式**を検出・監査：

- 漏洩した API キーの検出（`sk-`, `sk-ant-`, `ghp_`, `xai-`）
- 危険なシェルコマンド、権限バイパス、安全性オーバーライドのフラグ付け
- シンタックスハイライト付き Monaco エディタでの直接編集

### その他の機能

- **LiteLLM ルーティングダッシュボード** — モデルルーティング、支出トラッキング、API キー監視
- **セッション分析** — LLM を活用した個別セッションの深層分析
- **アーカイブ** — 長期セッション保存と取得
- **アナリティクス** — 使用トレンド、ツール分布、リスクヒートマップ（Recharts）
- **MCP サーバー** — Model Context Protocol サーバー管理
- **スキル / コマンド / メモリ** — Claude Code ナレッジベースブラウザ
- **リッチメッセージレンダリング** — ツール使用ブロック、思考ブロック、メッセージタイプフィルタリング
- **ダークテーマ** — zinc/slate パレットによる完全ダークモード UI

## クイックスタート

### 前提条件

- Node.js 20+
- npm 9+

### 開発環境

```bash
git clone https://github.com/M1zwell/jubitmind.git
cd jubitmind

npm install
npm run dev

# Client: http://localhost:8081
# API:    http://localhost:3001
```

### 本番環境

```bash
npm run build
npm start
# Serves on http://localhost:3000
```

### Docker

```bash
docker build -t jubitmind .
docker run -p 3000:3000 -v ~/.claude:/data/.claude:ro jubitmind

# Docker Compose を使用する場合
docker compose up -d
```

### デスクトップアプリ（macOS / Windows）

```bash
# 開発
npm run electron:dev

# macOS 向けビルド (.dmg)
npm run electron:build:mac

# Windows 向けビルド (.exe)
npm run electron:build:win
```

ワンクリックインストール。ターミナル不要。起動時にセッションを自動検出。

## アーキテクチャ

```
jubitmind/
├── server/
│   ├── index.ts                    # サーバーエントリ、ルートマウント、起動チェーン
│   ├── routes/
│   │   ├── conversations.ts        # セッション、メッセージ、ファセット、分類
│   │   ├── explorer.ts             # セッション横断インタラクション閲覧
│   │   ├── insights.ts             # AI インサイトレポート
│   │   ├── auditor.ts              # セキュリティ監査
│   │   ├── adapters.ts             # AI ツールアダプター
│   │   ├── agent-configs.ts        # 設定検出と編集
│   │   ├── litellm.ts              # LiteLLM プロキシ
│   │   └── ...                     # analysis, archives, cli, config, mcp など
│   └── services/
│       ├── adapters/               # 11 AI ツールアダプター + レジストリ
│       ├── session-classifier.ts   # モデル/ツール/カテゴリ分類
│       ├── interaction-index.ts    # インメモリセッション横断インデックス（75K+ エントリ）
│       ├── insights-agent.ts       # バックグラウンドインサイト分析
│       ├── auditor-agent.ts        # バックグラウンドセキュリティスキャナー
│       ├── risk-scorer.ts          # リスクスコアリングエンジン（30+ パターン）
│       ├── auto-tagger.ts          # 自動分類エンジン
│       ├── session-cache.ts        # 分類付きセッションメタデータキャッシュ
│       └── ...
├── src/
│   ├── App.tsx                     # 20+ ルートのルーター
│   ├── pages/
│   │   ├── InteractionExplorerPage.tsx  # セッション横断エクスプローラー
│   │   └── InsightsPage.tsx             # チャート付きインサイトダッシュボード
│   ├── components/
│   │   ├── layout/Sidebar.tsx      # 7セクションナビゲーション
│   │   ├── conversations/          # セッション一覧、メッセージスレッド、フィルター
│   │   ├── auditor/                # 監査レポート UI
│   │   ├── config/                 # エージェント設定 + Monaco エディタ
│   │   ├── litellm/                # LiteLLM ルーティングダッシュボード
│   │   └── ...
│   ├── hooks/                      # React Query フック
│   └── lib/
│       ├── api.ts                  # API クライアント（adapters, conversations, explorer, insights）
│       ├── export-insights.ts      # MD/PDF/PNG エクスポートユーティリティ
│       └── types.ts                # 共有 TypeScript 型定義
├── electron/                       # デスクトップアプリ（macOS + Windows）
├── Dockerfile                      # マルチステージ本番ビルド
├── docker-compose.yml              # コンテナオーケストレーション
└── package.json
```

## API リファレンス

### Explorer

| メソッド | パス | 説明 |
|--------|------|------|
| GET | `/api/explorer/interactions` | インタラクションの検索（category, tool, model, risk, search） |
| GET | `/api/explorer/interactions/:id/content` | オンデマンドの完全コンテンツ取得 |
| GET | `/api/explorer/facets` | エクスプローラー全体のファセットカウント |
| GET | `/api/explorer/stats` | インデックス統計 |

### Insights

| メソッド | パス | 説明 |
|--------|------|------|
| GET | `/api/insights/status` | エージェント実行ステータス |
| GET | `/api/insights/reports/latest` | 最新のインサイトレポート |
| GET | `/api/insights/reports` | レポート履歴 |
| POST | `/api/insights/run` | オンデマンド分析のトリガー |

### Conversations

| メソッド | パス | 説明 |
|--------|------|------|
| GET | `/api/conversations/sessions` | セッション一覧（model, tools, category, hasThinking フィルター） |
| GET | `/api/conversations/sessions/:id/messages` | ページネーション付きメッセージ |
| GET | `/api/conversations/sessions/:id/risk` | リスクスコア + 自動タグ |
| GET | `/api/conversations/facets` | モデル/ツール/カテゴリのファセットカウント |
| GET | `/api/conversations/classification-status` | 分類進捗 |
| POST | `/api/conversations/sessions/:id/classify` | オンデマンド分類 |

### Adapters

| メソッド | パス | 説明 |
|--------|------|------|
| GET | `/api/adapters` | 利用可能状況付きの全アダプター一覧 |
| GET | `/api/adapters/:id/sessions` | 特定ツールからのセッション |
| GET | `/api/adapters/:id/stats` | ツールの集計統計 |

### Auditor

| メソッド | パス | 説明 |
|--------|------|------|
| GET | `/api/auditor/status` | 監査エージェントのステータス |
| GET | `/api/auditor/reports/latest` | 最新の監査レポート |
| POST | `/api/auditor/run` | 緊急監査のトリガー |

### LiteLLM

| メソッド | パス | 説明 |
|--------|------|------|
| GET | `/api/litellm/models` | 設定済みモデル |
| GET | `/api/litellm/spend` | モデル/日別コスト |
| GET | `/api/litellm/usage` | リクエストボリューム |

## ロードマップ

### LangExtract 深層統合

| フェーズ | 説明 | ステータス |
|---------|------|--------|
| 1 | Python サイドカー（FastAPI ブリッジ）+ 抽出サービス | 計画中 |
| 2 | ビジュアル抽出テンプレートビルダー（ノーコード UI） | 計画中 |
| 3 | メッセージスレッド内のインライン抽出アノテーション | 計画中 |
| 4 | コミュニティ抽出テンプレートマーケットプレイス | 計画中 |

### デスクトップアプリ

| フェーズ | 説明 | ステータス |
|---------|------|--------|
| 1 | Electron デスクトップアプリ（macOS + Windows） | 完了 |
| 2 | Tauri への移行（5-15MB vs 150MB+） | 計画中 |
| 3 | PyInstaller バンドル LangExtract サイドカー | 計画中 |
| 4 | 自動アップデート付きワンクリックインストーラー | 計画中 |

### プラットフォーム

| 機能 | ステータス |
|------|--------|
| セッション分類 + ファセットフィルター | 完了 |
| インタラクション エクスプローラー（75K+ インデックス） | 完了 |
| バックグラウンド分析付きインサイトエージェント | 完了 |
| レポートエクスポート（MD/PDF/PNG） | 完了 |
| マルチツール アダプターシステム（11 ツール） | 完了（3 アクティブ、8 スタブ） |
| LiteLLM ルーティングダッシュボード | 完了 |
| Ollama ローカル LLM サポート | 計画中 |
| コミュニティ抽出テンプレート | 計画中 |

## 環境変数

| 変数 | 必須 | 説明 |
|------|------|------|
| `PORT` | いいえ | サーバーポート（デフォルト: 開発 3001、本番 3000） |
| `CLAUDE_HOME` | いいえ | Claude データディレクトリの上書き（デフォルト: `~/.claude`） |
| `LITELLM_DB_URL` | いいえ | LiteLLM 支出トラッキング用 PostgreSQL 接続先 |
| `SUPABASE_URL` | いいえ | Supabase プロジェクト URL（クラウド機能用） |
| `SUPABASE_ANON_KEY` | いいえ | Supabase 匿名キー |

すべての環境変数はオプションです。JubitMind はローカルファイルシステムへのアクセスのみで完全にオフラインで動作します。

## 技術スタック

| レイヤー | テクノロジー |
|---------|-----------|
| フロントエンド | React 18, TypeScript, Vite 5, Tailwind CSS 3 |
| バックエンド | Express 4, TypeScript, Node.js 20+ |
| 抽出 | Google LangExtract, Python 3.10+, FastAPI |
| 状態管理 | TanStack React Query v5 |
| チャート | Recharts 3 |
| エディタ | Monaco Editor |
| アイコン | Lucide React |
| デスクトップ | Electron 34（Tauri 移行予定） |
| コンテナ | Docker (node:20-alpine multi-stage) |
| ローカル LLM | Ollama（抽出のデフォルトとして計画中） |

## スクリプト

| スクリプト | 説明 |
|----------|------|
| `npm run dev` | クライアント + サーバーを開発モードで起動 |
| `npm run dev:client` | Vite 開発サーバー（ポート 8081） |
| `npm run dev:server` | ホットリロード付き Express サーバー |
| `npm run build` | 本番ビルド（Vite + TypeScript） |
| `npm start` | 本番サーバーの実行（ポート 3000） |
| `npm run docker:build` | Docker イメージのビルド |
| `npm run docker:run` | Docker コンテナの実行 |
| `npm run docker:compose` | Docker Compose での起動 |
| `npm run electron:dev` | Electron アプリのビルドと実行 |
| `npm run electron:build:mac` | macOS インストーラーのビルド (.dmg) |
| `npm run electron:build:win` | Windows インストーラーのビルド (.exe) |

## コントリビューション

コントリビューションを歓迎します。以下の手順でお願いします：

1. リポジトリをフォーク
2. フィーチャーブランチを作成（`git checkout -b feature/my-feature`）
3. Conventional Commits 形式でコミット（`feat:`, `fix:`, `docs:` など）
4. プッシュしてプルリクエストを作成

フォークを配布する場合の命名ガイドラインについては `TRADEMARKS.md` を参照してください。

## ライセンス

**Apache License 2.0** の下でライセンスされています。全文は [LICENSE](LICENSE) を参照してください。

```
Copyright 2025-2026 Jubit AI (jubit.ai)
```

### 商標

**Jubit**、**Jubit AI**、**JubitMind**、**ChatAB**、**ChatLab** の名称は Jubit AI の商標であり、Apache 2.0 ライセンスの対象**ではありません**。帰属表示（例：「JubitMind に基づく」）には使用できますが、派生製品のブランディングには使用できません。詳細なポリシーについては [TRADEMARKS.md](TRADEMARKS.md) を参照してください。

---

<p align="center">
  <a href="https://jubit.ai">Jubit AI</a> が開発
</p>
