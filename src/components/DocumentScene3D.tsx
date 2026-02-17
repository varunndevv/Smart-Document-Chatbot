'use client';

import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

// ─── Mouse position hook ────────────────────────────────
function useMousePosition() {
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  return mouse;
}

// ─── Neural Network Sphere (Icosahedron Wireframe) ──────
function NeuralNetwork({ mouse, isChatMode }: { mouse: React.RefObject<{ x: number; y: number }>, isChatMode?: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current || !mouse.current) return;
    const t = clock.getElapsedTime();

    // Smooth rotation
    meshRef.current.rotation.x = t * 0.1 + mouse.current.y * 0.1;
    meshRef.current.rotation.y = t * 0.15 + mouse.current.x * 0.1;

    // Target state based on mode
    // Chat Mode: Push back drastically (-12), reduce opacity (0.05), scale down (0.8)
    const targetZ = isChatMode ? -12 : -5;
    const targetOpacity = isChatMode ? 0.05 : 0.15;
    const targetScale = isChatMode ? 0.8 : 1;

    // Smooth lerp transitions
    meshRef.current.position.z = THREE.MathUtils.lerp(meshRef.current.position.z, targetZ, 0.05);

    const material = meshRef.current.material as THREE.MeshStandardMaterial;
    if (material) {
      material.opacity = THREE.MathUtils.lerp(material.opacity, targetOpacity, 0.05);
    }

    const currentScale = meshRef.current.scale.x;
    const nextScale = THREE.MathUtils.lerp(currentScale, targetScale * (1 + Math.sin(t * 0.5) * 0.02), 0.05);
    meshRef.current.scale.set(nextScale, nextScale, nextScale);
  });

  return (
    <Float speed={2} rotationIntensity={0.2} floatIntensity={0.2}>
      <mesh ref={meshRef} position={[0, 0, -5]}>
        {/* Detail=1 for a coarser, simpler network look */}
        <icosahedronGeometry args={[10, 1]} />
        <meshStandardMaterial
          color="#4f46e5"
          emissive="#6366f1"
          emissiveIntensity={0.5}
          wireframe
          transparent
          opacity={0.15}
          roughness={0.1}
          metalness={0.8}
        />
      </mesh>
    </Float>
  );
}

// ─── Circular Particles ─────────────────────────────────
function CircularParticles({ count = 300, isChatMode }: { count?: number, isChatMode?: boolean }) {

  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 32, 32);
      const tex = new THREE.CanvasTexture(canvas);
      setTexture(tex);
    }
  }, []);

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 25 * Math.cbrt(Math.random());
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi) - 5;
    }
    return arr;
  }, [count]);

  const pointsRef = useRef<THREE.Points>(null);

  useFrame(() => {
    if (!pointsRef.current) return;
    const material = pointsRef.current.material as THREE.PointsMaterial;
    // In Chat Mode: reduce opacity slightly (0.4) so it's not distracting
    const targetOpacity = isChatMode ? 0.3 : 0.7;
    material.opacity = THREE.MathUtils.lerp(material.opacity, targetOpacity, 0.05);

    // Slow rotation
    pointsRef.current.rotation.y += 0.0005;
  });

  if (!texture) return null;

  return (
    <Points ref={pointsRef} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        map={texture}
        color="#a5b4fc"
        size={0.25}
        sizeAttenuation={true}
        depthWrite={false}
        opacity={0.7}
        alphaTest={0.01}
      />
    </Points>
  );
}

// ─── Background Glow Orb ────────────────────────────────
function BackgroundGlow({ mouse }: { mouse: React.RefObject<{ x: number; y: number }> }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current || !mouse.current) return;
    meshRef.current.position.x = -mouse.current.x * 2;
    meshRef.current.position.y = -mouse.current.y * 2;
  });

  return (
    <mesh ref={meshRef} position={[0, 0, -20]} scale={[30, 30, 30]}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshBasicMaterial color="#312e81" transparent opacity={0.15} depthWrite={false} />
    </mesh>
  );
}

// ─── Scene Content ──────────────────────────────────────
function SceneContent({ isChatMode }: { isChatMode?: boolean }) {
  const mouse = useMousePosition();

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1.5} color="#818cf8" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#c084fc" />

      <BackgroundGlow mouse={mouse} />
      <CircularParticles count={400} isChatMode={isChatMode} />
      <NeuralNetwork mouse={mouse} isChatMode={isChatMode} />
    </>
  );
}

// ─── Exported Component ──────────────────────────────────
export default function DocumentScene3D({ isChatMode }: { isChatMode?: boolean }) {
  return (
    <div className={`absolute inset-0 transition-all duration-1000 ${isChatMode ? 'pointer-events-none' : ''}`} style={{ zIndex: 0 }}>
      {/* 
         Canvas is always rendered.
         We treat isChatMode as a state to change the scene content.
      */}
      <Canvas
        camera={{ position: [0, 0, 15], fov: 50 }}
        style={{ background: 'transparent' }}
        gl={{ alpha: true, antialias: true }}
        dpr={[1, 1.5]}
      >
        <SceneContent isChatMode={isChatMode} />
      </Canvas>
    </div>
  );
}
