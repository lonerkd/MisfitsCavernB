'use client';

import React, { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, useTexture } from '@react-three/drei';
import * as THREE from 'three';

interface Photo {
  id: string;
  imageUrl: string;
  title: string;
}

// The actual photo, rendered as a textured plane on the frame's face — without
// this the frame was just a solid-color box regardless of imageUrl, so every
// gallery entry looked like an empty dark void even with real photos.
function PhotoPlane({ imageUrl }: { imageUrl: string }) {
  const texture = useTexture(imageUrl);
  return (
    <mesh position={[0, 0, 0.03]}>
      <planeGeometry args={[1.86, 1.26]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

function PhotoFrame({ position, imageUrl, rotation }: { position: [number, number, number]; imageUrl: string; rotation: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = React.useState(false);

  useFrame((state) => {
    if (meshRef.current && hovered) {
      meshRef.current.rotation.y += 0.005;
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={position}
      rotation={rotation}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      scale={hovered ? 1.1 : 1}
    >
      <boxGeometry args={[2, 1.4, 0.05]} />
      <meshStandardMaterial color={hovered ? '#d7340b' : '#1a1a1a'} metalness={0.8} roughness={0.2} />

      <Suspense fallback={null}>
        <PhotoPlane imageUrl={imageUrl} />
      </Suspense>

      {/* Frame border */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(2, 1.4, 0.05)]} />
        <lineBasicMaterial color="#e0ddae" opacity={0.3} transparent />
      </lineSegments>
    </mesh>
  );
}

function RotatingGallery({ photos }: { photos: Photo[] }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.002;
    }
  });

  const frames = useMemo(() => {
    const radius = 5;
    const angleStep = (Math.PI * 2) / photos.length;

    return photos.map((photo, i) => {
      const angle = i * angleStep;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const rotation: [number, number, number] = [0, -angle + Math.PI / 2, 0];

      return (
        <PhotoFrame
          key={photo.id}
          position={[x, 0, z]}
          imageUrl={photo.imageUrl}
          rotation={rotation}
        />
      );
    });
  }, [photos]);

  return <group ref={groupRef}>{frames}</group>;
}

export default function OrbitGallery({ photos = [] }: { photos?: Photo[] }) {
  // No fabricated placeholders — if there's nothing real to show, say so.
  if (photos.length === 0) {
    return (
      <div style={{ width: '100%', height: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, background: 'rgba(255,255,255,0.01)' }}>
        <div style={{ textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 1, color: 'rgba(224, 221, 174,0.4)' }}>
          No gallery images yet.<br />
          <span style={{ fontSize: 9, color: 'rgba(224, 221, 174,0.25)' }}>Add concept art in Studio to populate this gallery.</span>
        </div>
      </div>
    );
  }

  const photosToShow = photos;

  return (
    <div style={{ width: '100%', height: '600px', background: 'transparent' }}>
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 2, 8]} />
        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
        
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#d7340b" />
        
        <RotatingGallery photos={photosToShow} />
        
        {/* Floor grid */}
        <gridHelper args={[20, 20, '#d7340b', '#1a1a1a']} position={[0, -2, 0]} />
      </Canvas>
    </div>
  );
}
