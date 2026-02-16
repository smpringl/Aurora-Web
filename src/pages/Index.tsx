import Header from "@/components/Header";
import Hero from "@/components/Hero";
import TrustSection from "@/components/TrustSection";
import ValuePropsSection from "@/components/ValuePropsSection";
import IntegrationsShowcase from "@/components/IntegrationsShowcase";
import StatsSection from "@/components/StatsSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-[#f9f9f9]">
      <Header />
      <main>
        <Hero />
        <TrustSection />
        <ValuePropsSection />
        <IntegrationsShowcase />
        <StatsSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
