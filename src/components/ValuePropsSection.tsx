import { GitBranch, Code, Infinity } from 'lucide-react';

const ValuePropsSection = () => {
  return (
    <section id="solutions" className="py-24 px-4 md:px-8 bg-white">
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-[-0.02em] leading-[1.2] mb-6 text-gray-900">
            Put GHG emissions at the forefront<br />
            of decision making
          </h2>
          <p className="text-base text-gray-500 max-w-3xl mx-auto leading-relaxed">
            Whether you are a growth marketer selling to corporate clients or a researcher measuring benchmarks (and everything in between), climate data shines a light on the blind spots of ESG realities.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="border border-gray-200 rounded-xl p-8 bg-white">
            <GitBranch className="text-black mb-6" size={28} strokeWidth={1.5} />
            <h3 className="text-xl font-semibold tracking-[-0.01em] mb-3 text-gray-900">
              Go-to-Market Enrichment
            </h3>
            <p className="text-gray-500 leading-relaxed">
              Target corporate clients for emissions-sensitive products and services.
            </p>
          </div>

          <div className="border border-gray-200 rounded-xl p-8 bg-white">
            <Code className="text-black mb-6" size={28} strokeWidth={1.5} />
            <h3 className="text-xl font-semibold tracking-[-0.01em] mb-3 text-gray-900">
              Analysis & Market Research
            </h3>
            <p className="text-gray-500 leading-relaxed">
              For corporate sustainability experts, investors, insurers and more.
            </p>
          </div>

          <div className="border border-gray-200 rounded-xl p-8 bg-white">
            <Infinity className="text-black mb-6" size={28} strokeWidth={1.5} />
            <h3 className="text-xl font-semibold tracking-[-0.01em] mb-3 text-gray-900">
              Core Insights & Custom Applications
            </h3>
            <p className="text-gray-500 leading-relaxed">
              For a multitude of use-cases we haven't yet imagined.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ValuePropsSection;
