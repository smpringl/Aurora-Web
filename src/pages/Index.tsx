import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { GitBranch, Code, Infinity, ArrowRight, ArrowUpRight } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

// Company emissions data (real reported data from Aurora DB)
const COMPANIES = [
  { name: 'Google', logo: '/logos/google.png', total: 11523600, s1: 73100, s2: 3059100, s2_basis: 'market-based', s3: 8400000 },
  { name: 'Microsoft', logo: '/logos/microsoft.png', total: 29800000, s1: 289000, s2: 521000, s2_basis: 'market-based', s3: 28829000 },
  { name: 'Starbucks', logo: '/logos/starbucks.png', total: 13254841, s1: 395666, s2: 319058, s2_basis: 'market-based', s3: 12540117 },
  { name: 'McDonald\'s', logo: '/logos/mcdonalds.png', total: 60457705, s1: 94233, s2: 118334, s2_basis: 'market-based', s3: 60245138 },
  { name: 'Apple', logo: '/logos/apple.png', total: 15279000, s1: 55200, s2: 3300, s2_basis: 'market-based', s3: 15106833 },
  { name: 'Walmart', logo: '/logos/walmart.png', total: 652210000, s1: 9030000, s2: 6610000, s2_basis: 'market-based', s3: 636570000 },
  { name: 'Meta', logo: '/logos/meta.png', total: 8200595, s1: 47468, s2: 1358, s2_basis: 'market-based', s3: 8151769 },
  { name: 'Toyota', logo: '/logos/toyota.png', total: 592890000, s1: 2560000, s2: 2870000, s2_basis: 'market-based', s3: 587460000 },
  { name: 'Nike', logo: '/logos/nike.png', total: 8266474, s1: 57390, s2: 12120, s2_basis: 'market-based', s3: 8196965 },
];

// Count-up hook
function useCountUp(target: number, duration: number, start: boolean) {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (!start) return;
    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * target));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        setValue(target);
      }
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration, start]);

  return value;
}

// Animate between two values smoothly
function useAnimatedValue(target: number, duration = 800) {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return;
    const startTime = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.floor(from + (target - from) * eased));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        setDisplay(target);
        fromRef.current = target;
      }
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return display;
}

// Format large numbers compactly: 15,279,000 → "15.3M"
function formatCompact(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toLocaleString();
}

