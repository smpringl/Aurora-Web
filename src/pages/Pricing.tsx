import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Separator } from '@/components/ui/separator';

const Pricing = () => {
  const [billedYearly, setBilledYearly] = useState(true);

  // Base monthly prices
  const explorerMonthly = 19;
  const standardMonthly = 99;

  // Calculate displayed price (always show monthly rate)
  const getDisplayPrice = (monthlyPrice: number) => {
    if (billedYearly) {
      // Show discounted monthly rate when billed yearly (16.67% discount)
      return Math.round(monthlyPrice * 0.8333);
    }
    return monthlyPrice;
  };

  return (
    <div className="min-h-screen bg-[#f9f9f9]">
      <Header />

      <main className="pt-40 pb-20 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-20">
            <h1 className="text-4xl md:text-5xl font-heading font-medium mb-4 text-primary-black">
              Flexible pricing
            </h1>
            <p className="text-lg text-detail-gray font-sans mb-8">
              Explore transparent pricing built for real-world climate use-cases. Start for free, then scale as you grow.
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-3 mb-8">
              <span className={`text-sm font-sans ${!billedYearly ? 'text-primary-black font-medium' : 'text-detail-gray'}`}>
                Billed monthly
              </span>
              <Switch
                checked={billedYearly}
                onCheckedChange={setBilledYearly}
                className="data-[state=checked]:bg-primary-black"
              />
              <span className={`text-sm font-sans ${billedYearly ? 'text-primary-black font-medium' : 'text-detail-gray'}`}>
                Billed yearly
              </span>
              {billedYearly && (
                <span className="bg-secondary-green text-primary-black px-3 py-1 rounded-full text-xs font-heading font-medium ml-2">
                  2 months free
                </span>
              )}
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Free Plan */}
            <div className="rounded-2xl pt-8 px-6 pb-0 border border-gray">
              <div className="mb-6">
                <h3 className="text-2xl font-heading font-medium mb-2 text-primary-black">
                  Free Plan
                </h3>
                <p className="text-sm text-detail-gray font-sans">
                  A lightweight way to try our API. No cost, no card, no hassle.
                </p>
              </div>

              <div className="mb-6">
                <div className="flex items-center gap-2 text-detail-gray mb-8">
                  <img
                    src="/aurora-mark-black.png"
                    alt="Credits"
                    className="w-5 h-5 object-contain"
                  />
                  <span className="font-sans">500 credits</span>
                </div>

                <Separator className="bg-detail-light -mx-6 w-[calc(100%+3rem)] mb-8" />

                <div className="py-4 mb-4">
                  <span className="text-5xl font-heading font-medium text-primary-black">$0</span>
                  <span className="text-detail-gray font-sans ml-2">one-time</span>
                </div>

                <div className="h-[52px]"></div>
              </div>

              <Button
                className="w-full mb-8 bg-[#e6e6e6] text-primary-black hover:bg-[#d0d0d0] font-heading"
                asChild
              >
                <Link to="/auth">Get started</Link>
              </Button>

              <Separator className="bg-detail-light -mx-6 w-[calc(100%+3rem)]" />

              <ul>
                <li className="flex items-start gap-3 py-3">
                  <CheckCircle2 className="w-5 h-5 text-detail-gray flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-detail-gray font-sans">
                    Get <strong className="text-primary-black">100</strong> climate profiles
                  </span>
                </li>
                <Separator className="bg-detail-light -mx-6 w-[calc(100%+3rem)]" />
                <li className="flex items-start gap-3 py-3">
                  <CheckCircle2 className="w-5 h-5 text-detail-gray flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-detail-gray font-sans">
                    <strong className="text-primary-black">2</strong> concurrent requests
                  </span>
                </li>
                <Separator className="bg-detail-light -mx-6 w-[calc(100%+3rem)]" />
                <li className="flex items-start gap-3 py-3">
                  <CheckCircle2 className="w-5 h-5 text-detail-gray flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-detail-gray font-sans">
                    Low rate limits
                  </span>
                </li>
              </ul>
            </div>

            {/* Explorer Plan */}
            <div className="rounded-2xl pt-8 px-6 pb-0 border border-gray">
              <div className="mb-6">
                <h3 className="text-2xl font-heading font-medium mb-2 text-primary-black">
                  Explorer
                </h3>
                <p className="text-sm text-detail-gray font-sans">
                  Great for side projects and small tools. Fast, simple, no overkill.
                </p>
              </div>

              <div className="mb-6">
                <div className="flex items-center gap-2 text-detail-gray mb-8">
                  <img
                    src="/aurora-mark-black.png"
                    alt="Credits"
                    className="w-5 h-5 object-contain"
                  />
                  <span className="font-sans">3,000 credits</span>
                </div>

                <Separator className="bg-detail-light -mx-6 w-[calc(100%+3rem)] mb-8" />

                <div className="py-4 mb-4">
                  <span className="text-5xl font-heading font-medium text-primary-black">
                    ${getDisplayPrice(explorerMonthly)}
                  </span>
                  <span className="text-detail-gray font-sans ml-2">/month</span>
                </div>

                <div className="flex items-center gap-2 h-[52px]">
                  <Switch
                    checked={billedYearly}
                    onCheckedChange={setBilledYearly}
                    className="data-[state=checked]:bg-primary-black"
                  />
                  <span className="text-xs font-sans text-primary-black whitespace-nowrap">
                    Billed yearly
                  </span>
                  {billedYearly && (
                    <span className="bg-secondary-green text-primary-black px-2 py-1 rounded-full text-xs font-heading font-medium whitespace-nowrap">
                      2 months free
                    </span>
                  )}
                </div>
              </div>

              <Button
                className="w-full mb-8 bg-[#e6e6e6] text-primary-black hover:bg-[#d0d0d0] font-heading"
                asChild
              >
                <Link to="/auth">Subscribe</Link>
              </Button>

              <Separator className="bg-detail-light -mx-6 w-[calc(100%+3rem)]" />

              <ul>
                <li className="flex items-start gap-3 py-3">
                  <CheckCircle2 className="w-5 h-5 text-detail-gray flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-detail-gray font-sans">
                    Get <strong className="text-primary-black">600</strong> climate profiles
                  </span>
                </li>
                <Separator className="bg-detail-light -mx-6 w-[calc(100%+3rem)]" />
                <li className="flex items-start gap-3 py-3">
                  <CheckCircle2 className="w-5 h-5 text-detail-gray flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-detail-gray font-sans">
                    <strong className="text-primary-black">5</strong> concurrent requests
                  </span>
                </li>
                <Separator className="bg-detail-light -mx-6 w-[calc(100%+3rem)]" />
                <li className="flex items-start gap-3 py-3">
                  <CheckCircle2 className="w-5 h-5 text-detail-gray flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-detail-gray font-sans">
                    Basic support
                  </span>
                </li>
                <Separator className="bg-detail-light -mx-6 w-[calc(100%+3rem)]" />
                <li className="flex items-start gap-3 py-3">
                  <CheckCircle2 className="w-5 h-5 text-detail-gray flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-detail-gray font-sans">
                    <strong className="text-primary-black">$9</strong> per extra <strong className="text-primary-black">1k</strong> credits
                  </span>
                </li>
              </ul>
            </div>

            {/* Standard Plan */}
            <div className="rounded-2xl pt-8 px-6 pb-0 border border-gray">
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-2xl font-heading font-medium text-primary-black">
                    Standard
                  </h3>
                  <span className="bg-secondary-green text-primary-black px-3 py-1 rounded-full text-xs font-heading font-medium">
                    Most popular
                  </span>
                </div>
                <p className="text-sm text-detail-gray font-sans">
                  Perfect for scaling with less effort. Simple, solid, dependable.
                </p>
              </div>

              <div className="mb-6">
                <div className="flex items-center gap-2 text-detail-gray mb-8">
                  <img
                    src="/aurora-mark-black.png"
                    alt="Credits"
                    className="w-5 h-5 object-contain"
                  />
                  <span className="font-sans">100,000 credits</span>
                </div>

                <Separator className="bg-detail-light -mx-6 w-[calc(100%+3rem)] mb-8" />

                <div className="py-4 mb-4">
                  <span className="text-5xl font-heading font-medium text-primary-black">
                    ${getDisplayPrice(standardMonthly)}
                  </span>
                  <span className="text-detail-gray font-sans ml-2">/month</span>
                </div>

                <div className="flex items-center gap-2 h-[52px]">
                  <Switch
                    checked={billedYearly}
                    onCheckedChange={setBilledYearly}
                    className="data-[state=checked]:bg-primary-black"
                  />
                  <span className="text-xs font-sans text-primary-black whitespace-nowrap">
                    Billed yearly
                  </span>
                  {billedYearly && (
                    <span className="bg-secondary-green text-primary-black px-2 py-1 rounded-full text-xs font-heading font-medium whitespace-nowrap">
                      2 months free
                    </span>
                  )}
                </div>
              </div>

              <Button
                className="w-full mb-8 bg-primary-black text-white hover:bg-detail-gray font-heading"
                asChild
              >
                <Link to="/auth">Subscribe</Link>
              </Button>

              <Separator className="bg-detail-light -mx-6 w-[calc(100%+3rem)]" />

              <ul>
                <li className="flex items-start gap-3 py-3">
                  <CheckCircle2 className="w-5 h-5 text-detail-gray flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-detail-gray font-sans">
                    Get <strong className="text-primary-black">20,000</strong> climate profiles
                  </span>
                </li>
                <Separator className="bg-detail-light -mx-6 w-[calc(100%+3rem)]" />
                <li className="flex items-start gap-3 py-3">
                  <CheckCircle2 className="w-5 h-5 text-detail-gray flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-detail-gray font-sans">
                    <strong className="text-primary-black">50</strong> concurrent requests
                  </span>
                </li>
                <Separator className="bg-detail-light -mx-6 w-[calc(100%+3rem)]" />
                <li className="flex items-start gap-3 py-3">
                  <CheckCircle2 className="w-5 h-5 text-detail-gray flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-detail-gray font-sans">
                    Standard support
                  </span>
                </li>
                <Separator className="bg-detail-light -mx-6 w-[calc(100%+3rem)]" />
                <li className="flex items-start gap-3 py-3">
                  <CheckCircle2 className="w-5 h-5 text-detail-gray flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-detail-gray font-sans">
                    <strong className="text-primary-black">$47</strong> per extra <strong className="text-primary-black">35k</strong> credits
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Pricing;
