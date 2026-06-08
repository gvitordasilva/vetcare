'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PawPrint, Eye, EyeOff, CheckCircle2, XCircle, Loader2 as SpinIcon, AlertCircle } from 'lucide-react'
import { portalAuthApi, setPortalAuth, portalApi } from '@/lib/portal-api'
import { api } from '@/lib/api'

const schema = z.object({
  slug:     z.string().min(1, 'Informe o identificador da clínica'),
  email:    z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
})
type FormData = z.infer<typeof schema>

type SlugStatus = 'idle' | 'checking' | 'found' | 'not-found' | 'suspended'

export default function PortalLoginPage() {
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

  useEffect(() => {
    const slug = slugValue?.trim()
    if (!slug || slug.length < 2) { setSlugStatus('idle'); setClinicName(''); return }
    setSlugStatus('checking')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get('/auth/clinic-check', { params: { slug } })
        if (data.found && data.active)  { setSlugStatus('found');     setClinicName(data.name) }
        else if (data.found)            { setSlugStatus('suspended'); setClinicName('') }
        else                            { setSlugStatus('not-found'); setClinicName('') }
      } catch { setSlugStatus('not-found'); setClinicName('') }
    }, 600)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [slugValue])

  async function onSubmit(values: FormData) {
    setError('')
    try {
      const result = await portalAuthApi.login(values.slug, values.email, values.password)
      setPortalAuth(result.accessToken, result.refreshToken, result.owner)
      router.push('/portal/meus-pets')
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Erro ao fazer login')
    }
  }

  const statusIcon = () => {
    if (slugStatus === 'checking')  return <SpinIcon className="w-4 h-4 text-gray-400 animate-spin" />
    if (slugStatus === 'found')     return <CheckCircle2 className="w-4 h-4 text-green-500" />
    if (slugStatus === 'not-found') return <XCircle className="w-4 h-4 text-red-400" />
    if (slugStatus === 'suspended') return <AlertCircle className="w-4 h-4 text-orange-400" />
    return null
  }

  const slugBorder =
    slugStatus === 'found'     ? 'border-green-300 focus:ring-green-200 focus:border-green-400' :
    slugStatus === 'not-found' ? 'border-red-300 focus:ring-red-100 focus:border-red-400' :
    slugStatus === 'suspended' ? 'border-orange-300 focus:ring-orange-100' :
    'border-gray-200 focus:ring-primary/30 focus:border-primary'

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/30">
            <PawPrint className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Portal do Tutor</h1>
          <p className="text-gray-500 mt-1 text-sm">Acesse o histórico do seu pet</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/60 p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Identificador da Clínica
              </label>
              <div className="relative">
                <input
                  {...register('slug')}
                  placeholder="ex: clinica-sao-pedro"
                  className={`w-full px-4 py-3 pr-10 rounded-xl border bg-gray-50 text-sm focus:outline-none focus:ring-2 transition ${slugBorder}`}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  {statusIcon()}
                </div>
              </div>
              {slugStatus === 'found'     && <p className="text-green-600 text-xs mt-1">✓ {clinicName}</p>}
              {slugStatus === 'not-found' && <p className="text-red-500 text-xs mt-1">Clínica não encontrada</p>}
              {slugStatus === 'suspended' && <p className="text-orange-500 text-xs mt-1">Clínica suspensa</p>}
              {slugStatus === 'idle'      && errors.slug && <p className="text-red-500 text-xs mt-1">{errors.slug.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                {...register('email')}
                type="email"
                placeholder="seu@email.com"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
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
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || slugStatus === 'not-found' || slugStatus === 'suspended'}
              className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition disabled:opacity-60 mt-2"
            >
              {isSubmitting ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6">
            Seu acesso é fornecido pela clínica veterinária.
            <br />Em caso de dúvidas, entre em contato com a clínica.
          </p>
        </div>
      </div>
    </div>
  )
}
