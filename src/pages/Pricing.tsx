import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const Pricing = () => {
  const [billedYearly, setBilledYearly] = useState(true);

  const explorerMonthly = 19;
  const standardMonthly = 99;

  const getDisplayPrice = (monthlyPrice: number) => {
    if (billedYearly) {
      return Math.round(monthlyPrice * 0.8333);
    }
    return monthlyPrice;
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="pt-40 pb-20 px-4 md:px-8">
        <div className="max-w-[1200px] mx-auto">
          {/* Header */}
          <div className="text-center mb-20">
            <h1 className="text-4xl md:text-5xl lg:text-[56px] font-semibold tracking-[-0.03em] leading-[1.1] mb-4 text-gray-900">
              Flexible pricing
            </h1>
            <p className="text-lg text-gray-500 mb-8">
              Explore transparent pricing built for real-world climate use-cases. Start for free, then scale as you grow.
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-3 mb-8">
              <span className={`text-sm ${!billedYearly ? 'text-black font-medium' : 'text-gray-500'}`}>
                Billed monthly
              </span>
              <Switch
                checked={billedYearly}
                onCheckedChange={setBilledYearly}
                className="data-[state=checked]:bg-black"
              />
              <span className={`text-sm ${billedYearly ? 'text-black font-medium' : 'text-gray-500'}`}>
                Billed yearly
              </span>
              {billedYearly && (
                <span className="bg-gray-100 text-black px-3 py-1 rounded-full text-xs font-medium ml-2">
                  2 months free
                </span>
              )}
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Free Plan */}
            <div className="rounded-xl border border-gray-200 bg-white flex flex-col">
              <div className="p-8 flex-1">
                <div className="mb-6">
                  <h3 className="text-2xl font-semibold tracking-[-0.02em] mb-2 text-gray-900">Free Plan</h3>
                  <p className="text-sm text-gray-500">A lightweight way to try our API. No cost, no card, no hassle.</p>
                </div>

                <div className="flex items-center gap-2 text-gray-500 mb-6">
                  <img src="/aurora-mark-black.png" alt="Credits" className="w-5 h-5 object-contain" />
                  <span className="text-sm">500 credits</span>
                </div>

                <div className="border-t border-gray-200 pt-6 mb-6">
                  <span className="text-5xl font-semibold font-mono tracking-[-0.02em] text-gray-900">$0</span>
                  <span className="text-gray-500 ml-2 text-sm">one-time</span>
                </div>

                <div className="h-[52px]"></div>

                <Button className="w-full bg-gray-100 text-black hover:bg-gray-200 font-medium rounded-lg" asChild>
                  <Link to="/auth">Get started</Link>
                </Button>
              </div>

              <div className="border-t border-gray-200">
                <ul>
                  <li className="flex items-center gap-3 px-8 py-3.5 border-b border-gray-100 last:border-0">
                    <span className="text-gray-400 text-xs">&#9679;</span>
                    <span className="text-sm text-gray-500">
                      Get <strong className="text-gray-900">100</strong> climate profiles
                    </span>
                  </li>
                  <li className="flex items-center gap-3 px-8 py-3.5 border-b border-gray-100 last:border-0">
                    <span className="text-gray-400 text-xs">&#9679;</span>
                    <span className="text-sm text-gray-500">
                      <strong className="text-gray-900">2</strong> concurrent requests
                    </span>
                  </li>
                  <li className="flex items-center gap-3 px-8 py-3.5">
                    <span className="text-gray-400 text-xs">&#9679;</span>
                    <span className="text-sm text-gray-500">Low rate limits</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Explorer Plan */}
            <div className="rounded-xl border border-gray-200 bg-white flex flex-col">
              <div className="p-8 flex-1">
                <div className="mb-6">
                  <h3 className="text-2xl font-semibold tracking-[-0.02em] mb-2 text-gray-900">Explorer</h3>
                  <p className="text-sm text-gray-500">Great for side projects and small tools. Fast, simple, no overkill.</p>
                </div>

                <div className="flex items-center gap-2 text-gray-500 mb-6">
                  <img src="/aurora-mark-black.png" alt="Credits" className="w-5 h-5 object-contain" />
                  <span className="text-sm">3,000 credits</span>
                </div>

                <div className="border-t border-gray-200 pt-6 mb-6">
                  <span className="text-5xl font-semibold font-mono tracking-[-0.02em] text-gray-900">
                    ${getDisplayPrice(explorerMonthly)}
                  </span>
                  <span className="text-gray-500 ml-2 text-sm">/month</span>
                </div>

                <div className="flex items-center gap-2 h-[52px]">
                  <Switch
                    checked={billedYearly}
                    onCheckedChange={setBilledYearly}
                    className="data-[state=checked]:bg-black"
                  />
                  <span className="text-xs text-black whitespace-nowrap">Billed yearly</span>
                  {billedYearly && (
                    <span className="bg-gray-100 text-black px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap">
                      2 months free
                    </span>
                  )}
                </div>

                <Button className="w-full bg-gray-100 text-black hover:bg-gray-200 font-medium rounded-lg" asChild>
                  <Link to="/auth">Subscribe</Link>
                </Button>
              </div>

              <div className="border-t border-gray-200">
                <ul>
                  <li className="flex items-center gap-3 px-8 py-3.5 border-b border-gray-100">
                    <span className="text-gray-400 text-xs">&#9679;</span>
                    <span className="text-sm text-gray-500">
                      Get <strong className="text-gray-900">600</strong> climate profiles
                    </span>
                  </li>
                  <li className="flex items-center gap-3 px-8 py-3.5 border-b border-gray-100">
                    <span className="text-gray-400 text-xs">&#9679;</span>
                    <span className="text-sm text-gray-500">
                      <strong className="text-gray-900">5</strong> concurrent requests
                    </span>
                  </li>
                  <li className="flex items-center gap-3 px-8 py-3.5 border-b border-gray-100">
                    <span className="text-gray-400 text-xs">&#9679;</span>
                    <span className="text-sm text-gray-500">Basic support</span>
                  </li>
                  <li className="flex items-center gap-3 px-8 py-3.5">
                    <span className="text-gray-400 text-xs">&#9679;</span>
                    <span className="text-sm text-gray-500">
                      <strong className="text-gray-900">$9</strong> per extra <strong className="text-gray-900">1k</strong> credits
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Standard Plan */}
            <div className="rounded-xl border-2 border-black bg-white flex flex-col">
              <div className="p-8 flex-1">
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-2xl font-semibold tracking-[-0.02em] text-gray-900">Standard</h3>
                    <span className="bg-black text-white px-3 py-1 rounded-full text-xs font-medium">Most popular</span>
                  </div>
                  <p className="text-sm text-gray-500">Perfect for scaling with less effort. Simple, solid, dependable.</p>
                </div>

                <div className="flex items-center gap-2 text-gray-500 mb-6">
                  <img src="/aurora-mark-black.png" alt="Credits" className="w-5 h-5 object-contain" />
                  <span className="text-sm">100,000 credits</span>
                </div>

                <div className="border-t border-gray-200 pt-6 mb-6">
                  <span className="text-5xl font-semibold font-mono tracking-[-0.02em] text-gray-900">
                    ${getDisplayPrice(standardMonthly)}
                  </span>
                  <span className="text-gray-500 ml-2 text-sm">/month</span>
                </div>

                <div className="flex items-center gap-2 h-[52px]">
                  <Switch
                    checked={billedYearly}
                    onCheckedChange={setBilledYearly}
                    className="data-[state=checked]:bg-black"
                  />
                  <span className="text-xs text-black whitespace-nowrap">Billed yearly</span>
                  {billedYearly && (
                    <span className="bg-gray-100 text-black px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap">
                      2 months free
                    </span>
                  )}
                </div>

                <Button className="w-full bg-black text-white hover:bg-gray-800 font-medium rounded-lg" asChild>
                  <Link to="/auth">Subscribe</Link>
                </Button>
              </div>

              <div className="border-t border-gray-200">
                <ul>
                  <li className="flex items-center gap-3 px-8 py-3.5 border-b border-gray-100">
                    <span className="text-gray-400 text-xs">&#9679;</span>
                    <span className="text-sm text-gray-500">
                      Get <strong className="text-gray-900">20,000</strong> climate profiles
                    </span>
                  </li>
                  <li className="flex items-center gap-3 px-8 py-3.5 border-b border-gray-100">
                    <span className="text-gray-400 text-xs">&#9679;</span>
                    <span className="text-sm text-gray-500">
                      <strong className="text-gray-900">50</strong> concurrent requests
                    </span>
                  </li>
                  <li className="flex items-center gap-3 px-8 py-3.5 border-b border-gray-100">
                    <span className="text-gray-400 text-xs">&#9679;</span>
                    <span className="text-sm text-gray-500">Standard support</span>
                  </li>
                  <li className="flex items-center gap-3 px-8 py-3.5">
                    <span className="text-gray-400 text-xs">&#9679;</span>
                    <span className="text-sm text-gray-500">
                      <strong className="text-gray-900">$47</strong> per extra <strong className="text-gray-900">35k</strong> credits
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Pricing;
