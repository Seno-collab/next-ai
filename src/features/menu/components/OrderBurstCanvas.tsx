"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import * as THREE from "three";

export type OrderBurstHandle = {
  burstAt: (x: number, y: number) => void;
};

type Burst = {
  mesh: THREE.InstancedMesh;
  positions: THREE.Vector3[];
  velocities: THREE.Vector3[];
  start: number;
  life: number;
  material: THREE.MeshStandardMaterial;
};

const COLORS = [0xf97316, 0xf59e0b, 0xfb7185, 0x38bdf8];

export const OrderBurstCanvas = forwardRef<OrderBurstHandle>(function OrderBurstCanvas(_, ref) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const geometryRef = useRef<THREE.BoxGeometry | null>(null);
  const lightRef = useRef<THREE.PointLight | null>(null);
  const burstsRef = useRef<Burst[]>([]);
  const frameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  useImperativeHandle(ref, () => ({
    burstAt: (x: number, y: number) => {
      const mountEl = mountRef.current;
      const scene = sceneRef.current;
      const geometry = geometryRef.current;
      if (!mountEl || !scene || !geometry) {
        return;
      }
      if (globalThis.window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
      }

      const rect = mountEl.getBoundingClientRect();
      const localX = x - rect.left;
      const localY = y - rect.top;

      const material = new THREE.MeshStandardMaterial({
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        roughness: 0.25,
        metalness: 0.6,
        transparent: true,
      });

      const count = 18;
      const mesh = new THREE.InstancedMesh(geometry, material, count);
      const positions: THREE.Vector3[] = [];
      const velocities: THREE.Vector3[] = [];
      const matrix = new THREE.Matrix4();

      for (let i = 0; i < count; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 90 + Math.random() * 120;
        const velocity = new THREE.Vector3(Math.cos(angle) * speed, Math.sin(angle) * speed, (Math.random() - 0.5) * 60);
        const position = new THREE.Vector3(localX, localY, 0);
        const scale = 1 + Math.random() * 0.6;
        positions.push(position);
        velocities.push(velocity);
        matrix.compose(position, new THREE.Quaternion(), new THREE.Vector3(scale, scale, scale));
        mesh.setMatrixAt(i, matrix);
      }

      mesh.instanceMatrix.needsUpdate = true;
      scene.add(mesh);
      burstsRef.current.push({
        mesh,
        positions,
        velocities,
        start: performance.now(),
        life: 900,
        material,
      });
    },
  }));

  useEffect(() => {
    const mountEl = mountRef.current;
    if (!mountEl) {
      return undefined;
    }

    const scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(globalThis.window.devicePixelRatio, 2));
    renderer.setSize(mountEl.clientWidth, mountEl.clientHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    mountEl.appendChild(renderer.domElement);

    const camera = new THREE.OrthographicCamera(0, mountEl.clientWidth, mountEl.clientHeight, 0, 0.1, 10);
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0);

    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    const point = new THREE.PointLight(0xffffff, 0.9, 700);
    point.position.set(mountEl.clientWidth / 2, mountEl.clientHeight / 2, 200);
    lightRef.current = point;
    scene.add(ambient, point);

    const geometry = new THREE.BoxGeometry(6, 6, 6);

    const handleResize = () => {
      const { clientWidth, clientHeight } = mountEl;
      renderer.setSize(clientWidth, clientHeight);
      camera.left = 0;
      camera.right = clientWidth;
      camera.top = 0;
      camera.bottom = clientHeight;
      camera.updateProjectionMatrix();
      if (lightRef.current) {
        lightRef.current.position.set(clientWidth / 2, clientHeight / 2, 200);
      }
    };

    globalThis.window.addEventListener("resize", handleResize);

    const animate = (time: number) => {
      const lastTime = lastTimeRef.current || time;
      const delta = Math.min(0.033, (time - lastTime) / 1000);
      lastTimeRef.current = time;

      if (burstsRef.current.length > 0) {
        const matrix = new THREE.Matrix4();
        burstsRef.current = burstsRef.current.filter((burst) => {
          const elapsed = time - burst.start;
          const progress = elapsed / burst.life;
          if (progress >= 1) {
            scene.remove(burst.mesh);
            burst.material.dispose();
            return false;
          }
          const fade = 1 - progress;
          burst.material.opacity = fade;
          for (let i = 0; i < burst.positions.length; i += 1) {
            burst.positions[i].addScaledVector(burst.velocities[i], delta);
            burst.velocities[i].multiplyScalar(0.92);
            const scale = fade * 1.2;
            matrix.compose(
              burst.positions[i],
              new THREE.Quaternion(),
              new THREE.Vector3(scale, scale, scale),
            );
            burst.mesh.setMatrixAt(i, matrix);
          }
          burst.mesh.instanceMatrix.needsUpdate = true;
          return true;
        });
      }

      renderer.render(scene, camera);
      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);

    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;
    geometryRef.current = geometry;

    return () => {
      cancelAnimationFrame(frameRef.current);
      globalThis.window.removeEventListener("resize", handleResize);
      burstsRef.current.forEach((burst) => {
        scene.remove(burst.mesh);
        burst.material.dispose();
      });
      burstsRef.current = [];
      geometry.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div className="order-burst-layer" ref={mountRef} />;
});

OrderBurstCanvas.displayName = "OrderBurstCanvas";
