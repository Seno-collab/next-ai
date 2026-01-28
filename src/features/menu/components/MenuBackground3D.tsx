"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * MenuBackground3D - Stunning immersive Three.js background
 *
 * Features:
 * - Floating geometric shapes with soft glow
 * - Dynamic particle system
 * - Smooth camera movement with mouse parallax
 * - Gradient color transitions
 * - Performance optimized
 */
export default function MenuBackground3D() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check reduced motion preference
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Setup
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 0, 30);

    // Colors
    const colors = {
      primary: 0xff6b35,    // Orange
      secondary: 0xffd93d,  // Gold
      accent: 0xff8c5a,     // Light orange
      purple: 0x9333ea,     // Purple
      cyan: 0x06b6d4,       // Cyan
      pink: 0xec4899,       // Pink
    };

    const colorArray = Object.values(colors);

    // Cleanup arrays
    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    const objects: THREE.Object3D[] = [];

    // === FLOATING GEOMETRIC SHAPES ===
    const shapes: Array<{
      mesh: THREE.Mesh;
      rotationSpeed: THREE.Vector3;
      floatSpeed: number;
      floatOffset: number;
      originalY: number;
    }> = [];

    const shapeCount = 15;
    const shapeTypes = [
      () => new THREE.IcosahedronGeometry(1, 0),
      () => new THREE.OctahedronGeometry(1, 0),
      () => new THREE.TetrahedronGeometry(1, 0),
      () => new THREE.TorusGeometry(0.7, 0.3, 16, 32),
      () => new THREE.TorusKnotGeometry(0.6, 0.2, 64, 8),
    ];

    for (let i = 0; i < shapeCount; i++) {
      const geometry = shapeTypes[i % shapeTypes.length]();
      const color = colorArray[i % colorArray.length];

      const material = new THREE.MeshPhysicalMaterial({
        color: color,
        metalness: 0.3,
        roughness: 0.4,
        transparent: true,
        opacity: 0.7,
        emissive: new THREE.Color(color),
        emissiveIntensity: 0.3,
        clearcoat: 1,
        clearcoatRoughness: 0.2,
      });

      geometries.push(geometry);
      materials.push(material);

      const mesh = new THREE.Mesh(geometry, material);

      // Random position in a sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 15 + Math.random() * 20;

      mesh.position.set(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi) - 20
      );

      const scale = 0.5 + Math.random() * 1.5;
      mesh.scale.setScalar(scale);

      mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      shapes.push({
        mesh,
        rotationSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02
        ),
        floatSpeed: 0.5 + Math.random() * 0.5,
        floatOffset: Math.random() * Math.PI * 2,
        originalY: mesh.position.y,
      });

      scene.add(mesh);
      objects.push(mesh);
    }

    // === PARTICLE SYSTEM - Floating Dust ===
    const particleCount = 500;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);
    const particleSizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;

      // Spread particles in a large volume
      particlePositions[i3] = (Math.random() - 0.5) * 80;
      particlePositions[i3 + 1] = (Math.random() - 0.5) * 60;
      particlePositions[i3 + 2] = (Math.random() - 0.5) * 60 - 10;

      // Random warm colors
      const color = new THREE.Color(colorArray[Math.floor(Math.random() * colorArray.length)]);
      particleColors[i3] = color.r;
      particleColors[i3 + 1] = color.g;
      particleColors[i3 + 2] = color.b;

      particleSizes[i] = Math.random() * 3 + 1;
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute("color", new THREE.BufferAttribute(particleColors, 3));
    particleGeometry.setAttribute("size", new THREE.BufferAttribute(particleSizes, 1));

    // Custom shader for soft particles
    const particleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: renderer.getPixelRatio() },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uTime;
        uniform float uPixelRatio;

        void main() {
          vColor = color;

          vec3 pos = position;
          pos.y += sin(uTime * 0.5 + position.x * 0.1) * 2.0;
          pos.x += cos(uTime * 0.3 + position.z * 0.1) * 1.5;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;

          float sizeAttenuation = 300.0 / -mvPosition.z;
          gl_PointSize = size * sizeAttenuation * uPixelRatio;

          vAlpha = smoothstep(100.0, 20.0, -mvPosition.z);
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;

          float alpha = smoothstep(0.5, 0.0, dist) * vAlpha * 0.6;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    geometries.push(particleGeometry);
    materials.push(particleMaterial);

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);
    objects.push(particles);

    // === GLOWING ORB - Central Light ===
    const orbGeometry = new THREE.SphereGeometry(3, 32, 32);
    const orbMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor1: { value: new THREE.Color(colors.primary) },
        uColor2: { value: new THREE.Color(colors.secondary) },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          float fresnel = pow(1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          float pulse = sin(uTime * 2.0) * 0.2 + 0.8;

          vec3 color = mix(uColor1, uColor2, sin(uTime * 0.5) * 0.5 + 0.5);
          float alpha = fresnel * pulse * 0.8;

          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
    });

    geometries.push(orbGeometry);
    materials.push(orbMaterial);

    const orb = new THREE.Mesh(orbGeometry, orbMaterial);
    orb.position.set(0, 0, -15);
    orb.scale.setScalar(4);
    scene.add(orb);
    objects.push(orb);

    // Inner orb glow
    const innerOrbGeometry = new THREE.SphereGeometry(2, 32, 32);
    const innerOrbMaterial = new THREE.MeshBasicMaterial({
      color: colors.primary,
      transparent: true,
      opacity: 0.3,
    });

    geometries.push(innerOrbGeometry);
    materials.push(innerOrbMaterial);

    const innerOrb = new THREE.Mesh(innerOrbGeometry, innerOrbMaterial);
    innerOrb.position.copy(orb.position);
    scene.add(innerOrb);
    objects.push(innerOrb);

    // === RING EFFECTS ===
    const ringCount = 3;
    const rings: THREE.Mesh[] = [];

    for (let i = 0; i < ringCount; i++) {
      const ringGeometry = new THREE.TorusGeometry(5 + i * 3, 0.05, 16, 100);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: colorArray[i % colorArray.length],
        transparent: true,
        opacity: 0.3 - i * 0.08,
        blending: THREE.AdditiveBlending,
      });

      geometries.push(ringGeometry);
      materials.push(ringMaterial);

      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.position.set(0, 0, -15);
      ring.rotation.x = Math.PI / 2 + i * 0.2;

      rings.push(ring);
      scene.add(ring);
      objects.push(ring);
    }

    // === LIGHTING ===
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(colors.primary, 2, 50);
    pointLight1.position.set(10, 10, 10);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(colors.secondary, 1.5, 50);
    pointLight2.position.set(-10, -5, 5);
    scene.add(pointLight2);

    const pointLight3 = new THREE.PointLight(colors.purple, 1, 40);
    pointLight3.position.set(0, -10, -10);
    scene.add(pointLight3);

    // === MOUSE INTERACTION ===
    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;

    const handleMouseMove = (event: MouseEvent) => {
      targetMouseX = (event.clientX / window.innerWidth) * 2 - 1;
      targetMouseY = -(event.clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener("mousemove", handleMouseMove);

    // === RESIZE ===
    const handleResize = () => {
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;

      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();

      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener("resize", handleResize);

    // === ANIMATION ===
    const clock = new THREE.Clock();
    let animationId: number;

    const animate = () => {
      const elapsed = clock.getElapsedTime();

      // Update shader uniforms
      particleMaterial.uniforms.uTime.value = elapsed;
      orbMaterial.uniforms.uTime.value = elapsed;

      if (!prefersReducedMotion) {
        // Smooth mouse follow
        mouseX += (targetMouseX - mouseX) * 0.05;
        mouseY += (targetMouseY - mouseY) * 0.05;

        // Camera movement
        camera.position.x = mouseX * 5;
        camera.position.y = mouseY * 3;
        camera.lookAt(0, 0, -10);

        // Animate shapes
        shapes.forEach((shape) => {
          shape.mesh.rotation.x += shape.rotationSpeed.x;
          shape.mesh.rotation.y += shape.rotationSpeed.y;
          shape.mesh.rotation.z += shape.rotationSpeed.z;

          // Float animation
          shape.mesh.position.y = shape.originalY +
            Math.sin(elapsed * shape.floatSpeed + shape.floatOffset) * 2;
        });

        // Animate orb
        orb.scale.setScalar(4 + Math.sin(elapsed * 2) * 0.3);
        innerOrb.scale.setScalar(2 + Math.sin(elapsed * 2.5) * 0.2);

        // Animate rings
        rings.forEach((ring, i) => {
          ring.rotation.z = elapsed * (0.1 + i * 0.05);
          ring.rotation.x = Math.PI / 2 + Math.sin(elapsed * 0.5 + i) * 0.1;
        });

        // Rotate particle system slowly
        particles.rotation.y = elapsed * 0.02;
      }

      renderer.render(scene, camera);
      animationId = requestAnimationFrame(animate);
    };

    animate();

    // === CLEANUP ===
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);

      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      objects.forEach((o) => scene.remove(o));

      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="menu-3d-background"
      aria-hidden="true"
    />
  );
}
