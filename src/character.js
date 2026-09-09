import * as THREE from 'three';

// A GLB set in ASSETS.character replaces only the visual, keeping controller/collision.
export function createCharacter(assets) {
  const root = new THREE.Group();
  root.name = 'Player';
  const replacement = assets.create('character');
  if (replacement) {
    root.add(replacement);
    return { root, glbInstances: 1, animate() {} };
  }
  const box = new THREE.BoxGeometry(1, 1, 1);
  const head = new THREE.IcosahedronGeometry(0.27, 1);
  const materials = new Map();
  function part(color, geometry, x, y, z, sx = 1, sy = 1, sz = 1) {
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.9 }));
    const mesh = new THREE.Mesh(geometry, materials.get(color));
    mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz);
    mesh.castShadow = true; mesh.receiveShadow = true; root.add(mesh);
    return mesh;
  }
  part('#ebad76', head, 0, 1.23, 0);
  part('#d98162', box, 0, 0.8, 0, 0.34, 0.5, 0.48);
  part('#3b6973', box, 0, 0.49, 0, 0.32, 0.15, 0.42);
  part('#e9ce86', box, 0, 1.43, 0, 0.43, 0.13, 0.52);
  part('#e9ce86', box, 0.2, 1.39, 0, 0.28, 0.055, 0.52);
  part('#3d5554', box, 0.255, 1.25, -0.1, 0.015, 0.055, 0.045);
  part('#3d5554', box, 0.255, 1.25, 0.1, 0.015, 0.055, 0.045);
  const limbs = [-1, 1].map(side => ({
    arm: part('#ebad76', box, 0, 0.75, side * 0.32, 0.17, 0.42, 0.14),
    leg: part('#3b6973', box, 0, 0.25, side * 0.13, 0.2, 0.45, 0.18),
  }));
  let phase = 0;
  return {
    root, glbInstances: 0,
    animate(dt, moving) {
      if (moving) phase += dt * 10;
      limbs.forEach(({ arm, leg }, i) => {
        const swing = moving ? Math.sin(phase + i * Math.PI) * 0.4 : 0;
        arm.rotation.z = swing; leg.rotation.z = -swing;
      });
    },
  };
}
