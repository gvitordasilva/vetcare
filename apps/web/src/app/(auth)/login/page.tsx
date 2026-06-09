'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import {
  Eye, EyeOff, PawPrint, Loader2, Building2,
  CheckCircle2, XCircle, AlertCircle,
} from 'lucide-react'
import { authApi, api } from '@/lib/api'
import { setAuth } from '@/lib/auth'

/* ── Zod schema + types ───────────────────────────────────────────── */
const schema = z.object({
  slug:     z.string().min(1, 'Informe o identificador da clínica'),
  email:    z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
})
type FormData    = z.infer<typeof schema>
type SlugStatus  = 'idle' | 'checking' | 'found' | 'not-found' | 'suspended'

/* ─────────────────────────────────────────────────────────────────── */
/*  SVG silhuetas de animais (inline, zero dependência externa)        */
/* ─────────────────────────────────────────────────────────────────── */

const DogSVG = () => (
  <svg viewBox="0 0 120 65" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    {/* Corpo */}
    <ellipse cx="52" cy="36" rx="30" ry="15" />
    {/* Pescoço */}
    <path d="M72 27 Q82 20 86 26 Q82 32 74 34 Q72 38 70 36Z" />
    {/* Cabeça */}
    <ellipse cx="94" cy="21" rx="14" ry="12" />
    {/* Orelha caindo para trás */}
    <path d="M85 13 Q74 8 72 16 Q77 14 83 17Z" />
    {/* Focinho */}
    <ellipse cx="106" cy="24" rx="7" ry="5" />
    {/* Nariz */}
    <ellipse cx="112" cy="22" rx="3" ry="2.2" />
    {/* Olho */}
    <circle cx="96" cy="17" r="2.5" fill="rgba(0,0,0,0.35)" />
    {/* Rabo erguido */}
    <path d="M22 30 Q10 20 13 8 Q15 3 19 5 Q16 9 19 16 Q22 24 24 32Z" />
    {/* Pata dianteira esticada à frente */}
    <path d="M76 48 Q80 56 78 64 L73 64 Q74 56 71 48Z" />
    {/* Pata dianteira de trás */}
    <path d="M63 50 Q60 58 58 64 L54 64 Q56 58 58 50Z" />
    {/* Pata traseira esticada para trás */}
    <path d="M34 48 Q30 56 28 64 L24 64 Q26 56 30 48Z" />
    {/* Pata traseira avançando */}
    <path d="M45 49 Q46 57 48 64 L44 64 Q42 57 42 49Z" />
  </svg>
)

const CatSVG = () => (
  <svg viewBox="0 0 105 62" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    {/* Corpo esbelto */}
    <ellipse cx="44" cy="32" rx="26" ry="13" />
    {/* Cabeça */}
    <circle cx="77" cy="18" r="12" />
    {/* Orelhas pontudas */}
    <polygon points="68,11 64,2 73,9" />
    <polygon points="79,9 82,0 87,8" />
    {/* Cauda longa curvando para cima */}
    <path d="M18 29 Q5 20 4 9 Q4 3 9 3 Q7 7 9 14 Q13 22 20 30Z" />
    {/* Olho */}
    <ellipse cx="81" cy="16" rx="3" ry="3.5" fill="rgba(0,0,0,0.4)" />
    {/* Focinho triangular */}
    <polygon points="86,21 84,23 88,23" />
    {/* Bigodes */}
    <line x1="88" y1="21" x2="100" y2="19" stroke="currentColor" strokeWidth="1.2" />
    <line x1="88" y1="23" x2="100" y2="25" stroke="currentColor" strokeWidth="1.2" />
    {/* Patas */}
    <path d="M68 42 Q70 50 68 58 L64 58 Q65 50 62 42Z" />
    <path d="M57 42 Q55 50 53 58 L49 58 Q51 50 53 42Z" />
    <path d="M30 42 Q26 50 24 58 L20 58 Q22 50 26 42Z" />
    <path d="M40 42 Q40 50 42 58 L38 58 Q36 50 36 42Z" />
  </svg>
)

