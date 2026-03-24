'use client';

import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import Avatar from '@/components/Avatar';

export default function Home() {
  return (
    <main className="relative h-screen w-full overflow-hidden bg-[#050505]">
      {/* Background Gradient */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          background: 'radial-gradient(circle at center, #10101a 0%, #050505 100%)'
        }}
      />
      
      {/* 3D Scene */}
      <div className="relative z-10 h-full w-full">
        <Canvas camera={{ position: [0, 0, 3], fov: 40 }}>
          <ambientLight intensity={1.5} />
          <pointLight position={[5, 10, 5]} intensity={0.8} />
          <Suspense fallback={null}>
            <Avatar />
          </Suspense>
        </Canvas>
      </div>

      {/* Subtle UI Overlay */}
      <div className="absolute bottom-12 left-0 right-0 z-20 flex flex-col items-center gap-2 pointer-events-none">
        <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse" />
        <p className="text-white/20 text-[10px] font-light tracking-[0.4em] uppercase">
          Assistant Ready
        </p>
      </div>

      {/* Decorative Edge Glow */}
      <div className="absolute inset-0 pointer-events-none border-[1px] border-white/5 opacity-20" />
    </main>
  );
}
