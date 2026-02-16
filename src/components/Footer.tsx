const Footer = () => {
  return (
    <footer className="bg-primary-black text-white py-16 px-4 md:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="md:col-span-1">
            <div className="mb-6">
              <img
                src="/aurora-logo-white.png"
                alt="Aurora"
                className="h-8 w-auto mb-4"
              />
            </div>
            <p className="text-detail-light mb-6 max-w-md font-sans">
              Aurora comprehensive corporate climate data built on emissions reports, models and signals.
            </p>
            <p className="text-sm text-detail-gray font-sans">
              Precision climate intelligence for smarter business decisions.
            </p>
          </div>

          <div>
            <h3 className="font-heading font-medium text-lg mb-4 text-secondary-green">Solutions</h3>
            <ul className="space-y-3">
              <li><a href="#" className="text-detail-light hover:text-white transition-colors font-sans">Data Enrichment API</a></li>
              <li><a href="#" className="text-detail-light hover:text-white transition-colors font-sans">GHG Reports API</a></li>
              <li><a href="#" className="text-detail-light hover:text-white transition-colors font-sans">Custom Datasets</a></li>
            </ul>
          </div>

          <div>
            <h3 className="font-heading font-medium text-lg mb-4 text-secondary-green">Get Access</h3>
            <ul className="space-y-3">
              <li><a href="#" className="text-detail-light hover:text-white transition-colors font-sans">Sign Up</a></li>
              <li><a href="#" className="text-detail-light hover:text-white transition-colors font-sans">Request Demo</a></li>
              <li><a href="#" className="text-detail-light hover:text-white transition-colors font-sans">API Docs</a></li>
            </ul>
          </div>

          <div>
            <h3 className="font-heading font-medium text-lg mb-4 text-secondary-green">Contact Info</h3>
            <ul className="space-y-3">
              <li><span className="text-detail-light font-sans">hi@auroracarbon.com</span></li>
              <li><span className="text-detail-light font-sans">64 Fulton Street</span></li>
              <li><span className="text-detail-light font-sans">London, United Kingdom</span></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-detail-gray mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-detail-gray mb-4 md:mb-0 font-sans">
            © {new Date().getFullYear()} Aurora Carbon. All rights reserved.
          </p>
          <div className="flex space-x-6 text-sm font-sans">
            <a href="#" className="text-detail-light hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="text-detail-light hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="text-detail-light hover:text-white transition-colors">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
