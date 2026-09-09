import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
// Replace url with a local GLB path. width is the uniform target size in metres.
export const ASSETS={car:{url:'./assets/car/cozy_car.glb',width:3.6,rotation:0},building:{url:null,width:5.2,rotation:0},tree:{url:null,width:2,rotation:0},lamp:{url:null,width:0.65,rotation:0},bench:{url:null,width:1.7,rotation:0}};
export class AssetLibrary{
 constructor(){this.loader=new GLTFLoader();this.sources=new Map();this.models={};}
 async init(){await Promise.all(Object.entries(ASSETS).map(async([kind,spec])=>{if(!spec.url)return;if(!this.sources.has(spec.url))this.sources.set(spec.url,this.loader.loadAsync(spec.url));const gltf=await this.sources.get(spec.url);this.models[kind]=gltf.scene;}));}
 create(kind){const source=this.models[kind];if(!source)return null;const spec=ASSETS[kind],root=new THREE.Group(),model=clone(source);root.add(model);model.rotation.y=spec.rotation;model.updateMatrixWorld(true);
 const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),s=spec.width/Math.max(size.x,0.001);
 model.scale.multiplyScalar(s);model.position.set(-center.x*s,-box.min.y*s,-center.z*s);model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});root.userData.glb=true;return root;}
}
