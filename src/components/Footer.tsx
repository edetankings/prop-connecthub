import { Link } from "react-router-dom";
import logo from "@/assets/logo.jpg";
import { Instagram, Phone, Mail, ArrowUpRight } from "lucide-react";

const TikTokIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1 0-5.78c.16 0 .31.03.45.06v-3.5a6.33 6.33 0 0 0-.45-.02A6.34 6.34 0 0 0 4 15.45a6.34 6.34 0 0 0 6.34 6.33 6.33 6.33 0 0 0 6.33-6.33V8.83a7.86 7.86 0 0 0 4.6 1.47V7.13a4.72 4.72 0 0 1-1.68-.44z"/>
  </svg>
);

const platformLinks = [
  { to: "/properties", label: "Browse Properties" },
  { to: "/agents", label: "Find an Agent" },
  { to: "/add-property", label: "List a Property" },
  { to: "/payments", label: "Payments" },
  { to: "/messages", label: "Messages" },
  { to: "/ai-assistant", label: "Prop-Connect AI" },
  { to: "/announcements", label: "Announcements" },
];

const trustLinks = [
  { to: "/trust/safety-center", label: "Safety Center" },
  { to: "/trust/escrow-protection", label: "Escrow Protection" },
  { to: "/trust/agent-verification", label: "Agent Verification" },
  { to: "/trust/property-verification", label: "Property Verification" },
  { to: "/trust/fraud-prevention", label: "Fraud Prevention" },
  { to: "/trust/code-of-conduct", label: "Code of Conduct" },
  { to: "/privacy", label: "NDPR & Privacy" },
];

const categoryLinks = [
  {to:"/properties?type=house",label:"Houses"},{to:"/properties?type=apartment",label:"Apartments"},
  {to:"/properties?type=land",label:"Land"},{to:"/properties?type=commercial",label:"Commercial"},
  {to:"/properties?type=estate",label:"Estate listings"},
];
const companyLinks = [{to:"/#how-it-works",label:"How it works"},{to:"/register",label:"For agents & builders"},{to:"/announcements",label:"Announcements"},{to:"/guides/investing-in-nigeria",label:"Property guide"}];

export default function Footer() {
  return <footer data-home-section="footer" className="home-premium-footer" role="contentinfo">
    <div className="page-container">
      <div className="home-footer-masthead"><Link to="/" aria-label="PROP-CONNECT home"><img src={logo} alt="" /><span>PROP-CONNECT<span>Find your place. Move with confidence.</span></span></Link><a href="mailto:propconnect0@gmail.com" className="home-footer-hello">Let's talk property. <ArrowUpRight /></a></div>
      <div className="home-footer-columns">
        {[{title:"Explore",links:platformLinks},{title:"Find your place",links:categoryLinks},{title:"Our platform",links:companyLinks},{title:"Trust & support",links:trustLinks}].map(group=><nav key={group.title} aria-label={`Footer ${group.title}`}><h2>{group.title}</h2>{group.links.map(item=><Link key={item.to} to={item.to}>{item.label}</Link>)}</nav>)}
      </div>
      <div className="home-footer-contact"><div><a href="mailto:propconnect0@gmail.com"><Mail /> propconnect0@gmail.com</a><a href="tel:+2348144954576"><Phone /> 08144954576</a></div><div className="home-footer-socials"><a href="https://instagram.com/propconnect2" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><Instagram /></a><a href="https://tiktok.com/@prop.connect" target="_blank" rel="noopener noreferrer" aria-label="TikTok"><TikTokIcon /></a></div></div>
      <div className="home-footer-bottom"><p>Copyright {new Date().getFullYear()} PROP-CONNECT. All rights reserved.</p><div><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><a href="mailto:propconnect0@gmail.com">Help & support</a></div><span>Made for your next move.</span></div>
    </div>
  </footer>;
}
