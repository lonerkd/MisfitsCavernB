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

// The actual photo, rendered as a textured plane on the frame's face — the
// box alone (no texture) is what made every frame look like a dark, unloaded
// void regardless of imageUrl.
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
      <meshStandardMaterial color={hovered ? '#d7340b' : '#2a2a2a'} metalness={0.4} roughness={0.4} />

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
  // '/placeholder.jpg' never existed in /public — every default frame's
  // texture 404'd, so with no fallback content the gallery just looked like
  // dark, empty boxes. Use real images until real project stills are wired in.
  const defaultPhotos: Photo[] = [
    { id: '1', imageUrl: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=400&q=80', title: 'Project 1' },
    { id: '2', imageUrl: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=400&q=80', title: 'Project 2' },
    { id: '3', imageUrl: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=400&q=80', title: 'Project 3' },
    { id: '4', imageUrl: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=400&q=80', title: 'Project 4' },
    { id: '5', imageUrl: 'https://images.unsplash.com/photo-1574267432553-4b4628081c31?auto=format&fit=crop&w=400&q=80', title: 'Project 5' },
    { id: '6', imageUrl: 'https://images.unsplash.com/photo-1500964757637-c85e8a162699?auto=format&fit=crop&w=400&q=80', title: 'Project 6' },
  ];

  const photosToShow = photos.length > 0 ? photos : defaultPhotos;

  return (
    <div style={{ width: '100%', height: '600px', background: 'transparent' }}>
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 2, 8]} />
        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
        
        <ambientLight intensity={0.9} />
        <pointLight position={[10, 10, 10]} intensity={1.4} />
        <pointLight position={[-10, -10, -10]} intensity={0.6} color="#d7340b" />
        
        <RotatingGallery photos={photosToShow} />
        
        {/* Floor grid */}
        <gridHelper args={[20, 20, '#d7340b', '#1a1a1a']} position={[0, -2, 0]} />
      </Canvas>
    </div>
  );
}
