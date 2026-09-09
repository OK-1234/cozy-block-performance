import * as THREE from 'three';
import {createRenderer} from './renderer.js';
import {createCamera} from './camera.js';
import {addLighting} from './lighting.js';
import {AssetLibrary} from './assets.js';
import {buildTown,LEVELS} from './town.js';
import {createPerformance} from './performance.js';
const {renderer,resize}=createRenderer(document.querySelector('#viewport'));
const {camera,controls,reset}=createCamera(renderer.domElement);
renderer.domElement.setAttribute('aria-label','街の3D表示。ドラッグで回転、ピンチで拡大、2本指で移動。');
const scene=new THREE.Scene();scene.background=new THREE.Color('#dcefeb');addLighting(scene,renderer);
const assets=new AssetLibrary();let town=null;
const perf=createPerformance(renderer,assets,()=>town);
function setLevel(level){if(!LEVELS[level])return;const next=buildTown(level,assets);town?.dispose();town=next;scene.add(town.root);renderer.shadowMap.needsUpdate=true;perf.reset();
 document.querySelectorAll('[data-level]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.level===level)));
 const c=town.counts;document.querySelector('#counts').textContent=`建物 ${c.buildings} · 木 ${c.trees} · 街灯 ${c.lamps} · ベンチ ${c.benches} · 車 ${c.cars}`;
}
await assets.init();setLevel('LOW');document.querySelector('#status').textContent='cozy_car.glb 読み込み済み · 同じ視点で負荷を比較';
document.querySelectorAll('[data-level]').forEach(b=>b.addEventListener('click',()=>setLevel(b.dataset.level)));
document.querySelector('#reset').addEventListener('click',reset);
window.addEventListener('resize',()=>{resize();camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();perf.reset();});
function frame(now){controls.update();renderer.info.reset();renderer.render(scene,camera);perf.update(now);}
renderer.setAnimationLoop(frame);
document.addEventListener('visibilitychange',()=>{perf.reset();renderer.setAnimationLoop(document.hidden?null:frame);});
renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();renderer.setAnimationLoop(null);document.querySelector('#status').textContent='描画が停止しました。ページを再読み込みしてください。';});
