import MarketingHeader    from './MarketingHeader'
import HeroSection        from './HeroSection'
import FeaturesSection    from './FeaturesSection'
import DashboardPreviewSection from './DashboardPreviewSection'
import HowItWorksSection  from './HowItWorksSection'
import PricingPreview     from './PricingPreview'
import TestimonialsSection from './TestimonialsSection'
import CtaSection         from './CtaSection'
import MarketingFooter    from './MarketingFooter'
import PawCursor          from './PawCursor'
import StickyCta          from './StickyCta'

function SocialProofBar() {
  const stats = [
    { value: '200+',    label: 'clínicas ativas',        emoji: '🏥' },
    { value: '50.000+', label: 'pacientes gerenciados',   emoji: '🐾' },
    { value: '5 estados', label: 'do Brasil',             emoji: '🇧🇷' },
    { value: '98%',     label: 'de satisfação',           emoji: '⭐' },
  ]
  return (
    <div style={{ background: '#030d06', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16 text-center">
          {stats.map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <span className="text-lg">{s.emoji}</span>
              <div>
                <span className="text-2xl font-black text-white">{s.value}</span>
                <span className="text-sm ml-2" style={{ color: 'rgba(255,255,255,0.4)' }}>{s.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function LandingPage() {
  return (
    <div style={{ background: '#fff' }}>
      {/* Cursor patinha + tab title — só no site, não no dashboard */}
      <PawCursor />

      {/* CTA flutuante após 600px de scroll */}
      <StickyCta />

      <MarketingHeader />

      <main>
        {/* Seções dark */}
        <div style={{ background: '#020a05' }}>
          <HeroSection />
          <SocialProofBar />
          <FeaturesSection />
        </div>

        {/* Seções claras */}
        <DashboardPreviewSection />
        <HowItWorksSection />
        <PricingPreview />
        <TestimonialsSection />
        <CtaSection />
      </main>

      <MarketingFooter />
    </div>
  )
}
