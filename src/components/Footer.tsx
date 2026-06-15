import { Link } from "react-router-dom";
import logo from "@/assets/logo.jpg";
import { Instagram, Facebook, Phone, Mail } from "lucide-react";

const TikTokIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1 0-5.78c.16 0 .31.03.45.06v-3.5a6.33 6.33 0 0 0-.45-.02A6.34 6.34 0 0 0 4 15.45a6.34 6.34 0 0 0 6.34 6.33 6.33 6.33 0 0 0 6.33-6.33V8.83a7.86 7.86 0 0 0 4.6 1.47V7.13a4.72 4.72 0 0 1-1.68-.44z"/>
  </svg>
);

const Footer = () => (
  <footer className="border-t border-border bg-primary text-primary-foreground" role="contentinfo">
    <div className="container mx-auto px-4 py-12">
      <div className="grid gap-8 md:grid-cols-4">
        <div>
          <Link to="/" className="mb-4 flex items-center gap-2">
            <img src={logo} alt="PROP-connect" className="h-12 w-12 rounded-lg object-contain" />
          </Link>
          <p className="text-sm text-primary-foreground/70">
            Nigeria's most secure digital property marketplace with escrow protection and trust verification.
          </p>
          <div className="mt-4 flex gap-3">
            <a href="https://instagram.com/propconnect2" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="rounded-full bg-white/10 p-2 hover:bg-white/20 transition-colors">
              <Instagram className="h-4 w-4 text-primary-foreground" />
            </a>
            <a href="https://tiktok.com/@prop.connect" target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="rounded-full bg-white/10 p-2 hover:bg-white/20 transition-colors">
              <TikTokIcon />
            </a>
            <a href="https://facebook.com/Prop Connect" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="rounded-full bg-white/10 p-2 hover:bg-white/20 transition-colors">
              <Facebook className="h-4 w-4 text-primary-foreground" />
            </a>
          </div>
        </div>
        <div>
          <h4 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-secondary">Platform</h4>
          <div className="flex flex-col gap-2">
            <Link to="/properties" className="text-sm text-primary-foreground/70 hover:text-primary-foreground">Properties</Link>
            <Link to="/agents" className="text-sm text-primary-foreground/70 hover:text-primary-foreground">Find Agents</Link>
            <Link to="/announcements" className="text-sm text-primary-foreground/70 hover:text-primary-foreground">Announcements</Link>
            <Link to="/analytics" className="text-sm text-primary-foreground/70 hover:text-primary-foreground">Analytics</Link>
          </div>
        </div>
        <div>
          <h4 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-secondary">Trust & Safety</h4>
          <div className="flex flex-col gap-2">
            <span className="text-sm text-primary-foreground/70">Escrow Protection</span>
            <span className="text-sm text-primary-foreground/70">Agent Verification</span>
            <span className="text-sm text-primary-foreground/70">Code of Conduct</span>
            <span className="text-sm text-primary-foreground/70">NDPR Compliance</span>
          </div>
        </div>
        <div>
          <h4 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-secondary">Contact Us</h4>
          <div className="flex flex-col gap-2">
            <a href="mailto:propconnect0@gmail.com" className="flex items-center gap-2 text-sm text-primary-foreground/70 hover:text-primary-foreground">
              <Mail className="h-3.5 w-3.5 text-secondary" /> propconnect0@gmail.com
            </a>
            <a href="tel:+2348144954576" className="flex items-center gap-2 text-sm text-primary-foreground/70 hover:text-primary-foreground">
              <Phone className="h-3.5 w-3.5 text-secondary" /> 08144954576
            </a>
            <Link to="/terms" className="text-sm text-primary-foreground/70 hover:text-primary-foreground">Terms of Service</Link>
            <Link to="/privacy" className="text-sm text-primary-foreground/70 hover:text-primary-foreground">Privacy Policy</Link>
          </div>
        </div>
      </div>
      <div className="mt-8 border-t border-primary-foreground/20 pt-6 text-center text-xs text-primary-foreground/50">
        © 2026 Prop Connect. All rights reserved. Secured with end-to-end encryption.
      </div>
    </div>
  </footer>
);

export default Footer;
