'use client';

import { useEffect, useRef, useState } from 'react';
import { Mark } from './Mark';
import { ASSINIBOINE, RUNDLE, MOON, LIGHT_DIR, mountainPositions, crescentOutline } from '@/lib/brand/mark3d';

// The landing hero: the R13 mark in three dimensions. The crescent hangs
// still and lights the mountains; move the pointer over them (or drag, on a
// phone) and they turn, faces swinging into the moonlight (vanilla) and out
// of it (sinopia) — the flat mark's two tones, made live. Colours are the
// theme's own tokens. three.js loads only here, after the page, so it costs
// the landing page nothing up front; until it's drawn — and wherever WebGL
// isn't available — the flat mark stands in. Reduce motion stops the idle
// sway; the pointer still turns it.

const VERT = /* glsl */ `
  varying vec3 vWorld;
  varying vec3 vLocal;
  void main() {
    vLocal = position;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const FRAG = /* glsl */ `
  uniform vec3 uLit;
  uniform vec3 uShade;
  uniform vec3 uDeep;
  uniform vec3 uSnowLit;
  uniform vec3 uSnowShade;
  uniform vec3 uBg;
  uniform vec3 uLight;
  uniform float uSnowline;
  varying vec3 vWorld;
  varying vec3 vLocal;
  void main() {
    // Flat facets: the face's own normal, from the screen-space slope.
    vec3 n = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
    float d = dot(n, uLight);
    float snow = step(uSnowline + 0.22 * sin(vLocal.x * 6.0 + vLocal.z * 4.0), vLocal.y);
    vec3 lit = mix(uLit, uSnowLit, snow);
    vec3 shade = mix(mix(uDeep, uShade, smoothstep(-0.55, 0.0, d)), uSnowShade, snow);
    vec3 c = mix(shade, lit, smoothstep(0.02, 0.12, d));
    // The foot of the range fades into the night.
    c = mix(uBg, c, smoothstep(0.0, 0.45, vLocal.y));
    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
  }
