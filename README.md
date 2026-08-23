# 孫子兵法 十三篇

『孫子兵法』の十三篇を、軍師の進言、現代に残る名句、原文、書き下し文で読むための静的サイトです。

## 開発

基準ランタイムは Bun 1.4.0 です。

```bash
bun run build
bun run dev -- --host 127.0.0.1 --port 5173
```

編集対象は `src/`、生成先は `dist/` です。`design/` には制作時のデスクトップ／モバイル参考画像を残しています。

## LocalWeb

LocalWeb では `sonshi-guide.localhost` として公開し、Tailscale 経由では `/apps/sonshi-guide/` から参照します。

## 出典

原文・書き下し文と各名句の出典は、各篇の末尾および各名句に表示しています。主な全文参照先は中国語版・日本語版 Wikisource です。
