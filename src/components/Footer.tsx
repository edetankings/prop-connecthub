import { Link } from "react-router-dom";
import logo from "@/assets/logo.jpg";

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
          <h4 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-secondary">Support</h4>
          <div className="flex flex-col gap-2">
            <span className="text-sm text-primary-foreground/70">Help Center</span>
            <span className="text-sm text-primary-foreground/70">Report a Dispute</span>
            <span className="text-sm text-primary-foreground/70">Terms of Service</span>
            <span className="text-sm text-primary-foreground/70">Privacy Policy</span>
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
