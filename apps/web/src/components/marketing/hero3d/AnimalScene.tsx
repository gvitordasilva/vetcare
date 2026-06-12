'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations, Environment } from '@react-three/drei'
import * as THREE from 'three'
import { ANIMAL_MODELS, type AnimalConfig } from './animalConfig'

/** Estado de mouse compartilhado por ref — evita re-render por frame */
export type MouseRef = React.MutableRefObject<{ x: number }>

type AnimalModelProps = {
  speciesId: string
  config: AnimalConfig
  mode: 'in' | 'out'
  mouse: MouseRef
  reducedMotion: boolean
  onGone?: () => void
  onReady?: () => void
}

/* ── Modelo individual: auto-fit, float, mouse-follow, scale pop ───── */
function AnimalModel({ config, mode, mouse, reducedMotion, onGone, onReady }: AnimalModelProps) {
  const group = useRef<THREE.Group>(null)
  const inner = useRef<THREE.Group>(null)
  const { scene, animations } = useGLTF(config.url)
  const { actions, names } = useAnimations(animations, inner)
  const goneRef = useRef(false)

  /* Auto-fit: normaliza modelos de fontes diferentes para a mesma altura.
     Centraliza em X/Z e apoia a base no groundY. */
  const fit = useMemo(() => {
    scene.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(scene)
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    box.getSize(size)
    box.getCenter(center)
    const scale = size.y > 0 ? config.targetHeight / size.y : 1
    return {
      scale,
      offset: new THREE.Vector3(
        -center.x * scale,
        -box.min.y * scale + config.groundY,
        -center.z * scale,
      ),
    }
  }, [scene, config])

  /* Animation clip embutida (ex.: voo do papagaio) */
  useEffect(() => {
    if (!config.playClip || names.length === 0) return
    const action = actions[names[0]]
    action?.reset().fadeIn(0.3).play()
    return () => { action?.fadeOut(0.2) }
  }, [actions, names, config.playClip])

  useEffect(() => { onReady?.() }, [onReady])

  /* Float + mouse follow + transição de escala (pop in/out).
     Escala em vez de fade de opacity: materiais com alpha de pelo/pena
     produzem artefatos de sorting ao animar opacity. */
  useFrame(({ clock }, delta) => {
    const g = group.current
    if (!g) return

    // Transição de escala
    const target = mode === 'in' ? 1 : 0
    const speed = mode === 'in' ? 5.5 : 9
    const next = THREE.MathUtils.damp(g.scale.x, target, speed, delta)
    g.scale.setScalar(next)
    if (mode === 'out' && next < 0.02 && !goneRef.current) {
      goneRef.current = true
      onGone?.()
      return
    }

    if (reducedMotion) return

    // Float idle (amplitude 0.08, frequência 0.8)
    const t = clock.elapsedTime
    g.position.y = Math.sin(t * 0.8) * 0.08

    // Rotação segue o mouse com lerp suave
    const targetRot = config.baseRotY + mouse.current.x * 0.38
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, targetRot, 3.5, delta)
  })

  return (
    <group ref={group} rotation-y={config.baseRotY} scale={mode === 'in' ? 0.01 : 1}>
      <group ref={inner} position={[fit.offset.x, fit.offset.y, fit.offset.z]} scale={fit.scale}>
        <primitive object={scene} />
      </group>
    </group>
  )
}

/* ── Sombra elíptica que respira com o float ───────────────────────── */
function GroundShadow({ config, reducedMotion }: { config: AnimalConfig; reducedMotion: boolean }) {
  const mat = useRef<THREE.MeshBasicMaterial>(null)
  const mesh = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (reducedMotion || !mat.current || !mesh.current) return
    // Mesma fase do float: quanto mais alto o animal, menor/mais clara a sombra
    const lift = Math.sin(clock.elapsedTime * 0.8) * 0.08
    const k = 1 - lift * 2.2
    mesh.current.scale.set(k, k * 0.55, 1)
    mat.current.opacity = 0.16 * k
  })

  return (
    <mesh ref={mesh} rotation-x={-Math.PI / 2} position={[0, config.groundY + 0.005, 0]} scale={[1, 0.55, 1]}>
      <circleGeometry args={[config.shadowRadius, 32]} />
      <meshBasicMaterial ref={mat} color="#000000" transparent opacity={0.16} depthWrite={false} />
    </mesh>
  )
}

/* ── Cena completa ─────────────────────────────────────────────────── */
type AnimalSceneProps = {
  speciesId: string
  gpuTier: number
  frameloop: 'always' | 'never'
  mouse: MouseRef
  reducedMotion: boolean
  onReady?: () => void
}

export default function AnimalScene({ speciesId, gpuTier, frameloop, mouse, reducedMotion, onReady }: AnimalSceneProps) {
  /* Duas "vagas" para a transição: o atual entra enquanto o anterior sai */
  const [current, setCurrent] = useState(speciesId)
  const [leaving, setLeaving] = useState<string | null>(null)

  useEffect(() => {
    if (speciesId === current) return
    setLeaving(current)
    setCurrent(speciesId)
  }, [speciesId, current])

  const dpr = useMemo(
    () => (gpuTier <= 1 ? 1 : Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2)),
    [gpuTier],
  )

  const currentCfg = ANIMAL_MODELS[current]
  const leavingCfg = leaving ? ANIMAL_MODELS[leaving] : null

  return (
    <Canvas
      frameloop={frameloop}
      dpr={dpr}
      camera={{ fov: 45, position: [0, 0.45, 3.1] }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      style={{ background: 'transparent' }}
    >
      {/* Luzes conforme spec: ambiente 0.4 + key 1.2 + fill suave */}
      <ambientLight intensity={0.4} />
      <directionalLight intensity={1.2} position={[2, 4, 3]} />
      <directionalLight intensity={0.35} position={[-2, 1, -1]} />

      {/* Env map só em GPU tier 2+ (reflexos PBR) */}
      {gpuTier >= 2 && <Environment preset="city" />}

      {currentCfg && (
        <Suspense fallback={null}>
          <AnimalModel
            key={current}
            speciesId={current}
            config={currentCfg}
            mode="in"
            mouse={mouse}
            reducedMotion={reducedMotion}
            onReady={onReady}
          />
        </Suspense>
      )}

      {leaving && leavingCfg && (
        <Suspense fallback={null}>
          <AnimalModel
            key={`out-${leaving}`}
            speciesId={leaving}
            config={leavingCfg}
            mode="out"
            mouse={mouse}
            reducedMotion={reducedMotion}
            onGone={() => setLeaving(null)}
          />
        </Suspense>
      )}

      {currentCfg && <GroundShadow config={currentCfg} reducedMotion={reducedMotion} />}
    </Canvas>
  )
}
