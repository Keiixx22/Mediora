import * as THREE from 'three';

/**
 * MEDIORA as an isometric miniature world.
 * - Orthographic camera at true isometric angles (45 deg azimuth, 35.264 deg elevation). It slides over the
 *   map as you scroll but never rotates.
 * - Every block has three flat tones: light top, mid left face, dark right face (MeshBasicMaterial, no lighting).
 * - Pieces drop in from 40 px above with a small bounce, staggered by 3 frames.
 * - To explain a step, the roof lifts off a building and the process shows inside.
 * - Labels are DOM nodes with thin leader lines, projected from 3D anchors every frame.
 */

const PAL = { bg: 0xeef2f3, ink: 0x2d3142, accent: 0xef8354, slate: 0x4f5d75, grey: 0xbfc0c0 };
const WHITE = new THREE.Color(0xffffff);
const INK = new THREE.Color(PAL.ink);

const matCache = new Map();
function tones(hex) {
  if (matCache.has(hex)) return matCache.get(hex);
  const base = new THREE.Color(hex);
  const top = base.clone().lerp(WHITE, 0.4);
  const right = base.clone().lerp(INK, 0.38);
  const m = {
    top: new THREE.MeshBasicMaterial({ color: top }),
    left: new THREE.MeshBasicMaterial({ color: base }),
    right: new THREE.MeshBasicMaterial({ color: right }),
  };
  matCache.set(hex, m);
  return m;
}

/** A box sitting on y=0 with its footprint centred on x,z. Face order: +x, -x, +y, -y, +z, -z. */
function blk(w, h, d, hex, x = 0, y = 0, z = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(0, h / 2, 0);
  const t = tones(hex);
  const mesh = new THREE.Mesh(g, [t.right, t.right, t.top, t.top, t.left, t.left]);
  mesh.position.set(x, y, z);
  return mesh;
}

const group = (x = 0, y = 0, z = 0) => {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  return g;
};

function person(hex, x, z) {
  const g = group(x, 0, z);
  g.add(blk(0.9, 1.5, 0.9, hex), blk(0.7, 0.7, 0.7, PAL.grey, 0, 1.5, 0));
  return g;
}

function tree(x, z, s = 1) {
  const g = group(x, 0, z);
  g.add(blk(0.6 * s, 1.4 * s, 0.6 * s, PAL.ink), blk(2.6 * s, 2.2 * s, 2.6 * s, PAL.slate, 0, 1.4 * s, 0), blk(1.6 * s, 1.4 * s, 1.6 * s, PAL.slate, 0, 3.6 * s, 0));
  return g;
}

/** Hollow building: four low walls, with an upper block (the roof) in its own group so it can lift off. */
function hollow(w, d, wallH, wallHex, roofH, roofHex, capHex) {
  const g = group();
  const t = 0.5;
  g.add(blk(w, 0.3, d, PAL.grey)); // floor
  g.add(blk(w, wallH, t, wallHex, 0, 0, -d / 2 + t / 2));
  g.add(blk(t, wallH, d, wallHex, -w / 2 + t / 2, 0, 0));
  // the two near walls are low so the inside stays visible with the roof off
  g.add(blk(w, 1.2, t, wallHex, 0, 0, d / 2 - t / 2));
  g.add(blk(t, 1.2, d, wallHex, w / 2 - t / 2, 0, 0));
  const roof = group(0, wallH, 0);
  roof.userData.base = wallH;
  roof.add(blk(w, roofH, d, roofHex), blk(w + 0.6, 0.5, d + 0.6, capHex, 0, roofH, 0));
  g.add(roof);
  return { g, roof };
}

const smooth = (t) => t * t * (3 - 2 * t);
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const seg = (p, a, b) => smooth(clamp01((p - a) / (b - a)));

