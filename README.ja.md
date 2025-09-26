# aglib

`aglib` は `agbd` と `agrb` CLIツール間で共有される機能を提供するライブラリです。

## 含まれる機能

- **UIコンポーネント:** Inkを使用した対話的なUIコンポーネント。
- **Git操作:** `simple-git`をラップしたGitコマンド操作ユーティリティ。
- **設定管理:** 設定ファイルの読み込みや書き込み、管理機能。
- **その他ユーティリティ:** 引数パーサーやバリデーション関数など。

## 開発

このライブラリは`agbd`および`agrb`プロジェクトから利用されることを想定しています。

```bash
# 依存関係のインストール
bun install

# ビルド
bun run build

# 開発（watch）
bun run dev

# Lint（チェック／自動修正）
bun run test
bun run lint
```

## ライセンス

MIT
