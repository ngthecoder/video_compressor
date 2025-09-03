# 動画変換サービス (Video Compressor Service)
Electron（TypeScript）フロントエンドとPythonバックエンドで構築された暗号化機能を備えた安全なクライアント・サーバー動画処理アプリケーション。

## 機能
### 動画処理操作
- **動画圧縮**: 動的品質設定によるファイルサイズの最適化
- **解像度変更**: 480p、720p、1080p、1440p、4Kに対応
- **アスペクト比調整**: 16:9と4:3フォーマット間の変換
- **音声抽出**: 動画をMP3音声ファイルに変換
- **GIF/WEBM変換**: 動画セグメントからアニメーションクリップを作成

### セキュリティ機能
- **RSA暗号化**: 安全な通信のための2048ビットRSA鍵交換
- **AES-256-GCM暗号化**: 全ファイル転送のエンドツーエンド暗号化
- **安全な鍵保存**: ElectronのsafeStorageを使用したクライアント側安全鍵管理

### 技術アーキテクチャ
- **クライアント**: TypeScript使用のElectronデスクトップアプリケーション
- **サーバー**: FFmpeg統合のPythonベース処理サーバー
- **通信**: 暗号化TCPソケット接続
- **ファイル処理**: 設定可能なレートでのチャンク化ストリーミング

## プロジェクト構造
```
videoCompressor/
├── client_desktop_app/         # Electronフロントエンド
│   ├── src/
│   │   ├── main.ts             # Electronメインプロセス
│   │   ├── preload.ts          # IPCブリッジ
│   │   ├── renderer.ts         # UIロジック
│   │   ├── index.html          # メインインターフェース
│   │   └── style.css           # スタイリング
│   ├── dist/                   # コンパイル済みTypeScript
│   ├── package.json
│   └── tsconfig.json
├── server/
│   ├── server.py               # Python処理サーバー
│   ├── __init__.py
|   └── storage/                # 一時ファイル保存
├── config.json                 # 設定ファイル
└── README.md
```

## クイックスタート
### 前提条件
#### クライアント（Electronアプリ）
- **Node.js** (v16以上)
- **npm** (Node.jsに付属)
- **Git**

#### サーバー（Python）
- **Python** 3.11.2
- **Poetry** (依存関係管理)
- **FFmpeg** (動画処理エンジン)

### インストール
#### 1. リポジトリのクローン
```bash
git clone <repository-url>
cd videoCompressor
```

#### 2. サーバーセットアップ
```bash
# Python依存関係のインストール
poetry install

# サーバー起動
poetry run python server/server.py
```

#### 3. クライアントセットアップ
```bash
# クライアントディレクトリに移動
cd client_desktop_app

# 依存関係のインストール
npm install

# TypeScriptビルド
npm run build

# アプリケーション起動
npm start
```

### 設定
`config.json`を編集してサーバー設定をカスタマイズ:
```json
{
  "server_address": "127.0.0.1",
  "server_port": 65432,
  "max_storage": 1073741824,
  "storage_dir": "/storage",
  "stream_rate": 4096
}
```

## 開発
### クライアント開発コマンド
```bash
npm start      # アプリケーションをビルドして実行
npm run build  # TypeScriptをコンパイル
```

### 依存関係の追加
```bash
# Python（サーバー）
poetry add <パッケージ名>

# Node.js（クライアント）
cd client_desktop_app
npm install <パッケージ名>
```

## セキュリティ実装
### 暗号化フロー
1. **鍵生成**: クライアントが起動時にRSA鍵ペアを生成
2. **公開鍵交換**: クライアントとサーバーがRSA公開鍵を交換
3. **AES鍵配布**: クライアントがAES-256鍵を生成し、サーバーのRSA公開鍵で暗号化
4. **安全な通信**: 全ファイルデータをAES-256-GCMで暗号化

### コード内のセキュリティ機能
**TypeScript（クライアント）:**
```typescript
// RSA鍵生成
const { publicKey, privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" }
});

// AES暗号化
function encryptChunk(chunk: Buffer, key: Buffer): Buffer {
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, nonce);
  // ... 暗号化ロジック
}
```

**Python（サーバー）:**
```python
# RSA鍵管理
class RSAManager:
    def __init__(self):
        self.private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048
        )
```

## 動画処理機能
### サポートされる操作
- **圧縮**: ファイルサイズに基づく動的品質
- **解像度**: 480pから4Kまでサポート
- **フォーマット変換**: MP4、MP3、GIF、WEBM
- **アスペクト比**: 16:9、4:3変換
- **時間ベースクリッピング**: カスタム開始/終了時間

### FFmpeg統合
サーバーは各操作タイプに最適化されたコマンドで、すべての動画処理操作にFFmpegを使用します。

## 開発コンテキスト
このプロジェクトは、3人チームにより4週間で開発されました。以下を実証しています：
- **TypeScriptとPython**によるフルスタック開発
- **暗号化セキュリティ**の実装
- **Electron**によるデスクトップアプリケーション開発
- **FFmpeg**による動画処理
- **非同期通信**パターン
- **エラーハンドリング**とユーザーエクスペリエンス設計

## 技術スタック
### フロントエンド
- **Electron**: デスクトップアプリケーションフレームワーク
- **TypeScript**: 型安全なJavaScript
- **HTML/CSS**: モダンUI設計
- **Node.js**: ランタイム環境

### バックエンド
- **Python 3.11.2**: サーバー実装
- **Poetry**: 依存関係管理
- **FFmpeg**: 動画処理
- **Cryptography**: セキュリティ実装

### 通信
- **TCPソケット**: クライアント・サーバー通信
- **RSA + AES**: ハイブリッド暗号化
- **チャンク化ストリーミング**: 効率的なファイル転送

## 使用方法
1. **アプリケーション起動**: サーバーとクライアント両方を開始
2. **動画アップロード**: アップロードエリアをクリックしてMP4ファイルを選択
3. **操作選択**: 圧縮、解像度変更などを選択
4. **設定構成**: 選択した操作のパラメータを調整
5. **処理**: 実行をクリックして処理開始
6. **ダウンロード**: 処理済みファイルを希望の場所に保存
