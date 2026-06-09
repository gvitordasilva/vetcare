import MarketingHeader from './MarketingHeader'
import HeroSection from './HeroSection'
import FeaturesSection from './FeaturesSection'
import VideoSection from './VideoSection'
import HowItWorksSection from './HowItWorksSection'
import PricingPreview from './PricingPreview'
import TestimonialsSection from './TestimonialsSection'
import CtaSection from './CtaSection'
import MarketingFooter from './MarketingFooter'

// Barra de social proof / parceiros
function SocialProofBar() {
  return (
    <div className="bg-white border-y border-gray-100 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16 text-center">
          {[
            { value: '200+', label: 'clínicas ativas' },
            { value: '50.000+', label: 'pacientes gerenciados' },
            { value: '5 estados', label: 'do Brasil' },
            { value: '98%', label: 'de satisfação' },
          ].map((item) => (
            <div key={item.label}>
              <span className="text-2xl font-black text-gray-900">{item.value}</span>
              <span className="text-sm text-gray-500 ml-2">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function LandingPage() {
  return (
    <>
      <MarketingHeader />
      <main>
        <HeroSection />
        <SocialProofBar />
        <FeaturesSection />
        <VideoSection />
        <HowItWorksSection />
        <PricingPreview />
        <TestimonialsSection />
        <CtaSection />
      </main>
      <MarketingFooter />
    </>
  )
}
