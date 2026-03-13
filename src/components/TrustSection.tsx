const TrustSection = () => {
  return (
    <section className="py-16 px-4 md:px-8 bg-gray-50">
      <div className="max-w-[1200px] mx-auto">
        <div className="section-label justify-center mb-8">Trusted By</div>
        <p className="text-sm text-gray-400 text-center mb-10">
          Built by researchers with deep domain experience and cross-industry exposure
        </p>
        <div className="flex flex-wrap justify-center items-center gap-10 md:gap-16">
          <div className="text-2xl font-semibold text-gray-400 tracking-tight">recapture</div>
          <div className="text-2xl font-semibold text-gray-400 tracking-tight">Yale</div>
          <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
          <div className="text-2xl font-semibold text-gray-400 tracking-tight">devon</div>
        </div>
      </div>
    </section>
  );
};

export default TrustSection;
