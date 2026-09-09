import * as THREE from 'three';
import { createRenderer } from './renderer.js';
import { createCamera } from './camera.js';
import { addLighting } from './lighting.js';
import { AssetLibrary } from './assets.js';
import { buildTown, LEVELS } from './town.js';
import { createPerformance } from './performance.js';
import { createCharacter } from './character.js';
import { createInput } from './input.js';
import { Game } from './game.js';

const { renderer, resize } = createRenderer(document.querySelector('#viewport'));
const follow = createCamera(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#dcefeb');
addLighting(scene, renderer);
const assets = new AssetLibrary();
let town = null, previousTime = null, accumulator = 0, uiTime = 0;
const FIXED_STEP = 1 / 120;
const perf = createPerformance(renderer, assets, () => town);
const action = document.querySelector('#interact');
const status = document.querySelector('#status');
const modeValue = document.querySelector('#mode');
const speedValue = document.querySelector('#speed');
const resetButton = document.querySelector('#reset');
await assets.init();
const character = createCharacter(assets);
scene.add(character.root);
const game = new Game(character);
const input = createInput(document.querySelector('#stick'), document.querySelector('#knob'), action, () => {
  if (game.interact()) {
    input.release(); follow.reset(game.subject); renderer.shadowMap.needsUpdate = true; updateUI();
  }
});

function updateUI() {
  modeValue.textContent = game.mode;
  speedValue.textContent = game.car ? `${Math.abs(game.car.speed * 3.6).toFixed(0)} km/h` : '';
  if (game.mode === 'DRIVE') {
    action.hidden = false; action.textContent = '降りる';
    action.disabled = !game.exitPosition();
    status.textContent = Math.abs(game.car.speed) > 0.6 ? 'スティックを離して減速 → E / 降りる' : action.disabled ? '降車スペースのある場所へ移動してください' : 'E / 降りる · 上：前進 下：後退 左右：旋回';
  } else {
    action.hidden = !game.nearbyCar(); action.disabled = false; action.textContent = '乗る';
    status.textContent = action.hidden ? 'WASD / 矢印 / 左スティックで車へ' : 'Eで乗る /「乗る」ボタン';
  }
  resetButton.textContent = follow.overview ? '追従に戻す' : '街全体';
}

function setLevel(level) {
  if (!LEVELS[level]) return;
  input.release(); accumulator = 0;
  const next = buildTown(level, assets);
  next.cameraBoxes = next.colliders.map(b => new THREE.Box3(new THREE.Vector3(b.minX, 0, b.minZ), new THREE.Vector3(b.maxX, b.height, b.maxZ)));
  next.cameraHit = new THREE.Vector3();
  next.glbInstances += character.glbInstances;
  town?.dispose(); town = next; scene.add(town.root);
  game.setTown(town); follow.reset(game.subject);
  renderer.shadowMap.needsUpdate = true; perf.reset();
  document.querySelectorAll('[data-level]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.level === level)));
  const c = town.counts;
  document.querySelector('#counts').textContent = `建物 ${c.buildings} · 木 ${c.trees} · 街灯 ${c.lamps} · ベンチ ${c.benches} · 車 ${c.cars}`;
  updateUI();
}
setLevel('HIGH');
document.querySelectorAll('[data-level]').forEach(button => button.addEventListener('click', () => setLevel(button.dataset.level)));
resetButton.addEventListener('click', () => {
  input.release();
  if (follow.overview) follow.reset(game.subject); else follow.showOverview();
  updateUI();
});
window.addEventListener('resize', () => {
  resize(); follow.camera.aspect = innerWidth / innerHeight; follow.camera.updateProjectionMatrix(); perf.reset();
});

function frame(now) {
  const dt = previousTime === null ? 0 : Math.min((now - previousTime) / 1000, 0.1);
  previousTime = now;
  const axes = input.read();
  if (follow.overview && (Math.abs(axes.x) + Math.abs(axes.y) > 0.1)) follow.reset(game.subject);
  accumulator += dt;
  let changed = false;
  while (accumulator >= FIXED_STEP) {
    changed = game.update(FIXED_STEP, axes, follow.heading) || changed;
    accumulator -= FIXED_STEP;
  }
  // Moving actors require fresh shadows. Static frames retain the cached map.
  if (changed) renderer.shadowMap.needsUpdate = true;
  follow.update(dt, game);
  uiTime += dt;
  if (uiTime >= 0.1) { updateUI(); uiTime = 0; }
  renderer.info.reset(); renderer.render(scene, follow.camera); perf.update(now);
}
renderer.setAnimationLoop(frame);
function pause() {
  input.release(); previousTime = null; accumulator = 0; perf.reset();
  if (game.car) game.car.speed = 0;
}
window.addEventListener('blur', pause);
document.addEventListener('visibilitychange', () => {
  pause(); renderer.setAnimationLoop(document.hidden ? null : frame);
});
renderer.domElement.addEventListener('webglcontextlost', event => {
  event.preventDefault(); renderer.setAnimationLoop(null); pause();
  status.textContent = '描画が停止しました。ページを再読み込みしてください。';
});