const BirdSVG = () => (
  <svg viewBox="0 0 110 55" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    {/* Corpo */}
    <ellipse cx="54" cy="30" rx="14" ry="9" />
    {/* Asa esquerda — batendo para baixo */}
    <path d="M52 26 Q38 10 18 16 Q30 18 46 26Z" />
    {/* Asa direita — batendo para baixo */}
    <path d="M56 26 Q70 10 90 16 Q78 18 62 26Z" />
    {/* Cabeça */}
    <circle cx="70" cy="24" r="8" />
    {/* Bico */}
    <path d="M77 24 L88 21 L77 27Z" />
    {/* Olho */}
    <circle cx="72" cy="21" r="1.8" fill="rgba(0,0,0,0.4)" />
    {/* Cauda */}
    <path d="M40 30 Q28 28 20 34 L22 38 Q30 32 38 33Z" />
    <path d="M40 32 Q28 36 22 42 L26 44 Q32 38 40 35Z" />
  </svg>
)

const RabbitSVG = () => (
  <svg viewBox="0 0 95 70" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    {/* Corpo esticado na corrida */}
    <ellipse cx="42" cy="40" rx="24" ry="15" />
    {/* Cabeça */}
    <circle cx="70" cy="28" r="13" />
    {/* Orelhas longas inclinadas para trás na corrida */}
    <ellipse cx="60" cy="11" rx="5.5" ry="14" transform="rotate(22 60 11)" />
    <ellipse cx="70" cy="9" rx="5.5" ry="14" transform="rotate(32 70 9)" />
    {/* Olho */}
    <circle cx="76" cy="24" r="2.8" fill="rgba(0,0,0,0.4)" />
    {/* Narizinho */}
    <ellipse cx="81" cy="30" rx="3" ry="2" />
    {/* Rabo fofo */}
    <circle cx="18" cy="40" r="9" />
    {/* Patas traseiras potentes */}
    <path d="M28 52 Q20 60 16 68 L12 68 Q14 60 22 52Z" />
    <path d="M38 54 Q36 62 38 68 L34 68 Q32 62 34 54Z" />
    {/* Patas dianteiras */}
    <path d="M56 48 Q58 56 56 62 L52 62 Q53 56 51 48Z" />
    <path d="M64 46 Q66 54 68 60 L64 60 Q62 54 60 46Z" />
  </svg>
)

const ANIMAL_COMPONENTS: Record<string, React.FC> = {
  dog:    DogSVG,
  cat:    CatSVG,
  bird:   BirdSVG,
  rabbit: RabbitSVG,
}

/* ── Configuração dos animais na cena ────────────────────────────── */
const ANIMALS = [
  // y = % do topo, duration = segundos para cruzar a tela, depth = fator de parallax
  { type: 'dog',    y: 73, duration: 14, delay: 0,  scale: 1.05, opacity: 0.10, depth: 1.2, dir: 1  },
  { type: 'cat',    y: 67, duration: 18, delay: 4,  scale: 0.85, opacity: 0.07, depth: 0.9, dir: 1  },
  { type: 'bird',   y: 20, duration: 9,  delay: 1,  scale: 0.75, opacity: 0.06, depth: 0.5, dir: 1  },
  { type: 'rabbit', y: 79, duration: 11, delay: 6,  scale: 0.90, opacity: 0.08, depth: 1.0, dir: 1  },
  { type: 'dog',    y: 83, duration: 21, delay: 9,  scale: 0.75, opacity: 0.05, depth: 0.7, dir: 1  },
  { type: 'bird',   y: 33, duration: 7,  delay: 3,  scale: 0.65, opacity: 0.05, depth: 0.4, dir: 1  },
  { type: 'cat',    y: 57, duration: 25, delay: 12, scale: 0.65, opacity: 0.04, depth: 0.6, dir: 1  },
  { type: 'dog',    y: 87, duration: 15, delay: 10, scale: 1.15, opacity: 0.11, depth: 1.4, dir: 1  },
  { type: 'rabbit', y: 62, duration: 15, delay: 7,  scale: 0.70, opacity: 0.05, depth: 0.7, dir: 1  },
  { type: 'bird',   y: 13, duration: 12, delay: 2,  scale: 0.80, opacity: 0.04, depth: 0.3, dir: 1  },
  // Esquerda para direita (virados, para variar)
  { type: 'cat',    y: 71, duration: 20, delay: 14, scale: 0.80, opacity: 0.06, depth: 0.8, dir: -1 },
  { type: 'dog',    y: 89, duration: 17, delay: 16, scale: 0.90, opacity: 0.07, depth: 1.0, dir: -1 },
  { type: 'rabbit', y: 76, duration: 13, delay: 18, scale: 0.75, opacity: 0.06, depth: 0.9, dir: -1 },
]

