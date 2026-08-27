"use client";

import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { Exoplanet } from "@/lib/nasa";
import { Planet3DPosition } from "@/lib/coordinates";

interface StarMapCanvasProps {
  nodes: Planet3DPosition[];
  selectedPlanet: Exoplanet | null;
  onSelectPlanet: (planet: Exoplanet) => void;
  hoveredPlanet: Exoplanet | null;
  onHoverPlanet: (planet: Exoplanet | null) => void;
  focusTarget: [number, number, number] | null;
}

// ─── Concentric Distance Rings & Galactic Coordinate Grid ────────────────────

function DistanceGrids() {
  const gridRadii = [
    { r: 18, label: "50 pc" },
    { r: 38, label: "250 pc" },
    { r: 58, label: "500 pc" },
    { r: 76, label: "1000 pc" },
    { r: 92, label: "2000 pc" },
  ];

  return (
    <group>
      {/* Galactic Equatorial Plane Grid */}
      <gridHelper
        args={[200, 40, "#1d3557", "#0a192f"]}
        position={[0, -0.2, 0]}
        rotation={[0, 0, 0]}
      />

      {/* Concentric Distance Rings */}
      {gridRadii.map(({ r, label }) => (
        <group key={label} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh>
            <ringGeometry args={[r - 0.15, r + 0.15, 64]} />
            <meshBasicMaterial
              color="#06b6d4"
              transparent
              opacity={0.18}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      ))}

      {/* Sol / Earth Core Beacon */}
      <group position={[0, 0, 0]}>
        <mesh>
          <sphereGeometry args={[0.9, 24, 24]} />
          <meshBasicMaterial color="#fef08a" />
        </mesh>
        <mesh>
          <sphereGeometry args={[1.8, 16, 16]} />
          <meshBasicMaterial color="#facc15" transparent opacity={0.25} />
        </mesh>
        {/* Origin Label */}
        <Html position={[0, 1.8, 0]} center distanceFactor={45} style={{ pointerEvents: "none" }}>
          <div className="font-mono text-[0.55rem] font-bold tracking-widest px-1.5 py-0.5 rounded bg-[#030718]/90 border border-yellow-500/50 text-yellow-300 whitespace-nowrap shadow-lg select-none">
            ☉ SOL / EARTH
          </div>
        </Html>
      </group>
    </group>
  );
}

// ─── Individual Interactive Star / Planet Node ───────────────────────────────

function PlanetNode({
  node,
  isSelected,
  isHovered,
  onSelect,
  onHover,
}: {
  node: Planet3DPosition;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: (p: Exoplanet) => void;
  onHover: (p: Exoplanet | null) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const colorObj = useMemo(() => new THREE.Color(node.color), [node.color]);

  const scaleMultiplier = isSelected ? 1.9 : isHovered ? 1.5 : 1;

  return (
    <group position={node.position}>
      {/* Core Glowing Sphere */}
      <mesh
        ref={meshRef}
        scale={node.size * scaleMultiplier}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(node.planet);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(node.planet);
        }}
        onPointerOut={() => {
          onHover(null);
        }}
      >
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial
          color={colorObj}
          emissive={colorObj}
          emissiveIntensity={isSelected ? 1.8 : isHovered ? 1.2 : 0.6}
          roughness={0.2}
        />
      </mesh>

      {/* Atmospheric Glow Halo */}
      <mesh scale={node.size * scaleMultiplier * 1.6}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshBasicMaterial
          color={colorObj}
          transparent
          opacity={isSelected ? 0.45 : isHovered ? 0.35 : 0.15}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* Selected Target Holographic Reticle */}
      {isSelected && (
        <group>
          {/* Outer Pulsing Reticle */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[node.size * 2.8, node.size * 3.1, 32]} />
            <meshBasicMaterial
              color="#22d3ee"
              transparent
              opacity={0.8}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 4]}>
            <ringGeometry args={[node.size * 3.4, node.size * 3.6, 4]} />
            <meshBasicMaterial
              color="#a78bfa"
              transparent
              opacity={0.9}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/* Target Name Tag */}
          <Html position={[0, node.size * 2.4 + 0.8, 0]} center distanceFactor={40} style={{ pointerEvents: "none" }}>
            <div className="font-mono text-[0.6rem] font-bold tracking-widest px-2 py-0.5 rounded bg-[#030616]/95 border border-[var(--accent-cyan)] text-[var(--accent-cyan-bright)] whitespace-nowrap shadow-[0_0_12px_rgba(6,182,212,0.5)] select-none">
              TARGET // {node.planet.pl_name}
            </div>
          </Html>
        </group>
      )}

      {/* Hover Tooltip Label */}
      {isHovered && !isSelected && (
        <Html position={[0, node.size * 1.8 + 0.6, 0]} center distanceFactor={45} style={{ pointerEvents: "none" }}>
          <div className="font-mono text-[0.58rem] font-medium tracking-wider px-1.5 py-0.5 rounded bg-[#03081c]/90 border border-[var(--accent-blue)] text-slate-200 whitespace-nowrap shadow-md select-none">
            {node.planet.pl_name} ({node.distance.toFixed(0)} pc)
          </div>
        </Html>
      )}
    </group>
  );
}

