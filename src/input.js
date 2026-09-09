const MOVEMENT_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight']);

export function createInput(stick, knob, actionButton, onInteract) {
  const keys = new Set();
  let pointer = null, centreX = 0, centreY = 0, radius = 45;
  const touch = { x: 0, y: 0 }, axes = { x: 0, y: 0 };

  function release() {
    keys.clear(); pointer = null; touch.x = touch.y = 0;
    knob.style.transform = 'translate(0px, 0px)';
  }
  function setPointer(event) {
    const dx = event.clientX - centreX, dy = event.clientY - centreY;
    const length = Math.hypot(dx, dy), scale = Math.min(1, radius / Math.max(length, 1));
    touch.x = dx * scale / radius; touch.y = -dy * scale / radius;
    if (length < radius * 0.13) touch.x = touch.y = 0;
    knob.style.transform = `translate(${dx * scale}px, ${dy * scale}px)`;
  }
  stick.addEventListener('pointerdown', event => {
    if (pointer !== null || event.button > 0) return;
    event.preventDefault(); pointer = event.pointerId;
    const bounds = stick.getBoundingClientRect();
    centreX = bounds.left + bounds.width / 2; centreY = bounds.top + bounds.height / 2;
    radius = bounds.width * 0.33;
    stick.setPointerCapture(pointer); setPointer(event);
  });
  stick.addEventListener('pointermove', event => {
    if (event.pointerId === pointer) { event.preventDefault(); setPointer(event); }
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    stick.addEventListener(type, event => { if (event.pointerId === pointer) release(); });
  }
  window.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
    if (MOVEMENT_KEYS.has(event.code)) { event.preventDefault(); keys.add(event.code); }
    if (event.code === 'KeyE' && !event.repeat) { event.preventDefault(); onInteract(); }
  });
  window.addEventListener('keyup', event => { keys.delete(event.code); });
  window.addEventListener('blur', release);
  document.addEventListener('visibilitychange', release);
  window.addEventListener('resize', release);
  actionButton.addEventListener('click', onInteract);
  return {
    release,
    read() {
      axes.x = touch.x + Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'));
      axes.y = touch.y + Number(keys.has('KeyW') || keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown'));
      const length = Math.max(1, Math.hypot(axes.x, axes.y));
      axes.x /= length; axes.y /= length;
      return axes;
    },
  };
}