/* ── Componente de animais correndo ──────────────────────────────── */
function RunningAnimals({ mouseY }: { mouseY: number }) {
  return (
    <>
      <style>{`
        @keyframes runLTR {
          from { transform: translateX(-220px); }
          to   { transform: translateX(calc(100vw + 220px)); }
        }
        @keyframes runRTL {
          from { transform: translateX(calc(100vw + 220px)); }
          to   { transform: translateX(-220px); }
        }
      `}</style>

      {ANIMALS.map((a, i) => {
        const Animal = ANIMAL_COMPONENTS[a.type]
        const size   = a.type === 'bird' ? 80 : a.type === 'rabbit' ? 68 : 90
        const parallaxOffset = mouseY * a.depth * 14   // px de deslocamento vertical

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: `calc(${a.y}% + ${parallaxOffset}px)`,
              left: 0,
              right: 0,
              pointerEvents: 'none',
              transition: 'top 0.1s linear',
            }}
          >
            <div
              style={{
                display: 'inline-block',
                animation: `${a.dir === 1 ? 'runLTR' : 'runRTL'} ${a.duration}s linear ${a.delay}s infinite`,
                transform: a.dir === -1 ? 'scaleX(-1)' : undefined,
                width: size * a.scale,
                color: 'rgba(22, 163, 74, 1)',
                opacity: a.opacity,
              }}
            >
              <Animal />
            </div>
          </div>
        )
      })}

      {/* Linha de "grama" sutil no rodapé — onde os animais correm */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '35%',
          background: 'linear-gradient(to top, rgba(22,163,74,0.04) 0%, transparent 100%)',
          pointerEvents: 'none',
        }}
      />
    </>
  )
}

