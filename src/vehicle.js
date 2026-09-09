import * as THREE from 'three';
import { groundHeight } from './collision.js';

const Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
const steeringRotation = new THREE.Quaternion(), spinRotation = new THREE.Quaternion();
export const MAX_SPEED = 7.5, MAX_REVERSE = 3;

export class Vehicle {
  constructor(root) {
    this.root = root; this.speed = 0; this.steer = 0; this.spin = 0;
    this.wheels = [];
    for (const name of ['Wheel_FL', 'Wheel_FR', 'Wheel_RL', 'Wheel_RR']) {
      const mesh = root.getObjectByName(name);
      if (mesh) this.wheels.push({ mesh, base: mesh.quaternion.clone(), front: name.startsWith('Wheel_F') });
    }
    // Exported wheel radius, adjusted by the existing uniform car transform.
    this.wheelRadius = 0.35 * (root.children[0]?.scale.x || 1);
  }

  update(dt, input, world) {
    const oldSteer = this.steer;
    this.steer += (-input.x * 0.55 - this.steer) * (1 - Math.exp(-10 * dt));
    const throttle = input.y;
    if (Math.abs(throttle) > 0.08) {
      const braking = this.speed * throttle < 0;
      this.speed += throttle * (braking ? 10 : 4.5) * dt;
    } else {
      this.speed = Math.sign(this.speed) * Math.max(0, Math.abs(this.speed) - 4 * dt);
    }
    this.speed = THREE.MathUtils.clamp(this.speed, -MAX_REVERSE, MAX_SPEED);
    const distance = this.speed * dt;
    const yaw = this.root.rotation.y + distance * Math.tan(this.steer) / 2.05;
    const x = this.root.position.x + Math.cos(yaw) * distance;
    const z = this.root.position.z - Math.sin(yaw) * distance;
    let moved = false;
    if (world.carIsFree(x, z, yaw, this.root)) {
      moved = Math.abs(distance) > 0.00001;
      this.root.position.set(x, groundHeight(x, z), z); this.root.rotation.y = yaw;
      this.spin = (this.spin - distance / this.wheelRadius) % (Math.PI * 2);
    } else this.speed = 0;
    for (const wheel of this.wheels) {
      steeringRotation.setFromAxisAngle(Y, wheel.front ? this.steer : 0);
      spinRotation.setFromAxisAngle(Z, this.spin);
      wheel.mesh.quaternion.copy(steeringRotation).multiply(wheel.base).multiply(spinRotation);
    }
    return moved || Math.abs(oldSteer - this.steer) > 0.0001;
  }
}
