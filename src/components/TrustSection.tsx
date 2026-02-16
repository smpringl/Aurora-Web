const TrustSection = () => {
  return (
    <section className="py-16 px-4 md:px-8 bg-[#f9f9f9]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-sm text-detail-gray font-sans mb-8">
            Built by researchers with deep domain experience and cross-industry exposure
          </p>

          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
            <div className="text-2xl font-bold text-detail-gray">recapture</div>
            <div className="text-2xl font-bold text-detail-gray">Yale</div>
            <div className="w-12 h-12 bg-detail-light rounded-full"></div>
            <div className="text-2xl font-bold text-detail-gray">devon</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrustSection;
