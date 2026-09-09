import * as THREE from 'three';
import { AssetLibrary } from '../src/assets.js';
import { buildTown, LEVELS } from '../src/town.js';
import { createCharacter } from '../src/character.js';
import { Game } from '../src/game.js';
import { CollisionWorld } from '../src/collision.js';
import { createInput } from '../src/input.js';

const result = document.querySelector('#result');
const input = createInput(document.querySelector('#test-stick'), document.querySelector('#test-knob'), document.querySelector('#test-action'), () => {});
let maxAxis = 0;
function poll() {
  const axes = input.read(); maxAxis = Math.max(maxAxis, Math.hypot(axes.x, axes.y));
  document.querySelector('#pointer-result').textContent = `Pointer max: ${maxAxis.toFixed(2)}; released: ${axes.x.toFixed(2)}, ${axes.y.toFixed(2)}`;
  requestAnimationFrame(poll);
}
poll();

document.querySelector('#run').addEventListener('click', async () => {
  const checks = [];
  const assert = (condition, name) => { if (!condition) throw new Error(name); checks.push('PASS ' + name); };
  try {
    const assets = new AssetLibrary(); await assets.init();
    for (const level of Object.keys(LEVELS)) {
      const town = buildTown(level, assets), character = createCharacter(assets), game = new Game(character);
      game.setTown(town);
      assert(town.cars.length === LEVELS[level].cars && town.colliders.length === LEVELS[level].buildings, `${level}: preserved object counts`);
      const z = character.root.position.z;
      for (let i = 0; i < 20; i++) game.update(1 / 120, { x: 0, y: 1 }, Math.PI / 2);
      assert(character.root.position.z < z - 0.3, `${level}: walk towards car`);
      assert(game.interact() && game.mode === 'DRIVE' && !character.root.visible, `${level}: enter and hide character`);
      const vehicle = game.car, car = vehicle.root;
      assert(vehicle.wheels.length === 4, `${level}: all 4 GLB wheel objects found`);
      const wheelBefore = vehicle.wheels[0].mesh.quaternion.clone();
      for (let i = 0; i < 240; i++) game.update(1 / 120, { x: 0, y: 1 }, 0);
      assert(vehicle.speed > 7 && vehicle.speed <= 7.5, `${level}: acceleration and speed limit`);
      assert(!game.interact() && game.mode === 'DRIVE', `${level}: cannot exit at speed`);
      assert(wheelBefore.angleTo(vehicle.wheels[0].mesh.quaternion) > 0.01, `${level}: wheels rotate`);
      const yaw = car.rotation.y;
      for (let i = 0; i < 25; i++) game.update(1 / 120, { x: -0.7, y: 0.7 }, 0);
      assert(car.rotation.y > yaw, `${level}: left steering follows front +X axis`);
      for (let i = 0; i < 240; i++) game.update(1 / 120, { x: 0, y: 0 }, 0);
      assert(vehicle.speed === 0, `${level}: releasing controls stops car`);
      for (let i = 0; i < 50; i++) game.update(1 / 120, { x: 0, y: -1 }, 0);
      assert(vehicle.speed < 0, `${level}: reverse`);
      for (let i = 0; i < 100; i++) game.update(1 / 120, { x: 0, y: 0 }, 0);
      assert(game.interact() && character.root.visible && game.mode === 'WALK', `${level}: safe exit`);
      assert(game.world.isFree(character.root.position.x, character.root.position.z, 0.34), `${level}: exit outside car and buildings`);
      const before = character.root.position.clone();
      for (let i = 0; i < 60; i++) game.update(1 / 120, { x: 1, y: 0 }, 0);
      assert(character.root.position.distanceTo(before) > 0.3, `${level}: walking resumes`);
      character.root.position.set(-15, 0.27, -6);
      for (let i = 0; i < 240; i++) game.update(1 / 120, { x: 0, y: 1 }, Math.PI / 2);
      assert(game.world.isFree(character.root.position.x, character.root.position.z, 0.34), `${level}: player never enters building`);
      game.setTown(town);
      assert(game.mode === 'WALK' && character.root.visible && !game.car, `${level}: level reset leaves no hidden driver`);
      town.dispose();
    }
    const world = new CollisionWorld([{ minX: -1, maxX: 1, minZ: -1, maxZ: 1 }], []);
    const position = new THREE.Vector3(-4, 0, 0);
    world.moveWalker(position, 20, 0);
    assert(position.x < -1.3, 'large movement cannot tunnel through wall');
    world.moveWalker(position, 0, 100);
    assert(position.z <= 22.06, 'player stays on town platform');

    const town = buildTown('HIGH', assets), game = new Game(createCharacter(assets)); game.setTown(town); game.interact();
    const vehicle = game.car;
    vehicle.root.position.set(-6, 0.2, 0); vehicle.root.rotation.y = 0;
    game.world = new CollisionWorld([{ minX: 0, maxX: 2, minZ: -3, maxZ: 3 }], [vehicle.root]);
    for (let i = 0; i < 600; i++) game.update(1 / 120, { x: 0, y: 1 }, 0);
    assert(vehicle.root.position.x < -1.7 && vehicle.speed === 0, 'car stops before building, including bumper');
    assert(game.world.carIsFree(vehicle.root.position.x, vehicle.root.position.z, vehicle.root.rotation.y, vehicle.root), 'stopped car footprint remains clear');
    game.world = new CollisionWorld([{ minX: -22, maxX: 22, minZ: -22, maxZ: 22 }], [vehicle.root]);
    assert(!game.interact(), 'blocked exit does not place player in wall');
    town.dispose();

    // A complete loop around the north-east group of the EXISTING HIGH town.
    // Only ordinary throttle/steering are supplied; no movement or collision bypass.
    const loopTown = buildTown('HIGH', assets), loopGame = new Game(createCharacter(assets));
    loopGame.setTown(loopTown); loopGame.interact();
    const route = [[-2,1.55],[1.3,-4],[1.3,-15],[6,-20],[18.6,-20],[21.1,-4],[21.1,1.5],[7,5],[2,2],[-9,2]];
    let waypoint = 0, travel = 0, stuckFrames = 0, reverseTicks = 0;
    for (let tick = 0; tick < 120 * 100 && waypoint < route.length; tick++) {
      const p = loopGame.car.root.position, [x,z] = route[waypoint];
      const distance = Math.hypot(x-p.x,z-p.z);
      if (distance < 1.2) { waypoint++; continue; }
      const desired = Math.atan2(-(z-p.z),x-p.x), yaw = loopGame.car.root.rotation.y;
      const difference = Math.atan2(Math.sin(desired-yaw),Math.cos(desired-yaw));
      const steer = -THREE.MathUtils.clamp(difference * 2, -1, 1);
      const speed = loopGame.car.speed, forward = speed < 2.5 ? 0.65 : 0;
      if (reverseTicks > 0) {
        loopGame.update(1/120,{x:0,y:0.65},0); reverseTicks--;
      } else {
        loopGame.update(1/120,{x:steer,y:forward},0);
        stuckFrames = Math.abs(loopGame.car.speed) < 0.02 ? stuckFrames + 1 : 0;
        if (stuckFrames > 30) { reverseTicks = 120; stuckFrames = 0; }
      }
      travel += Math.abs(loopGame.car.speed) / 120;
    }
    assert(waypoint === route.length && travel > 60, `HIGH: full block driving loop (${waypoint}/${route.length} waypoints; position ${loopGame.car.root.position.x.toFixed(2)},${loopGame.car.root.position.z.toFixed(2)} yaw ${loopGame.car.root.rotation.y.toFixed(2)})`);
    for (let i=0;i<120;i++) loopGame.update(1/120,{x:0,y:0},0);
    assert(loopGame.interact() && loopGame.mode === 'WALK', 'HIGH: stop and exit after full loop');
    loopTown.dispose();

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    assert(input.read().y === 1, 'W key input');
    window.dispatchEvent(new Event('blur'));
    assert(input.read().y === 0, 'blur releases held input');
    result.textContent = `${checks.length} checks passed\n` + checks.join('\n');
  } catch (error) { result.textContent = checks.join('\n') + '\nFAIL ' + error.stack; }
});
