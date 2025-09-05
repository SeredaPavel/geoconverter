"use client";

import { useEffect, useRef } from "react";

export default function GlobeLogo({
  size = 68,
  textureUrl = "/images/earth_equirect.jpeg", // если у тебя .jpeg — укажи это в месте вызова
  rotationSpeed = 0.01,
  atmosphere = true,

  // ориентация
  initialRotation = 0.55,  // поворот по долготе (ось Y)
  tiltX = -0.25,           // ▼ НОВОЕ: наклон по широте (ось X), отриц. — «к камере» север
  tiltZ = 0.0,             // ▼ НОВОЕ: тонкая докрутка вокруг оси Z

  // UV-коррекция
  uvZoom = 0.97,           // по долготе (X)
  uvShift = 0.015,         // по долготе (X)
  uvZoomY = 1.0,           // по широте (Y)
  uvShiftY = 0.0,          // по широте (Y)
}: {
  size?: number;
  textureUrl?: string;
  rotationSpeed?: number;
  atmosphere?: boolean;

  initialRotation?: number;
  tiltX?: number;          // -π..+π
  tiltZ?: number;          // -π..+π

  uvZoom?: number;         // 0.95..1.05
  uvShift?: number;        // -0.5..+0.5
  uvZoomY?: number;        // 0.95..1.05
  uvShiftY?: number;       // -0.5..+0.5
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let mounted = true;
    let raf = 0;
    let renderer: any, scene: any, camera: any, globe: any, atm: any;

    (async () => {
      try {
        const THREE = await import("three");

        if (!mounted || !wrapRef.current) return;

        // WebGL check
        const test = document.createElement("canvas");
        if (!test.getContext("webgl") && !test.getContext("experimental-webgl")) {
          console.warn("[GlobeLogo] WebGL unsupported");
          return;
        }

        const w = Math.round(size);
        const h = Math.round(size);

        // Renderer
        renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: true,
          canvas: canvasRef.current || undefined,
        });
        renderer.setSize(w, h, false);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio ?? 1, 2));
        // @ts-ignore
        renderer.outputColorSpace = THREE.SRGBColorSpace;

        // Scene & camera
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(30, w / h, 0.1, 100);
        camera.position.set(0, 0, 2.7);

        // Lights
        const hemi = new THREE.HemisphereLight(0x9ecbff, 0x0a0a0a, 0.7);
        scene.add(hemi);
        const dir = new THREE.DirectionalLight(0xffffff, 1.0);
        dir.position.set(2.5, 2.0, 2.0);
        scene.add(dir);

        // Geometry
        const seg = size <= 44 ? 32 : size <= 64 ? 48 : 64;
        const geom = new THREE.SphereGeometry(1, seg, seg);

        // Material (fallback first)
        let material: any = new THREE.MeshStandardMaterial({
          color: 0x6ea8ff,
          roughness: 0.9,
          metalness: 0.0,
        });

        // Texture
        try {
          const loader = new (THREE as any).TextureLoader();
          const tex = await loader.loadAsync(textureUrl);
          // @ts-ignore
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy?.() || 1);

          // UV control
          const zX = Math.min(1.05, Math.max(0.95, uvZoom));
          const zY = Math.min(1.05, Math.max(0.95, uvZoomY));
          const oX = Math.min(0.5, Math.max(-0.5, uvShift));
          const oY = Math.min(0.5, Math.max(-0.5, uvShiftY));

          tex.wrapS = (THREE as any).RepeatWrapping;       // X — repeat
          tex.wrapT = (THREE as any).ClampToEdgeWrapping;  // Y — clamp (чтобы не «рвались» полюса)
          tex.center.set(0.5, 0.5);
          tex.repeat.set(zX, zY);
          tex.offset.set(oX, oY);
          tex.needsUpdate = true;

          material = new THREE.MeshStandardMaterial({
            map: tex,
            roughness: 0.9,
            metalness: 0.0,
          });
        } catch (e) {
          console.warn("[GlobeLogo] Texture load failed, using fallback color.", e);
        }

        // Mesh
        globe = new THREE.Mesh(geom, material);
        // ВАЖНО: задаём стартовую ориентацию по всем осям
        globe.rotation.set(tiltX, initialRotation, tiltZ);
        scene.add(globe);

        // Atmosphere
        if (atmosphere) {
          const ageom = new THREE.SphereGeometry(1.045, seg, seg);
          const amat = new THREE.MeshBasicMaterial({
            color: 0x5bd6ff,
            transparent: true,
            opacity: 0.35,
            // @ts-ignore
            blending: THREE.AdditiveBlending,
            // @ts-ignore
            side: THREE.BackSide,
            depthWrite: false,
          });
          atm = new THREE.Mesh(ageom, amat);
          // Атмосфера повторяет ориентацию сферы
          atm.rotation.set(tiltX, initialRotation, tiltZ);
          scene.add(atm);
        }

        const animate = () => {
          try {
            if (!mounted) return;
            // Продолжаем вращение по долготе (ось Y)
            if (globe) globe.rotation.y += rotationSpeed;
            if (atm) atm.rotation.y += rotationSpeed * 0.95;
            renderer.render(scene, camera);
            raf = requestAnimationFrame(animate);
          } catch (e) {
            console.error("[GlobeLogo] render error", e);
          }
        };
        animate();
      } catch (e) {
        console.error("[GlobeLogo] fatal", e);
      }
    })();

    return () => {
      mounted = false;
      cancelAnimationFrame(raf);
      try {
        const canvas = canvasRef.current;
        // Если добавим сложные ресурсы — можно пройтись по сцене и dispose().
      } catch {}
    };
  }, [
    size,
    textureUrl,
    rotationSpeed,
    atmosphere,
    initialRotation,
    tiltX,
    tiltZ,
    uvZoom,
    uvShift,
    uvZoomY,
    uvShiftY,
  ]);

  return (
    <div
      ref={wrapRef}
      style={{
        width: size,
        height: size,
        display: "inline-block",
        borderRadius: "9999px",
        overflow: "hidden",
        filter: "drop-shadow(0 6px 10px rgba(0,0,0,.28))",
        background: "transparent",
        lineHeight: 0,
      }}
      aria-hidden
    >
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          background: "transparent",
        }}
      />
    </div>
  );
}
