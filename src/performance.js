export function createPerformance(renderer,assets,getTown){
 const labels=['Triangles','Draw Calls','Geometries','Textures','GLB files / instances','画面 (CSS px)','devicePixelRatio','描画 PixelRatio'];
 const dl=document.querySelector('#metrics');const values=labels.map(label=>{const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent='—';dl.append(dt,dd);return dd;});
 let last=null,total=0,frames=0;
 function reset(){last=null;total=0;frames=0;}
 function update(now){if(last===null){last=now;return;}total+=now-last;last=now;frames++;if(total<500)return;
  document.querySelector('#fps').textContent=(frames*1000/total).toFixed(0);document.querySelector('#frame').textContent=(total/frames).toFixed(1)+' ms';
  const info=renderer.info,town=getTown();[info.render.triangles.toLocaleString(),info.render.calls,info.memory.geometries,info.memory.textures,`${assets.sources.size} / ${town?.glbInstances??0}`,`${innerWidth} × ${innerHeight}`,(devicePixelRatio||1).toFixed(2),renderer.getPixelRatio().toFixed(2)].forEach((v,i)=>values[i].textContent=v);
  total=0;frames=0;
 }
 return {update,reset};
}
