import { SceneBoundary } from './SceneBoundary';
import { useEffect, useMemo, useRef, useState, type PointerEvent, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, PMREMGenerator, Quaternion, Vector3, type Group } from 'three';
import { DRAG_RADIANS_PER_PIXEL, rotateInView } from '../scene/motion';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { loadPreview, type PreviewAsset } from '../scene/menu-preview-asset';
import { FoodInkEffect } from '../scene/FoodInkEffect';

type PreviewVariant = 'thumbnail' | 'hero' | 'detail';
const RETURN_DELAY_MS = 150;
const RETURN_DURATION_MS = 650;

function ContextLossListener({ onError }: { onError: () => void }) {
  const gl = useThree(state => state.gl);
  useEffect(() => {
    const canvas = gl.domElement;
    canvas.addEventListener('webglcontextlost', onError);
    // Remove before R3F deliberately loses the context during Canvas disposal.
    return () => canvas.removeEventListener('webglcontextlost', onError);
  }, [gl, onError]);
  return null;
}

/** Local studio reflections give aluminium lids a highlight without a network HDR. */
function PackagingStudio() {
  const { gl, scene, invalidate } = useThree();
  useEffect(() => {
    const room = new RoomEnvironment();
    const generator = new PMREMGenerator(gl);
    const environment = generator.fromScene(room, 0.04);
    room.dispose();
    generator.dispose();
    const previous = scene.environment;
    const previousIntensity = scene.environmentIntensity;
    scene.environment = environment.texture;
    scene.environmentIntensity = 0.8;
    invalidate();
    return () => {
      scene.environment = previous;
      scene.environmentIntensity = previousIntensity;
      environment.dispose();
    };
  }, [gl, scene, invalidate]);
  return <>
    <ambientLight intensity={0.45} />
    <directionalLight position={[-3, 5, 4]} intensity={2.4} color="#fff8ed" />
    <directionalLight position={[3, 2, -3]} intensity={1.4} color="#ffffff" />
  </>;
}

interface PreviewPose {
  orientation: Quaternion;
  view: Quaternion;
  home: Quaternion;
  homeYaw: number;
  pitch: number;
  yaw: number;
  returning: { from: Quaternion; pitch: number; yaw: number; start: number } | null;
}

function PreviewModel({ asset, pose, container, redraw, foodId, variant, standalone, onReady }: { asset: PreviewAsset; pose: PreviewPose; container: RefObject<HTMLDivElement | null>; redraw: RefObject<() => void>; foodId: string; variant: PreviewVariant; standalone: boolean; onReady: () => void }) {
  const scene = useMemo(() => asset.scene.clone(true), [asset]);
  const model = useRef<Group>(null);
  const { camera, size, invalidate } = useThree();
  useEffect(() => {
    redraw.current = invalidate;
    return () => { redraw.current = () => {}; };
  }, [redraw, invalidate]);
  useEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return;
    const aspect = size.width / Math.max(1, size.height);
    const halfFov = camera.fov * Math.PI / 360;
    // Fit a sphere around the normalized bounds, so rotation cannot crop the food.
    const radius = standalone ? asset.radius * 1.18 : variant === 'thumbnail' ? 1.9 : asset.radius * 1.06;
    const distance = radius / Math.sin(Math.min(halfFov, Math.atan(Math.tan(halfFov) * aspect)));
    camera.position.set(0, distance * (standalone ? 0.12 : 0.24), distance);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    pose.view.copy(camera.quaternion);
    invalidate();
    onReady();
  }, [camera, size.width, size.height, invalidate, onReady, asset.radius, variant, standalone, pose]);
  useFrame(() => {
    const returning = pose.returning;
    if (returning) {
      const progress = Math.min(1, (performance.now() - returning.start) / RETURN_DURATION_MS);
      const eased = 1 - (1 - progress) ** 3;
      pose.orientation.slerpQuaternions(returning.from, pose.home, eased);
      pose.pitch = returning.pitch * (1 - eased);
      pose.yaw = returning.yaw + (pose.homeYaw - returning.yaw) * eased;
      if (progress >= 1) pose.returning = null;
      else invalidate();
    }
    model.current?.quaternion.copy(pose.orientation);
    if (container.current) {
      container.current.dataset.rotation = pose.yaw.toFixed(4);
      container.current.dataset.pitch = pose.pitch.toFixed(4);
    }
  });
  return <group ref={model} quaternion={pose.orientation} scale={foodId === 'crispy-chicken' && variant === 'thumbnail' ? 1.25 : 1} dispose={null}>
    <group scale={asset.scale}><primitive object={scene} position={[-asset.center.x, -asset.center.y, -asset.center.z]} dispose={null} /></group>
  </group>;
}

export interface HoloLight { x: number; y: number; strength: number }

interface MenuModelPreviewProps {
  foodId: string;
  name: string;
  onClose: () => void;
  showClose?: boolean;
  variant?: PreviewVariant;
  onActivate?: () => void;
  previewModelUrl?: string;
  holo?: HoloLight;
  reducedMotion?: boolean;
}

