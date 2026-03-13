import { Button } from "@/components/ui/button";

const IntegrationsShowcase = () => {
  return (
    <section id="integrations" className="py-24 px-4 md:px-8 bg-gray-50">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-[-0.02em] leading-[1.2] mb-6 text-gray-900">
              Send climate data where it<br />
              works best for you
            </h2>
            <p className="text-base text-gray-500 leading-relaxed mb-8">
              Connect Aurora with flows in n8n, Clay, Zapier and more to enrich leads with critical emissions data points.
            </p>
            <Button className="bg-black text-white hover:bg-gray-800 rounded-full px-8 py-3 h-auto text-base font-medium">
              See Setup Guides
            </Button>
          </div>

          <div className="flex justify-end">
            <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
              <div className="border border-gray-200 rounded-xl flex items-center justify-center p-6 h-28 bg-white">
                <img src="/clay_gs.png" alt="Clay" className="max-w-full max-h-full object-contain" />
              </div>
              <div className="border border-gray-200 rounded-xl flex items-center justify-center p-6 h-28 bg-white">
                <img src="/n8n_gs.png" alt="n8n" className="max-w-full max-h-full object-contain" />
              </div>
              <div className="border border-gray-200 rounded-xl flex items-center justify-center p-6 h-28 bg-white">
                <img src="/zapier_gs.png" alt="Zapier" className="max-w-full max-h-full object-contain" />
              </div>
              <div className="border border-gray-200 rounded-xl flex items-center justify-center p-6 h-28 bg-white">
                <img src="/make_gs.png" alt="Make" className="max-w-full max-h-full object-contain" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default IntegrationsShowcase;
