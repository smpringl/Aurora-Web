import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Hero = () => {
  return (
    <section className="pt-32 pb-24 px-4 md:px-8 bg-white">
      <div className="max-w-[1200px] mx-auto">
        {/* Text content */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl lg:text-[56px] font-semibold leading-[1.1] tracking-[-0.03em] mb-6 text-gray-900">
            Unlock High-Value Insights with<br />
            Precision Climate Data
          </h1>
          <p className="text-lg md:text-xl text-gray-400 font-normal mb-10 max-w-2xl mx-auto leading-relaxed">
            Access comprehensive corporate climate profiles built on a multi-layered fabric of emissions reports, models and signals.
          </p>
          <div className="flex justify-center gap-4">
            <Button className="bg-black text-white hover:bg-gray-800 rounded-full px-8 py-3 h-auto text-base font-medium" asChild>
              <Link to="/auth">Get Started</Link>
            </Button>
            <Button variant="outline" className="border-gray-200 text-gray-600 hover:text-black hover:border-black rounded-full px-8 py-3 h-auto text-base font-medium" asChild>
              <Link to="/pricing">See Pricing</Link>
            </Button>
          </div>
        </div>

        {/* API Response showcase */}
        <div className="max-w-3xl mx-auto">
          <div className="section-label mb-4">API Response</div>
          <div className="border border-gray-200 rounded-xl p-8 bg-white">
            <div className="flex items-center justify-between mb-6">
              <span className="text-xs font-medium uppercase tracking-[0.08em] border border-gray-700 rounded-full px-4 py-1.5 text-gray-900">
                POST /v1/ghg/latest
              </span>
              <span className="text-xs font-mono text-gray-400">
                application/json
              </span>
            </div>

            <pre className="text-[13px] font-mono bg-gray-50 rounded-lg p-6 overflow-x-auto text-gray-900 leading-relaxed">
{`{
  "status": "ok",
  "company": "Unilever",
  "year": 2024,
  "methodology": "reported",
  "total_emissions_tco2e": 29800000,
  "scope1_emissions_tco2e": 289000,
  "scope2_emissions_tco2e": 521000,
  "scope2_basis": "market-based",
  "scope3_emissions_tco2e": 28829000
}`}
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
