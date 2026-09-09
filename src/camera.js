import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function createCamera(canvas) {
  const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.1, 400);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.minDistance = 9; controls.maxDistance = 280;
  controls.maxPolarAngle = Math.PI * 0.47;
  controls.maxTargetRadius = 23; controls.screenSpacePanning = false;
  controls.enabled = false;
  const target = new THREE.Vector3(), desired = new THREE.Vector3(), aim = new THREE.Vector3();
  const raycaster = new THREE.Raycaster(), ray = new THREE.Vector3();
  let heading = Math.PI / 2, overview = false, initialized = false;

  function reset(subject) {
    overview = false; controls.enabled = false;
    if (subject) heading = subject.rotation.y;
    // Reset input yaw, but keep position transitions smooth after initial load.
  }
  function showOverview() {
    overview = true; controls.enabled = true;
    controls.target.set(0, 0, 0);
    const k = Math.max(1.16, 1.25 / camera.aspect);
    camera.position.set(33 * k, 37 * k, 42 * k); controls.update();
  }
  function update(dt, game) {
    if (overview) { controls.update(); return; }
    const subject = game.subject, drive = game.mode === 'DRIVE';
    const delta = Math.atan2(Math.sin(subject.rotation.y - heading), Math.cos(subject.rotation.y - heading));
    heading += delta * (1 - Math.exp(-3 * dt));
    const c = Math.cos(heading), s = Math.sin(heading);
    const distance = (drive ? 10 : 7.5) * (camera.aspect < 0.8 ? 1.15 : 1);
    desired.set(subject.position.x - c * distance + s * 1.5,
      subject.position.y + (drive ? 7.5 : 6), subject.position.z + s * distance + c * 1.5);
    const lookAhead = drive ? 3.4 : 1.7;
    aim.set(subject.position.x + c * lookAhead, subject.position.y + 1.0, subject.position.z - s * lookAhead);
    // Keep a useful following distance near buildings. Raise the desired camera
    // over roofs instead of pushing it into an extreme close-up behind the player.
    for (let attempt = 0; attempt < 5; attempt++) {
      ray.copy(desired).sub(aim);
      const length = ray.length(); ray.normalize();
      raycaster.ray.set(aim, ray);
      const obstructed = game.town.cameraBoxes.some(box => {
        const hit = raycaster.ray.intersectBox(box, game.town.cameraHit);
        return hit && aim.distanceTo(hit) < length;
      });
      if (!obstructed) break;
      desired.y += 3;
    }
    if (!initialized) { camera.position.copy(desired); target.copy(aim); initialized = true; }
    else {
      camera.position.lerp(desired, 1 - Math.exp(-5 * dt));
      target.lerp(aim, 1 - Math.exp(-8 * dt));
    }
    camera.lookAt(target);
  }
  return { camera, controls, reset, showOverview, update, get heading() { return heading; }, get overview() { return overview; } };
}
