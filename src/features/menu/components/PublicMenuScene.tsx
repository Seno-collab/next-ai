"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function PublicMenuScene() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mountEl = mountRef.current;
    if (!mountEl) return undefined;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(globalThis.window.devicePixelRatio, 2));
    renderer.setSize(mountEl.clientWidth, mountEl.clientHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    mountEl.appendChild(renderer.domElement);

    // Scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0a0f, 0.015);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      55,
      mountEl.clientWidth / mountEl.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 2, 25);

    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];

    // Restaurant & Hotel color palette
    const colors = {
      gold: 0xfbbf24,
      orange: 0xf97316,
      red: 0xef4444,
      green: 0x22c55e,
      cyan: 0x0ea5e9,
      purple: 0xa855f7,
    };

    // === RESPONSIVE QUALITY SETTINGS ===
    const isMobile = mountEl.clientWidth < 768;
    const isLowEnd = mountEl.clientWidth < 480;

    const quality = {
      qrCount: isLowEnd ? 4 : isMobile ? 6 : 8,
      menuItemCount: isLowEnd ? 10 : isMobile ? 15 : 25,
      particleCount: isLowEnd ? 150 : isMobile ? 300 : 600,
      orbCount: isLowEnd ? 5 : isMobile ? 8 : 15,
      starCount: isLowEnd ? 100 : isMobile ? 150 : 300,
      scanLineCount: isLowEnd ? 5 : isMobile ? 7 : 10,
      enableHologramBoard: !isLowEnd, // Disable on very low-end
      enableMouseParallax: !isMobile, // Disable parallax on mobile
    };

    // === CENTRAL HOLOGRAPHIC MENU BOARD ===
    const menuBoardGroup = new THREE.Group();
    menuBoardGroup.position.set(0, 0, -8);
    const scanLines: THREE.Mesh[] = [];
    let borderMaterial: THREE.LineBasicMaterial | null = null;

    if (quality.enableHologramBoard) {
      // Hologram frame
      const frameGeometry = new THREE.BoxGeometry(8, 5, 0.2);
      const frameMaterial = new THREE.MeshPhysicalMaterial({
        color: colors.cyan,
        metalness: 0.9,
        roughness: 0.1,
        transparent: true,
        opacity: 0.3,
        emissive: new THREE.Color(colors.cyan),
        emissiveIntensity: 0.4,
      });
      geometries.push(frameGeometry);
      materials.push(frameMaterial);
      const frame = new THREE.Mesh(frameGeometry, frameMaterial);
      menuBoardGroup.add(frame);

      // Hologram scan lines
      for (let i = 0; i < quality.scanLineCount; i++) {
        const lineGeo = new THREE.PlaneGeometry(7.8, 0.1);
        const lineMat = new THREE.MeshBasicMaterial({
          color: colors.cyan,
          transparent: true,
          opacity: 0.2,
          blending: THREE.AdditiveBlending,
        });
        geometries.push(lineGeo);
        materials.push(lineMat);
        const line = new THREE.Mesh(lineGeo, lineMat);
        line.position.y = -2 + (i / (quality.scanLineCount - 1)) * 4;
        line.position.z = 0.2;
        menuBoardGroup.add(line);
        scanLines.push(line);
      }

      // Glowing border
      const borderEdges = new THREE.EdgesGeometry(frameGeometry);
      borderMaterial = new THREE.LineBasicMaterial({
        color: colors.gold,
        transparent: true,
        opacity: 0.8,
      });
      geometries.push(borderEdges);
      materials.push(borderMaterial);
      const border = new THREE.LineSegments(borderEdges, borderMaterial);
      menuBoardGroup.add(border);

      scene.add(menuBoardGroup);
    }

    // === FLOATING QR CODES ===
    const qrCodeGroup = new THREE.Group();
    const qrCodes: THREE.Mesh[] = [];

    for (let i = 0; i < quality.qrCount; i++) {
      const qrGroup = new THREE.Group();

      // QR base
      const qrBaseGeo = new THREE.PlaneGeometry(1.5, 1.5);
      const qrBaseMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0.2,
        roughness: 0.3,
        transparent: true,
        opacity: 0.9,
      });
      geometries.push(qrBaseGeo);
      materials.push(qrBaseMat);
      const qrBase = new THREE.Mesh(qrBaseGeo, qrBaseMat);
      qrGroup.add(qrBase);

      // QR pattern (simple squares)
      const squareSize = 0.2;
      const positions = [
        [-0.5, 0.5], [0.5, 0.5], [-0.5, -0.5], [0.5, -0.5],
        [0, 0], [-0.25, 0.25], [0.25, -0.25]
      ];

      positions.forEach(([x, y]) => {
        const squareGeo = new THREE.PlaneGeometry(squareSize, squareSize);
        const squareMat = new THREE.MeshBasicMaterial({
          color: 0x0ea5e9,
          transparent: true,
          opacity: 0.8,
        });
        geometries.push(squareGeo);
        materials.push(squareMat);
        const square = new THREE.Mesh(squareGeo, squareMat);
        square.position.set(x, y, 0.01);
        qrGroup.add(square);
      });

      // Position QR codes in circle
      const angle = (i / quality.qrCount) * Math.PI * 2;
      const radius = 12;
      qrGroup.position.set(
        Math.cos(angle) * radius,
        Math.sin(angle) * 3,
        Math.sin(angle) * radius - 10
      );
      qrGroup.rotation.y = -angle;

      qrGroup.userData = {
        baseAngle: angle,
        radius: radius,
        floatOffset: i * Math.PI / 4,
      };

      qrCodes.push(qrBase);
      qrCodeGroup.add(qrGroup);
    }
    scene.add(qrCodeGroup);

    // === FLOATING RESTAURANT ITEMS (Holographic) ===
    const menuItems: THREE.Mesh[] = [];
    const itemData: Array<{
      baseY: number;
      floatSpeed: number;
      rotationSpeed: number;
      orbitRadius: number;
      orbitSpeed: number;
      orbitOffset: number;
    }> = [];

    const createMenuItem = (index: number): THREE.BufferGeometry => {
      const type = index % 6;
      switch (type) {
        case 0: // Plate (cylinder)
          return new THREE.CylinderGeometry(0.6, 0.7, 0.15, 24);
        case 1: // Glass
          return new THREE.CylinderGeometry(0.25, 0.3, 0.8, 16);
        case 2: // Bowl (sphere)
          return new THREE.SphereGeometry(0.5, 16, 16);
        case 3: // Utensil (box)
          return new THREE.BoxGeometry(0.1, 1.2, 0.1);
        case 4: // Dome cover
          return new THREE.SphereGeometry(0.6, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        default: // Tray
          return new THREE.BoxGeometry(1.2, 0.1, 0.9);
      }
    };

    const itemColors = [colors.gold, colors.orange, colors.cyan, colors.green, colors.purple];

    for (let i = 0; i < quality.menuItemCount; i++) {
      const geometry = createMenuItem(i);
      geometries.push(geometry);

      const color = itemColors[i % itemColors.length];
      const material = new THREE.MeshPhysicalMaterial({
        color,
        metalness: 0.7,
        roughness: 0.2,
        transparent: true,
        opacity: 0.7,
        emissive: new THREE.Color(color),
        emissiveIntensity: 0.25,
      });
      materials.push(material);

      const mesh = new THREE.Mesh(geometry, material);

      const angle = (i / quality.menuItemCount) * Math.PI * 2;
      const radius = 10 + Math.random() * 6;
      const y = (Math.random() - 0.5) * 12;

      mesh.position.set(
        Math.cos(angle) * radius,
        y,
        Math.sin(angle) * radius - 8
      );

      itemData.push({
        baseY: y,
        floatSpeed: 0.4 + Math.random() * 0.6,
        rotationSpeed: (Math.random() - 0.5) * 0.02,
        orbitRadius: radius,
        orbitSpeed: 0.08 + Math.random() * 0.12,
        orbitOffset: angle,
      });

      menuItems.push(mesh);
      scene.add(mesh);
    }

    // === AI SECURITY PARTICLES ===
    const particleCount = quality.particleCount;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);
    const particleSpeeds: number[] = [];

    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 50;
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 30;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 40 - 10;

      // Cyan/Gold particles for AI + premium feel
      const useCyan = Math.random() > 0.5;
      if (useCyan) {
        particleColors[i * 3] = 0.05;
        particleColors[i * 3 + 1] = 0.65;
        particleColors[i * 3 + 2] = 0.91;
      } else {
        particleColors[i * 3] = 0.98;
        particleColors[i * 3 + 1] = 0.75;
        particleColors[i * 3 + 2] = 0.14;
      }

      particleSpeeds.push(0.015 + Math.random() * 0.025);
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.Float32BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute("color", new THREE.Float32BufferAttribute(particleColors, 3));
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    geometries.push(particleGeometry);
    materials.push(particleMaterial);
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // === PREMIUM GLOWING ORBS ===
    const premiumOrbs: THREE.Mesh[] = [];
    for (let i = 0; i < quality.orbCount; i++) {
      const orbGeo = new THREE.SphereGeometry(0.4 + Math.random() * 0.5, 20, 20);
      const orbColor = i % 2 === 0 ? colors.gold : colors.cyan;
      const orbMat = new THREE.MeshBasicMaterial({
        color: orbColor,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
      });
      geometries.push(orbGeo);
      materials.push(orbMat);

      const orb = new THREE.Mesh(orbGeo, orbMat);
      orb.position.set(
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20 - 5
      );
      orb.userData = {
        basePos: orb.position.clone(),
        speed: 0.6 + Math.random() * 0.6,
        amplitude: 1.5 + Math.random() * 2,
        phase: Math.random() * Math.PI * 2,
      };
      premiumOrbs.push(orb);
      scene.add(orb);
    }

    // === ROTATING RINGS (Restaurant Vibe) ===
    const rings: THREE.Mesh[] = [];
    const ringRadii = [6, 8, 10];
    const ringColors = [colors.gold, colors.orange, colors.cyan];

    ringRadii.forEach((radius, i) => {
      const ringGeo = new THREE.TorusGeometry(radius, 0.08, 16, 100);
      const ringMat = new THREE.MeshBasicMaterial({
        color: ringColors[i],
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
      });
      geometries.push(ringGeo);
      materials.push(ringMat);

      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2 + (i * Math.PI) / 12;
      ring.position.z = -8;
      rings.push(ring);
      scene.add(ring);
    });

    // === BACKGROUND STARS ===
    const starCount = quality.starCount;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 80;
      starPositions[i * 3 + 1] = (Math.random() - 0.5) * 50;
      starPositions[i * 3 + 2] = -30 - Math.random() * 30;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.Float32BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.1,
      transparent: true,
      opacity: 0.6,
    });
    geometries.push(starGeo);
    materials.push(starMat);
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // === LIGHTING ===
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1);
    keyLight.position.set(8, 12, 12);
    scene.add(keyLight);

    const goldLight = new THREE.PointLight(colors.gold, 2, 40);
    goldLight.position.set(-10, 5, 5);
    scene.add(goldLight);

    const cyanLight = new THREE.PointLight(colors.cyan, 1.5, 35);
    cyanLight.position.set(10, -3, 3);
    scene.add(cyanLight);

    // === MOUSE INTERACTION ===
    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMove = (event: MouseEvent) => {
      const rect = mountEl.getBoundingClientRect();
      mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };
    mountEl.addEventListener("mousemove", handleMouseMove);

    // === RESIZE ===
    const handleResize = () => {
      const { clientWidth, clientHeight } = mountEl;
      renderer.setSize(clientWidth, clientHeight);
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
    };
    globalThis.window.addEventListener("resize", handleResize);

    // === ANIMATION ===
    const clock = new THREE.Clock();
    let frameId = 0;

    const animate = () => {
      const t = clock.getElapsedTime();

      // Holographic menu board effects
      menuBoardGroup.position.y = Math.sin(t * 0.5) * 0.3;
      menuBoardGroup.rotation.y = Math.sin(t * 0.3) * 0.1;

      // Scan lines animation
      scanLines.forEach((line, i) => {
        line.material.opacity = 0.1 + Math.sin(t * 3 + i * 0.5) * 0.15;
      });

      if (borderMaterial) {
        borderMaterial.opacity = 0.6 + Math.sin(t * 2) * 0.2;
      }

      // Floating QR codes
      qrCodeGroup.children.forEach((qrGroup) => {
        const data = qrGroup.userData;
        const angle = data.baseAngle + t * 0.15;
        qrGroup.position.x = Math.cos(angle) * data.radius;
        qrGroup.position.z = Math.sin(angle) * data.radius - 10;
        qrGroup.position.y = Math.sin(t * 0.6 + data.floatOffset) * 2;
        qrGroup.rotation.y = -angle + Math.sin(t * 0.5) * 0.2;
      });

      // Menu items animation
      menuItems.forEach((item, i) => {
        const data = itemData[i];
        const angle = data.orbitOffset + t * data.orbitSpeed;
        item.position.x = Math.cos(angle) * data.orbitRadius;
        item.position.z = Math.sin(angle) * data.orbitRadius - 8;
        item.position.y = data.baseY + Math.sin(t * data.floatSpeed + i) * 1.2;
        item.rotation.y += data.rotationSpeed;
      });

      // Particles (AI security effect)
      const positions = particleGeometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3 + 1] += particleSpeeds[i];
        if (positions[i * 3 + 1] > 15) {
          positions[i * 3 + 1] = -15;
        }
      }
      particleGeometry.attributes.position.needsUpdate = true;

      // Premium orbs
      premiumOrbs.forEach((orb) => {
        const { basePos, speed, amplitude, phase } = orb.userData;
        orb.position.x = basePos.x + Math.sin(t * speed + phase) * amplitude;
        orb.position.y = basePos.y + Math.cos(t * speed * 0.8 + phase) * amplitude * 0.6;
        orb.material.opacity = 0.25 + Math.sin(t * 2 + phase) * 0.15;
      });

      // Rings rotation
      rings.forEach((ring, i) => {
        ring.rotation.z = t * (0.15 + i * 0.05) * (i % 2 === 0 ? 1 : -1);
        ring.material.opacity = 0.25 + Math.sin(t * 1.5 + i) * 0.12;
      });

      // Stars twinkle
      stars.rotation.y = t * 0.008;
      stars.rotation.x = t * 0.005;

      // Camera parallax with mouse (disabled on mobile for performance)
      if (quality.enableMouseParallax) {
        camera.position.x += (mouseX * 5 - camera.position.x) * 0.03;
        camera.position.y += (mouseY * 4 + 2 - camera.position.y) * 0.03;
      }
      camera.lookAt(0, 0, -8);

      renderer.render(scene, camera);
      frameId = globalThis.requestAnimationFrame(animate);
    };

    animate();

    return () => {
      globalThis.cancelAnimationFrame(frameId);
      globalThis.window.removeEventListener("resize", handleResize);
      mountEl.removeEventListener("mousemove", handleMouseMove);
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div className="public-menu-stage" ref={mountRef} />;
}
