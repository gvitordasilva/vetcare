'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Eye, EyeOff, PawPrint, Loader2, Building2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { authApi, api } from '@/lib/api'
import { setAuth } from '@/lib/auth'

const schema = z.object({
  slug:     z.string().min(1, 'Informe o identificador da clínica'),
  email:    z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
})
type FormData = z.infer<typeof schema>

type SlugStatus = 'idle' | 'checking' | 'found' | 'not-found' | 'suspended'

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError]               = useState('')
  const [slugStatus, setSlugStatus]     = useState<SlugStatus>('idle')
  const [clinicName, setClinicName]     = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const slugValue = watch('slug', '')

  // Verifica o slug com debounce de 600ms
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

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
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

  // Indicador visual para o campo de slug
  const SlugIndicator = () => {
    if (slugStatus === 'checking') {
      return <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
    }
    if (slugStatus === 'found') {
      return <CheckCircle2 className="w-4 h-4 text-green-500" />
    }
    if (slugStatus === 'not-found') {
      return <XCircle className="w-4 h-4 text-red-400" />
    }
    if (slugStatus === 'suspended') {
      return <AlertCircle className="w-4 h-4 text-orange-400" />
    }
    return null
  }

  const slugHint = () => {
    if (slugStatus === 'found')     return { text: `✓ ${clinicName}`, color: 'text-green-600' }
    if (slugStatus === 'not-found') return { text: 'Clínica não encontrada', color: 'text-red-500' }
    if (slugStatus === 'suspended') return { text: 'Clínica suspensa — contate o suporte', color: 'text-orange-500' }
    if (errors.slug)                return { text: errors.slug.message!, color: 'text-red-500' }
    return { text: 'Fornecido no cadastro da clínica (ex: clinica-abc)', color: 'text-gray-400' }
  }

  const hint = slugHint()

  return (
    <div className="flex min-h-screen">
      <style>{`
        @keyframes loginAurora1 {
          0%,100% { transform: translate(0,0) scale(1); }
          25%      { transform: translate(60px,-40px) scale(1.1); }
          50%      { transform: translate(-30px,60px) scale(0.95); }
          75%      { transform: translate(40px,30px) scale(1.05); }
        }
        @keyframes loginAurora2 {
          0%,100% { transform: translate(0,0) scale(1); }
          30%      { transform: translate(-70px,40px) scale(1.08); }
          60%      { transform: translate(50px,-60px) scale(0.92); }
        }
      `}</style>

      {/* ── Painel esquerdo: dark aurora (só desktop) ─────────────── */}
      <div
        className="hidden lg:flex lg:w-[55%] relative flex-col justify-between overflow-hidden"
        style={{ background: '#020a05' }}
      >
        {/* Blobs aurora */}
        <div className="absolute w-[700px] h-[700px] rounded-full opacity-30 blur-[100px] pointer-events-none"
          style={{ background: 'radial-gradient(circle, #16a34a 0%, #15803d 40%, transparent 70%)', top: '-15%', left: '-10%', animation: 'loginAurora1 18s ease-in-out infinite' }} />
        <div className="absolute w-[500px] h-[500px] rounded-full opacity-20 blur-[80px] pointer-events-none"
          style={{ background: 'radial-gradient(circle, #0d9488 0%, #0f766e 40%, transparent 70%)', bottom: '0%', right: '-5%', animation: 'loginAurora2 22s ease-in-out infinite' }} />

        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.035] pointer-events-none"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.4) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.4) 1px,transparent 1px)', backgroundSize: '60px 60px' }} />

        {/* Conteúdo */}
        <div className="relative z-10 flex flex-col justify-between h-full px-12 py-10">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
              <PawPrint className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">VetCare</span>
          </div>

          {/* Stats card glassmorphism */}
          <div className="rounded-3xl p-7 border" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(16px)', borderColor: 'rgba(255,255,255,0.08)' }}>
            <p className="text-xs font-medium mb-5" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Visão geral da clínica
            </p>
            <div className="grid grid-cols-2 gap-5 mb-6">
              <div>
                <p className="text-4xl font-black text-white tabular-nums">12</p>
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>consultas hoje</p>
              </div>
              <div>
                <p className="text-4xl font-black text-white tabular-nums">8.4k</p>
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  <span style={{ color: 'rgba(255,255,255,0.25)' }}>R$</span> receita do mês
                </p>
              </div>
            </div>
            {/* Mini chart */}
            <div className="flex items-end gap-1.5 h-12 mb-2">
              {[35, 58, 42, 72, 48, 88, 65].map((h, i) => (
                <div key={i} className="flex-1 rounded-t-sm transition-all"
                  style={{ height: `${h}%`, background: i === 5 ? '#16a34a' : 'rgba(22,163,74,0.2)' }} />
              ))}
            </div>
            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>Receita — últimos 7 dias</p>
          </div>

          {/* Depoimento */}
          <div>
            <div className="flex gap-0.5 mb-3">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
              ))}
            </div>
            <p className="text-sm italic leading-relaxed mb-4" style={{ color: 'rgba(255,255,255,0.55)' }}>
              "O VetCare transformou minha clínica. Economizo 2h por dia só com o AI Scribe preenchendo os prontuários."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{ background: 'rgba(22,163,74,0.25)', color: '#4ade80' }}>A</div>
              <div>
                <p className="text-sm font-semibold text-white">Dra. Ana Lima</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Clínica VetPet · São Paulo</p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Painel direito: formulário ────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center bg-white px-8 py-12 min-h-screen lg:min-h-0">
        <div className="w-full max-w-sm">

          {/* Logo — só mobile (desktop tem no painel esquerdo) */}
          <div className="lg:hidden flex items-center gap-3 justify-center mb-8">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg">
              <PawPrint className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-gray-900">VetCare</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-black text-gray-900">Bem-vindo de volta</h1>
            <p className="text-gray-400 text-sm mt-1.5">Entre na sua clínica para continuar</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Slug */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Identificador da clínica
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building2 className="w-4 h-4 text-gray-400" />
                </div>
                <input
                  {...register('slug')}
                  type="text"
                  placeholder="minha-clinica"
                  className={`w-full pl-10 pr-10 py-2.5 border rounded-xl focus:outline-none focus:ring-2 transition text-sm ${
                    slugStatus === 'found'
                      ? 'border-green-300 focus:ring-green-200 focus:border-green-400'
                      : slugStatus === 'not-found'
                      ? 'border-red-300 focus:ring-red-100 focus:border-red-400'
                      : slugStatus === 'suspended'
                      ? 'border-orange-300 focus:ring-orange-100 focus:border-orange-400'
                      : 'border-gray-200 focus:ring-primary/30 focus:border-primary'
                  }`}
                  autoComplete="organization"
                  autoCapitalize="none"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <SlugIndicator />
                </div>
              </div>
              <p className={`text-xs mt-1.5 ${hint.color}`}>{hint.text}</p>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                {...register('email')}
                type="email"
                placeholder="email@clinica.com.br"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition text-sm"
                autoComplete="email"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            {/* Senha */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Senha</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition pr-10 text-sm"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || slugStatus === 'not-found' || slugStatus === 'suspended'}
              className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 transition disabled:opacity-60 flex items-center justify-center gap-2 text-sm shadow-sm hover:shadow-primary/25 hover:shadow-md mt-2"
            >
              {isSubmitting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Entrando...</>
                : 'Entrar'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-400 mt-8">
            Sem conta?{' '}
            <Link href="/pricing" className="text-primary font-semibold hover:underline">
              Ver planos e preços
            </Link>
          </p>

        </div>
      </div>
    </div>
  )
}
