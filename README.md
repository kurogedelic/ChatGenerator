# シンプルチャット画像ジェネレーター

Markdownからチャット風の画像を簡単に生成するツールです。ライブプレビュー機能付きで、CSSで自由にカスタマイズ可能です。

## クイックスタート

```bash
# パッケージをインストール
npm install

# 初期化（サンプルファイルを生成）
npm run init

# 特定のファイルをプレビュー
npm run preview -- ファイル名.md --watch
# 例: npm run preview -- ep1.md --watch

# 特定のファイルをエクスポート
npm run export -- ファイル名.md
# 例: npm run export -- ep1.md
```

## 注意事項

- サーバーは通常 http://localhost:3000 で起動します
- iCloudフォルダ内で実行すると問題が発生する場合があります
- 問題が発生した場合は、ローカルフォルダにコピーして実行してください

## Markdown構文

```markdown
# メインタイトル
## サブタイトル

キャラクター:方向:タイプ "メッセージ内容"

---

## 次のセクション
```

### 例

```markdown
mercury:right "こんにちは！**DTM**を始めたばかりです。"

glasses:left:think "電子音楽の世界へようこそ"
```

## ライセンス

MIT