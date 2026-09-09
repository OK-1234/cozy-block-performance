import * as THREE from 'three';
export const LEVELS={LOW:{buildings:6,trees:10,lamps:10,benches:3,cars:1},MEDIUM:{buildings:8,trees:20,lamps:16,benches:5,cars:3},HIGH:{buildings:10,trees:32,lamps:24,benches:8,cars:6}};
// Shared geometry and material per primitive family, with per-instance colours.
class Batches{
 constructor(root){this.root=root;this.items=new Map();this.geometries={box:new THREE.BoxGeometry(1,1,1),leaf:new THREE.IcosahedronGeometry(1,0),pole:new THREE.CylinderGeometry(0.5,0.5,1,8),roof:new THREE.CylinderGeometry(0,1,1,4)};this.material=new THREE.MeshStandardMaterial({roughness:0.85});}
 add(type,color,x,y,z,sx,sy,sz,rotation=0){if(!this.items.has(type))this.items.set(type,[]);this.items.get(type).push({color,x,y,z,sx,sy,sz,rotation});}
 finish(){const dummy=new THREE.Object3D();for(const[type,items]of this.items){const mesh=new THREE.InstancedMesh(this.geometries[type],this.material,items.length);items.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.scale.set(p.sx,p.sy,p.sz);dummy.rotation.set(0,p.rotation,0);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,new THREE.Color(p.color));});mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();this.root.add(mesh);}}
 dispose(){Object.values(this.geometries).forEach(g=>g.dispose());this.material.dispose();this.root.traverse(o=>{if(o.isInstancedMesh)o.dispose();});}
}
export function buildTown(level,assets){
 const counts=LEVELS[level],root=new THREE.Group(),b=new Batches(root);let glbInstances=0;
 const box=(c,x,y,z,w,h,d,r=0)=>b.add('box',c,x,y,z,w,h,d,r);
 const replacement=(kind,x,z,r=0)=>{const model=assets.create(kind);if(!model)return false;model.position.set(x,0.26,z);model.rotation.y=r;root.add(model);glbInstances++;return true;};
 box('#b4d5bd',0,-0.65,0,46,1.3,46);box('#d0e3c4',0,0.02,0,45.5,0.12,45.5);
 box('#849a9f',0,0.11,0,6.4,0.12,45.6);box('#849a9f',0,0.12,0,45.6,0.12,6.4);
 for(const x of [-1,1])for(const z of [-1,1])box('#f2e8d2',x*13.1,0.15,z*13.1,19.4,0.22,19.4);
 for(let i=-21;i<=21;i+=3){if(Math.abs(i)<5)continue;box('#f5eed8',0,0.19,i,0.13,0.015,1.35);box('#f5eed8',i,0.2,0,1.35,0.015,0.13);}
 for(const s of [-1,1])for(let i=-2;i<=2;i++){box('#fff5de',i*0.95,0.2,s*4.3,0.55,0.02,1.3);box('#fff5de',s*4.3,0.2,i*0.95,1.3,0.02,0.55);}
 const sites=[[-15,-11],[-7,-11],[10,-11],[-15,11],[-7,11],[10,11],[17,-11],[17,11],[-11,-19],[-11,19]];
 const colors=['#e6b58d','#95c9c1','#e8ca82','#bcb9d8','#e6b3b0','#98bcca'];
 sites.slice(0,counts.buildings).forEach(([x,z],i)=>{if(replacement('building',x,z))return;const h=3.5+(i%3)*0.65,face=z<0?1:-1;
 box('#e5dbc7',x,0.4,z,5.8,0.3,5.8);box(colors[i%6],x,h/2+0.5,z,5.2,h,5);
 box('#faf0d9',x,h+0.6,z,5.65,0.25,5.5);
 b.add('roof',i%2?'#789d9d':'#c58776',x,h+1.25,z,4.1,1.2,4.1,Math.PI/4);
 box('#f6e9cd',x+1.5,h+1.1,z-1,0.55,1.6,0.6);
 for(const dx of [-1.55,1.55])for(const y of [1.4,h-0.45]){box('#fff2d8',x+dx,y,z+face*2.54,1.12,1.13,0.16);box('#5e8792',x+dx,y,z+face*2.64,0.85,0.87,0.06);box('#fdf1d4',x+dx,y,z+face*2.69,0.055,0.87,0.025);}
 for(const side of [-1,1])for(const dz of [-1.25,1.25]){box('#fff2d8',x+side*2.64,h-0.65,z+dz,0.12,1.15,1.1);box('#5e8792',x+side*2.72,h-0.65,z+dz,0.05,0.87,0.83);}
 for(const dx of [-1.5,1.5]){box('#fff2d8',x+dx,h-0.65,z-face*2.54,1.1,1.15,0.12);box('#5e8792',x+dx,h-0.65,z-face*2.63,0.83,0.87,0.05);}
 box('#617f7b',x,1.22,z+face*2.56,0.85,1.65,0.15);box('#f8e8bc',x+0.23,1.14,z+face*2.68,0.09,0.09,0.09);
 box('#fff0d6',x,2.4,z+face*2.95,4.7,0.18,0.85);for(let stripe=0;stripe<5;stripe++)box(i%2?'#7bb6a9':'#df9e84',x-1.9+stripe*0.95,2.51,z+face*2.95,0.47,0.05,0.85);
 });
 const trees=[];for(let i=0;i<16;i++){const edge=Math.floor(i/4),v=-18+(i%4)*12;trees.push(edge===0?[v,-21]:edge===1?[v,21]:edge===2?[-21,v]:[21,v]);}for(let i=0;i<16;i++){trees.push([[-18,-14,-10,-6,6,10,14,18][i%8],i<8?-6.1:6.1]);}
 trees.slice(0,counts.trees).forEach(([x,z],i)=>{if(replacement('tree',x,z))return;box('#b9d3a6',x,0.29,z,2.3,0.12,2.3);b.add('pole','#b09477',x,1.05,z,0.3,1.6,0.3);b.add('leaf',i%2?'#83b99a':'#a0c581',x,2.35,z,1.25,1.6,1.2);b.add('leaf','#a9cc93',x+0.5,2.8,z,0.85,1,0.9);});
 for(let i=0;i<counts.lamps;i++){const side=i%2?1:-1,n=Math.floor(i/2),x=n<6?side*3.85:-20+(n-6)*8,z=n<6?-20+n*8:side*3.85;if(replacement('lamp',x,z))continue;b.add('pole','#617e7b',x,1.65,z,0.12,2.85,0.12);box('#617e7b',x,0.4,z,0.32,0.28,0.32);box('#fff0bf',x,3.16,z,0.43,0.52,0.43);box('#617e7b',x,3.46,z,0.57,0.12,0.57);}
 for(let i=0;i<counts.benches;i++){const x=-17+(i%4)*10,z=i<4?18:-18;if(replacement('bench',x,z))continue;box('#c59d77',x,0.8,z,1.9,0.14,0.6);box('#c59d77',x,1.2,z+0.3,1.9,0.6,0.12);for(const dx of [-0.65,0.65])box('#617e7b',x+dx,0.51,z,0.12,0.5,0.5);}
 for(const s of [-1,1]){b.add('pole','#78928b',s*5,1.2,s*5,0.09,1.9,0.09);box('#659bb1',s*5,2.05,s*5,0.95,0.5,0.1);box('#f7ebd5',s*5,2.05,s*5+0.07,0.6,0.07,0.02);}
 const cars=[[-9,1.55,0],[8,-1.55,Math.PI],[-1.55,-13,Math.PI/2],[1.55,12,-Math.PI/2],[-18,1.55,0],[17,-1.55,Math.PI]];
 cars.slice(0,counts.cars).forEach(([x,z,r])=>replacement('car',x,z,r));b.finish();
 return {root,counts,glbInstances,dispose:()=>{root.removeFromParent();b.dispose();}};
}

