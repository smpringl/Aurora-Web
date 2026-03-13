import { useState, useEffect, useRef, useCallback } from 'react';

// Eased count-up hook — counts from 0 to target over `duration` ms on trigger
function useCountUp(target: number, duration: number, start: boolean) {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (!start) return;

    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
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

const StatsSection = () => {
  const BASE_DATA_POINTS = 126896457;
  const BASE_DATE = new Date('2025-01-01T00:00:00Z');
  const DATA_POINTS_PER_MINUTE = 2.5;

  const calculateCurrentDataPoints = () => {
    const now = new Date();
    const minutesElapsed = Math.floor((now.getTime() - BASE_DATE.getTime()) / (1000 * 60));
    const additionalPoints = Math.floor(minutesElapsed * DATA_POINTS_PER_MINUTE);
    return BASE_DATA_POINTS + additionalPoints;
  };

  const [dataPoints, setDataPoints] = useState(calculateCurrentDataPoints());
  const [hasAnimated, setHasAnimated] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  // Intersection observer — trigger count-up when section enters viewport
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasAnimated]);

  // Live increment after initial count-up finishes (delayed by animation duration)
  const scheduleRef = useRef(false);
  useEffect(() => {
    if (!hasAnimated || scheduleRef.current) return;
    scheduleRef.current = true;

    // Wait for count-up to finish (1.2s) before starting live ticks
    const initDelay = setTimeout(() => {
      const scheduleNextIncrement = () => {
        const delay = Math.floor(Math.random() * 10000) + 20000;
        setTimeout(() => {
          setDataPoints(prev => prev + 1);
          scheduleNextIncrement();
        }, delay);
      };
      scheduleNextIncrement();
    }, 1400);

    return () => clearTimeout(initDelay);
  }, [hasAnimated]);

  // Count-up values
  const animatedDataPoints = useCountUp(dataPoints, 1200, hasAnimated);
  const animatedProfiles = useCountUp(12, 1200, hasAnimated);

  const formatNumber = useCallback((num: number) => {
    return num.toLocaleString();
  }, []);

  return (
    <section className="py-24 px-4 md:px-8 bg-white" ref={sectionRef}>
      <div className="max-w-[1200px] mx-auto">
        {/* KPI card grid — gap creates divider lines */}
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-200">
          <div className="grid md:grid-cols-3 gap-px">
            <div className="bg-white p-8 text-center">
              <span className="text-[13px] font-medium text-gray-500 uppercase tracking-[0.05em]">Data Refresh</span>
              <div className="text-[32px] font-semibold font-mono text-black tracking-[-0.02em] mt-2">
                Daily
              </div>
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
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
