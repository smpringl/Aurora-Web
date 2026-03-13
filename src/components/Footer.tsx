const Footer = () => {
  return (
    <footer className="px-4 md:px-8 pb-8">
      <div className="max-w-[1200px] mx-auto bg-black text-white rounded-2xl py-14 px-8 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="md:col-span-1">
            <div className="mb-6">
              <img
                src="/aurora-logo-white.png"
                alt="Aurora"
                className="h-8 w-auto mb-4"
              />
            </div>
            <p className="text-gray-400 mb-6 max-w-md text-sm leading-relaxed">
              Comprehensive corporate climate data built on emissions reports, models and signals.
            </p>
            <p className="text-xs text-gray-500">
              Precision climate intelligence for smarter business decisions.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium uppercase tracking-[0.06em] text-white mb-4">Solutions</h3>
            <ul className="space-y-3">
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Data Enrichment API</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">GHG Reports API</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Custom Datasets</a></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-medium uppercase tracking-[0.06em] text-white mb-4">Get Access</h3>
            <ul className="space-y-3">
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Sign Up</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Request Demo</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">API Docs</a></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-medium uppercase tracking-[0.06em] text-white mb-4">Contact</h3>
            <ul className="space-y-3">
              <li><span className="text-gray-400 text-sm">hi@auroracarbon.com</span></li>
              <li><span className="text-gray-400 text-sm">64 Fulton Street</span></li>
              <li><span className="text-gray-400 text-sm">London, United Kingdom</span></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-xs text-gray-500 mb-4 md:mb-0">
            &copy; {new Date().getFullYear()} Aurora Carbon. All rights reserved.
          </p>
          <div className="flex space-x-6 text-xs">
            <a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
