/**
 * Mapa de modelos 3D por espécie do seletor do hero.
 *
 * Os arquivos vivem em /public/models/. Espécies cujo GLB ainda não foi
 * adicionado são detectadas em runtime (HEAD request) e o hero continua
 * mostrando o último animal disponível — basta soltar o .glb otimizado
 * na pasta e fazer deploy para a espécie ativar, sem mudar código.
 *
 * Pipeline de otimização (50MB → ~2MB): ver public/models/README.md
 */
export type AnimalConfig = {
  url: string
  /** Altura-alvo em unidades de cena (auto-fit pela bounding box) */
  targetHeight: number
  /** Y do "chão" — onde a sombra fica e os pés repousam */
  groundY: number
  /** Rotação Y inicial (radianos) — deixa o animal de 3/4 para a câmera */
  baseRotY: number
  /** Raio da sombra elíptica */
  shadowRadius: number
  /** Tocar a primeira animation clip embutida no GLB, se existir */
  playClip: boolean
}

export const ANIMAL_MODELS: Record<string, AnimalConfig> = {
  dog: {
    url: '/models/german-shepherd.glb',
    targetHeight: 1.35,
    groundY: -0.78,
    baseRotY: -0.5,
    shadowRadius: 0.72,
    playClip: true,
  },
  cat: {
    url: '/models/cat.glb',
    targetHeight: 1.0,
    groundY: -0.78,
    baseRotY: -0.45,
    shadowRadius: 0.55,
    playClip: true,
  },
  exotic: {
    url: '/models/parrot.glb',
    // Altura maior que o esperado: a bounding box inclui a envergadura
    // das asas em voo, então o corpo fica pequeno se normalizar baixo
    targetHeight: 1.45,
    groundY: -0.55,
    baseRotY: -0.35,
    shadowRadius: 0.5,
    playClip: true, // Parrot.glb (three.js) tem clip de voo
  },
  large: {
    url: '/models/horse.glb',
    targetHeight: 1.7,
    groundY: -0.82,
    baseRotY: -0.55,
    shadowRadius: 0.95,
    playClip: false, // estático (DinoReplicas)
  },
}