// Scope bar sub-component
function ScopeBar({ label, value, maxValue, color = 'bg-gray-900' }: {
  label: string; value: number; maxValue: number; color?: string;
}) {
  const animatedVal = useAnimatedValue(value);
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[12px] font-medium text-gray-500">{label}</span>
        <span className="text-[13px] font-mono font-semibold text-gray-900 tabular-nums">
          {formatCompact(animatedVal)} <span className="text-[10px] font-normal text-gray-400">tCO₂e</span>
        </span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${color}`}
          style={{ width: `${Math.max(pct, 1.5)}%` }}
        />
      </div>
    </div>
  );
}

const Index = () => {
  // Company grid cycling
  const [activeCompany, setActiveCompany] = useState(0);
  const cycleRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    cycleRef.current = setInterval(() => {
      setActiveCompany(prev => (prev + 1) % COMPANIES.length);
    }, 5000);
    return () => clearInterval(cycleRef.current);
  }, []);

  // Stop cycling on manual click
  const handleCompanyClick = useCallback((i: number) => {
    setActiveCompany(i);
    clearInterval(cycleRef.current);
  }, []);

  // Stats count-up logic
  const BASE_DATA_POINTS = 126896457;
  const BASE_DATE = new Date('2025-01-01T00:00:00Z');

  const calculateCurrentDataPoints = () => {
    const now = new Date();
    const minutesElapsed = Math.floor((now.getTime() - BASE_DATE.getTime()) / (1000 * 60));
    return BASE_DATA_POINTS + Math.floor(minutesElapsed * 2.5);
  };

  const [dataPoints, setDataPoints] = useState(calculateCurrentDataPoints());
  const [hasAnimated, setHasAnimated] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);
  const scheduleRef = useRef(false);

  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !hasAnimated) setHasAnimated(true); },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasAnimated]);

  useEffect(() => {
    if (!hasAnimated || scheduleRef.current) return;
    scheduleRef.current = true;
    const initDelay = setTimeout(() => {
      const tick = () => {
        setTimeout(() => { setDataPoints(prev => prev + 1); tick(); },
          Math.floor(Math.random() * 10000) + 20000);
      };
      tick();
    }, 1400);
    return () => clearTimeout(initDelay);
  }, [hasAnimated]);

  const initialDataPoints = useCountUp(calculateCurrentDataPoints(), 1200, hasAnimated);
  const liveDataPoints = useAnimatedValue(hasAnimated ? dataPoints : 0, 800);
  const [initialCountDone, setInitialCountDone] = useState(false);

  useEffect(() => {
    if (hasAnimated && !initialCountDone) {
      const timer = setTimeout(() => setInitialCountDone(true), 1300);
      return () => clearTimeout(timer);
    }
  }, [hasAnimated, initialCountDone]);

  const animatedDataPoints = initialCountDone ? liveDataPoints : initialDataPoints;
  const animatedProfiles = useCountUp(12, 1200, hasAnimated);
  const formatNumber = useCallback((num: number) => num.toLocaleString(), []);

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="pt-24 pb-20 px-4 md:px-8">
        <div className="max-w-[1200px] mx-auto flex flex-col gap-px bg-gray-200 border border-gray-200 rounded-2xl overflow-hidden">

          {/* HERO */}
          <div className="bg-white px-8 md:px-16 py-16 md:py-24 text-center">
            <h1 className="text-4xl md:text-5xl lg:text-[56px] font-semibold leading-[1.1] tracking-[-0.03em] mb-6 text-gray-900">
              Unlock High-Value Insights with<br className="hidden md:block" />
              Precision Climate Data
            </h1>
            <p className="text-lg md:text-xl text-gray-400 font-normal mb-10 max-w-2xl mx-auto leading-relaxed">
              Access comprehensive corporate climate profiles built on a multi-layered fabric of emissions reports, models and signals.
            </p>
            <div className="flex justify-center gap-4">
              <Button className="bg-black text-white hover:bg-gray-800 rounded-full px-8 py-3 h-auto text-base font-medium" asChild>
                <Link to="/auth">Get Started</Link>
              </Button>
              <Button variant="outline" className="border-gray-300 text-gray-600 hover:text-black hover:border-black rounded-full px-8 py-3 h-auto text-base font-medium bg-white" asChild>
                <Link to="/pricing">See Pricing</Link>
              </Button>
            </div>
          </div>

          {/* COMPANY GRID + API RESPONSE */}
          <div className="bg-white p-8 md:p-10">
            <div className="section-label mb-5">Live Data</div>
            <div className="max-w-4xl mx-auto">
              <div className="flex flex-col md:flex-row gap-8">
                {/* 3x3 Company Grid */}
                <div className="grid grid-cols-3 gap-px bg-gray-200 rounded-lg overflow-hidden flex-shrink-0 md:w-[280px]">
                  {COMPANIES.map((company, i) => (
                    <button
                      key={company.name}
                      onClick={() => handleCompanyClick(i)}
                      className={`bg-white p-5 flex flex-col items-center justify-center gap-2 transition-all duration-300 ${
                        activeCompany === i
                          ? 'bg-gray-50'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <img
                        src={company.logo}
                        alt={company.name}
                        className="w-8 h-8 object-contain transition-all duration-500"
                        style={{
                          filter: activeCompany === i ? 'none' : 'grayscale(100%)',
                          opacity: activeCompany === i ? 1 : 0.4,
                        }}
                      />
                      <span className={`text-[10px] font-medium tracking-tight leading-tight transition-colors duration-300 ${
                        activeCompany === i ? 'text-gray-900' : 'text-gray-400'
                      }`}>
                        {company.name}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Emissions breakdown for active company */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-5">
                    <span className="text-[11px] font-medium uppercase tracking-[0.08em] border border-gray-300 rounded-full px-3 py-1 text-gray-900">
                      POST /v1/ghg/latest
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-gray-400">2024</span>
                      <span className="text-[10px] font-medium uppercase tracking-[0.06em] rounded-full px-2.5 py-0.5 text-black" style={{ backgroundColor: '#B3FD00' }}>
                        reported
                      </span>
                    </div>
                  </div>

                  {/* Company name + total */}
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold tracking-[-0.01em] text-gray-900 mb-1">
                      {COMPANIES[activeCompany].name}
                    </h3>
                    <div className="flex items-baseline gap-2">
                      <span className="text-[28px] font-semibold font-mono tracking-[-0.02em] text-gray-900 tabular-nums">
                        {formatCompact(useAnimatedValue(COMPANIES[activeCompany].total))}
                      </span>
                      <span className="text-[12px] text-gray-400">total tCO₂e</span>
                    </div>
                  </div>

                  {/* Scope bars */}
                  <div className="space-y-4">
                    <ScopeBar
                      label="Scope 1 — Direct"
                      value={COMPANIES[activeCompany].s1}
                      maxValue={COMPANIES[activeCompany].total}
                      color="bg-gray-900"
                    />
                    <ScopeBar
                      label={`Scope 2 — Indirect (${COMPANIES[activeCompany].s2_basis})`}
                      value={COMPANIES[activeCompany].s2}
                      maxValue={COMPANIES[activeCompany].total}
                    />
                    <ScopeBar
                      label="Scope 3 — Value chain"
                      value={COMPANIES[activeCompany].s3}
                      maxValue={COMPANIES[activeCompany].total}
                    />
                  </div>

                  {/* Inline JSON response */}
                  <div className="mt-5">
                    <code className="text-[10px] font-mono text-gray-400 bg-gray-50 rounded-md px-3 py-2 block overflow-x-auto whitespace-nowrap">
                      {`{ "status": "ok", "company": "${COMPANIES[activeCompany].name}", "total_emissions_tco2e": ${COMPANIES[activeCompany].total.toLocaleString()}, "scope1": ${COMPANIES[activeCompany].s1.toLocaleString()}, "scope2": ${COMPANIES[activeCompany].s2.toLocaleString()}, "scope2_basis": "${COMPANIES[activeCompany].s2_basis}", "scope3": ${COMPANIES[activeCompany].s3.toLocaleString()} }`}
                    </code>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* VALUE PROPS — 3-col grid within the row */}
          <div className="grid md:grid-cols-3 gap-px" id="solutions">
            <div className="bg-white p-8">
              <div className="w-10 h-10 rounded-full flex items-center justify-center mb-5" style={{ backgroundColor: '#B3FD00' }}>
                <GitBranch className="text-black" size={20} strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-semibold tracking-[-0.01em] mb-2 text-gray-900">
                Go-to-Market Enrichment
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Target corporate clients for emissions-sensitive products and services.
              </p>
            </div>
            <div className="bg-white p-8">
              <div className="w-10 h-10 rounded-full flex items-center justify-center mb-5" style={{ backgroundColor: '#B3FD00' }}>
                <Code className="text-black" size={20} strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-semibold tracking-[-0.01em] mb-2 text-gray-900">
                Analysis & Market Research
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                For corporate sustainability experts, investors, insurers and more.
              </p>
            </div>
            <div className="bg-white p-8">
              <div className="w-10 h-10 rounded-full flex items-center justify-center mb-5" style={{ backgroundColor: '#B3FD00' }}>
                <Infinity className="text-black" size={20} strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-semibold tracking-[-0.01em] mb-2 text-gray-900">
                Core Insights & Custom Applications
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                For a multitude of use-cases we haven't yet imagined.
              </p>
            </div>
          </div>

          {/* INTEGRATIONS */}
          <div className="bg-white p-8 md:p-10" id="integrations">
            <div className="section-label mb-5">Integrations</div>
            <div className="grid md:grid-cols-[3fr_2fr] md:items-center gap-8 md:gap-12">
              <div>
                <h2 className="text-2xl md:text-3xl font-semibold tracking-[-0.02em] leading-[1.2] mb-4 text-gray-900">
                  <span className="underline decoration-2 underline-offset-4" style={{ textDecorationColor: '#B3FD00' }}>Send climate data</span> where it works best
                </h2>
                <p className="text-sm text-gray-500 leading-relaxed max-w-md mb-5">
                  Connect Aurora with flows in n8n, Clay, Zapier and more to enrich leads with critical emissions data points.
                </p>
                <Button variant="outline" className="border-gray-300 text-gray-600 hover:text-black hover:border-black rounded-full px-6 py-2.5 h-auto text-sm font-medium bg-white" asChild>
                  <Link to="/docs">
                    API Docs <ArrowUpRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              </div>
              <div className="flex justify-start">
                <div className="grid grid-cols-2 gap-3">
                  <div className="border border-gray-200 rounded-lg flex items-center justify-center p-5 h-20 w-36">
                    <img src="/clay_gs.png" alt="Clay" className="max-w-full max-h-full object-contain" />
                  </div>
                  <div className="border border-gray-200 rounded-lg flex items-center justify-center p-5 h-20 w-36">
                    <img src="/n8n_gs.png" alt="n8n" className="max-w-full max-h-full object-contain" />
                  </div>
                  <div className="border border-gray-200 rounded-lg flex items-center justify-center p-5 h-20 w-36">
                    <img src="/zapier_gs.png" alt="Zapier" className="max-w-full max-h-full object-contain" />
                  </div>
                  <div className="border border-gray-200 rounded-lg flex items-center justify-center p-5 h-20 w-36">
                    <img src="/make_gs.png" alt="Make" className="max-w-full max-h-full object-contain" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* STATS — 3-col KPIs */}
          <div className="grid md:grid-cols-3 gap-px" ref={statsRef}>
            <div className="bg-white p-8 text-center">
              <span className="text-[13px] font-medium text-gray-500 uppercase tracking-[0.05em]">Data Refresh</span>
              <div className="text-[32px] font-semibold font-mono text-black tracking-[-0.02em] mt-2">Daily</div>
            </div>
            <div className="bg-white p-8 text-center">
              <span className="text-[13px] font-medium text-gray-500 uppercase tracking-[0.05em]">Data Points</span>
              <div className="text-[32px] font-semibold font-mono text-black tracking-[-0.02em] mt-2 tabular-nums">
                {hasAnimated ? formatNumber(animatedDataPoints) : '0'}
              </div>
            </div>
            <div className="bg-white p-8 text-center">
              <span className="text-[13px] font-medium text-gray-500 uppercase tracking-[0.05em]">Climate Profiles</span>
              <div className="text-[32px] font-semibold font-mono text-black tracking-[-0.02em] mt-2 tabular-nums">
                {hasAnimated ? `${animatedProfiles}M+` : '0M+'}
              </div>
            </div>
          </div>

          {/* TRUSTED BY */}
          <div className="bg-white px-8 md:px-10 py-10 text-center">
            <div className="section-label justify-center mb-6">Trusted By</div>
            <p className="text-sm text-gray-500 mb-8 max-w-lg mx-auto">
              Built by researchers with deep domain experience and cross-industry exposure
            </p>
            <div className="flex flex-wrap justify-center items-center gap-10 md:gap-14">
              <span className="text-xl font-semibold text-gray-300 tracking-tight">recapture</span>
              <span className="text-xl font-semibold text-gray-300 tracking-tight">Yale</span>
              <span className="w-8 h-8 bg-gray-200 rounded-full"></span>
              <span className="text-xl font-semibold text-gray-300 tracking-tight">devon</span>
            </div>
          </div>

          {/* CTA */}
          <div className="bg-white px-8 md:px-10 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-semibold tracking-[-0.02em] leading-[1.2] text-gray-900 mb-2">
                Ready to start your emissions-driven strategy?
              </h2>
              <p className="text-sm text-gray-500">
                Join industry leaders who rely on Aurora's precise climate data intelligence.
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
                <Link to="/pricing">Pricing</Link>
              </Button>
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