// ─── Camera Controller & Fly-To Animator ────────────────────────────────────

function CameraFlyController({
  focusTarget,
  controlsRef,
}: {
  focusTarget: [number, number, number] | null;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}) {
  const { camera } = useThree();
  const targetPos = useRef<THREE.Vector3 | null>(null);

  useEffect(() => {
    if (focusTarget && controlsRef.current) {
      const [tx, ty, tz] = focusTarget;
      targetPos.current = new THREE.Vector3(tx, ty, tz);
    }
  }, [focusTarget, controlsRef]);

  useFrame((_state, delta) => {
    if (targetPos.current && controlsRef.current) {
      const ctrl = controlsRef.current;
      const curTarget = ctrl.target;
      const dest = targetPos.current;

      // Smooth lerp controls target toward the planet
      curTarget.lerp(dest, 0.08);

      // Smooth camera position follow maintaining offset
      const dist = camera.position.distanceTo(curTarget);
      if (dist > 35) {
        camera.position.lerp(
          new THREE.Vector3(dest.x + 12, dest.y + 8, dest.z + 18),
          0.05
        );
      }

      ctrl.update();

      if (curTarget.distanceTo(dest) < 0.2) {
        targetPos.current = null;
      }
    }
  });

  return null;
}

// ─── Master Canvas Export ───────────────────────────────────────────────────

export default function StarMapCanvas({
  nodes,
  selectedPlanet,
  onSelectPlanet,
  hoveredPlanet,
  onHoverPlanet,
  focusTarget,
}: StarMapCanvasProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);

  return (
    <div className="w-full h-full relative bg-[#01030b] overflow-hidden select-none">
      <Canvas
        camera={{ position: [0, 45, 95], fov: 50, near: 0.1, far: 2000 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 1.5]}
        onPointerMissed={() => onHoverPlanet(null)}
      >
        <color attach="background" args={["#01030b"]} />

        {/* Ambient Space Lighting */}
        <ambientLight intensity={0.4} />
        <pointLight position={[0, 0, 0]} intensity={2.5} color="#fef08a" distance={150} />
        <directionalLight position={[50, 80, 50]} intensity={0.8} color="#93c5fd" />
        <directionalLight position={[-50, -40, -50]} intensity={0.3} color="#818cf8" />

        {/* Distance Grids & Origin */}
        <DistanceGrids />

        {/* Planet Nodes */}
        {nodes.map((node) => (
          <PlanetNode
            key={node.planet.pl_name}
            node={node}
            isSelected={selectedPlanet?.pl_name === node.planet.pl_name}
            isHovered={hoveredPlanet?.pl_name === node.planet.pl_name}
            onSelect={onSelectPlanet}
            onHover={onHoverPlanet}
          />
        ))}

        {/* Camera Fly Controller */}
        <CameraFlyController
          focusTarget={focusTarget}
          controlsRef={controlsRef}
        />

        {/* Interactive Orbit Controls */}
        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.06}
          rotateSpeed={0.65}
          zoomSpeed={1.1}
          panSpeed={0.7}
          minDistance={6}
          maxDistance={350}
          maxPolarAngle={Math.PI / 1.05}
        />
      </Canvas>
    </div>
  );
}
