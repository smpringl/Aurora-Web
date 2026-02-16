import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Link } from "react-router-dom";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="w-full bg-white border-b border-detail-light fixed top-0 z-50 backdrop-blur-sm bg-white/95">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo on the left */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <img
                src="/aurora-logo-black.png"
                alt="Aurora"
                className="h-7 w-auto"
              />
            </Link>
          </div>

          {/* Desktop Navigation - Links in center */}
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#solutions" className="text-sm font-medium text-detail-gray hover:text-primary-black transition-colors">
              Solutions
            </a>
            <a href="#integrations" className="text-sm font-medium text-detail-gray hover:text-primary-black transition-colors">
              Integrations
            </a>
            <Link to="/pricing" className="text-sm font-medium text-detail-gray hover:text-primary-black transition-colors">
              Pricing
            </Link>
          </nav>

          {/* Buttons on the right */}
          <div className="hidden md:flex items-center space-x-3">
            <Button variant="ghost" className="font-medium text-detail-gray hover:text-primary-black hover:bg-transparent" asChild>
              <Link to="/auth?mode=signin">Log In</Link>
            </Button>
            <Button className="bg-primary-black text-white hover:bg-detail-gray font-medium rounded-lg px-5" asChild>
              <Link to="/auth">Sign Up</Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-detail-gray hover:text-primary-black"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-detail-light">
            <nav className="flex flex-col space-y-3">
              <a
                href="#solutions"
                className="text-sm font-medium text-detail-gray hover:text-primary-black transition-colors py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Solutions
              </a>
              <a
                href="#integrations"
                className="text-sm font-medium text-detail-gray hover:text-primary-black transition-colors py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Integrations
              </a>
              <Link
                to="/pricing"
                className="text-sm font-medium text-detail-gray hover:text-primary-black transition-colors py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Pricing
              </Link>
              <div className="flex flex-col space-y-2 pt-4 border-t border-detail-light">
                <Button variant="ghost" className="w-full justify-start font-medium text-detail-gray hover:text-primary-black hover:bg-transparent" asChild>
                  <Link to="/auth?mode=signin" onClick={() => setIsMenuOpen(false)}>Log In</Link>
                </Button>
                <Button className="w-full bg-primary-black text-white hover:bg-detail-gray font-medium rounded-lg" asChild>
                  <Link to="/auth" onClick={() => setIsMenuOpen(false)}>Sign Up</Link>
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
