import { Button } from "@/components/ui/button";
import { AURORA_BOX_SHADOW } from "@/lib/constants";

const IntegrationsShowcase = () => {
  return (
    <section className="py-20 px-4 md:px-8 bg-[#f9f9f9]">
      <div className="max-w-5xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-heading font-medium mb-6 text-primary-black">
              Send climate data where it<br />
              works best for you
            </h2>
            <p className="text-lg text-detail-gray font-sans mb-8">
              Connect Aurora with flows in n8n, Clay, Zapier and more to enrich leads with critical emissions data points.
            </p>
            <Button className="bg-primary-black text-white hover:bg-detail-gray font-heading">
              See Setup Guides
            </Button>
          </div>

          <div className="relative flex justify-end">
            {/* Aurora Mark Background */}
            <div className="relative w-96 h-80">
              <img
                src="/aurora-big-mark.png"
                alt="Aurora Mark"
                className="w-full h-full object-contain"
              />

              {/* Grid of Integration Logos */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="grid grid-cols-2 gap-3 w-80">
                  {/* Top Left - Clay */}
                  <div
                    className="bg-white rounded-lg flex items-center justify-center p-4 h-24"
                    style={{ boxShadow: AURORA_BOX_SHADOW }}
                  >
                    <img
                      src="/clay_gs.png"
                      alt="Clay"
                      className="max-w-60 max-h-full"
                    />
                  </div>

                  {/* Top Right - n8n */}
                  <div
                    className="bg-white rounded-lg flex items-center justify-center p-4 h-24"
                    style={{ boxShadow: AURORA_BOX_SHADOW }}
                  >
                    <img
                      src="/n8n_gs.png"
                      alt="n8n"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>

                  {/* Bottom Left - Zapier */}
                  <div
                    className="bg-white rounded-lg flex items-center justify-center p-4 h-24"
                    style={{ boxShadow: AURORA_BOX_SHADOW }}
                  >
                    <img
                      src="/zapier_gs.png"
                      alt="Zapier"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>

                  {/* Bottom Right - Make */}
                  <div
                    className="bg-white rounded-lg flex items-center justify-center p-4 h-24"
                    style={{ boxShadow: AURORA_BOX_SHADOW }}
                  >
                    <img
                      src="/make_gs.png"
                      alt="Make"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default IntegrationsShowcase;
