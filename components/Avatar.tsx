'use client';

import React, { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Mesh, MathUtils, Vector3, TorusGeometry, Shape } from 'three';

interface AvatarProps {
  isSpeaking?: boolean;
  isLaughing?: boolean;
  isSmiling?: boolean;
  theme?: 'dark' | 'light';
}

export default function Avatar({ isSpeaking = false, isLaughing = false, isSmiling = false, theme = 'dark' }: AvatarProps) {
  const groupRef = useRef<Group>(null);
  const leftEyeRef = useRef<Mesh>(null);
  const rightEyeRef = useRef<Mesh>(null);
  const mouthGroupRef = useRef<Group>(null);
  const torusRef = useRef<Mesh>(null);
  const leftCapRef = useRef<Mesh>(null);
  const rightCapRef = useRef<Mesh>(null);
  const laughMouthRef = useRef<Mesh>(null);

  const [isBlinking, setIsBlinking] = useState(false);
  const blinkTimer = useRef(0);
  const nextBlink = useRef(2 + Math.random() * 3);

  // Dynamic color based on theme
  const materialColor = theme === 'light' ? '#3c9d00' : 'white';

  // Define the "D" shape for the filled laughing mouth
  const laughShape = useMemo(() => {
    const shape = new Shape();
    const width = 0.5;
    const radius = width / 2;
    shape.moveTo(-radius, 0);
    shape.absarc(0, 0, radius, Math.PI, 0, false);
    shape.lineTo(-radius, 0);
    return shape;
  }, []);

  // Animation values state
  const animState = useRef({
    morphFactor: 0,
    laughFactor: 0,
  });

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const time = state.clock.getElapsedTime();

    // 1. Floating & Laughing Bounce
    animState.current.laughFactor = MathUtils.lerp(animState.current.laughFactor, isLaughing ? 1 : 0, 0.05);
    const laughVal = animState.current.laughFactor;

    const floatFreq = 1.8 + (isSpeaking ? 0.7 : 0); 
    const floatAmp = 0.12 + (isSpeaking ? 0.03 : 0) + (laughVal * 0.01);
    
    let posY = Math.sin(time * floatFreq) * floatAmp;
    if (laughVal > 0.01) {
      posY += Math.sin(time * 4) * 0.005 * laughVal; 
    }
    groupRef.current.position.y = posY;

    // 2. Mouth Toggling & Animation
    const showLaugh = laughVal > 0.6;
    const showSmile = isSmiling && !isLaughing;
    const showFilledMouth = showLaugh || showSmile;
    
    if (torusRef.current) torusRef.current.visible = !showFilledMouth;
    if (leftCapRef.current) leftCapRef.current.visible = !showFilledMouth;
    if (rightCapRef.current) rightCapRef.current.visible = !showFilledMouth;
    
    if (laughMouthRef.current) {
        laughMouthRef.current.visible = showFilledMouth;
        if (showLaugh) {
          // Squash and stretch
          const squash = 1 + Math.sin(time * 3) * 0.02 * laughVal;
          laughMouthRef.current.scale.set(1 + (1 - squash) * 0.5, squash, 1);
          // NEW: Mouth Y-oscillation during laughter
          laughMouthRef.current.position.y = Math.sin(time * 12) * 0.02 * laughVal;
        } else {
          laughMouthRef.current.scale.set(1, 1, 1);
          laughMouthRef.current.position.y = 0;
        }
    }

    // Existing Torus Morphing Logic (Preserved)
    let targetMorph = isSpeaking && !showFilledMouth
      ? 0.5 + Math.abs(Math.sin(time * 12)) * 0.5 
      : Math.abs(Math.sin(time * 2)) * 0.05;

    animState.current.morphFactor = MathUtils.lerp(animState.current.morphFactor, targetMorph, 0.2);

    const r = 0.25;
    const baseArc = Math.PI * 0.7;
    const speakerArc = 0.05;
    const currentArc = MathUtils.lerp(baseArc, speakerArc, animState.current.morphFactor);
    const tube = 0.05;
    const startAngle = -Math.PI / 2 - currentArc / 2;

    if (torusRef.current && torusRef.current.visible) {
      torusRef.current.geometry.dispose();
      torusRef.current.geometry = new TorusGeometry(r, tube, 12, 48, currentArc);
      torusRef.current.rotation.z = startAngle;
    }

    if (leftCapRef.current && rightCapRef.current && leftCapRef.current.visible) {
      const angleOffset = currentArc / 2;
      const leftAngle = -Math.PI / 2 - angleOffset;
      const rightAngle = -Math.PI / 2 + angleOffset;
      leftCapRef.current.position.set(r * Math.cos(leftAngle), r * Math.sin(leftAngle), 0);
      rightCapRef.current.position.set(r * Math.cos(rightAngle), r * Math.sin(rightAngle), 0);
    }

    // 3. Blinking & Squinting
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
      // NEW: Eye squinting while laughing
      const squintFactor = 1 - (laughVal * 0.35); 
      const targetScaleY = isBlinking ? 0.05 : squintFactor;
      leftEyeRef.current.scale.y = MathUtils.lerp(leftEyeRef.current.scale.y, targetScaleY, 0.4);
      rightEyeRef.current.scale.y = MathUtils.lerp(rightEyeRef.current.scale.y, targetScaleY, 0.4);
    }

    // 4. Mouse Reaction
    const targetRotX = (state.mouse.y * Math.PI) / 10;
    const targetRotY = (state.mouse.x * Math.PI) / 8;
    groupRef.current.rotation.x = MathUtils.lerp(groupRef.current.rotation.x, -targetRotX, 0.1);
    groupRef.current.rotation.y = MathUtils.lerp(groupRef.current.rotation.y, targetRotY, 0.1);
  });

  return (
    <group ref={groupRef}>
      {/* Eyes */}
      <mesh ref={leftEyeRef} position={[-0.13, 0.17, 0]}>
        <capsuleGeometry args={[0.05, 0.15, 8, 16]} />
        <meshBasicMaterial color={materialColor} />
      </mesh>
      <mesh ref={rightEyeRef} position={[0.13, 0.17, 0]}>
        <capsuleGeometry args={[0.05, 0.15, 8, 16]} />
        <meshBasicMaterial color={materialColor} />
      </mesh>

      {/* Mouth Group */}
      <group position={[0, -0.05, 0]}>
        {/* Torus Mouth (Idle/Speaking) */}
        <mesh ref={torusRef}>
          <torusGeometry args={[0.25, 0.05, 12, 48, Math.PI * 0.7]} />
          <meshBasicMaterial color={materialColor} />
        </mesh>
        <mesh ref={leftCapRef}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshBasicMaterial color={materialColor} />
        </mesh>
        <mesh ref={rightCapRef}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshBasicMaterial color={materialColor} />
        </mesh>

        {/* Filled Laughing/Smiling Mouth (Emoji Style) */}
        <mesh ref={laughMouthRef} visible={false}>
          <shapeGeometry args={[laughShape]} />
          <meshBasicMaterial color={materialColor} />
        </mesh>
      </group>
    </group>
  );
}
