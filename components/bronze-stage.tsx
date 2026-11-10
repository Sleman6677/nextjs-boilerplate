"use client";

import { useEffect, useRef } from "react";

/* Liquid-bronze wave field: slow, layered sine waves with a satin crest,
   moving from molten bronze (top of the page) to deep sapphire (bottom). */
const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec2 uMouse;
  uniform float uScroll;

  void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / uResolution.y;
    float aspect = uResolution.x / uResolution.y;
    float time = uTime * 0.08;
    float scroll = uScroll;

    float angle1 = 0.6;
    float angle2 = -0.7;
    float angle3 = 1.2;
    float freq1 = 2.4;
    float freq2 = 3.2;
    float freq3 = 4.0;

    vec2 warpedUv = uv;
    float scrollDeform = scroll * 5.0;
    warpedUv.x += sin(uv.y * 2.5 + time * 0.2 + scrollDeform) * 0.35;
    warpedUv.y += cos(uv.x * 2.5 - time * 0.15 - scrollDeform * 0.8) * 0.35;
    warpedUv.x += sin(uv.y * 1.2 - time * 0.1 - scrollDeform * 1.5) * 0.25;
    warpedUv.y += cos(uv.x * 1.2 + time * 0.18 + scrollDeform * 1.2) * 0.25;

    vec2 scrollDrift = vec2(scroll * 0.04, -scroll * 0.02);
    vec2 mouseShift = vec2(uMouse.x * aspect * 0.05, uMouse.y * 0.05);
    warpedUv += scrollDrift + mouseShift;

    vec2 dir1 = vec2(cos(angle1), sin(angle1));
    vec2 dir2 = vec2(cos(angle2), sin(angle2));
    vec2 dir3 = vec2(cos(angle3), sin(angle3));

    float w1 = sin(dot(warpedUv, dir1) * freq1 + time * 1.0);
    float w2 = cos(dot(warpedUv, dir2) * freq2 - time * 1.4 + w1 * 0.4);
    float w3 = sin(dot(warpedUv, dir3) * freq3 + time * 1.8 + w2 * 0.5);
    float waveField = w1 * 0.50 + w2 * 0.35 + w3 * 0.15;

    float wideSheen = pow(max(0.0, 1.0 - abs(waveField - 0.1)), 2.5);
    float crispSpecular = pow(max(0.0, 1.0 - abs(waveField - 0.15)), 8.0);
    float crest = wideSheen * 0.5 + crispSpecular * 0.9;

    vec3 c0_shadow = vec3(0.0010, 0.0006, 0.0004);
    vec3 c0_wave1  = vec3(0.085, 0.040, 0.015);
    vec3 c0_wave2  = vec3(0.050, 0.022, 0.008);
    vec3 c0_crest  = vec3(0.45, 0.30, 0.18);

    vec3 c1_shadow = vec3(0.0004, 0.0006, 0.0012);
    vec3 c1_wave1  = vec3(0.015, 0.035, 0.065);
    vec3 c1_wave2  = vec3(0.008, 0.020, 0.045);
    vec3 c1_crest  = vec3(0.18, 0.35, 0.55);

    float t = smoothstep(0.0, 1.0, scroll);
    vec3 colShadow = mix(c0_shadow, c1_shadow, t);
    vec3 colWave1  = mix(c0_wave1, c1_wave1, t);
    vec3 colWave2  = mix(c0_wave2, c1_wave2, t);
    vec3 colCrest  = mix(c0_crest, c1_crest, t);

    vec3 color = colShadow;
    color = mix(color, colWave2, smoothstep(-0.6, 0.2, waveField));
    color = mix(color, colWave1, smoothstep(0.0, 0.8, waveField));
    color += colCrest * crest * 1.4;

    float vignette = 1.0 - dot(uv, uv) * 0.12;
    color *= vignette;
    gl_FragColor = vec4(color, 1.0);
  }
