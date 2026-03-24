'use client';

import React, { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Mesh, MathUtils, Vector3, TorusGeometry } from 'three';

interface AvatarProps {
  isSpeaking?: boolean;
}

export default function Avatar({ isSpeaking = false }: AvatarProps) {
  const groupRef = useRef<Group>(null);
  const leftEyeRef = useRef<Mesh>(null);
  const rightEyeRef = useRef<Mesh>(null);
  const mouthGroupRef = useRef<Group>(null);
  const torusRef = useRef<Mesh>(null);
  const leftCapRef = useRef<Mesh>(null);
  const rightCapRef = useRef<Mesh>(null);

  const [isBlinking, setIsBlinking] = useState(false);
  const blinkTimer = useRef(0);
  const nextBlink = useRef(2 + Math.random() * 3);

  // Animation values state (using refs for high performance in useFrame)
  const animState = useRef({
    morphFactor: 0, // 0 = Smile, 1 = Flat Line
    currentRadius: 0.25,
    currentArc: Math.PI * 0.7,
  });

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const time = state.clock.getElapsedTime();

    // 1. Floating Animation
    const floatFrequency = isSpeaking ? 2.5 : 1.8;
    const floatAmplitude = isSpeaking ? 0.15 : 0.12;
    groupRef.current.position.y = Math.sin(time * floatFrequency) * floatAmplitude;

    // 2. Morphing Mouth Animation
    // Target morph: 0 (idle breathing) to 1 (full speaking movement)
    let targetMorph = isSpeaking 
      ? 0.5 + Math.abs(Math.sin(time * 12)) * 0.5 // Irregular speaking movement
      : Math.abs(Math.sin(time * 2)) * 0.05; // Subtle breathing morph

    animState.current.morphFactor = MathUtils.lerp(animState.current.morphFactor, targetMorph, 0.2);

    // Interpolate Torus Parameters
    // From Smile: R=0.25, Arc=PI*0.7
    // To Flat: R=50 (approx straight), Arc=0.01
    const baseR = 0.25;
    const baseArc = Math.PI * 0.7;
    const targetArc = 0.05;

    const r = 0.25;
    const arc = MathUtils.lerp(baseArc, targetArc, animState.current.morphFactor);
    const tube = 0.05;

    // Center the torus so the top of the arc is always at [0, 0, 0]
    // The torus is drawn from 0 to arc. We need to rotate it to center it.
    const startAngle = -Math.PI / 2 - arc / 2;

    if (torusRef.current) {
      // Dispose old geometry and create new one for the smooth morph
      // Low poly + high refresh rate is okay for this simple mesh
      torusRef.current.geometry.dispose();
      torusRef.current.geometry = new TorusGeometry(r, tube, 12, 48, arc);
      torusRef.current.rotation.z = startAngle;
      // Offset position to keep the curve top at the mouth center
    }

    // Update Spherical Caps to follow the tips of the arc
    if (leftCapRef.current && rightCapRef.current) {
      const angleOffset = arc / 2;
      const leftAngle = -Math.PI / 2 - arc / 2;
      const rightAngle = -Math.PI / 2 + arc / 2;

      leftCapRef.current.position.set(r * Math.cos(leftAngle), r * Math.sin(leftAngle), 0);
      rightCapRef.current.position.set(r * Math.cos(rightAngle), r * Math.sin(rightAngle), 0);
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
      {/* Friendly Pill-shaped Eyes - Positions kept as requested by USER */}
      <mesh ref={leftEyeRef} position={[-0.13, 0.17, 0]}>
        <capsuleGeometry args={[0.05, 0.15, 8, 16]} />
        <meshBasicMaterial color="white" />
      </mesh>
      <mesh ref={rightEyeRef} position={[0.13, 0.17, 0]}>
        <capsuleGeometry args={[0.05, 0.15, 8, 16]} />
        <meshBasicMaterial color="white" />
      </mesh>

      {/* Morphing Mouth Group */}
      <group position={[0, -0.05, 0]}>
        <mesh ref={torusRef}>
          <torusGeometry args={[0.25, 0.05, 12, 48, Math.PI * 0.7]} />
          <meshBasicMaterial color="white" />
        </mesh>

        <mesh ref={leftCapRef}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshBasicMaterial color="white" />
        </mesh>
        <mesh ref={rightCapRef}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshBasicMaterial color="white" />
        </mesh>
      </group>
    </group>
  );
}
