import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import LandingPage from '@/components/marketing/LandingPage'

export const metadata = {
  title: 'VetCare — Gestão veterinária moderna para clínicas que crescem',
  description:
    'Prontuário eletrônico, agenda online, financeiro, AI Scribe, telemedicina e NF-e em um só sistema. 14 dias grátis, sem cartão de crédito.',
  openGraph: {
    title: 'VetCare — Gestão veterinária moderna',
    description: 'Sistema SaaS completo para clínicas veterinárias brasileiras. Experimente 14 dias grátis.',
    type: 'website',
  },
}

export default function Home() {
  // Usuário já autenticado → vai direto para o dashboard
  const cookieStore = cookies()
  const token = cookieStore.get('accessToken')
  if (token) redirect('/dashboard')

  return <LandingPage />
}
