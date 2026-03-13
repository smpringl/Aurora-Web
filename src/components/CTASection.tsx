import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const CTASection = () => {
  return (
    <section className="py-24 px-4 md:px-8 bg-gray-50">
      <div className="max-w-[1200px] mx-auto">
        <div className="border border-gray-200 rounded-xl bg-white p-12 md:p-16 flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="md:max-w-lg">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-[-0.02em] leading-[1.2] mb-4 text-gray-900">
              Ready to start your emissions-driven strategy?
            </h2>
            <p className="text-base text-gray-500 leading-relaxed">
              Join industry leaders who rely on Aurora's precise climate data intelligence to drive smarter decisions.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Button className="bg-black text-white hover:bg-gray-800 rounded-full px-8 py-3 h-auto text-base font-medium" asChild>
              <Link to="/auth">
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button variant="outline" className="border-gray-200 text-gray-600 hover:text-black hover:border-gray-400 rounded-full px-8 py-3 h-auto text-base font-medium" asChild>
              <Link to="/pricing">See Pricing</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
