# 医療DXアプリ PC向けフロントエンド開発仕様

医療従事者向けダッシュボードのPC向けWebアプリケーション開発仕様書です。

## プロジェクト概要

### ビジョン
「患者説明品質向上に特化した唯一のソリューション」として、医療者と患者が同じ目線で治療に取り組める環境を提供します。

### 対象ユーザー
- **医療従事者（医師・看護師）**
- 患者の音声記録・画像記録の管理・編集を行う

## 技術要件

### 推奨技術スタック
- **フレームワーク**: Next.js (TypeScript)
- **UIライブラリ**: Shadcn/UI または同等のモダンUIライブラリ
- **スタイリング**: Tailwind CSS
- **API通信**: RESTful API

### 対応環境
- モダンブラウザ（Chrome, Firefox, Safari, Edge）
- レスポンシブ対応（デスクトップ・タブレット）

## 機能要件

### 1. ログイン画面
- 医療従事者認証（ユーザー名・パスワード）
- パスワード認証によるセキュアなログイン

### 2. 患者一覧ダッシュボード
- **記録ステータス別タブ表示**
  - 未処理
  - 処理中  
  - 確認待ち
  - 完了
- **患者一覧テーブル**
  - 患者コード、氏名、病室、記録タイプ、作成日時
  - 要約テキストプレビュー
  - 記録詳細画面への遷移

### 3. 記録詳細・編集画面
- 患者基本情報表示
- 音声・画像ファイル再生/表示
- **AI生成要約テキストの編集機能**
- 文字数カウント表示
- 編集履歴表示
- 電子カルテ転記機能

## API連携仕様

### ベースURL
```
本番環境: https://b2ba7e421g.execute-api.ap-southeast-2.amazonaws.com
開発環境: http://localhost:8000/v1 (ローカル開発用)
```

### 主要エンドポイント

#### 認証
- `POST /auth/login` - ログイン（ユーザー名・パスワード）
- `POST /auth/logout` - ログアウト

#### 患者管理
- `GET /patients` - 患者一覧取得（ダッシュボード用）
- `GET /patients/{patient_code}` - 患者詳細取得

#### 記録管理
- `GET /records/{record_id}` - 記録詳細取得
- `PUT /records/{record_id}` - 記録内容更新
- `POST /records/{record_id}/transfer` - 電子カルテ転記

詳細なAPI仕様は別途提供のAPI仕様書を参照してください。

## 画面遷移

```
ログイン画面
    ↓ 認証成功
患者一覧ダッシュボード
    ↓ 記録選択
記録詳細・編集画面
    ↓ 編集完了・転記
患者一覧ダッシュボードに戻る
```

## セキュリティ要件

- HTTPS通信の強制
- パスワード認証によるアクセス制御
- セッションタイムアウト管理
- XSS・CSRF対策の実装

## パフォーマンス要件

- 初期ロード時間: 3秒以内
- ページ遷移: 1秒以内
- 同時接続ユーザー: 最大100名

## 参考プロジェクト構成例

```
frontend-pc/
├── app/                    # Next.js App Router
│   ├── login/             # ログイン画面
│   ├── dashboard/         # 患者一覧ダッシュボード  
│   └── records/[id]/      # 記録詳細・編集画面
├── components/            # 再利用可能コンポーネント
│   ├── ui/               # 基本UIコンポーネント
│   ├── auth/             # 認証関連
│   ├── dashboard/        # ダッシュボード関連
│   └── records/          # 記録関連
└── lib/
    └── api/              # API通信層
```

## 提供資料

- [UIデザイン（Figma）](https://www.figma.com/design/vce1JZ7n9TkLq7ItD4UESi/step4_draft?node-id=190-630)
- [API仕様書](https://b2ba7e421g.execute-api.ap-southeast-2.amazonaws.com/docs)
- データベース設計書（参考資料として提供）

### API接続情報
- **API仕様書URL**: https://b2ba7e421g.execute-api.ap-southeast-2.amazonaws.com/docs
- **ベースURL**: https://b2ba7e421g.execute-api.ap-southeast-2.amazonaws.com
- サンプルデータの受け渡しが可能なエンドポイントを提供

## 開発・納品要件

### 成果物
- 実装済みソースコード
- セットアップ・実行手順書
- デプロイ手順書

### 動作確認環境
- 開発環境での動作確認
- 提供APIとの連携確認
- レスポンシブ対応確認

### 品質要件
- TypeScript使用（型安全性の確保）
- ESLint/Prettierによるコード品質管理
- 主要機能のテストコード実装

---

**プロジェクト**: 医療DXアプリケーション  
**対象**: PC向けWebアプリケーション（医療従事者用）  
**最終更新**: 2025年7月13日
