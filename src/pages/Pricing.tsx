import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Mail, ShieldCheck, Square, LayoutGrid, Globe } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const Pricing = () => {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="pt-24 pb-20 px-4 md:px-8">
        <div className="max-w-[1200px] mx-auto flex flex-col gap-px bg-gray-200 border border-gray-200 rounded-2xl overflow-hidden">

          {/* HEADER */}
          <div className="bg-white px-8 md:px-16 py-16 md:py-24 text-center">
            <h1 className="text-4xl md:text-5xl lg:text-[56px] font-semibold leading-[1.1] tracking-[-0.03em] mb-6 text-gray-900">
              Simple, transparent pricing
            </h1>
            <p className="text-lg md:text-xl text-gray-400 font-normal max-w-2xl mx-auto leading-relaxed">
              Buy credits, look up emissions. No subscriptions, no tiers, no surprises.
            </p>
          </div>

          {/* PRICING CARDS — 3 col */}
          <div className="grid md:grid-cols-3 gap-px">
            {/* Trial Pack */}
            <div className="bg-white p-8 md:p-10 flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#B3FD00' }}>
                  <Square className="text-black" size={20} strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold tracking-[-0.01em] text-gray-900">Starter Pack</h3>
                  <p className="text-[13px] text-gray-400">See it in action</p>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6 mb-6">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-5xl font-semibold font-mono tracking-[-0.02em] text-gray-900">$20</span>
                  <span className="text-gray-400 ml-1 text-sm">each</span>
                </div>
                <span className="text-sm text-gray-400">120 credits</span>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-center gap-3">
                  <span className="w-1 h-1 rounded-full bg-gray-400 flex-shrink-0"></span>
                  <span className="text-sm text-gray-500"><strong className="text-gray-900">40</strong> lookups</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-1 h-1 rounded-full bg-gray-400 flex-shrink-0"></span>
                  <span className="text-sm text-gray-500">Search via dashboard or API</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-1 h-1 rounded-full bg-gray-400 flex-shrink-0"></span>
                  <span className="text-sm text-gray-500">Credits never expire</span>
                </li>
              </ul>

              <Button variant="outline" className="w-full border-gray-300 text-gray-600 hover:text-black hover:border-black font-medium rounded-lg bg-white" asChild>
                <Link to="/auth">Get Started</Link>
              </Button>
            </div>

            {/* Standard Credits Pack */}
            <div className="bg-white p-8 md:p-10 flex flex-col border-l border-r border-gray-200 md:border-0">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#B3FD00' }}>
                  <LayoutGrid className="text-black" size={20} strokeWidth={1.5} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold tracking-[-0.01em] text-gray-900">Growth Pack</h3>
                    <span className="bg-black text-white px-2.5 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-[0.04em]">Best value</span>
                  </div>
                  <p className="text-[13px] text-gray-400">Scale with ease</p>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6 mb-6">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-5xl font-semibold font-mono tracking-[-0.02em] text-gray-900">$250</span>
                  <span className="text-gray-400 ml-1 text-sm">each</span>
                </div>
                <span className="text-sm text-gray-400">5,400 credits</span>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-center gap-3">
                  <span className="w-1 h-1 rounded-full bg-gray-400 flex-shrink-0"></span>
                  <span className="text-sm text-gray-500"><strong className="text-gray-900">1,800</strong> lookups</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-1 h-1 rounded-full bg-gray-400 flex-shrink-0"></span>
                  <span className="text-sm text-gray-500">Full API access</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-1 h-1 rounded-full bg-gray-400 flex-shrink-0"></span>
                  <span className="text-sm text-gray-500">Manual or auto-reload</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-1 h-1 rounded-full bg-gray-400 flex-shrink-0"></span>
                  <span className="text-sm text-gray-500">Credits never expire</span>
                </li>
              </ul>

              <Button className="w-full bg-black text-white hover:bg-gray-800 font-medium rounded-lg" asChild>
                <Link to="/auth">
                  Get Started
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>

            {/* Enterprise */}
            <div className="bg-white p-8 md:p-10 flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#B3FD00' }}>
                  <Globe className="text-black" size={18} strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold tracking-[-0.01em] text-gray-900">Enterprise</h3>
                  <p className="text-[13px] text-gray-400">Volume pricing</p>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6 mb-6">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-5xl font-semibold font-mono tracking-[-0.02em] text-gray-900">Custom</span>
                </div>
                <span className="text-sm text-gray-400">tailored to your needs</span>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-center gap-3">
                  <span className="w-1 h-1 rounded-full bg-gray-400 flex-shrink-0"></span>
                  <span className="text-sm text-gray-500">Volume credit pricing</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-1 h-1 rounded-full bg-gray-400 flex-shrink-0"></span>
                  <span className="text-sm text-gray-500">Dedicated support</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-1 h-1 rounded-full bg-gray-400 flex-shrink-0"></span>
                  <span className="text-sm text-gray-500">Custom integrations & SLAs</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-1 h-1 rounded-full bg-gray-400 flex-shrink-0"></span>
                  <span className="text-sm text-gray-500">Annual agreements available</span>
                </li>
              </ul>

              <Button variant="outline" className="w-full border-gray-300 text-gray-600 hover:text-black hover:border-black font-medium rounded-lg bg-white" asChild>
                <a href="mailto:sam@auroracarbon.com">
                  <Mail className="w-4 h-4 mr-2" />
                  Contact Us
                </a>
              </Button>
            </div>
          </div>

          {/* HOW IT WORKS */}
          <div className="grid md:grid-cols-2 gap-px">
            <div className="bg-white p-8 md:p-10 flex items-start gap-4">
              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sm font-semibold text-gray-900">3</span>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">Credits per lookup</h4>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Every lookup consumes 3 credits — whether you use the API or the dashboard. Add credits to your balance anytime.
                </p>
              </div>
            </div>
            <div className="bg-white p-8 md:p-10 flex items-start gap-4">
              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <ShieldCheck className="text-gray-900" size={16} strokeWidth={1.5} />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">Only pay for results</h4>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Lookups that return emissions data consume credits. If a no-data response is returned by the API, you're not charged.
                </p>
              </div>
            </div>
          </div>

          {/* CLAY / MARKETPLACE CALLOUT */}
          <div className="bg-white px-8 md:px-10 py-10">
            <div className="section-label mb-5">Integrations</div>
            <div className="grid md:grid-cols-[3fr_2fr] md:items-center gap-8 md:gap-12">
              <div>
                <h2 className="text-2xl md:text-3xl font-semibold tracking-[-0.02em] leading-[1.2] mb-3 text-gray-900">
                  Use Aurora through Clay
                </h2>
                <p className="text-sm text-gray-500 leading-relaxed max-w-md mb-5">
                  Access Aurora's emissions data directly in your Clay workflows. Enrich leads and accounts with corporate climate profiles — no API key needed.
                </p>
                <Button variant="outline" className="border-gray-300 text-gray-600 hover:text-black hover:border-black rounded-full px-6 py-2.5 h-auto text-sm font-medium bg-white" asChild>
                  <a href="https://clay.com" target="_blank" rel="noopener noreferrer">
                    View on Clay <ArrowUpRight className="w-4 h-4 ml-1" />
                  </a>
                </Button>
              </div>
              <div className="flex justify-start">
                <div className="border border-gray-200 rounded-lg flex items-center justify-center p-8 h-28 w-48">
                  <img src="/clay_gs.png" alt="Clay" className="max-w-full max-h-full object-contain" />
                </div>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="bg-white px-8 md:px-10 py-10">
            <div className="section-label mb-8">FAQ</div>
            <div className="grid md:grid-cols-2 gap-x-12 gap-y-8 max-w-4xl">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">What counts as one lookup?</h4>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Each emissions lookup costs 3 credits — whether you use the API or the dashboard. You're only charged when data is successfully returned.
                </p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">What if you don't have data for a company?</h4>
                <p className="text-sm text-gray-500 leading-relaxed">
                  You won't be charged. The API returns a <code className="text-[13px] font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">data_not_available</code> response and no credits are deducted from your balance.
                </p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Do credits expire?</h4>
                <p className="text-sm text-gray-500 leading-relaxed">
                  No. Credits remain in your account until you use them.
                </p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">What data do I get back?</h4>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Scope 1, 2, and 3 GHG emissions in tCO₂e, methodology classification, and the reporting year — all from a single lookup with just a company domain.
                </p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">What's the difference between the packs?</h4>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Same API, same data. The Growth Pack is significantly better value per credit. The Starter Pack is for teams that want to evaluate the data before committing.
                </p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">How does Clay integration work?</h4>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Aurora is available as an enrichment provider in Clay. Usage is billed through Clay's platform — no separate Aurora account needed.
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="bg-white px-8 md:px-10 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-semibold tracking-[-0.02em] leading-[1.2] text-gray-900 mb-2">
                Ready to get started?
              </h2>
              <p className="text-sm text-gray-500">
                Create an account and start looking up emissions in minutes.
              </p>
            </div>
            <div className="flex gap-3 shrink-0">
              <Button className="bg-black text-white hover:bg-gray-800 rounded-full px-7 py-2.5 h-auto text-sm font-medium" asChild>
                <Link to="/auth">
                  Get Started
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button variant="outline" className="border-gray-300 text-gray-600 hover:text-black hover:border-black rounded-full px-7 py-2.5 h-auto text-sm font-medium bg-white" asChild>
                <a href="mailto:sam@auroracarbon.com">Contact Sales</a>
              </Button>
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Pricing;
