import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { useState } from "react";
import { AURORA_BOX_SHADOW } from "@/lib/constants";

const Hero = () => {
  const [email, setEmail] = useState("");

  return (
    <section className="pt-32 pb-20 px-4 md:px-8 bg-[#f9f9f9]">
      <div className="max-w-5xl mx-auto text-center">
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-heading font-medium leading-tight mb-6 text-primary-black">
          Unlock High-Value Insights with<br />
          Precision Climate Data
        </h1>
        <p className="text-lg md:text-xl text-detail-gray mb-12 max-w-2xl mx-auto font-sans">
          Access comprehensive corporate climate profiles built on a multi-layered fabric of emissions reports, models and signals.
        </p>

        {/* Email input with embedded button */}
        <div className="flex justify-center mb-24">
          <div
            className="bg-white rounded-lg p-2 flex items-center max-w-md w-full"
            style={{ boxShadow: AURORA_BOX_SHADOW }}
          >
            <Input
              type="email"
              placeholder="Enter your work email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 border-0 bg-transparent text-primary-black placeholder:text-detail-gray font-sans focus:ring-0 focus:outline-none"
            />
            <Button className="bg-primary-black text-white hover:bg-detail-gray rounded-lg ml-2 px-6 font-medium" asChild>
              <Link to="/auth">Get Climate Data →</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Three Element Layout - Aligned with header */}
      <div className="max-w-5xl mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between">
          {/* Left: Corporate Logo Circle */}
          <div
            className="w-64 h-64 bg-white rounded-full flex items-center justify-center flex-shrink-0"
            style={{ boxShadow: AURORA_BOX_SHADOW }}
          >
            <img
              src="/corporate-logo-unilever.png"
              alt="Unilever"
              className="w-24 h-24 object-contain"
            />
          </div>

          {/* Middle: Dotted Line */}
          <div className="hidden lg:flex items-center gap-2">
            <div className="w-2 h-2 bg-[#e6e6e6] rounded-full"></div>
            <div className="w-2 h-2 bg-[#e6e6e6] rounded-full"></div>
            <div className="w-2 h-2 bg-[#e6e6e6] rounded-full"></div>
            <div className="w-2 h-2 bg-[#e6e6e6] rounded-full"></div>
            <div className="w-2 h-2 bg-[#e6e6e6] rounded-full"></div>
          </div>

          {/* Middle: Aurora Mark Circle */}
          <div
            className="w-24 h-24 bg-secondary-green rounded-full flex items-center justify-center flex-shrink-0 border-[12px] border-white p-4"
            style={{ boxShadow: AURORA_BOX_SHADOW }}
          >
            <img
              src="/aurora-mark-black.png"
              alt="Aurora"
              className="w-14 h-14 object-contain"
            />
          </div>

          {/* Middle: Dotted Line */}
          <div className="hidden lg:flex items-center gap-2">
            <div className="w-2 h-2 bg-[#e6e6e6] rounded-full"></div>
            <div className="w-2 h-2 bg-[#e6e6e6] rounded-full"></div>
            <div className="w-2 h-2 bg-[#e6e6e6] rounded-full"></div>
            <div className="w-2 h-2 bg-[#e6e6e6] rounded-full"></div>
            <div className="w-2 h-2 bg-[#e6e6e6] rounded-full"></div>
          </div>

          {/* Right: API Call Rectangle */}
          <div
            className="bg-white rounded-2xl p-6 flex-shrink-0 w-96"
            style={{ boxShadow: AURORA_BOX_SHADOW }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="bg-secondary-green text-primary-black px-4 py-1 rounded text-sm font-medium">
                API GHG LATEST
              </div>
              <div className="text-detail-gray text-sm font-mono">
                [.JSON ]
              </div>
            </div>

            <div className="space-y-3 text-left">
              <div className="bg-[#f9f9f9] px-4 py-2 rounded">
                <span className="text-detail-gray font-sans">Company: </span>
                <span className="text-primary-black font-medium">Unilever</span>
              </div>

              <div className="bg-[#f9f9f9] px-4 py-2 rounded">
                <span className="text-detail-gray font-sans">URL: </span>
                <span className="text-primary-black font-medium">https://unilever.com</span>
              </div>

              <div className="bg-[#f9f9f9] px-4 py-2 rounded">
                <span className="text-detail-gray font-sans">Emissions Year: </span>
                <span className="text-primary-black font-medium">2024</span>
              </div>

              <div className="bg-[#f9f9f9] px-4 py-2 rounded">
                <span className="text-detail-gray font-sans">Total Emissions: </span>
                <span className="text-primary-black font-medium">189.3M tCO₂</span>
              </div>

              <div className="bg-[#f9f9f9] px-4 py-2 rounded">
                <span className="text-detail-gray font-sans">Scope 1: </span>
                <span className="text-primary-black font-medium">87k tCO₂</span>
              </div>

              <div className="bg-[#f9f9f9] px-4 py-2 rounded">
                <span className="text-detail-gray font-sans">Scope 2: </span>
                <span className="text-primary-black font-medium">116k tCO₂</span>
              </div>

              <div className="bg-[#f9f9f9] px-4 py-2 rounded">
                <span className="text-detail-gray font-sans">Scope 2 Method: </span>
                <span className="text-primary-black font-medium">Market-Based</span>
              </div>

              <div className="bg-[#f9f9f9] px-4 py-2 rounded">
                <span className="text-detail-gray font-sans">Scope 3: </span>
                <span className="text-primary-black font-medium">183M tCO₂</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
