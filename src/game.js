import { CollisionWorld, groundHeight } from './collision.js';
import { Vehicle } from './vehicle.js';

export class Game {
  constructor(character) {
    this.character = character;
    this.mode = 'WALK'; this.car = null; this.moving = false; this.walkBasis = 0;
  }

  setTown(town) {
    this.town = town;
    this.vehicles = town.cars.map(root => new Vehicle(root));
    this.world = new CollisionWorld(town.colliders, town.cars);
    this.mode = 'WALK'; this.car = null; this.moving = false;
    this.character.root.visible = true;
    this.character.root.position.set(-9, groundHeight(-9, 4.2), 4.2);
    this.character.root.rotation.y = Math.PI / 2;
    this.character.animate(0, false);
  }

  get subject() { return this.car?.root || this.character.root; }

  nearbyCar() {
    const p = this.character.root.position;
    let nearest = null, distance = 3.3 ** 2;
    for (const vehicle of this.vehicles) {
      const car = vehicle.root, dx = p.x - car.position.x, dz = p.z - car.position.z;
      const d = dx * dx + dz * dz;
      if (d >= distance) continue;
      // A nearby car behind a building is not interactable through the wall.
      let visible = true;
      for (let step = 1; step < 8; step++) {
        if (!this.world.isFree(p.x - dx * step / 8, p.z - dz * step / 8, 0.12, car)) { visible = false; break; }
      }
      if (visible) { nearest = vehicle; distance = d; }
    }
    return nearest;
  }

  exitPosition() {
    if (!this.car || Math.abs(this.car.speed) > 0.6) return null;
    const root = this.car.root, p = root.position, yaw = root.rotation.y;
    for (const side of [1, -1]) for (const along of [0, -1.1, 1.1]) {
      const out = side * (root.userData.halfWidth + 0.65);
      const x = p.x + Math.cos(yaw) * along + Math.sin(yaw) * out;
      const z = p.z - Math.sin(yaw) * along + Math.cos(yaw) * out;
      if (this.world.isFree(x, z, 0.34)) return { x, z };
    }
    return null;
  }

  interact() {
    if (this.mode === 'WALK') {
      const car = this.nearbyCar(); if (!car) return false;
      this.car = car; this.mode = 'DRIVE'; this.character.root.visible = false;
    } else {
      const exit = this.exitPosition(); if (!exit) return false;
      this.character.root.position.set(exit.x, groundHeight(exit.x, exit.z), exit.z);
      this.character.root.rotation.y = this.car.root.rotation.y;
      this.car.speed = 0; this.car = null; this.mode = 'WALK'; this.character.root.visible = true;
    }
    this.moving = false; return true;
  }

  update(dt, input, cameraHeading) {
    if (this.mode === 'DRIVE') return this.car.update(dt, input, this.world);
    const active = Math.hypot(input.x, input.y) > 0.08;
    if (active && !this.moving) this.walkBasis = cameraHeading;
    const p = this.character.root.position, oldX = p.x, oldZ = p.z;
    if (active) {
      // Lock the view-relative basis for each movement gesture; camera chasing
      // must not turn a held direction into an unintended circular path.
      const c = Math.cos(this.walkBasis), s = Math.sin(this.walkBasis);
      const dx = (c * input.y + s * input.x) * 2.6 * dt;
      const dz = (-s * input.y + c * input.x) * 2.6 * dt;
      this.world.moveWalker(p, dx, dz);
      this.character.root.rotation.y = Math.atan2(-dz, dx);
    }
    const moved = Math.hypot(p.x - oldX, p.z - oldZ) > 0.00001;
    this.character.animate(dt, moved);
    const dirty = moved || this.animating;
    this.animating = moved;
    this.moving = active;
    return dirty;
  }
}