/** Camera target along the scroll: piecewise smooth between key positions (a slide, never a turn). */
const KEYS = [
  [0, 0, 0],
  [0.12, 0, 0],
  [0.3, -18, -6],
  [0.45, -4, 6],
  [0.65, 10, -6],
  [0.85, 24, -6],
  [1, 8, -2],
];
function target(p, out) {
  for (let i = 1; i < KEYS.length; i++) {
    if (p <= KEYS[i][0]) {
      const a = KEYS[i - 1];
      const b = KEYS[i];
      const u = smooth((p - a[0]) / (b[0] - a[0] || 1));
      return out.set(a[1] + (b[1] - a[1]) * u, 0, a[2] + (b[2] - a[2]) * u);
    }
  }
  return out.set(KEYS[KEYS.length - 1][1], 0, KEYS[KEYS.length - 1][2]);
}

const LABELS = [
  { at: [-18, 4, -6], d: [-150, -110], text: 'Book from your phone', show: [0.18, 0.33] },
  { at: [-18, 2.2, -4], d: [150, 70], text: 'Pick a doctor and a day', show: [0.2, 0.33] },
  { at: [-4, 4.4, 6], d: [-140, -90], text: 'Pay online, seat held 15 min', show: [0.34, 0.48] },
  { at: [10, 3, -2], d: [-170, 90], text: 'Queue number A-007', show: [0.52, 0.66] },
  { at: [10, 2.6, -9], d: [150, -100], text: 'Check in at reception', show: [0.52, 0.66] },
  { at: [3, 1.8, 0.5], d: [-130, 150], text: '5 ahead: alert sent', show: [0.54, 0.66] },
  { at: [26, 3, -6], d: [-150, -110], text: 'Doctor calls the next number', show: [0.7, 0.86] },
];

