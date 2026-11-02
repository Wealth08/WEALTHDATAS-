import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ThreeCanvasProps {
  className?: string;
}

export const ThreeCanvas: React.FC<ThreeCanvasProps> = ({ className = '' }) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect software WebGL to adapt rendering performance safely
    const isSoftwareGl = (() => {
      try {
        const probeCanvas = document.createElement('canvas');
        const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : (gl as WebGLRenderingContext).RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    let width = container.clientWidth || 400;
    let height = container.clientHeight || 400;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 5.5);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    container.appendChild(renderer.domElement);

    // Group for the 3D subject: Architectural Monogram & Liquid Glass Ribbon
    const group = new THREE.Group();
    scene.add(group);

    // Liquid Glass Torus Knot
    const knotGeometry = new THREE.TorusKnotGeometry(1.2, 0.35, isSoftwareGl ? 64 : 128, 32, 2, 3);
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x18181b,
      roughness: 0.12,
      metalness: 0.85,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      reflectivity: 0.9,
      transparent: true,
      opacity: 0.88,
    });
    const knotMesh = new THREE.Mesh(knotGeometry, glassMaterial);
    group.add(knotMesh);

    // Inner Obsidian Core Orb
    const coreGeometry = new THREE.IcosahedronGeometry(0.7, 3);
    const coreMaterial = new THREE.MeshStandardMaterial({
      color: 0x050505,
      metalness: 0.95,
      roughness: 0.18,
    });
    const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    group.add(coreMesh);

    // Outer Thin Orbit Ring
    const ringGeometry = new THREE.TorusGeometry(2.1, 0.02, 16, 100);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x71717a,
      transparent: true,
      opacity: 0.35,
    });
    const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
    ringMesh.rotation.x = Math.PI / 3;
    group.add(ringMesh);

    // Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(4, 5, 4);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xa1a1aa, 1.5);
    rimLight.position.set(-4, -2, -3);
    scene.add(rimLight);

    // Mouse interaction with inertia
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const handlePointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      targetX = x * 1.8;
      targetY = y * 1.8;
    };

    window.addEventListener('mousemove', handlePointerMove, { passive: true });

    let animationFrameId: number = 0;
    let timeoutId: number = 0;
    let clock = new THREE.Clock();

    const renderTick = () => {
      const delta = Math.min(clock.getDelta(), 0.1);

      // Smooth inertia damping
      currentX = THREE.MathUtils.damp(currentX, targetX, 4.0, delta);
      currentY = THREE.MathUtils.damp(currentY, targetY, 4.0, delta);

      // Rotate group with continuous motion + mouse response
      knotMesh.rotation.x += delta * 0.4;
      knotMesh.rotation.y += delta * 0.5;
      coreMesh.rotation.y -= delta * 0.3;
      ringMesh.rotation.z += delta * 0.15;

      group.rotation.y = currentX;
      group.rotation.x = -currentY;

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        // Pace loop on software GL to avoid hogging CPU
        timeoutId = window.setTimeout(() => {
          animationFrameId = requestAnimationFrame(renderTick);
        }, 60);
      } else {
        animationFrameId = requestAnimationFrame(renderTick);
      }
    };

    renderTick();

    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth || 400;
      height = container.clientHeight || 400;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      clearTimeout(timeoutId);

      knotGeometry.dispose();
      glassMaterial.dispose();
      coreGeometry.dispose();
      coreMaterial.dispose();
      ringGeometry.dispose();
      ringMaterial.dispose();
      renderer.dispose();

      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement.domElement || renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={`relative w-full h-full pointer-events-none select-none flex items-center justify-center ${className}`}
      data-testid="three-canvas"
    />
  );
};