`;

const SPARKS = 450;

/**
 * The page's stage: a fixed WebGL canvas behind everything with the
 * breathing bronze wave shader and rising forge sparks. Scroll shifts the
 * palette and orbits the camera; fast scrolling stirs the sparks.
 * Reduced motion: one still frame, redrawn only on resize/scroll.
 */
export function BronzeStage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let cleanup = () => {};

    import("three").then((THREE) => {
      if (disposed) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const size = { w: window.innerWidth, h: window.innerHeight };

      const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.setSize(size.w, size.h, false);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 2.2;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color("#000000");
      scene.fog = new THREE.FogExp2("#000000", 0.01);
      const camera = new THREE.PerspectiveCamera(50, size.w / size.h, 0.1, 100);
      camera.position.set(0, 0.2, 3);
      scene.add(camera);

      const uniforms = {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(size.w * renderer.getPixelRatio(), size.h * renderer.getPixelRatio()) },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uScroll: { value: 0 },
      };
      const bgMat = new THREE.ShaderMaterial({ vertexShader: VERTEX, fragmentShader: FRAGMENT, uniforms, depthWrite: false, depthTest: false });
      const bg = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), bgMat);
      bg.position.set(0, 0, -8);
      bg.renderOrder = -10;
      camera.add(bg);

      // Forge sparks: 60% molten orange, 40% icy blue, additive.
      const tex = (() => {
        const c = document.createElement("canvas");
        c.width = c.height = 16;
        const ctx = c.getContext("2d")!;
        const g = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
        g.addColorStop(0, "rgba(255,255,255,1)");
        g.addColorStop(0.25, "rgba(255,255,255,0.85)");
        g.addColorStop(0.6, "rgba(255,255,255,0.3)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 16, 16);
        return new THREE.CanvasTexture(c);
      })();
      const pos = new Float32Array(SPARKS * 3);
      const col = new Float32Array(SPARKS * 3);
      const data: { sx: number; sy: number; sz: number; sw: number; sr: number; ph: number }[] = [];
      for (let i = 0; i < SPARKS; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 6.5;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 5 - 0.5;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 6.5;
        if (Math.random() < 0.6) {
          col.set([1, 0.4 + Math.random() * 0.15, 0.05 + Math.random() * 0.1], i * 3);
        } else {
          col.set([0.55 + Math.random() * 0.15, 0.82 + Math.random() * 0.12, 1], i * 3);
        }
        data.push({ sx: (Math.random() - 0.5) * 0.4, sy: 0.15 + Math.random() * 0.3, sz: (Math.random() - 0.5) * 0.4, sw: 0.5 + Math.random() * 1.5, sr: 0.05 + Math.random() * 0.15, ph: Math.random() * Math.PI * 2 });
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
      const sparkMat = new THREE.PointsMaterial({ size: 0.025, vertexColors: true, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, map: tex });
      const sparks = new THREE.Points(geo, sparkMat);
      scene.add(sparks);

      const clock = new THREE.Clock();
      let current = 0;
      let mouse = { x: 0, y: 0 };
      const target = { x: 0, y: 0 };
      const lookAt = new THREE.Vector3(0, -0.15, 0);
      const camTarget = new THREE.Vector3();

      const progress = () => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        return max > 0 ? window.scrollY / max : 0;
      };

      const frame = () => {
        const dt = Math.min(clock.getDelta(), 0.05);
        const goal = progress();
        current += (goal - current) * (reduce ? 1 : 0.05);
        mouse = { x: mouse.x + (target.x - mouse.x) * 0.05, y: mouse.y + (target.y - mouse.y) * 0.05 };

        if (!reduce) {
          const time = clock.elapsedTime;
          const vel = Math.abs(goal - current);
          const speed = 1 + vel * 9;
          const turb = vel * 0.8;
          const p = geo.attributes.position.array as Float32Array;
          for (let i = 0; i < SPARKS; i++) {
            const k = i * 3;
            const d = data[i];
            p[k] += d.sx * dt * speed;
            p[k + 1] += d.sy * dt * speed;
            p[k + 2] += d.sz * dt * speed;
            const sway = d.sr * (1 + turb * 4);
            p[k] += Math.sin(time * d.sw + d.ph) * sway * dt;
            p[k + 2] += Math.cos(time * d.sw + d.ph) * sway * dt;
            if (p[k + 1] > 3 || Math.abs(p[k]) > 3.5 || Math.abs(p[k + 2]) > 3.5) {
              p[k + 1] = -2.5;
              p[k] = (Math.random() - 0.5) * 3;
              p[k + 2] = (Math.random() - 0.5) * 3;
            }
          }
          geo.attributes.position.needsUpdate = true;
        }

        // A slow 360° orbit through the sparks as the page scrolls.
        const phi = current * Math.PI * 2;
        const r = 4.2 - Math.sin(current * Math.PI) * 0.6;
        camTarget.set(r * Math.sin(phi), 0.35 + Math.sin(current * Math.PI) * 0.8, r * Math.cos(phi));
        camera.position.lerp(camTarget, reduce ? 1 : 0.05);
        camera.lookAt(lookAt);

        uniforms.uTime.value = reduce ? 0 : clock.elapsedTime;
        uniforms.uMouse.value.set(mouse.x, -mouse.y);
        uniforms.uScroll.value = current;
        renderer.render(scene, camera);
      };

      let raf = 0;
      const loop = () => {
        frame();
        raf = requestAnimationFrame(loop);
      };
      const once = () => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(frame);
      };

      const onResize = () => {
        size.w = window.innerWidth;
        size.h = window.innerHeight;
        camera.aspect = size.w / size.h;
        camera.updateProjectionMatrix();
        renderer.setSize(size.w, size.h, false);
        uniforms.uResolution.value.set(size.w * renderer.getPixelRatio(), size.h * renderer.getPixelRatio());
        if (reduce) once();
      };
      const onMove = (e: PointerEvent) => {
        target.x = (e.clientX / window.innerWidth) * 2 - 1;
        target.y = (e.clientY / window.innerHeight) * 2 - 1;
      };
      window.addEventListener("resize", onResize);
      window.addEventListener("pointermove", onMove, { passive: true });
      if (reduce) {
        window.addEventListener("scroll", once, { passive: true });
        once();
      } else {
        loop();
      }

      cleanup = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", onResize);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("scroll", once);
        geo.dispose();
        sparkMat.dispose();
        tex.dispose();
        bgMat.dispose();
        bg.geometry.dispose();
        renderer.dispose();
      };
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 h-full w-full" />;
}
