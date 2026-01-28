"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * SignaturePicksScene - A minimal, elegant Three.js background
 *
 * Design principles:
 * - Subtle and supportive, not dominant
 * - Soft ambient glow that enhances the UI
 * - Smooth, slow animations
 * - High performance with minimal resource usage
 * - Clean, modern, premium aesthetic
 */
export default function SignaturePicksScene() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mountEl = mountRef.current;
    if (!mountEl) return undefined;

    // Check for reduced motion preference
    const prefersReducedMotion = globalThis.window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // Renderer setup - optimized for performance
    const renderer = new THREE.WebGLRenderer({
      antialias: false, // Disable for better performance
      alpha: true,
      powerPreference: "low-power",
    });
    renderer.setPixelRatio(Math.min(globalThis.window.devicePixelRatio, 1.5));
    renderer.setSize(mountEl.clientWidth, mountEl.clientHeight);
    renderer.setClearColor(0x000000, 0);
    mountEl.appendChild(renderer.domElement);

    // Scene
    const scene = new THREE.Scene();

    // Camera - simple orthographic for 2D-like effect
    const aspect = mountEl.clientWidth / mountEl.clientHeight;
    const frustumSize = 10;
    const camera = new THREE.OrthographicCamera(
      (frustumSize * aspect) / -2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      frustumSize / -2,
      0.1,
      100
    );
    camera.position.z = 10;

    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];

    // === SOFT AMBIENT GLOW ===
    // Central gradient orb - subtle warm glow
    const glowGeometry = new THREE.CircleGeometry(3, 64);
    const glowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor1: { value: new THREE.Color(0xff8c42) }, // Warm orange
        uColor2: { value: new THREE.Color(0xffd700) }, // Gold
        uOpacity: { value: 0.15 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform float uOpacity;
        varying vec2 vUv;

        void main() {
          vec2 center = vec2(0.5);
          float dist = distance(vUv, center);

          // Smooth radial gradient
          float gradient = 1.0 - smoothstep(0.0, 0.5, dist);
          gradient = pow(gradient, 2.0);

          // Subtle color shift
          float colorMix = sin(uTime * 0.3) * 0.5 + 0.5;
          vec3 color = mix(uColor1, uColor2, colorMix);

          // Subtle breathing effect
          float breath = sin(uTime * 0.5) * 0.1 + 0.9;

          gl_FragColor = vec4(color, gradient * uOpacity * breath);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    geometries.push(glowGeometry);
    materials.push(glowMaterial);
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.set(0, 0, -1);
    scene.add(glow);

    // === SUBTLE FLOATING PARTICLES ===
    // Very few particles for depth, not distraction
    const particleCount = 20;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleSizes = new Float32Array(particleCount);
    const particleAlphas = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 12;
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 8;
      particlePositions[i * 3 + 2] = Math.random() * -5;
      particleSizes[i] = Math.random() * 0.03 + 0.01;
      particleAlphas[i] = Math.random() * 0.3 + 0.1;
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(particlePositions, 3)
    );

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.08,
      color: 0xffd700,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    geometries.push(particleGeometry);
    materials.push(particleMaterial);
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // === SOFT EDGE VIGNETTE RINGS ===
    // Two subtle rings at edges for depth framing
    const createSoftRing = (radius: number, opacity: number) => {
      const ringGeometry = new THREE.RingGeometry(radius - 0.1, radius, 64);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0xff8c42,
        transparent: true,
        opacity: opacity,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
      geometries.push(ringGeometry);
      materials.push(ringMaterial);
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.position.z = -2;
      return ring;
    };

    const outerRing = createSoftRing(5, 0.03);
    const innerRing = createSoftRing(3.5, 0.05);
    scene.add(outerRing);
    scene.add(innerRing);

    // === MOUSE PARALLAX ===
    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;

    const handleMouseMove = (event: MouseEvent) => {
      const rect = mountEl.getBoundingClientRect();
      targetMouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      targetMouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    mountEl.addEventListener("mousemove", handleMouseMove);

    // === RESIZE ===
    const handleResize = () => {
      const { clientWidth, clientHeight } = mountEl;
      const newAspect = clientWidth / clientHeight;

      camera.left = (frustumSize * newAspect) / -2;
      camera.right = (frustumSize * newAspect) / 2;
      camera.top = frustumSize / 2;
      camera.bottom = frustumSize / -2;
      camera.updateProjectionMatrix();

      renderer.setSize(clientWidth, clientHeight);
    };
    globalThis.window.addEventListener("resize", handleResize);

    // === ANIMATION LOOP ===
    const clock = new THREE.Clock();
    let frameId = 0;

    const animate = () => {
      const t = clock.getElapsedTime();

      // Update shader time
      glowMaterial.uniforms.uTime.value = t;

      if (!prefersReducedMotion) {
        // Smooth mouse follow
        mouseX += (targetMouseX - mouseX) * 0.02;
        mouseY += (targetMouseY - mouseY) * 0.02;

        // Subtle parallax on glow
        glow.position.x = mouseX * 0.3;
        glow.position.y = mouseY * 0.2;

        // Very slow particle drift
        const positions = particleGeometry.attributes.position.array as Float32Array;
        for (let i = 0; i < particleCount; i++) {
          const i3 = i * 3;
          // Gentle upward drift
          positions[i3 + 1] += 0.002;
          // Subtle horizontal sway
          positions[i3] += Math.sin(t * 0.5 + i) * 0.001;

          // Reset if out of bounds
          if (positions[i3 + 1] > 5) {
            positions[i3 + 1] = -5;
            positions[i3] = (Math.random() - 0.5) * 12;
          }
        }
        particleGeometry.attributes.position.needsUpdate = true;

        // Subtle ring breathing
        const breathScale = 1 + Math.sin(t * 0.3) * 0.02;
        outerRing.scale.setScalar(breathScale);
        innerRing.scale.setScalar(1 + Math.sin(t * 0.4 + 1) * 0.015);

        // Subtle ring rotation
        outerRing.rotation.z = t * 0.02;
        innerRing.rotation.z = -t * 0.015;
      }

      renderer.render(scene, camera);
      frameId = globalThis.requestAnimationFrame(animate);
    };

    animate();

    // === CLEANUP ===
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

  return (
    <div
      className="signature-picks-scene"
      ref={mountRef}
      aria-hidden="true"
    />
  );
}