export default function MenuModelPreview({ foodId, name, onClose, showClose = true, variant = 'thumbnail', onActivate, previewModelUrl, holo, reducedMotion = false }: MenuModelPreviewProps) {
  const container = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const redraw = useRef<() => void>(() => {});
  const returnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moved = useRef(false);
  const [asset, setAsset] = useState<PreviewAsset | null>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const standalone = Boolean(previewModelUrl);
  const [inView, setInView] = useState(!standalone);
  const [pageVisible, setPageVisible] = useState(() => typeof document === 'undefined' || !document.hidden);
  // Lay the drumstick's long axis flat across the view (bone→meat axis in the
  // X-Z ground plane at 0.8:0.6), so the thumbnail shows its full side profile.
  const [pose] = useState<PreviewPose>(() => {
    const homeYaw = foodId === 'mango-cheesecake' ? Math.PI / 3 : foodId === 'crispy-chicken' ? Math.atan2(0.6, 0.8) : 0;
    const home = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), homeYaw);
    return { orientation: home.clone(), home, homeYaw, view: new Quaternion(), pitch: 0, yaw: homeYaw, returning: null };
  });
  const active = inView && pageVisible;
  const shouldLoad = !standalone || active;
  const markReady = useMemo(() => () => setReady(true), []);
  const markFailed = useMemo(() => () => { setFailed(true); setReady(false); }, []);

  useEffect(() => {
    if (!shouldLoad) return;
    let cancelled = false;
    void loadPreview(foodId, previewModelUrl).then(value => {
      if (cancelled) return;
      setFailed(false);
      setAsset(value);
    }, () => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [foodId, previewModelUrl, shouldLoad]);
  useEffect(() => {
    const element = container.current;
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
      setInView(entries[0]?.isIntersecting ?? false);
    });
    if (element && observer) observer.observe(element);
    if (!observer) setInView(true);
    const visibility = () => setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', visibility);
    return () => { observer?.disconnect(); document.removeEventListener('visibilitychange', visibility); };
  }, []);
  function cancelReturn() {
    if (returnTimer.current !== null) clearTimeout(returnTimer.current);
    returnTimer.current = null;
    pose.returning = null;
  }
  function scheduleReturn() {
    cancelReturn();
    if (reducedMotion || !active || !ready || pose.orientation.angleTo(pose.home) < 0.001) return;
    returnTimer.current = setTimeout(() => {
      returnTimer.current = null;
      if (drag.current) return;
      pose.returning = { from: pose.orientation.clone(), pitch: pose.pitch, yaw: pose.yaw, start: performance.now() };
      redraw.current();
    }, RETURN_DELAY_MS);
  }
  useEffect(() => {
    if (!active) { setReady(false); drag.current = null; cancelReturn(); }
    else scheduleReturn();
    return cancelReturn;
  }, [active, ready, reducedMotion, variant, pose]);

  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    const button = (event.target as HTMLElement).closest('button');
    if ((button && event.currentTarget.contains(button)) || event.button !== 0 || !event.isPrimary) return;
    moved.current = false;
    cancelReturn();
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x;
    if (Math.hypot(dx, event.clientY - start.y) > 5) moved.current = true;
    if (moved.current) {
      const gain = DRAG_RADIANS_PER_PIXEL * 2;
      const pitch = (event.clientY - start.y) * gain;
      const yaw = dx * gain;
      rotateInView(pose.orientation, pose.view, pitch, yaw);
      pose.pitch += pitch; pose.yaw += yaw;
      start.x = event.clientX; start.y = event.clientY;
      redraw.current();
    }
  };
  const stopDrag = () => { if (!drag.current) return; drag.current = null; scheduleReturn(); };
  return <div ref={container} className={`ordering-model-preview ordering-model-preview--${variant}${ready && active && !failed ? ' is-ready' : ''}`} data-testid="menu-model-preview" data-ready={ready && active && !failed} data-rotation={pose.yaw.toFixed(4)} data-pitch={pose.pitch.toFixed(4)} aria-label={`${name}3D预览`} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={stopDrag} onPointerCancel={() => { moved.current = true; stopDrag(); }} onLostPointerCapture={stopDrag} onClick={event => { event.stopPropagation(); if (!moved.current) onActivate?.(); }}>
    {active && asset && !failed && <SceneBoundary fallback={null} onError={markFailed}>
      <Canvas frameloop="demand" dpr={[1, 2]} camera={{ fov: 38, near: 0.1, far: 100 }} gl={{ antialias: false, alpha: true, powerPreference: 'low-power' }} fallback={<span className="ordering-preview-status" role="status">加载失败</span>}>
        <ContextLossListener onError={markFailed} />
        {standalone ? <PackagingStudio /> : <>
          <ambientLight intensity={0.65} />
          <hemisphereLight args={['#fff6e8', '#665344', 0.55]} />
          <directionalLight
            color={holo ? '#fff8ee' : '#fff0da'}
            position={holo ? [(holo.x - 0.5) * 10, 2 + (1 - holo.y) * 4, 4] : [-3, 5, 4]}
            intensity={holo ? 2.6 + holo.strength * 0.8 : 3}
          />
          <directionalLight color="#fff5e7" position={[3, 2, -3]} intensity={1.6} />
        </>}
        <PreviewModel asset={asset} pose={pose} container={container} redraw={redraw} foodId={foodId} variant={variant} standalone={standalone} onReady={markReady} />
        <FoodInkEffect preview={variant === 'thumbnail'} />
      </Canvas>
    </SceneBoundary>}
    {(!ready || failed) && <span className="ordering-preview-status" role="status">{failed ? '加载失败' : active ? '加载中…' : '预览已暂停'}</span>}
    {showClose && <button className="ordering-preview-close" aria-label="关闭3D预览" onClick={event => { event.stopPropagation(); onClose(); }}>×</button>}
  </div>;
}
