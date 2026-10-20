import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import architecture from "@/assets/architecture-forest-v2.jpg";
import logo from "@/assets/logo.jpg";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className="auth-page">
    <aside className="auth-story" aria-label="About PROP-CONNECT">
      <img className="auth-story-image" src={architecture} alt="" width={1600} height={1000} />
      <Link className="auth-brand" to="/"><img src={logo} alt="" />PROP-CONNECT</Link>
      <div className="auth-story-copy"><p className="auth-eyebrow">A considered move.</p><h2>Your next chapter<br />starts with a place.</h2><p>Discover properties across Nigeria. Connect with the people who can help you take the next step.</p><Link to="/properties">Explore the marketplace </Link></div>
      <p className="auth-story-foot">Homes. Possibilities. New beginnings.</p>
    </aside>
    <div className="auth-form-panel"><header className="auth-mobile-brand"><Link to="/"><img src={logo} alt="" />PROP-CONNECT</Link></header><main className="auth-form-content">{children}</main><footer className="auth-footer"><Link to="/"> Back to home</Link><div><Link to="/terms">Terms</Link><Link to="/privacy">Privacy</Link></div></footer></div>
  </div>;
}
