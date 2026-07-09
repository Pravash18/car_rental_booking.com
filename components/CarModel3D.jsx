import React, { useMemo, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, useGLTF, Center } from '@react-three/drei';

// ─── CarModel: Manual scale, position, and rotation control ─────────────────
function CarModel(props) {
  const { scene, materials } = useGLTF(props.modelUrl || '/models/lamborghini.glb');
  const model = useMemo(() => scene.clone(), [scene]);

  // Apply body color + finish (matte for Bugatti, glossy for Lambo)
  useEffect(() => {
    if (!model) return;

    const isBugatti = (props.modelName || '').includes('Bugatti');

    // Detect explicit body meshes first
    let hasExplicitBody = false;
    model.traverse((child) => {
      if (child.isMesh && child.material) {
        const name = (child.name || '').toLowerCase();
        const matName = (child.material.name || '').toLowerCase();
        const isBody = (n) =>
          n.includes('body') || n.includes('paint') || n.includes('exterior') ||
          n.includes('car_paint') || n.includes('shell') || n.includes('car_body');
        if (isBody(name) || isBody(matName)) hasExplicitBody = true;
      }
    });

    model.traverse((child) => {
      if (!child.isMesh || !child.material) return;

      child.castShadow = true;
      child.receiveShadow = true;

      const name = (child.name || '').toLowerCase();
      const matName = (child.material.name || '').toLowerCase();

      let shouldColor = false;
      if (hasExplicitBody) {
        const isBody = (n) =>
          n.includes('body') || n.includes('paint') || n.includes('exterior') ||
          n.includes('car_paint') || n.includes('shell') || n.includes('car_body') ||
          n.includes('metallic');
        shouldColor = isBody(name) || isBody(matName);
      } else {
        const blackList = [
          'glass', 'window', 'windshield', 'tire', 'wheel', 'rim', 'rubber',
          'interior', 'seat', 'dashboard', 'steering', 'leather', 'light',
          'lens', 'reflector', 'spoke', 'chrome', 'brake', 'caliper', 'logo',
          'emblem', 'mirror_glass', 'exhaust', 'grid', 'grille', 'carbon', 'shadow'
        ];
        const blocked = (n) => blackList.some((t) => n.includes(t));
        shouldColor = !blocked(name) && !blocked(matName);
      }

      if (shouldColor) {
        if (isBugatti && materials && materials[child.material.name]) {
          // Apply the native material with textures from the Bugatti GLB
          child.material = materials[child.material.name];
        } else {
          child.material = child.material.clone();
          child.material.color.set(props.currentColor || '#ff5500');

          if (isBugatti) {
            child.material.roughness = 0.9;
            child.material.metalness = 0.1;
            if (child.material.clearcoat !== undefined) child.material.clearcoat = 0;
          } else {
            child.material.roughness = 0.05;
            child.material.metalness = 0.9;
            if (child.material.clearcoat !== undefined) child.material.clearcoat = 1.0;
          }
          child.material.needsUpdate = true;
        }
      }
    });
  }, [model, props.currentColor, props.modelName]);

  return (
    <Center>
      <primitive 
        object={model} 
        scale={props.modelScale} 
        position={props.modelPosition}
        rotation={props.modelRotation} 
      />
    </Center>
  );
}

// ─── Error Boundary ───
class GLTFErrorBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch() {}
  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

// ─── Main 3D Viewer Entry Point ─────────────────────────────────────────────
export default function CarModel3D({
  height = '100%',
  carColor = '#ff5500',
  rotationY = 0,
  modelUrl = '/models/lamborghini.glb',
  modelScale = 1,
  modelPosition = [0, 0, 0],
  modelRotation = [0, 0, 0],
  modelName = 'Lamborghini Huracan',
}) {
  return (
    <div style={{ width: '100%', height }} className="relative bg-transparent">
      <Canvas shadows dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
        <PerspectiveCamera makeDefault position={[0, 0, 7]} fov={45} />

        <ambientLight intensity={1} />
        <directionalLight position={[10, 10, 5]} intensity={2} />

        <Suspense fallback={null}>
          <Environment preset="city" />

          <GLTFErrorBoundary>
            <CarModel
              currentColor={carColor}
              modelUrl={modelUrl}
              modelScale={modelScale}
              modelPosition={modelPosition}
              modelRotation={modelRotation}
              modelName={modelName}
            />
          </GLTFErrorBoundary>
        </Suspense>

        <OrbitControls enableZoom={false} enablePan={false} autoRotate={false} />
      </Canvas>
    </div>
  );
}

// Pre-cache both models
useGLTF.preload('/models/lamborghini.glb');