/* ─────────────────────────────────────────────────────────────────── */
/*  Página de login                                                    */
/* ─────────────────────────────────────────────────────────────────── */
export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError]               = useState('')
  const [slugStatus, setSlugStatus]     = useState<SlugStatus>('idle')
  const [clinicName, setClinicName]     = useState('')
  const [mouseY, setMouseY]             = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const slugValue = watch('slug', '')

  /* Parallax suave ao mover o mouse */
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      setMouseY((e.clientY / window.innerHeight - 0.5) * 2) // -1 a +1
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  /* Verifica o slug com debounce de 600ms */
  useEffect(() => {
    const slug = slugValue?.trim()
    if (!slug || slug.length < 2) {
      setSlugStatus('idle')
      setClinicName('')
      return
    }
    setSlugStatus('checking')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get('/auth/clinic-check', { params: { slug } })
        if (data.found && data.active) {
          setSlugStatus('found')
          setClinicName(data.name)
        } else if (data.found && !data.active) {
          setSlugStatus('suspended')
          setClinicName('')
        } else {
          setSlugStatus('not-found')
          setClinicName('')
        }
      } catch {
        setSlugStatus('not-found')
        setClinicName('')
      }
    }, 600)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [slugValue])

  async function onSubmit(data: FormData) {
    setError('')
    try {
      const result = await authApi.login(data.slug, data.email, data.password)
      setAuth(result)
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao fazer login')
    }
  }

  /* Indicador de slug */
  const SlugIndicator = () => {
    if (slugStatus === 'checking')  return <Loader2        className="w-4 h-4 animate-spin" style={{ color: 'rgba(255,255,255,0.4)' }} />
    if (slugStatus === 'found')     return <CheckCircle2   className="w-4 h-4 text-green-400" />
    if (slugStatus === 'not-found') return <XCircle        className="w-4 h-4 text-red-400"   />
    if (slugStatus === 'suspended') return <AlertCircle    className="w-4 h-4 text-orange-400" />
    return null
  }

  const slugHint = () => {
    if (slugStatus === 'found')     return { text: `✓ ${clinicName}`, color: 'rgba(74,222,128,0.9)' }
    if (slugStatus === 'not-found') return { text: 'Clínica não encontrada', color: 'rgba(248,113,113,0.9)' }
    if (slugStatus === 'suspended') return { text: 'Clínica suspensa — contate o suporte', color: 'rgba(251,146,60,0.9)' }
    if (errors.slug)                return { text: errors.slug.message!, color: 'rgba(248,113,113,0.9)' }
    return { text: 'Fornecido no cadastro da clínica (ex: clinica-abc)', color: 'rgba(255,255,255,0.3)' }
  }

  const hint = slugHint()

  /* Borda dinâmica do slug input */
  const slugBorderColor =
    slugStatus === 'found'     ? 'rgba(74,222,128,0.45)'  :
    slugStatus === 'not-found' ? 'rgba(248,113,113,0.45)' :
    slugStatus === 'suspended' ? 'rgba(251,146,60,0.45)'  :
    'rgba(255,255,255,0.14)'

  /* Estilo base para todos os inputs */
  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: 14,
    padding: '11px 16px',
    fontSize: 14,
    color: 'white',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  }

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: '#020a05' }}>

      {/* ── Keyframes globais ─────────────────────────────────────── */}
      <style>{`
        @keyframes loginAurora1 {
          0%,100% { transform: translate(0,0) scale(1); }
          25%      { transform: translate(80px,-60px) scale(1.1); }
          50%      { transform: translate(-40px,80px) scale(0.95); }
          75%      { transform: translate(60px,40px) scale(1.05); }
        }
        @keyframes loginAurora2 {
          0%,100% { transform: translate(0,0) scale(1); }
          30%      { transform: translate(-90px,50px) scale(1.08); }
          60%      { transform: translate(60px,-70px) scale(0.92); }
        }
        @keyframes loginAurora3 {
          0%,100% { transform: translate(0,0) scale(1); }
          40%      { transform: translate(70px,-40px) scale(1.12); }
          70%      { transform: translate(-50px,60px) scale(0.9); }
        }
        @keyframes cardFloat {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-7px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .login-input:focus {
          border-color: rgba(74,222,128,0.55) !important;
          box-shadow: 0 0 0 3px rgba(22,163,74,0.18) !important;
        }
        .login-input::placeholder { color: rgba(255,255,255,0.22); }
      `}</style>

      {/* ── Aurora blobs ─────────────────────────────────────────── */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', width: 900, height: 900, borderRadius: '50%',
          background: 'radial-gradient(circle, #16a34a 0%, #15803d 40%, transparent 70%)',
          opacity: 0.2, filter: 'blur(120px)',
          top: '-20%', left: '-10%',
          animation: 'loginAurora1 20s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', width: 700, height: 700, borderRadius: '50%',
          background: 'radial-gradient(circle, #0d9488 0%, #0f766e 40%, transparent 70%)',
          opacity: 0.15, filter: 'blur(100px)',
          top: '10%', right: '-5%',
          animation: 'loginAurora2 26s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, #4ade80 0%, #22c55e 40%, transparent 70%)',
          opacity: 0.12, filter: 'blur(80px)',
          bottom: '0%', left: '30%',
          animation: 'loginAurora3 16s ease-in-out infinite',
        }} />
        {/* Grid overlay */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.025,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />
      </div>

      {/* ── Animais correndo ─────────────────────────────────────── */}
      <RunningAnimals mouseY={mouseY} />

      {/* ── Card centralizado ─────────────────────────────────────── */}
      <div style={{
        position: 'relative', zIndex: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', padding: '24px',
      }}>
        <div style={{
          width: '100%', maxWidth: 420,
          background: 'rgba(5, 20, 9, 0.82)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 24,
          padding: '40px 36px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.05)',
          animation: 'fadeIn 0.6s cubic-bezier(0.22,1,0.36,1) forwards, cardFloat 7s ease-in-out 0.6s infinite',
        }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
            <div style={{
              width: 42, height: 42, background: '#16a34a', borderRadius: 13,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(22,163,74,0.4)',
            }}>
              <PawPrint className="w-5 h-5 text-white" />
            </div>
            <span style={{ color: 'white', fontWeight: 800, fontSize: 20, letterSpacing: '-0.3px' }}>
              VetCare
            </span>
          </div>

          {/* Heading */}
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ color: 'white', fontWeight: 900, fontSize: 26, margin: 0, letterSpacing: '-0.5px' }}>
              Bem-vindo de volta
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, marginTop: 6, margin: '6px 0 0' }}>
              Entre na sua clínica para continuar
            </p>
          </div>

          {/* ── Formulário ─────────────────────────────────────────── */}
          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Slug */}
            <div>
              <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 7 }}>
                Identificador da clínica
              </label>
              <div style={{ position: 'relative' }}>
                <Building2 style={{
                  position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                  width: 16, height: 16, color: 'rgba(255,255,255,0.3)', pointerEvents: 'none',
                }} />
                <input
                  {...register('slug')}
                  type="text"
                  placeholder="minha-clinica"
                  className="login-input"
                  autoComplete="organization"
                  autoCapitalize="none"
                  style={{ ...inputStyle, paddingLeft: 38, paddingRight: 38, borderColor: slugBorderColor }}
                />
                <div style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  pointerEvents: 'none', display: 'flex', alignItems: 'center',
                }}>
                  <SlugIndicator />
                </div>
              </div>
              <p style={{ fontSize: 12, marginTop: 6, color: hint.color }}>{hint.text}</p>
            </div>

            {/* Email */}
            <div>
              <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 7 }}>
                Email
              </label>
              <input
                {...register('email')}
                type="email"
                placeholder="email@clinica.com.br"
                className="login-input"
                autoComplete="email"
                style={inputStyle}
              />
              {errors.email && (
                <p style={{ color: 'rgba(248,113,113,0.9)', fontSize: 12, marginTop: 5 }}>{errors.email.message}</p>
              )}
            </div>

            {/* Senha */}
            <div>
              <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 7 }}>
                Senha
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="login-input"
                  autoComplete="current-password"
                  style={{ ...inputStyle, paddingRight: 42 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer',
                    transition: 'color 0.15s',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                  onMouseOut={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p style={{ color: 'rgba(248,113,113,0.9)', fontSize: 12, marginTop: 5 }}>{errors.password.message}</p>
              )}
            </div>

            {/* Erro de login */}
            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 12, padding: '10px 14px', color: 'rgba(252,165,165,0.95)', fontSize: 13,
              }}>
                {error}
              </div>
            )}

            {/* Botão Entrar */}
            <button
              type="submit"
              disabled={isSubmitting || slugStatus === 'not-found' || slugStatus === 'suspended'}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #16a34a 0%, #0d9488 100%)',
                color: 'white',
                border: 'none',
                borderRadius: 14,
                padding: '13px 0',
                fontSize: 14,
                fontWeight: 700,
                cursor: isSubmitting ? 'wait' : 'pointer',
                opacity: (isSubmitting || slugStatus === 'not-found' || slugStatus === 'suspended') ? 0.55 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginTop: 4,
                boxShadow: '0 4px 20px rgba(22,163,74,0.3)',
                transition: 'opacity 0.2s, transform 0.15s, box-shadow 0.2s',
              }}
              onMouseOver={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow = '0 8px 28px rgba(22,163,74,0.4)'
                }
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(22,163,74,0.3)'
              }}
            >
              {isSubmitting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Entrando...</>
                : '🐾 Entrar'}
            </button>
          </form>

          {/* Link cadastro */}
          <p style={{ textAlign: 'center', fontSize: 13, marginTop: 24, color: 'rgba(255,255,255,0.35)' }}>
            Sem conta?{' '}
            <Link href="/pricing" style={{ color: '#4ade80', fontWeight: 600, textDecoration: 'none' }}
              onMouseOver={(e) => (e.currentTarget.style.textDecoration = 'underline')}
              onMouseOut={(e) => (e.currentTarget.style.textDecoration = 'none')}>
              Ver planos e preços
            </Link>
          </p>

        </div>
      </div>
    </div>
  )
}
