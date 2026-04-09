'use client';

import React, { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Mesh, MathUtils, Vector3, TorusGeometry, Shape } from 'three';

interface AvatarProps {
  isSpeaking?: boolean;
  isLaughing?: boolean;
  isSmiling?: boolean;
  theme?: 'dark' | 'light';
  isFeminine?: boolean;
  isAlienMode?: boolean;
}

export default function Avatar({ isSpeaking = false, isLaughing = false, isSmiling = false, theme = 'dark', isFeminine = false, isAlienMode = false }: AvatarProps) {
  const groupRef = useRef<Group>(null);
  const headGroupRef = useRef<Group>(null);
  const bodyGroupRef = useRef<Group>(null);
  const leftEyeRef = useRef<Mesh>(null);
  const rightEyeRef = useRef<Mesh>(null);
  const torusRef = useRef<Mesh>(null);
  const leftCapRef = useRef<Mesh>(null);
  const rightCapRef = useRef<Mesh>(null);
  const laughMouthRef = useRef<Mesh>(null);

  const [isBlinking, setIsBlinking] = useState(false);
  const blinkTimer = useRef(0);
  const nextBlink = useRef(2 + Math.random() * 3);

  // Dynamic color based on mode and voice
  const materialColor = isAlienMode 
    ? '#a8ff3e' 
    : (theme === 'light' ? (isFeminine ? '#ec4899' : '#3b82f6') : 'white');

  // Tapered Almond Eye Shape
  const almondEyeShape = useMemo(() => {
    const shape = new Shape();
    // Start at right point (larger)
    shape.moveTo(0.15, 0);
    // Top curve
    shape.quadraticCurveTo(0, 0.15, -0.15, 0);
    // Bottom curve
    shape.quadraticCurveTo(0, -0.15, 0.15, 0);
    return shape;
  }, []);

  // Unified Teardrop Shape for Head
  const teardropShape = useMemo(() => {
    const shape = new Shape();
    shape.moveTo(0, -0.45);
    shape.bezierCurveTo(0.25, -0.4, 0.45, -0.1, 0.45, 0.2);
    shape.absarc(0, 0.2, 0.45, 0, Math.PI, false);
    shape.bezierCurveTo(-0.45, -0.1, -0.25, -0.4, 0, -0.45);
    return shape;
  }, []);

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

  const timeRef = useRef(0);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    timeRef.current += delta;
    const time = timeRef.current;

    // 1. Common Factors
    animState.current.laughFactor = MathUtils.lerp(animState.current.laughFactor, isLaughing ? 1 : 0, 0.05);
    const laughVal = animState.current.laughFactor;

    // 2. Head Rotation (Mouse follow)
    const targetRotX = (state.mouse.y * Math.PI) / 10;
    const targetRotY = (state.mouse.x * Math.PI) / 8;
    
    // Apply rotation only to head in Alien Mode, or to full group in Human Mode
    const activeRotateRef = isAlienMode ? headGroupRef.current : groupRef.current;
    if (activeRotateRef) {
      activeRotateRef.rotation.x = MathUtils.lerp(activeRotateRef.rotation.x, -targetRotX, 0.1);
      activeRotateRef.rotation.y = MathUtils.lerp(activeRotateRef.rotation.y, targetRotY, 0.1);
    }

    // 3. Floating (Only Human Mode)
    let posY = 0;
    if (!isAlienMode) {
      const floatFreq = 1.8 + (isSpeaking ? 0.7 : 0); 
      const floatAmp = 0.12 + (isSpeaking ? 0.03 : 0) + (laughVal * 0.01);
      posY = Math.sin(time * floatFreq) * floatAmp;
      if (laughVal > 0.01) {
        posY += Math.sin(time * 4) * 0.005 * laughVal; 
      }
      groupRef.current.position.y = posY;
    } else {
        // Reset full group pos/rot if switched
        groupRef.current.position.x = 0;
        groupRef.current.position.y = 0;
        groupRef.current.rotation.set(0,0,0);
        
        // Fix head position (no more floating)
        if (headGroupRef.current) {
            headGroupRef.current.position.y = 0.05;
        }
    }

    // 4. Mouth Toggling & Animation
    const showLaugh = laughVal > 0.6;
    const showSmile = isSmiling && !isLaughing;
    const showFilledMouth = showLaugh || showSmile;
    
    if (torusRef.current) torusRef.current.visible = !showFilledMouth;
    if (leftCapRef.current) leftCapRef.current.visible = !showFilledMouth;
    if (rightCapRef.current) rightCapRef.current.visible = !showFilledMouth;
    
    if (laughMouthRef.current) {
        laughMouthRef.current.visible = showFilledMouth;
        if (showLaugh) {
          const squash = 1 + Math.sin(time * 3) * 0.02 * laughVal;
          laughMouthRef.current.scale.set(1 + (1 - squash) * 0.5, squash, 1);
          laughMouthRef.current.position.y = Math.sin(time * 12) * 0.02 * laughVal;
        } else {
          laughMouthRef.current.scale.set(1, 1, 1);
          laughMouthRef.current.position.y = 0;
        }
    }

    // Mouth Morphing
    let targetMorph = isSpeaking && !showFilledMouth
      ? 0.5 + Math.abs(Math.sin(time * 12)) * 0.5 
      : Math.abs(Math.sin(time * 2)) * 0.05;

    animState.current.morphFactor = MathUtils.lerp(animState.current.morphFactor, targetMorph, 0.2);

    const r = isAlienMode ? 0.12 : 0.25; // Smaller mouth for alien
    const baseArc = Math.PI * 0.7;
    const speakerArc = 0.05;
    const currentArc = MathUtils.lerp(baseArc, speakerArc, animState.current.morphFactor);
    const tube = isAlienMode ? 0.015 : 0.05; // Much thinner for alien!
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
      const capScale = isAlienMode ? 0.3 : 1;
      leftCapRef.current.scale.set(capScale, capScale, capScale);
      rightCapRef.current.scale.set(capScale, capScale, capScale);
    }

    // 5. Blinking
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
      const squintFactor = 1 - (laughVal * 0.35); 
      const targetScaleY = isBlinking ? 0.05 : squintFactor;
      leftEyeRef.current.scale.y = MathUtils.lerp(leftEyeRef.current.scale.y, targetScaleY, 0.4);
      rightEyeRef.current.scale.y = MathUtils.lerp(rightEyeRef.current.scale.y, targetScaleY, 0.4);
    }
  });

  return (
    <group ref={groupRef}>

      {/* --------------------- ALIEN MODE (2D Stylized) --------------------- */}
      {isAlienMode && (
        <group>
            {/* Fixed Body Base (No Arms) */}
            <group ref={bodyGroupRef}>
                {/* Crescent Shoulders (Wider) */}
                {/* <mesh position={[0, -0.65, 0]}>
                    <torusGeometry args={[0.23, 0.05, 160, 100, Math.PI]} />
                    <meshBasicMaterial color={materialColor} />
                </mesh> */}
                {/* Smooth Torso (Wider) */}
                <mesh position={[0, -0.9, 0]} scale={[1.3, 1, 1]}>
                    <capsuleGeometry args={[0.25, 0.4, 50, 16]} />
                    <meshBasicMaterial color={materialColor} />
                </mesh>
            </group>

            {/* Rotating Head */}
            <group ref={headGroupRef}>
                {/* The Teardrop Head */}
                <mesh position={[0, 0, 0]}>
                    <shapeGeometry args={[teardropShape]} />
                    <meshBasicMaterial color={materialColor} side={2} />
                </mesh>

                {/* Facial Features (Layered in front) */}
                <group position={[0, 0.10, 0.02]}> 
                    {/* Eyebrows (Horizontal Curved Arcs) */}
                    <mesh position={[-0.18, 0.03, 0]} rotation={[0, 0, Math.PI / 4 + 0.3]}>
                        <torusGeometry args={[0.08, 0.006, 8, 32, Math.PI / 3]} />
                        <meshBasicMaterial color="#000000" opacity={0.6} transparent />
                    </mesh>
                    <mesh position={[0.18, 0.04, 0]} rotation={[10, 0, -Math.PI / 4 - 0.3 - Math.PI / 3]}>
                        <torusGeometry args={[0.08, 0.006, 8, 32, Math.PI / 3]} />
                        <meshBasicMaterial color="#000000" opacity={0.6} transparent />
                    </mesh>

                    {/* Tapered Almond Eyes (Adjusted Rotation) */}
                    <group position={[0, -0.05, 0]}>
                        <mesh 
                            ref={leftEyeRef} 
                            position={[-0.19, 0, 0]} 
                            rotation={[0, 0, -0.65]}
                        >
                            <shapeGeometry args={[almondEyeShape]} />
                            <meshBasicMaterial color="#000000" />
                        </mesh>
                        <mesh 
                            ref={rightEyeRef} 
                            position={[0.19, 0, 0]} 
                            rotation={[0, 0, 0.65]}
                        >
                            <shapeGeometry args={[almondEyeShape]} />
                            <meshBasicMaterial color="#000000" />
                        </mesh>
                    </group>

                    {/* Minimal Thin Mouth */}
                    <group position={[0, -0.22, 0]}>
                        <mesh ref={torusRef}>
                            <meshBasicMaterial color="#000000" opacity={0.6} transparent />
                        </mesh>
                        <mesh ref={leftCapRef}>
                            <sphereGeometry args={[0.05, 16, 16]} />
                            <meshBasicMaterial color="#000000" opacity={0.6} transparent />
                        </mesh>
                        <mesh ref={rightCapRef}>
                            <sphereGeometry args={[0.05, 16, 16]} />
                            <meshBasicMaterial color="#000000" opacity={0.6} transparent />
                        </mesh>
                        <mesh ref={laughMouthRef} visible={false}>
                            <shapeGeometry args={[laughShape]} />
                            <meshBasicMaterial color="#000000" opacity={0.6} transparent />
                        </mesh>
                    </group>
                </group>
            </group>
        </group>
      )}

      {/* --------------------- HUMAN MODE (Original 3D) --------------------- */}
      {!isAlienMode && (
         <group>
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
            <mesh ref={laughMouthRef} visible={false}>
              <shapeGeometry args={[laughShape]} />
              <meshBasicMaterial color={materialColor} />
            </mesh>
          </group>
        </group>
      )}
    </group>
  );
}
