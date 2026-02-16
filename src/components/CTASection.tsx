import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const CTASection = () => {
  return (
    <section className="py-20 px-4 md:px-8 bg-[#f9f9f9] mb-20">
      <div className="max-w-5xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-heading font-medium mb-6 text-primary-black">
          Ready to Start Your<br />
          Emissions-Driven Strategy?
        </h2>
        <p className="text-lg text-detail-gray font-sans mb-10 max-w-2xl mx-auto">
          Join industry leaders who rely on Aurora's precise climate data intelligence to drive smarter decisions and superior outcomes across the board.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Button className="bg-primary-black text-white hover:bg-detail-gray font-heading px-8" asChild>
            <Link to="/auth">Get Started</Link>
          </Button>
          <Button variant="outline" className="border-primary-black text-primary-black hover:bg-primary-black hover:text-white font-heading px-8" asChild>
            <Link to="/pricing">See Pricing</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
