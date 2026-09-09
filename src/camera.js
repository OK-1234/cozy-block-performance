import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
export function createCamera(canvas){
 const camera=new THREE.PerspectiveCamera(42,innerWidth/innerHeight,0.1,400),controls=new OrbitControls(camera,canvas);
 controls.enableDamping=true;controls.minDistance=9;controls.maxDistance=280;controls.maxPolarAngle=Math.PI*0.47;controls.minPolarAngle=0.12;controls.maxTargetRadius=23;controls.screenSpacePanning=false;
 const reset=()=>{controls.target.set(0,0,0);const k=Math.max(1.16,1.25/camera.aspect);camera.position.set(33*k,37*k,42*k);controls.update();};
 reset();return {camera,controls,reset};
}
