'use client';

import React, { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Mesh, MathUtils, Vector3 } from 'three';

export default function Avatar() {
  const groupRef = useRef<Group>(null);
  const leftEyeRef = useRef<Mesh>(null);
  const rightEyeRef = useRef<Mesh>(null);
  const mouthGroupRef = useRef<Group>(null);

  const [isBlinking, setIsBlinking] = useState(false);
  const blinkTimer = useRef(0);
  const nextBlink = useRef(2 + Math.random() * 3);

  // Configuration for the smile
  const smileConfig = useMemo(() => {
    const radius = 0.25;
    const tube = 0.05;
    const arc = Math.PI * 0.7; // Slightly tighter for a "cleaner" smile
    const startAngle = -Math.PI / 2 - arc / 2;
    const endAngle = -Math.PI / 2 + arc / 2;

    return {
      radius,
      tube,
      arc,
      startAngle,
      endAngle,
      leftEnd: new Vector3(radius * Math.cos(startAngle), radius * Math.sin(startAngle), 0),
      rightEnd: new Vector3(radius * Math.cos(endAngle), radius * Math.sin(endAngle), 0),
    };
  }, []);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const time = state.clock.getElapsedTime();

    // 1. Floating Animation
    groupRef.current.position.y = Math.sin(time * 1.8) * 0.12;

    // 2. Smile Reactivity (Subtle breathing/pulse)
    if (mouthGroupRef.current) {
      const breathingScale = 1 + Math.sin(time * 2) * 0.03;
      mouthGroupRef.current.scale.set(breathingScale, breathingScale, breathingScale);
    }

    // 3. Blinking Animation
    blinkTimer.current += delta;
    if (blinkTimer.current >= nextBlink.current) {
      setIsBlinking(true);
      if (blinkTimer.current >= nextBlink.current + 0.12) {
        setIsBlinking(false);
        blinkTimer.current = 0;
        nextBlink.current = 2 + Math.random() * 4;
      }
    }

    if (leftEyeRef.current && rightEyeRef.current) {
      const targetScaleY = isBlinking ? 0.05 : 1;
      leftEyeRef.current.scale.y = MathUtils.lerp(leftEyeRef.current.scale.y, targetScaleY, 0.4);
      rightEyeRef.current.scale.y = MathUtils.lerp(rightEyeRef.current.scale.y, targetScaleY, 0.4);
    }

    // 4. Mouse Reaction
    const targetRotationX = (state.mouse.y * Math.PI) / 10;
    const targetRotationY = (state.mouse.x * Math.PI) / 8;
    
    groupRef.current.rotation.x = MathUtils.lerp(groupRef.current.rotation.x, -targetRotationX, 0.1);
    groupRef.current.rotation.y = MathUtils.lerp(groupRef.current.rotation.y, targetRotationY, 0.1);
  });

  return (
    <group ref={groupRef}>
      {/* Friendly Pill-shaped Eyes - Rounded caps at top and bottom */}
      <mesh ref={leftEyeRef} position={[-0.13, 0.17, 0]}>
        <capsuleGeometry args={[0.05, 0.15, 8, 16]} />
        <meshBasicMaterial color="white" />
      </mesh>
      <mesh ref={rightEyeRef} position={[0.13, 0.17, 0]}>
        <capsuleGeometry args={[0.05, 0.15, 8, 16]} />
        <meshBasicMaterial color="white" />
      </mesh>

      {/* Curved Smile with perfectly rounded ends */}
      <group ref={mouthGroupRef} position={[0, -0.05, 0]}>
        {/* The Arc */}
        <mesh 
          position={[0, 0, 0]} 
          rotation={[0, 0, smileConfig.startAngle]}
        >
          <torusGeometry args={[smileConfig.radius, smileConfig.tube, 16, 64, smileConfig.arc]} />
          <meshBasicMaterial color="white" />
        </mesh>

        {/* Rounded Caps (Spheres at the tips) */}
        <mesh position={smileConfig.leftEnd}>
          <sphereGeometry args={[smileConfig.tube, 16, 16]} />
          <meshBasicMaterial color="white" />
        </mesh>
        <mesh position={smileConfig.rightEnd}>
          <sphereGeometry args={[smileConfig.tube, 16, 16]} />
          <meshBasicMaterial color="white" />
        </mesh>
      </group>
    </group>
  );
}
