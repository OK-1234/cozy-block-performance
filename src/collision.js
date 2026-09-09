// Metres, X/Z plane. No mesh traversal or physics engine in the movement loop.
export const WORLD_LIMIT = 22.4;

export function circleBox(x, z, radius, box) {
  const dx = x - Math.max(box.minX, Math.min(x, box.maxX));
  const dz = z - Math.max(box.minZ, Math.min(z, box.maxZ));
  return dx * dx + dz * dz < radius * radius;
}

export function groundHeight(x, z) {
  return Math.abs(x) < 3.3 || Math.abs(z) < 3.3 ? 0.2 : 0.27;
}

export class CollisionWorld {
  constructor(buildings, cars) {
    this.buildings = buildings;
    this.cars = cars;
  }

  isFree(x, z, radius, ignoredCar = null) {
    if (Math.abs(x) + radius > WORLD_LIMIT || Math.abs(z) + radius > WORLD_LIMIT) return false;
    for (const box of this.buildings) if (circleBox(x, z, radius, box)) return false;
    for (const car of this.cars) {
      if (car === ignoredCar) continue;
      const dx = x - car.position.x, dz = z - car.position.z;
      const c = Math.cos(car.rotation.y), s = Math.sin(car.rotation.y);
      // Inverse of Three.js Y rotation. Parked cars are small oriented boxes.
      const lx = c * dx - s * dz, lz = s * dx + c * dz;
      if (circleBox(lx, lz, radius, car.userData.footprint)) return false;
    }
    return true;
  }

  carIsFree(x, z, yaw, car) {
    // Oriented rectangle SAT keeps bumpers/corners out of walls without
    // artificially blocking the narrow passages of the existing HIGH town.
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const length = car.userData.halfLength + 0.02, width = car.userData.halfWidth + 0.02;
    if (Math.abs(x) + Math.abs(c) * length + Math.abs(s) * width > WORLD_LIMIT ||
        Math.abs(z) + Math.abs(s) * length + Math.abs(c) * width > WORLD_LIMIT) return false;
    for (const box of this.buildings) {
      if (rectanglesOverlap(x,z,length,width,yaw,(box.minX+box.maxX)/2,(box.minZ+box.maxZ)/2,
        (box.maxX-box.minX)/2,(box.maxZ-box.minZ)/2,0)) return false;
    }
    for (const other of this.cars) {
      if (other === car) continue;
      if (rectanglesOverlap(x,z,length,width,yaw,other.position.x,other.position.z,
        other.userData.halfLength,other.userData.halfWidth,other.rotation.y)) return false;
    }
    return true;
  }

  moveWalker(position, dx, dz, radius = 0.34) {
    // Axis sliding plus bounded steps avoids tunnelling even after a slow frame.
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.12));
    for (let i = 0; i < steps; i++) {
      if (this.isFree(position.x + dx / steps, position.z, radius)) position.x += dx / steps;
      if (this.isFree(position.x, position.z + dz / steps, radius)) position.z += dz / steps;
    }
    position.y = groundHeight(position.x, position.z);
  }
}

// Four separating axes for two oriented rectangles, no temporary geometry.
export function rectanglesOverlap(ax,az,al,aw,ay,bx,bz,bl,bw,by) {
  const ac=Math.cos(ay),as=Math.sin(ay),bc=Math.cos(by),bs=Math.sin(by);
  const dot=Math.abs(ac*bc+as*bs),cross=Math.abs(ac*bs-as*bc),dx=bx-ax,dz=bz-az;
  return Math.abs(dx*ac-dz*as)<al+bl*dot+bw*cross &&
    Math.abs(dx*as+dz*ac)<aw+bl*cross+bw*dot &&
    Math.abs(dx*bc-dz*bs)<bl+al*dot+aw*cross &&
    Math.abs(dx*bs+dz*bc)<bw+al*cross+aw*dot;
}
