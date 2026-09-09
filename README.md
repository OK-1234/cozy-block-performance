# Cozy Block 01 / Performance Lab

既存のローポリ街1区画に、徒歩・乗降・アーケード運転を追加したスマートフォン性能実験です。NPC・交通AI・会話・ミッション・物理エンジンはありません。

## 起動

公開URL： https://ok-1234.github.io/cozy-block-performance/

スマートフォンのSafari / Chromeで開く。PCの起動や同じWi-Fiは不要。
ローカルでは `start.bat`（Python 3）を起動して http://localhost:8000/ を開く。
Three.js 0.180.0は固定CDNから取得するためインターネット接続が必要。
GitHub Pagesは引き続きmainブランチのルートを配信する方式。`.nojekyll` を保持し、ビルドやサーバーAPIは不要。

## 操作

- 徒歩：WASD / 矢印キー、または左下スティック。操作開始時のカメラ方向を基準に移動する。歩行速度2.6m/s。
- 乗車：車の近くでE、または「乗る」。どの負荷でも配置されている車に乗れる。
- 運転：W / ↑ / スティック上で前進、S / ↓ / 下でブレーキ→後退、A/D / ←→ / 左右で旋回。
- スティック・キーを離すと減速。前進最大7.5m/s（27km/h）、後退最大3m/s。
- 降車：停止または0.6m/s以下でE /「降りる」。車の両側から安全な位置を探す。空きがなければ降りず、位置を移動して再試行。
- 「街全体」で従来のOrbitControls俯瞰表示。「追従に戻す」または移動入力で追従へ戻る。
- LOW / MEDIUM / HIGHの変更時は街と車の配置をリセットし、徒歩の開始位置へ戻る。初期値はHIGH。

| 負荷 | 建物 | 木 | 街灯 | ベンチ | 車 | 主人公 |
|---|---:|---:|---:|---:|---:|---:|
| LOW | 6 | 10 | 10 | 3 | 1 | 1 |
| MEDIUM | 8 | 20 | 16 | 5 | 3 | 1 |
| HIGH | 10 | 32 | 24 | 8 | 6 | 1 |

元の十字路、歩道、横断歩道、標識2個、建物や小物の配置を維持。外周の狭い場所では減速・切り返しを使う。車は建物・他の車・街の境界と衝突する。小さな木や街灯・ベンチは今回の衝突対象外。

## 性能測定

既存のFPS、Frame Time、Triangles、Draw Calls、Geometries、Textures、GLB files / instances、画面サイズ、端末DPR、描画PixelRatioを維持し、MODEと車速を追加。
FPS / Frame Timeは約0.5秒の平均フレーム間隔でGPU時間ではない。描画数には更新された影パスも含む。Geometries / Texturesは個数でありメモリ容量ではない。

HIGHで「静止」「徒歩」「運転」「周回後の徒歩」を各30秒以上測り、数分継続して発熱による低下も確認する。端末・ブラウザ・縦横・DPR・視点を記録する。追従カメラでは画面外カリングによりTriangles / Draw Callsが変わる。以前の静止版と比較するときは「街全体」に戻して同じ視点に合わせる。

- 描画PixelRatio上限1.5を維持。
- 街のInstancedMesh、車の共有geometry/material/textureを維持。
- 主人公は共有ジオメトリ2個・小さなメッシュ11個の仮モデル。
- シミュレーションは1/120秒刻み、1フレームの追いつき上限0.1秒。大きなフレーム落ちの後も壁を飛び越えない。
- 衝突判定は徒歩の円と建物AABB、車の向き付き矩形SAT。カメラは建物の箱を参照して屋根越しに視点を持ち上げる。
- 移動・車輪変化・乗降時は既存1024pxシャドウを更新。静止時はキャッシュ。影を更新する走行中は静止版よりDraw Callsが増える。
- 非表示・フォーカス喪失・pointercancelで入力を解除。非表示タブの描画停止を維持。

## ファイルの役割

- `src/main.js`：初期化、固定ステップ、モードUI、負荷切り替え
- `src/game.js`：徒歩・乗降・安全な降車先
- `src/input.js`：キーとPointer Events仮想スティック
- `src/vehicle.js`：加減速・旋回・4輪の回転と前輪操舵
- `src/character.js`：軽量主人公と最低限の歩行アニメーション
- `src/collision.js`：地面・境界・建物・車の当たり判定
- `src/camera.js`：滑らかな徒歩／車追従と既存俯瞰表示
- `src/town.js`：元の街、3段階の負荷、配置と衝突情報
- `src/assets.js`：GLTFLoader・共有モデル・差し替え設定
- `src/renderer.js` / `src/lighting.js`：既存のレンダラー、DPR、色、照明
- `src/performance.js`：既存の実測パネル
- `tests/runtime.html` / `tests/runtime.js`：ブラウザ回帰チェック（ゲーム本体からは読み込まない）

## 素材差し替え

`assets/buildings/`または`assets/props/`へGLBを追加し、`src/assets.js`の対応カテゴリのurl / width / rotationを設定して再読み込みする。ライセンスは`ASSET_LICENSES.md`へ記録する。
主人公も`ASSETS.character.url`にGLBを設定して差し替え可能（例：`./assets/props/player.glb`）。前方+X、上方+Yを基準とし、widthはX方向の目標幅。GLBキャラクターのクリップ再生は今後の拡張。
車GLBそのものは変更していない。車輪のノード変換だけを更新し、子のホイールも一緒に回転する。

## 確認

http://localhost:8000/tests/runtime.html で「Run gameplay checks」を押す。
3段階の乗降・運転・衝突・HIGH周回など54チェックと、スティックの実Pointer操作を確認済み。
390×844の縦画面で徒歩・乗車・旋回・降車を操作確認。スマートフォン実機のFPS、実機OS特有のマルチタッチ挙動はユーザー端末での測定が必要。

Three.js API参考：https://threejs.org/docs/pages/Object3D.html 、 https://threejs.org/docs/pages/WebGLRenderer.html
