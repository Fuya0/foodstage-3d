import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Group, Raycaster, Vector2, type OrthographicCamera } from 'three';
import type { SequenceState, SequenceEvent } from '../core/sequence';
import type { ModelAsset } from './assets';
import { stepMotion, type Motion } from './motion';
import { manifest } from '../data/manifest';

export type HitTest = (x: number, y: number) => boolean;
interface Props {
  asset: ModelAsset; base: ModelAsset; state: SequenceState; motion: Motion;
  reduced: boolean; dispatch: (event: SequenceEvent) => void;
  setHit: (hit: HitTest | null, owner?: HitTest) => void;
  onContextLost: () => void;
}
function Food({ asset, base, state, motion, reduced, dispatch, setHit }: Props) {
  const rotation = useRef<Group>(null), shake = useRef<Group>(null), exit = useRef<Group>(null);
  const { camera, size, gl } = useThree();
  const scene = useMemo(() => asset.scene.clone(true), [asset]);
  const timeline = useRef({ key: '', elapsed: 0, done: false });
  const hitRef = useRef<HitTest | null>(null);
  useEffect(() => {
    const cam = camera as OrthographicCamera;
    cam.zoom = Math.min(size.width / (base.size.x * 1.63), size.height / (base.size.y * 1.8));
    cam.lookAt(0, 0, 0); cam.updateProjectionMatrix();
  }, [camera, size, base]);
  useEffect(() => {
    const ray = new Raycaster(), point = new Vector2();
    const hitTest: HitTest = (x, y) => {
      const rect = gl.domElement.getBoundingClientRect();
      point.set((x - rect.left) / rect.width * 2 - 1, -(y - rect.top) / rect.height * 2 + 1);
      ray.setFromCamera(point, camera);
      return !!rotation.current && ray.intersectObject(rotation.current, true).length > 0;
    };
    hitRef.current = hitTest;
    setHit(hitTest);
    return () => {
      if (hitRef.current === hitTest) hitRef.current = null;
    };
  }, [camera, gl, setHit]);
  useFrame((_, dt) => {
    stepMotion(motion, dt);
    if (!rotation.current || !shake.current || !exit.current) return;
    rotation.current.rotation.set(motion.x, motion.y, 0);
    const amplitude = reduced ? 0 : motion.shake;
    shake.current.position.x = Math.sin(motion.age * 100) * amplitude * 0.003;
    shake.current.rotation.z = Math.sin(motion.age * 85) * amplitude * 0.035;
    const key = `${state.run}/${state.transition}/${state.phase}`;
    if (timeline.current.key !== key) timeline.current = { key, elapsed: 0, done: false };
    const time = timeline.current;
    time.elapsed += dt;
    const duration = reduced ? 0.06 : state.phase === 'final' ? 0.4 : 0.5;
    const progress = Math.min(1, time.elapsed / duration);
    exit.current.position.y = state.phase === 'eating' ? -progress * 0.1 : 0;
    // Composite the canvas instead of changing any original material.
    gl.domElement.style.opacity = state.phase === 'eating' ? String(1 - progress) : state.phase === 'finished' ? '0' : '1';
    const scale = state.phase === 'final' ? 1 - Math.sin(progress * Math.PI) * (reduced ? 0 : 0.06) : 1;
    exit.current.scale.setScalar(scale);
    if ((state.phase === 'final' || state.phase === 'eating') && progress === 1 && !time.done) {
      time.done = true;
      dispatch({ type: state.phase === 'final' ? 'FINAL_DONE' : 'EATING_DONE', run: state.run, transition: state.transition });
    }
  });
  const calibration = manifest[state.stage]!.calibration;
  // One stage-zero scale; each original model rests on the same baseline.
  const offsetY = -asset.center.y + asset.size.y / 2 - base.size.y / 2;
  return <group ref={rotation}><group ref={shake}><group ref={exit}>
    <group scale={calibration.scale} rotation-y={calibration.yaw} position={[...calibration.position]}>
      <primitive object={scene} position={[-asset.center.x, offsetY, -asset.center.z]} dispose={null} />
    </group>
  </group></group></group>;
}
export function Scene(props: Props) {
  return <Canvas onCreated={({ gl }) => { gl.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); props.onContextLost(); }, { once: true }); }} orthographic camera={{ position: [0, 0.12, 0.34], near: 0.01, far: 10 }} dpr={[1, 1.5]} gl={{ alpha: true, antialias: true }} fallback={<span>无法启动三维画面，请使用支持 WebGL 的浏览器。</span>}>
    <ambientLight intensity={1.4} />
    <hemisphereLight args={['#ffffff', '#b3a594', 1.8]} />
    <directionalLight position={[1, 2, 3]} intensity={2.4} />
    <directionalLight position={[-2, 1, -1]} intensity={0.7} />
    <Food {...props} />
  </Canvas>;
}
