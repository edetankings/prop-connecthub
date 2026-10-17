import { Link } from "react-router-dom";
import { Search, MessageCircle, CalendarCheck, Handshake, BadgeCheck, ArrowUpRight, Home, Building2, Trees, BriefcaseBusiness, Blocks } from "lucide-react";

const categories = [
  { label: "Houses", type: "house", icon: Home, text: "A little room to grow", image: "houses", imageAlt: "Modern detached house" },
  { label: "Apartments", type: "apartment", icon: Building2, text: "A space of your own", image: "apartments", imageAlt: "Apartment building with balconies" },
  { label: "Land", type: "land", icon: Trees, text: "Start with possibility", image: "land", imageAlt: "Open countryside and land" },
  { label: "Commercial", type: "commercial", icon: BriefcaseBusiness, text: "Make your next move", image: "commercial", imageAlt: "Commercial office towers" },
  { label: "New Developments", type: "estate", icon: Blocks, text: "Explore estate listings", image: "developments", imageAlt: "New building under construction" },
];

export function PropertyCategories() {
  return <section data-home-section="categories" className="page-container home-section home-categories">
    <div className="home-section-top"><div data-section-reveal className="home-section-intro"><p className="text-eyebrow">There is more than one way to feel at home</p><h2 className="home-section-heading">Room for the life you are building.</h2></div><span className="home-editorial-note">Find the space that fits your plans</span></div>
    <div className="home-category-track">{categories.map((item, i) => <div className="home-category-item" data-category-reveal key={item.type}><Link to={`/properties?type=${item.type}`} className="home-category-card"><span className="home-category-accent" aria-hidden="true" /><span className="home-category-image"><img src={`/images/categories/${item.image}.jpg`} alt={item.imageAlt} loading="lazy" decoding="async" width={900} height={600} /></span><span className="home-category-icon-wrap"><item.icon className="home-category-icon" aria-hidden="true" /></span><span className="home-category-index" aria-hidden="true">0{i + 1}</span><div className="home-category-copy"><h3>{item.label}</h3><p>{item.text}</p></div><span className="home-category-arrow" aria-hidden="true"><ArrowUpRight /></span></Link></div>)}</div>
    <p className="home-category-photo-note">Category illustrations · Browse listings for current availability.</p>
  </section>;
}

const steps = [
  { title: "Discover", text: "Explore properties and save the places that feel right.", icon: Search },
  { title: "Connect", text: "Get to know the professional behind a listing.", icon: MessageCircle },
  { title: "Inspect", text: "Request a viewing and see the property for yourself.", icon: CalendarCheck },
  { title: "Deal", text: "Keep enquiries and agreed next steps in your Deal Room.", icon: Handshake },
  { title: "Complete", text: "Review progress and confirm next steps. Financial operations remain locked.", icon: BadgeCheck },
];

export default function MarketplaceFlow() {
  return <section id="how-it-works" data-home-section="journey" className="home-journey home-section">
    <div className="page-container"><div className="home-section-top"><div data-section-reveal className="home-section-intro"><p className="text-eyebrow">A clearer path forward</p><h2 className="home-section-heading">Your next move,<br />made clearer.</h2></div><p className="home-journey-description">Big decisions feel better with a clear next step. Keep your property journey connected, at your own pace.</p></div>
    <ol className="home-journey-steps">{steps.map(({title,text,icon:Icon},i)=><li data-journey-step key={title}><span className="home-journey-node"><Icon aria-hidden="true" /></span><span className="home-step-index">0{i+1} /</span><div><h3>{title}</h3><p>{text}</p></div></li>)}</ol>
    <div className="home-journey-bottom"><span>Every meaningful move begins with a look.</span><Link to="/properties">Begin your search <ArrowUpRight /></Link></div></div>
  </section>;
}