`;

function token(el: Element, name: string, fallback: string): string {
  const v = getComputedStyle(el).getPropertyValue(name).trim();
  return v || fallback;
}

export function Mark3D({ label = 'The Cavern' }: { label?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let disposed = false;
    let cleanup = () => {};

    import('three').then((THREE) => {
      if (disposed) return;
      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
      } catch {
        return; // No WebGL: the flat mark stays.
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setClearColor(0x000000, 0);
      const canvas = renderer.domElement;
      canvas.setAttribute('aria-hidden', 'true');
      Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block' });
      el.appendChild(canvas);

      const colour = (name: string, fallback: string) => new THREE.Color().setStyle(token(el, name, fallback));
      const fg = colour('--fg', '#e0ddae');
      const accent = colour('--accent', '#e8431a');
      const bg = colour('--bg', '#040710');
      const white = new THREE.Color(1, 1, 1);
      const black = new THREE.Color(0, 0, 0);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(32, 1.25, 0.1, 50);
      camera.position.set(0, 2.6, 10.5);
      camera.lookAt(0, 1.95, 0);

      const light = new THREE.Vector3(...LIGHT_DIR);
      const range = new THREE.Group();
      scene.add(range);
      const geometries: { dispose(): void }[] = [];
      const materials: { dispose(): void }[] = [];

      for (const m of [ASSINIBOINE, RUNDLE]) {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(mountainPositions(m), 3));
        const mat = new THREE.ShaderMaterial({
          vertexShader: VERT,
          fragmentShader: FRAG,
          side: THREE.DoubleSide,
          uniforms: {
            uLit: { value: fg },
            uShade: { value: accent },
            uDeep: { value: accent.clone().lerp(black, 0.22) },
            uSnowLit: { value: fg.clone().lerp(white, 0.55) },
            uSnowShade: { value: accent.clone().lerp(white, 0.5) },
            uBg: { value: bg },
            uLight: { value: light },
            uSnowline: { value: m.snowline },
          },
        });
        range.add(new THREE.Mesh(g, mat));
        geometries.push(g);
        materials.push(mat);
      }

      // The crescent: a thin disc of light, and a soft glow behind it.
      const shape = new THREE.Shape(crescentOutline().map(([x, y]) => new THREE.Vector2(x, y)));
      const moonGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.015, bevelSegments: 2, curveSegments: 24 });
      const moonMat = new THREE.MeshBasicMaterial({ color: fg.clone().lerp(white, 0.55) });
      const moon = new THREE.Mesh(moonGeo, moonMat);
      moon.position.set(...MOON.centre);
      scene.add(moon);
      geometries.push(moonGeo);
      materials.push(moonMat);

      const glowCanvas = document.createElement('canvas');
      glowCanvas.width = glowCanvas.height = 128;
      const ctx = glowCanvas.getContext('2d');
      if (ctx) {
        const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        grad.addColorStop(0, 'rgba(255,255,255,0.55)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 128, 128);
      }
      const glowTex = new THREE.CanvasTexture(glowCanvas);
      const glowMat = new THREE.SpriteMaterial({ map: glowTex, color: fg, transparent: true, opacity: 0.35, depthWrite: false });
      const glow = new THREE.Sprite(glowMat);
      glow.position.set(MOON.centre[0], MOON.centre[1], MOON.centre[2] - 0.2);
      glow.scale.set(2.2, 2.2, 1);
      scene.add(glow);
      materials.push(glowMat, glowTex);

      // Pointer: hovering leans the range toward the pointer; dragging turns it.
      let hoverYaw = 0, hoverPitch = 0, dragYaw = 0, yaw = 0, pitch = 0;
      let dragging = false, lastX = 0;
      const onMove = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        if (dragging) {
          dragYaw += (e.clientX - lastX) * 0.012;
          lastX = e.clientX;
          return;
        }
        if (e.pointerType !== 'mouse') return;
        hoverYaw = ((e.clientX - r.left) / r.width - 0.5) * 0.9;
        hoverPitch = ((e.clientY - r.top) / r.height - 0.5) * 0.22;
      };
      const onDown = (e: PointerEvent) => {
        dragging = true;
        lastX = e.clientX;
        el.setPointerCapture?.(e.pointerId);
      };
      const onUp = (e: PointerEvent) => {
        dragging = false;
        el.releasePointerCapture?.(e.pointerId);
      };
      const onLeave = () => { if (!dragging) { hoverYaw = 0; hoverPitch = 0; } };
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerdown', onDown);
      el.addEventListener('pointerup', onUp);
      el.addEventListener('pointercancel', onUp);
      el.addEventListener('pointerleave', onLeave);

      const resize = () => {
        const w = el.clientWidth, h = el.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(el);

      // Draw only while it's on screen and the tab is visible.
      let visible = true, raf = 0, first = true;
      const start = performance.now();
      const frame = (now: number) => {
        raf = 0;
        const reduce = document.body.classList.contains('reduce-motion');
        const t = (now - start) / 1000;
        const idle = reduce ? 0 : Math.sin(t * 0.35) * 0.22;
        yaw += (dragYaw + hoverYaw + idle - yaw) * 0.07;
        pitch += (hoverPitch - pitch) * 0.07;
        range.rotation.set(pitch, yaw, 0);
        if (!reduce) moon.position.y = MOON.centre[1] + Math.sin(t * 0.6) * 0.04;
        renderer.render(scene, camera);
        if (first) { first = false; setDrawn(true); }
        if (visible && !document.hidden) raf = requestAnimationFrame(frame);
      };
      const kick = () => { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame); };
      const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; kick(); });
      io.observe(el);
      document.addEventListener('visibilitychange', kick);
      kick();

      cleanup = () => {
        if (raf) cancelAnimationFrame(raf);
        io.disconnect();
        ro.disconnect();
        document.removeEventListener('visibilitychange', kick);
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerdown', onDown);
        el.removeEventListener('pointerup', onUp);
        el.removeEventListener('pointercancel', onUp);
        el.removeEventListener('pointerleave', onLeave);
        geometries.forEach((g) => g.dispose());
        materials.forEach((m) => m.dispose());
        renderer.dispose();
        canvas.remove();
      };
    }).catch(() => { /* three.js didn't load (offline): the flat mark stays. */ });

    return () => { disposed = true; cleanup(); };
  }, []);

  return (
    <div
      ref={box}
      role="img"
      aria-label={label}
      style={{
        position: 'relative',
        width: 'min(560px, 86vw)',
        aspectRatio: '5 / 4',
        margin: '0 auto',
        touchAction: 'pan-y',
        cursor: 'grab',
        userSelect: 'none',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: drawn ? 0 : 1, transition: 'opacity 0.6s',
          pointerEvents: 'none',
        }}
      >
        <Mark variant="full" size={200} title="" />
      </div>
    </div>
  );
}
