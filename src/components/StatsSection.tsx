import { useState, useEffect } from 'react';

const StatsSection = () => {
  // Base number as of January 1, 2025
  const BASE_DATA_POINTS = 126896457;
  const BASE_DATE = new Date('2025-01-01T00:00:00Z');
  const DATA_POINTS_PER_MINUTE = 2.5;

  // Calculate the current data points based on time elapsed since base date
  const calculateCurrentDataPoints = () => {
    const now = new Date();
    const minutesElapsed = Math.floor((now.getTime() - BASE_DATE.getTime()) / (1000 * 60));
    const additionalPoints = Math.floor(minutesElapsed * DATA_POINTS_PER_MINUTE);
    return BASE_DATA_POINTS + additionalPoints;
  };

  const [dataPoints, setDataPoints] = useState(calculateCurrentDataPoints());
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Increment by 1 every 20-30 seconds (randomly between 20000-30000ms)
    const scheduleNextIncrement = () => {
      const delay = Math.floor(Math.random() * 10000) + 20000; // Random between 20-30 seconds

      setTimeout(() => {
        setIsAnimating(true);
        setTimeout(() => {
          setDataPoints(prev => prev + 1);
          setTimeout(() => {
            setIsAnimating(false);
            scheduleNextIncrement(); // Schedule the next increment
          }, 800);
        }, 100);
      }, delay);
    };

    // Start the increment cycle
    scheduleNextIncrement();
  }, []);

  // Format number with commas
  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  return (
    <section className="py-20 px-4 md:px-8 bg-[#f9f9f9]">
      <div className="max-w-5xl mx-auto">
        <div className="grid md:grid-cols-3 gap-12 text-center">
          <div>
            <h3 className="text-4xl font-heading mb-2 text-primary-black">Daily</h3>
            <p className="text-detail-gray font-sans">Data Refresh</p>
          </div>
          <div>
            <h3
              className={`text-4xl font-heading mb-2 text-primary-black transition-all duration-800 ease-in-out ${
                isAnimating ? 'font-bold' : ''
              }`}
            >
              {formatNumber(dataPoints)}
            </h3>
            <p className="text-detail-gray font-sans">Data Points</p>
          </div>
          <div>
            <h3 className="text-4xl font-heading mb-2 text-primary-black">12M+</h3>
            <p className="text-detail-gray font-sans">Climate Profiles</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
