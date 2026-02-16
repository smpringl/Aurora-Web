import { GitBranch, Code, Infinity } from 'lucide-react';

const ValuePropsSection = () => {
  return (
    <section className="py-20 px-4 md:px-8 bg-[#f9f9f9]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-heading font-medium mb-6 text-primary-black">
            Put GHG emissions at the forefront<br />
            of decision making
          </h2>
          <p className="text-lg text-detail-gray font-sans max-w-3xl mx-auto">
            Whether you are a growth marketer selling to corporate clients or a researcher measuring benchmarks (and everything in between), climate data shines a light on the blind spots of ESG realities.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white rounded-2xl p-8 text-left">
            <div className="w-16 h-16 bg-primary-black rounded-full flex items-center justify-center mb-6">
              <GitBranch className="text-secondary-green" size={32} />
            </div>
            <h3 className="text-xl font-heading font-medium mb-4 text-primary-black">
              Go-to-Market<br />
              Enrichment
            </h3>
            <p className="text-detail-gray font-sans">
              Target corporate clients for emissions-sensitive products and services.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 text-left">
            <div className="w-16 h-16 bg-primary-black rounded-full flex items-center justify-center mb-6">
              <Code className="text-secondary-green" size={32} />
            </div>
            <h3 className="text-xl font-heading font-medium mb-4 text-primary-black">
              Analysis & Market<br />
              Research
            </h3>
            <p className="text-detail-gray font-sans">
              For corporate sustainability experts, investors, insurers and more.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 text-left">
            <div className="w-16 h-16 bg-primary-black rounded-full flex items-center justify-center mb-6">
              <Infinity className="text-secondary-green" size={32} />
            </div>
            <h3 className="text-xl font-heading font-medium mb-4 text-primary-black">
              Core Insights &<br />
              Custom Applications
            </h3>
            <p className="text-detail-gray font-sans">
              For a multitude of use-cases we haven't yet imagined.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ValuePropsSection;
