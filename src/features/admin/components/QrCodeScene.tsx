"use client";

import QRCode from "qrcode";
import { useEffect, useRef } from "react";
import * as THREE from "three";

const MODULE_SIZE = 0.12;
const MODULE_DEPTH = 0.1;
const BASE_DEPTH = 0.08;
const GLASS_DEPTH = 0.05;
const QUIET_ZONE = 2;

export default function QrCodeScene({ value }: Readonly<{ value?: string }>) {
  const mountRef = useRef<HTMLDivElement | null>(null);

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

    const qrValue = value ?? `${globalThis.window.location.origin}/menu`;
    const qrData = QRCode.create(qrValue, { errorCorrectionLevel: "M" });
    const size = qrData.modules.size;
    const dimension = size + QUIET_ZONE * 2;
    const darkModules: Array<[number, number]> = [];

    for (let row = 0; row < dimension; row += 1) {
      for (let col = 0; col < dimension; col += 1) {
        const inQuietZone =
          row < QUIET_ZONE || col < QUIET_ZONE || row >= size + QUIET_ZONE || col >= size + QUIET_ZONE;
        if (inQuietZone) {
          continue;
        }
        const dataIndex = (row - QUIET_ZONE) * size + (col - QUIET_ZONE);
        if (qrData.modules.data[dataIndex]) {
          darkModules.push([row, col]);
        }
      }
    }

    const totalSize = dimension * MODULE_SIZE;
    const halfSize = totalSize / 2;
    const baseSize = totalSize + MODULE_SIZE * 1.4;
    const viewSize = baseSize;

    const aspect = mountEl.clientWidth / mountEl.clientHeight;
    const camera = new THREE.OrthographicCamera(
      (-viewSize * aspect) / 2,
      (viewSize * aspect) / 2,
      viewSize / 2,
      -viewSize / 2,
      0.1,
      20,
    );
    camera.position.set(0, 0, 8);
    camera.lookAt(0, 0, 0);

    const group = new THREE.Group();
    const baseRotation = new THREE.Euler(-0.22, 0.28, 0);
    group.rotation.copy(baseRotation);
    scene.add(group);

    const baseGeometry = new THREE.BoxGeometry(baseSize, baseSize, BASE_DEPTH * 1.6);
    const baseMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x0b1324,
      roughness: 0.4,
      metalness: 0.6,
      clearcoat: 0.6,
      clearcoatRoughness: 0.12,
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.z = -BASE_DEPTH * 1.1;
    group.add(base);

    const deckGeometry = new THREE.BoxGeometry(totalSize, totalSize, BASE_DEPTH);
    const deckMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xf8fafc,
      roughness: 0.25,
      metalness: 0.2,
      clearcoat: 0.9,
      clearcoatRoughness: 0.08,
    });
    const deck = new THREE.Mesh(deckGeometry, deckMaterial);
    deck.position.z = -BASE_DEPTH / 2;
    group.add(deck);

    const rimGeometry = new THREE.EdgesGeometry(deckGeometry);
    const rimMaterial = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.35,
    });
    const rim = new THREE.LineSegments(rimGeometry, rimMaterial);
    rim.position.z = -BASE_DEPTH / 2;
    group.add(rim);

    const glowGeometry = new THREE.PlaneGeometry(totalSize * 0.9, totalSize * 0.9);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.z = -BASE_DEPTH * 1.5;
    group.add(glow);

    const moduleGeometry = new THREE.BoxGeometry(MODULE_SIZE, MODULE_SIZE, MODULE_DEPTH);
    const moduleMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x0b1120,
      roughness: 0.45,
      metalness: 0.35,
      clearcoat: 0.3,
      clearcoatRoughness: 0.2,
      emissive: new THREE.Color(0x0ea5e9),
      emissiveIntensity: 0.08,
    });
    const instanced = new THREE.InstancedMesh(moduleGeometry, moduleMaterial, darkModules.length);

    const matrix = new THREE.Matrix4();
    darkModules.forEach(([row, col], index) => {
      const x = col * MODULE_SIZE - halfSize + MODULE_SIZE / 2;
      const y = (dimension - row - 1) * MODULE_SIZE - halfSize + MODULE_SIZE / 2;
      matrix.makeTranslation(x, y, MODULE_DEPTH / 2);
      instanced.setMatrixAt(index, matrix);
    });
    instanced.instanceMatrix.needsUpdate = true;
    group.add(instanced);

    const glassGeometry = new THREE.BoxGeometry(totalSize * 0.98, totalSize * 0.98, GLASS_DEPTH);
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x7dd3fc,
      roughness: 0.15,
      metalness: 0.1,
      transmission: 0.65,
      thickness: 0.4,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      opacity: 0.55,
      transparent: true,
    });
    const glass = new THREE.Mesh(glassGeometry, glassMaterial);
    glass.position.z = MODULE_DEPTH + GLASS_DEPTH * 0.6;
    glass.renderOrder = 2;
    group.add(glass);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0x93c5fd, 0.9);
    keyLight.position.set(4.6, 4.4, 6);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x22d3ee, 0.6);
    fillLight.position.set(-4, -2.5, 4.5);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(0xfbbf24, 0.4, 12);
    rimLight.position.set(0, 5, 6);
    scene.add(rimLight);

    const handleResize = () => {
      const { clientWidth, clientHeight } = mountEl;
      renderer.setSize(clientWidth, clientHeight);
      const newAspect = clientWidth / clientHeight;
      camera.left = (-viewSize * newAspect) / 2;
      camera.right = (viewSize * newAspect) / 2;
      camera.top = viewSize / 2;
      camera.bottom = -viewSize / 2;
      camera.updateProjectionMatrix();
    };

    globalThis.window.addEventListener("resize", handleResize);

    let frameId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      const t = clock.getElapsedTime();
      group.position.y = Math.sin(t * 0.6) * 0.05;
      group.position.z = Math.sin(t * 0.7) * 0.05;
      group.rotation.x = baseRotation.x + Math.sin(t * 0.4) * 0.04;
      group.rotation.y = baseRotation.y + Math.cos(t * 0.35) * 0.05;
      keyLight.position.x = 4.6 + Math.sin(t * 0.35) * 0.8;
      keyLight.position.y = 4.4 + Math.cos(t * 0.3) * 0.6;
      rimMaterial.opacity = 0.25 + Math.sin(t * 0.9) * 0.08;
      glowMaterial.opacity = 0.12 + Math.cos(t * 0.6) * 0.05;
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(frameId);
      globalThis.window.removeEventListener("resize", handleResize);
      baseGeometry.dispose();
      deckGeometry.dispose();
      rimGeometry.dispose();
      glowGeometry.dispose();
      moduleGeometry.dispose();
      glassGeometry.dispose();
      baseMaterial.dispose();
      deckMaterial.dispose();
      rimMaterial.dispose();
      glowMaterial.dispose();
      moduleMaterial.dispose();
      glassMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [value]);

  return <div className="qr-three" ref={mountRef} />;
}
