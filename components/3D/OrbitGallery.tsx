'use client';

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

interface Photo {
  id: string;
  imageUrl: string;
  title: string;
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
      <meshStandardMaterial color={hovered ? '#ff3c00' : '#1a1a1a'} metalness={0.8} roughness={0.2} />
      
      {/* Frame border */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(2, 1.4, 0.05)]} />
        <lineBasicMaterial color="#f0ece4" opacity={0.3} transparent />
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
  const defaultPhotos: Photo[] = [
    { id: '1', imageUrl: '/placeholder.jpg', title: 'Project 1' },
    { id: '2', imageUrl: '/placeholder.jpg', title: 'Project 2' },
    { id: '3', imageUrl: '/placeholder.jpg', title: 'Project 3' },
    { id: '4', imageUrl: '/placeholder.jpg', title: 'Project 4' },
    { id: '5', imageUrl: '/placeholder.jpg', title: 'Project 5' },
    { id: '6', imageUrl: '/placeholder.jpg', title: 'Project 6' },
  ];

  const photosToShow = photos.length > 0 ? photos : defaultPhotos;

  return (
    <div style={{ width: '100%', height: '600px', background: 'transparent' }}>
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 2, 8]} />
        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
        
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#ff3c00" />
        
        <RotatingGallery photos={photosToShow} />
        
        {/* Floor grid */}
        <gridHelper args={[20, 20, '#ff3c00', '#1a1a1a']} position={[0, -2, 0]} />
      </Canvas>
    </div>
  );
}
