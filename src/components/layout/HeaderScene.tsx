"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function HeaderScene() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mountEl = mountRef.current;
    if (!mountEl) {
      return undefined;
    }

    // Scene setup
    const scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mountEl.clientWidth, mountEl.clientHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    mountEl.appendChild(renderer.domElement);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      mountEl.clientWidth / mountEl.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, 12);
    camera.lookAt(0, 0, 0);

    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];

    // === RESPONSIVE QUALITY SETTINGS ===
    const isMobile = mountEl.clientWidth < 768;
    const isSmallScreen = mountEl.clientWidth < 480;

    const quality = {
      particleCount: isSmallScreen ? 50 : isMobile ? 100 : 200,
      qrSquareCount: isSmallScreen ? 4 : isMobile ? 6 : 9,
      enableGlows: !isSmallScreen,
    };

    // Main group
    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // === FLOATING PARTICLES (STARS) ===
    const particleCount = quality.particleCount;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleSpeeds = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 30;
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 8;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 20;
      particleSpeeds[i] = 0.3 + Math.random() * 0.7;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    geometries.push(particleGeometry);

    const particleMaterial = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.08,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });
    materials.push(particleMaterial);

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    mainGroup.add(particles);

    // === HOLOGRAPHIC QR RING ===
    const ringGroup = new THREE.Group();
    ringGroup.position.set(-6, 0, 0);
    mainGroup.add(ringGroup);

    // Outer ring
    const outerRingGeometry = new THREE.TorusGeometry(1.2, 0.04, 16, 100);
    const outerRingMaterial = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.7,
    });
    geometries.push(outerRingGeometry);
    materials.push(outerRingMaterial);
    const outerRing = new THREE.Mesh(outerRingGeometry, outerRingMaterial);
    outerRing.rotation.x = Math.PI / 2;
    ringGroup.add(outerRing);

    // Inner rotating ring
    const innerRingGeometry = new THREE.TorusGeometry(0.9, 0.03, 16, 100);
    const innerRingMaterial = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.5,
    });
    geometries.push(innerRingGeometry);
    materials.push(innerRingMaterial);
    const innerRing = new THREE.Mesh(innerRingGeometry, innerRingMaterial);
    innerRing.rotation.x = Math.PI / 2;
    ringGroup.add(innerRing);

    // QR-like squares inside ring
    const qrSquares: THREE.Mesh[] = [];
    const squareSize = 0.15;
    const squareGeometry = new THREE.BoxGeometry(squareSize, squareSize, 0.05);
    const squareMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x0ea5e9,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.3,
      metalness: 0.8,
      roughness: 0.2,
    });
    geometries.push(squareGeometry);
    materials.push(squareMaterial);

    const allPositions = [
      [-0.35, 0.35], [0.35, 0.35], [-0.35, -0.35], [0.35, -0.35],
      [0, 0], [-0.35, 0], [0.35, 0], [0, 0.35], [0, -0.35]
    ];
    const positions = allPositions.slice(0, quality.qrSquareCount);

    positions.forEach(([x, y]) => {
      const square = new THREE.Mesh(squareGeometry, squareMaterial);
      square.position.set(x, y, 0);
      ringGroup.add(square);
      qrSquares.push(square);
    });

    // Glow around QR (optional on low-end devices)
    let glow: THREE.Mesh | null = null;
    let glowMaterial: THREE.MeshBasicMaterial | null = null;

    if (quality.enableGlows) {
      const glowGeometry = new THREE.CircleGeometry(1.4, 32);
      glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.15,
        blending: THREE.AdditiveBlending,
      });
      geometries.push(glowGeometry);
      materials.push(glowMaterial);
      glow = new THREE.Mesh(glowGeometry, glowMaterial);
      glow.position.z = -0.2;
      ringGroup.add(glow);
    }

    // === AI SECURITY BADGE ===
    const badgeGroup = new THREE.Group();
    badgeGroup.position.set(6, 0, 0);
    mainGroup.add(badgeGroup);

    // Hexagon shape for AI badge
    const hexShape = new THREE.Shape();
    const hexRadius = 1;
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const x = Math.cos(angle) * hexRadius;
      const y = Math.sin(angle) * hexRadius;
      if (i === 0) hexShape.moveTo(x, y);
      else hexShape.lineTo(x, y);
    }
    hexShape.lineTo(Math.cos(0) * hexRadius, Math.sin(0) * hexRadius);

    const hexGeometry = new THREE.ShapeGeometry(hexShape);
    const hexMaterial = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });
    geometries.push(hexGeometry);
    materials.push(hexMaterial);
    const hexagon = new THREE.Mesh(hexGeometry, hexMaterial);
    badgeGroup.add(hexagon);

    // Hex border
    const hexEdges = new THREE.EdgesGeometry(hexGeometry);
    const hexEdgeMaterial = new THREE.LineBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.8,
    });
    geometries.push(hexEdges);
    materials.push(hexEdgeMaterial);
    const hexBorder = new THREE.LineSegments(hexEdges, hexEdgeMaterial);
    badgeGroup.add(hexBorder);

    // Inner rotating triangle (AI symbol)
    const triangleShape = new THREE.Shape();
    triangleShape.moveTo(0, 0.5);
    triangleShape.lineTo(-0.4, -0.3);
    triangleShape.lineTo(0.4, -0.3);
    triangleShape.lineTo(0, 0.5);

    const triangleGeometry = new THREE.ShapeGeometry(triangleShape);
    const triangleMaterial = new THREE.MeshBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });
    geometries.push(triangleGeometry);
    materials.push(triangleMaterial);
    const triangle = new THREE.Mesh(triangleGeometry, triangleMaterial);
    triangle.position.z = 0.1;
    badgeGroup.add(triangle);

    // AI Badge glow (optional on low-end devices)
    let badgeGlow: THREE.Mesh | null = null;
    let badgeGlowMaterial: THREE.MeshBasicMaterial | null = null;

    if (quality.enableGlows) {
      const badgeGlowGeometry = new THREE.CircleGeometry(1.3, 32);
      badgeGlowMaterial = new THREE.MeshBasicMaterial({
        color: 0x10b981,
        transparent: true,
        opacity: 0.12,
        blending: THREE.AdditiveBlending,
      });
      geometries.push(badgeGlowGeometry);
      materials.push(badgeGlowMaterial);
      badgeGlow = new THREE.Mesh(badgeGlowGeometry, badgeGlowMaterial);
      badgeGlow.position.z = -0.2;
      badgeGroup.add(badgeGlow);
    }

    // === CONNECTING LINES ===
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x475569,
      transparent: true,
      opacity: 0.3,
    });
    materials.push(lineMaterial);

    const linePoints1 = [
      new THREE.Vector3(-4, 0, 0),
      new THREE.Vector3(4, 0, 0),
    ];
    const lineGeometry1 = new THREE.BufferGeometry().setFromPoints(linePoints1);
    geometries.push(lineGeometry1);
    const line1 = new THREE.Line(lineGeometry1, lineMaterial);
    mainGroup.add(line1);

    // === LIGHTING ===
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0x38bdf8, 0.8);
    keyLight.position.set(5, 5, 8);
    scene.add(keyLight);

    const accentLight = new THREE.PointLight(0x10b981, 0.6, 20);
    accentLight.position.set(-5, 2, 5);
    scene.add(accentLight);

    // === RESIZE HANDLER ===
    const handleResize = () => {
      const { clientWidth, clientHeight } = mountEl;
      renderer.setSize(clientWidth, clientHeight);
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
    };

    window.addEventListener("resize", handleResize);

    // === ANIMATION LOOP ===
    let frameId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      const t = clock.getElapsedTime();

      // Rotate particles slowly
      particles.rotation.y = t * 0.05;
      particles.rotation.x = t * 0.02;

      // Animate particle opacity
      particleMaterial.opacity = 0.4 + Math.sin(t * 0.5) * 0.2;

      // QR Ring animations
      ringGroup.rotation.z = t * 0.3;
      innerRing.rotation.z = -t * 0.5;
      outerRing.scale.setScalar(1 + Math.sin(t * 1.2) * 0.05);

      // Pulse QR squares
      qrSquares.forEach((square, i) => {
        square.scale.setScalar(1 + Math.sin(t * 2 + i * 0.5) * 0.1);
        square.rotation.z = Math.sin(t * 0.8 + i) * 0.1;
      });

      // Pulse glow (if enabled)
      if (glowMaterial) {
        glowMaterial.opacity = 0.1 + Math.sin(t * 1.5) * 0.08;
      }

      // AI Badge animations
      badgeGroup.rotation.z = -t * 0.2;
      triangle.rotation.z = t * 0.4;
      if (badgeGlowMaterial) {
        badgeGlowMaterial.opacity = 0.08 + Math.sin(t * 1.8) * 0.06;
      }
      hexEdgeMaterial.opacity = 0.6 + Math.sin(t * 2) * 0.3;

      // Floating motion
      mainGroup.position.y = Math.sin(t * 0.6) * 0.1;
      ringGroup.position.y = Math.sin(t * 0.8) * 0.15;
      badgeGroup.position.y = Math.cos(t * 0.7) * 0.12;

      // Render
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };

    animate();

    // === CLEANUP ===
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);

      geometries.forEach((geo) => geo.dispose());
      materials.forEach((mat) => mat.dispose());

      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div className="header-scene" ref={mountRef} />;
}
