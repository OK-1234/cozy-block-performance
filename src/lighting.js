import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
export function addLighting(scene,renderer){
 scene.add(new THREE.HemisphereLight(0xffffff,0xb9d1bd,1.3));
 const sun=new THREE.DirectionalLight(0xfff4dd,2.2);sun.position.set(-12,28,16);sun.castShadow=true;
 Object.assign(sun.shadow.camera,{left:-28,right:28,top:28,bottom:-28,near:1,far:80});sun.shadow.mapSize.set(1024,1024);sun.shadow.normalBias=0.04;sun.shadow.bias=-0.0002;scene.add(sun);
 const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment(),env=pmrem.fromScene(room,0.04);
 scene.environment=env.texture;scene.environmentIntensity=0.45;room.dispose();pmrem.dispose();return env;
}
