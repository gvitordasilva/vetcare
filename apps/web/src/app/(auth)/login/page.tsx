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
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4 shadow-lg">
            <PawPrint className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">VetCare</h1>
          <p className="text-gray-500 mt-1">Gestão veterinária moderna</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Entrar na sua clínica</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Slug da clínica */}
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
                  className={`w-full pl-10 pr-10 py-2.5 border rounded-xl focus:outline-none focus:ring-2 transition ${
                    slugStatus === 'found'
                      ? 'border-green-300 focus:ring-green-200 focus:border-green-400'
                      : slugStatus === 'not-found'
                      ? 'border-red-300 focus:ring-red-100 focus:border-red-400'
                      : slugStatus === 'suspended'
                      ? 'border-orange-300 focus:ring-orange-100 focus:border-orange-400'
                      : 'border-gray-200 focus:ring-primary/50 focus:border-primary'
                  }`}
                  autoComplete="organization"
                  autoCapitalize="none"
                />
                {/* Ícone de status à direita */}
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <SlugIndicator />
                </div>
              </div>
              <p className={`text-xs mt-1 ${hint.color}`}>{hint.text}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                {...register('email')}
                type="email"
                placeholder="email@clinica.com.br"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                autoComplete="email"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Senha</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
              className="w-full bg-primary text-white py-2.5 rounded-xl font-medium hover:bg-primary/90 transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Entrando...</> : 'Entrar'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Sem conta?{' '}
            <Link href="/pricing" className="text-primary font-medium hover:underline">
              Ver planos e preços
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
