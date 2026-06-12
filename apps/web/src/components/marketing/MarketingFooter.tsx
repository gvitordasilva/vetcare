import Link from 'next/link'
import { PawPrint, Shield, MapPin } from 'lucide-react'

export default function MarketingFooter() {
  return (
    <footer className="bg-gray-950 text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-10 border-b border-gray-800">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 bg-green-600 rounded-xl flex items-center justify-center">
                <PawPrint className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-white text-xl">VetCare</span>
            </div>
            <p className="text-sm leading-relaxed text-gray-400 mb-5">
              Sistema de gestão para clínicas veterinárias modernas. Prontuário, agenda, financeiro e muito mais em um só lugar.
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
              <Shield className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>Dados armazenados no Brasil · LGPD</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <MapPin className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>Pagamentos via PIX e boleto</span>
            </div>
          </div>

          {/* Produto */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Produto</h4>
            <ul className="space-y-3">
              {[
                { href: '#funcionalidades', label: 'Funcionalidades' },
                { href: '/pricing', label: 'Planos e Preços' },
                { href: '#video', label: 'Demonstração' },
                { href: '#como-funciona', label: 'Como funciona' },
              ].map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm hover:text-white transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Empresa */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Empresa</h4>
            <ul className="space-y-3">
              {[
                { href: '#', label: 'Sobre nós' },
                { href: '#', label: 'Blog' },
                { href: '#', label: 'Contato' },
                { href: '#', label: 'Parceiros' },
              ].map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="text-sm hover:text-white transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Legal</h4>
            <ul className="space-y-3">
              {[
                { href: '#', label: 'Política de Privacidade' },
                { href: '#', label: 'Termos de Uso' },
                { href: '#', label: 'Política de Cookies' },
                { href: '#', label: 'LGPD' },
              ].map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="text-sm hover:text-white transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-600">
            © {new Date().getFullYear()} VetCare · Todos os direitos reservados
          </p>
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <span>Feito com</span>
            <span className="text-green-500">♥</span>
            <span>para veterinários brasileiros</span>
          </div>
        </div>

        {/* Atribuição CC BY dos modelos 3D */}
        <p className="pt-4 text-[11px] text-gray-700 text-center sm:text-left">
          Modelos 3D: cavalo por{' '}
          <a href="https://sketchfab.com/3d-models/free-horse-3d-model-e4ebd72418bb4256b04d0adca6324cdd"
            target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-500 transition-colors">
            DinoReplicas
          </a>{' '}
          (CC BY 4.0) · papagaio do projeto{' '}
          <a href="https://github.com/mrdoob/three.js" target="_blank" rel="noopener noreferrer"
            className="underline hover:text-gray-500 transition-colors">
            three.js
          </a>{' '}
          (MIT)
        </p>
      </div>
    </footer>
  )
}