export function createHospitalScene(canvas, labelLayer) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(PAL.bg);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, -300, 600);
  const OFFSET = new THREE.Vector3(1, 1, 1).normalize().multiplyScalar(120); // true isometric direction
  const LOOK_Y = 3;

  const pieces = []; // top-level things that drop in
  const add = (obj, x, z) => {
    obj.position.x = x;
    obj.position.z = z;
    obj.userData.restY = 0;
    obj.visible = false;
    scene.add(obj);
    pieces.push({ obj, key: x + z });
  };

  // ground and roads
  const ground = group();
  ground.add(blk(84, 1.2, 60, PAL.grey, 0, -1.2, 0));
  add(ground, 0, 0);
  const roadA = group();
  roadA.add(blk(84, 0.12, 4, PAL.slate, 0, 0, 0));
  add(roadA, 0, 12);
  const roadB = group();
  roadB.add(blk(4, 0.12, 40, PAL.slate, 0, 0, 0));
  add(roadB, -10, -8);

  // the patient's house
  const house = hollow(8, 7, 3.2, PAL.bg, 2.4, PAL.bg, PAL.slate);
  house.g.add(blk(1.4, 2.4, 0.2, PAL.accent, 0, 0.3, 3.45));
  const homeBody = person(PAL.ink, -1.6, -0.8);
  const phone = blk(0.5, 0.9, 0.12, PAL.accent, 0.6, 1.6, -0.2);
  const homePhone = group(-1.6, 0, -0.8);
  homePhone.add(phone);
  house.g.add(homeBody, homePhone);
  add(house.g, -18, -6);

  // payment kiosk with a coin stack
  const kiosk = group();
  kiosk.add(blk(5, 3.4, 4, PAL.slate), blk(3.2, 1.6, 0.2, PAL.accent, 0, 1, 2.1), blk(5.6, 0.5, 4.6, PAL.ink, 0, 3.4, 0));
  const coins = group(0, 3.9, 0);
  [0, 0.45, 0.9].forEach((y) => coins.add(blk(1.6, 0.4, 1.6, PAL.accent, 0, y, 0)));
  kiosk.add(coins);
  add(kiosk, -4, 6);

  // hospital: hollow ground floor, tall block on top is the roof
  const hospital = hollow(18, 12, 3.6, PAL.bg, 4.6, PAL.bg, PAL.slate);
  hospital.roof.add(blk(1.4, 0.8, 4.6, PAL.accent, 0, 5.1, 0), blk(4.6, 0.8, 1.4, PAL.accent, 0, 5.1, 0));
  hospital.g.add(blk(6, 0.6, 0.2, PAL.accent, 0, 3.4, 6.1)); // sign
  // lobby: reception desk, benches, a line of patients, a ticket
  hospital.g.add(blk(7, 1.2, 1.4, PAL.slate, 3, 0.3, -3.8));
  hospital.g.add(blk(4, 0.6, 1, PAL.slate, -5, 0.3, 3), blk(4, 0.6, 1, PAL.slate, -5, 0.3, -1));
  const queue = group(-1, 0.3, 0.5);
  const line = [];
  for (let i = 0; i < 5; i++) {
    const p = person(PAL.ink, i * 1.6, 0);
    line.push(p);
    queue.add(p);
  }
  const ticket = blk(0.9, 0.3, 0.6, PAL.accent, 0, 2.7, 0);
  queue.add(ticket);
  hospital.g.add(queue);
  add(hospital.g, 10, -6);

  // consultation wing
  const wing = hollow(9, 8, 3.2, PAL.bg, 2.2, PAL.bg, PAL.slate);
  wing.g.add(blk(3, 1.1, 1.2, PAL.slate, 0, 0.3, -1.2)); // doctor's desk
  const doc = person(PAL.accent, 0, -2.4);
  const patient = person(PAL.ink, 0, 0.6);
  wing.g.add(doc, patient);
  add(wing.g, 26, -6);

  // trees and a moving car
  [[-30, -14], [-26, 6], [-24, -20], [-8, -22], [2, -22], [16, -24], [34, -16], [34, 2], [-34, 20], [20, 22], [-16, 22], [6, 22], [30, 22]].forEach(([x, z], i) => add(tree(x, z, 0.9 + (i % 3) * 0.15), x, z));
  const car = group();
  car.add(blk(3, 1, 1.6, PAL.accent), blk(1.6, 0.8, 1.4, PAL.bg, -0.2, 1, 0));
  add(car, -30, 12);

  pieces.sort((a, b) => a.key - b.key); // far corner first, so the world builds toward the viewer

  const roofs = [
    { g: house.roof, a: 0.19, b: 0.3, back: [0.9, 0.97] },
    { g: hospital.roof, a: 0.49, b: 0.6, back: [0.9, 0.97] },
    { g: wing.roof, a: 0.69, b: 0.8, back: [0.9, 0.97] },
  ];
  const LIFT = 9;

  // labels
  const labelEls = (labelLayer ? LABELS : []).map((L) => {
    const el = document.createElement('div');
    el.style.cssText = 'position:absolute;left:0;top:0;opacity:0;will-change:transform,opacity;';
    el.innerHTML =
      '<svg width="1" height="1" style="position:absolute;left:0;top:0;overflow:visible" aria-hidden="true"><line stroke="#2d3142" stroke-width="1" /><circle r="3.5" fill="#ef8354" /></svg>' +
      '<span style="position:absolute;white-space:nowrap;background:#2d3142;color:#eef2f3;font:600 15px/1 Chillax,Figtree,system-ui,sans-serif;padding:9px 12px;border-radius:6px;transform:translate(-50%,-50%)"></span>';
    el.querySelector('span').textContent = L.text;
    labelLayer.appendChild(el);
    return { L, el, line: el.querySelector('line'), box: el.querySelector('span') };
  });

  let W = 1;
  let Hpx = 1;
  let pxPerUnit = 20;
  let phoneScale = 1;
  const resize = () => {
    W = canvas.clientWidth || canvas.parentElement.clientWidth;
    Hpx = canvas.clientHeight || canvas.parentElement.clientHeight;
    renderer.setSize(W, Hpx, false);
    const aspect = W / Hpx;
    const H = Math.max(36, 50 / aspect); // fit about 50 units across and 36 up on any screen
    const Wu = H * aspect;
    Object.assign(camera, { left: -Wu / 2, right: Wu / 2, top: H / 2, bottom: -H / 2 });
    camera.updateProjectionMatrix();
    pxPerUnit = Hpx / H;
    phoneScale = W < 640 ? 0.6 : 1;
  };

  let progress = 0;
  let current = 0;
  let raf = 0;
  let running = false;
  let t0 = 0;
  const tgt = new THREE.Vector3();
  const v = new THREE.Vector3();

  const dropOffset = (secs) => {
    const u = secs / 0.9;
    if (u >= 1) return 0;
    return (40 / pxPerUnit) * Math.abs(Math.exp(-5 * u) * Math.cos(9 * u)); // starts 40px up, bounces on the ground
  };

  const frame = (now) => {
    raf = requestAnimationFrame(frame);
    if (!t0) t0 = now;
    const secs = (now - t0) / 1000;
    current += (progress - current) * 0.1;

    // drop-in: 3 frames (50 ms) between pieces
    pieces.forEach((p, i) => {
      const s = secs - 0.15 - i * (3 / 60);
      p.obj.visible = s >= 0;
      p.obj.position.y = s >= 0 ? dropOffset(s) : 0;
    });

    // roofs lift off while a step is explained, then settle back
    roofs.forEach((r) => {
      const up = seg(current, r.a, r.b) - seg(current, r.back[0], r.back[1]);
      r.g.position.y = r.g.userData.base + up * LIFT;
    });

    // little life inside the buildings and on the road
    ticket.position.y = 2.7 + Math.sin(secs * 3) * 0.15;
    coins.position.y = 3.9 + Math.sin(secs * 2.4) * 0.12;
    phone.position.y = 1.6 + Math.sin(secs * 3) * 0.1;
    line.forEach((p, i) => (p.position.x = i * 1.6 + Math.max(0, Math.sin(secs * 0.8 - i * 0.25)) * 0.35));
    car.position.x = ((secs * 4 + 30) % 72) - 36;

    // slide the camera, never rotate it
    target(current, tgt);
    camera.position.set(tgt.x + OFFSET.x, LOOK_Y + OFFSET.y, tgt.z + OFFSET.z);
    camera.lookAt(tgt.x, LOOK_Y, tgt.z);
    renderer.render(scene, camera);

    // labels follow their anchors; leader lines are 1px
    labelEls.forEach(({ L, el, line: ln, box }) => {
      const k = seg(current, L.show[0], L.show[0] + 0.03) - seg(current, L.show[1] - 0.03, L.show[1]);
      el.style.opacity = String(k);
      if (k <= 0.01) return;
      v.set(L.at[0], L.at[1], L.at[2]).project(camera);
      const x = (v.x * 0.5 + 0.5) * W;
      const y = (-v.y * 0.5 + 0.5) * Hpx;
      el.style.transform = `translate(${x}px,${y}px)`;
      const dx = L.d[0] * phoneScale;
      const dy = L.d[1] * phoneScale;
      ln.setAttribute('x2', dx);
      ln.setAttribute('y2', dy);
      box.style.left = dx + 'px';
      box.style.top = dy + 'px';
      box.style.fontSize = phoneScale < 1 ? '13px' : '15px';
    });
  };

  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas.parentElement);

  return {
    setProgress(p) {
      progress = p;
    },
    start() {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
    },
    dispose() {
      this.stop();
      ro.disconnect();
      labelEls.forEach(({ el }) => el.remove());
      scene.traverse((o) => o.geometry && o.geometry.dispose());
      matCache.forEach((m) => Object.values(m).forEach((x) => x.dispose()));
      matCache.clear();
      renderer.dispose();
    },
  };
}

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch {
    return false;
  }
}
