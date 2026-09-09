# Cozy Block / 街1区画の性能実験

## スマートフォンで開く

公開URL： https://ok-1234.github.io/cozy-block-performance/

Safari / Chromeで開いて、LOW → MEDIUM → HIGHを同じ視点で比較する。PCの起動や同一Wi-Fiは不要。端末名、ブラウザ名、FPS、Frame Time、描画PixelRatioを記録すると比較しやすい。

GitHub： https://github.com/OK-1234/cozy-block-performance
公開方式：mainブランチのルートをGitHub Pagesから配信（.nojekyll、ビルド不要）。mainへ更新をpushすると自動反映される。

`start.bat` を起動して http://localhost:8000/ を開く。Python 3が必要。既存の車専用ビューアは `car-viewer.html` に保存。
スマートフォンは同じWi-Fiから `http://PCのIPv4アドレス:8000/` を開く。PCのアドレスは `ipconfig` で確認。必要な場合はWindowsのプライベートネットワークでPythonの通信を許可する。HTMLの直接ダブルクリックではGLBを読み込めない。
Three.js 0.180.0を固定CDNから取得するため初回はインターネット接続が必要。

| 負荷 | 建物 | 木 | 街灯 | ベンチ | 車 |
|---|---:|---:|---:|---:|---:|
| LOW | 6 | 10 | 10 | 3 | 1 |
| MEDIUM | 8 | 20 | 16 | 5 | 3 |
| HIGH | 10 | 32 | 24 | 8 | 6 |

共通：46m四方の台座、十字路、歩道、横断歩道、標識2個。街灯は模型で、個別の光源は持たない。

## 比較手順
同じ端末・ブラウザ・縦横方向・視点でLOW→MEDIUM→HIGHを切り替え、数秒のウォームアップ後に30秒以上測定する。各条件を数分継続して発熱による低下も確認する。画面サイズと描画PixelRatioを記録。PCでの結果は実機スマートフォンの性能を保証しない。
FPSとFrame TimeはrequestAnimationFrame間隔の約0.5秒平均（GPU時間ではない）。TrianglesとDraw Callsはそのフレームで描画した分で、影更新フレームでは影パスも含む。Geometries/Texturesはrenderer.info.memoryの個数でありバイト数ではない。環境マップや影の内部テクスチャも含む。GLB filesは読み込んだURLの数、instancesは配置したモデル数。画面外カリングや表示リフレッシュレートの影響を受ける。

## GLBの差し替え
1. assets/buildings または assets/props にGLBを置く。
2. src/assets.js の対応するurlに相対パスを指定し、width（X方向の目標幅）とrotation（Y軸ラジアン）を設定する。
3. ASSET_LICENSES.mdに出所・ライセンスを記録して再読み込み。

該当カテゴリ全体を置換する。配置はsrc/town.jsに保持。GLBの原点とサイズは外側の変換で合わせ、頂点・材質は編集しない。素材は起動時に一度読み込み、複製間でgeometry/material/textureを共有する。GLBアニメーションは再生しない。圧縮拡張（Draco/KTX2など）は別途デコーダ設定が必要。比較時は同じ負荷レベルを使用する。

## 主な役割
- src/renderer.js：DPR上限1.5、色管理、影の設定
- src/camera.js：初期視点とOrbitControls
- src/lighting.js：半球光・平行光の2光源、環境反射
- src/town.js：配置・負荷段階・InstancedMesh・破棄処理
- src/assets.js：GLTFLoader・共有モデル・差し替え設定
- src/performance.js：実測パネル
- src/main.js：初期化と描画ループ

影は1024pxの1枚を配置変更時だけ更新する。徒歩や車移動を追加する際はsrc/main.jsに更新処理を接続し、src/camera.jsに追従カメラ、src/town.jsに衝突用配置情報を追加。動的な影はrenderer.shadowMap.needsUpdateを必要時に立てるかautoUpdateを有効にする。主人公・運転・NPC・交通・ミッションは未実装。

API参考：https://threejs.org/docs/pages/WebGLRenderer.html 、 https://threejs.org/docs/pages/GLTFLoader.html
