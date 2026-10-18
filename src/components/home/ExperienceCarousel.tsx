import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, CalendarCheck, ChevronLeft, ChevronRight, ClipboardList, Heart, MessageCircle, Search } from "lucide-react";
import livingImage from "@/assets/cinematic-3.jpg";

const slides = [
  { icon: Search, title: "Search your way", text: "Narrow your search by location, budget and property type.", to: "/properties", image: "/images/categories/houses.jpg", alt: "Contemporary detached home" },
  { icon: Heart, title: "Keep your favourites close", text: "Save a listing on this device with the heart button. Local saves stay in this browser.", to: "/properties", image: "/images/categories/apartments.jpg", alt: "Apartment building with balconies" },
  { icon: MessageCircle, title: "Start a conversation", text: "Sign in to message a property professional.", to: "/messages", image: livingImage, alt: "Architectural inspiration for your next home" },
  { icon: CalendarCheck, title: "See it for yourself", text: "Request an inspection through an available listing.", to: "/properties", image: "/images/categories/commercial.jpg", alt: "Contemporary property exterior" },
  { icon: ClipboardList, title: "Follow your enquiries", text: "Check messages, inspections and deal updates in your dashboard.", to: "/dashboard", image: "/images/categories/developments.jpg", alt: "Residential development under construction" },
];

export default function ExperienceCarousel() {
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(preference.matches);
    preference.addEventListener("change", update);
    const observer = typeof IntersectionObserver !== "undefined" ? new IntersectionObserver(entries => setVisible(entries[0]?.isIntersecting ?? false), { threshold: .2 }) : null;
    if (root.current) observer?.observe(root.current);
    return () => { observer?.disconnect(); preference.removeEventListener("change", update); };
  }, []);
  useEffect(() => {
    if (reduced || !visible) return;
    const timer = window.setInterval(() => { if (!document.hidden) setActive(index => (index + 1) % slides.length); }, 5000);
    return () => window.clearInterval(timer);
  }, [active, reduced, visible]);
  const move = (direction: number) => setActive(index => (index + direction + slides.length) % slides.length);
  const slide = slides[active];
  const Icon = slide.icon;
  return <section id="property-experience" data-home-section="experience" className="page-container home-section" aria-labelledby="experience-heading">
    <div className="experience-glass-carousel" ref={root} role="region" aria-roledescription="carousel" aria-label="Your property journey">
      <div className="experience-images" aria-hidden="true">{slides.map((item,index) => <img key={item.title} src={item.image} alt="" className={index === active ? "is-active" : ""} loading="lazy" decoding="async" onError={event => { if (!event.currentTarget.src.endsWith("/placeholder.svg")) event.currentTarget.src = "/placeholder.svg"; }} />)}</div>
      <div className="experience-carousel-heading"><p className="text-eyebrow">For buyers. For renters. For you.</p><h2 id="experience-heading">Your search,<br />with room to breathe.</h2><p>Keep the important details together, every step of the way.</p></div>
      <div className="experience-carousel-arrows"><button type="button" aria-label="Previous property journey step" onClick={() => move(-1)}><ChevronLeft /></button><button type="button" aria-label="Next property journey step" onClick={() => move(1)}><ChevronRight /></button></div>
      <div className="experience-inner-glass" role="group" aria-roledescription="slide" aria-label={`${active + 1} of ${slides.length}: ${slide.title}`}><span className="experience-slide-icon"><Icon aria-hidden="true" /></span><div key={active} className="experience-slide-copy"><span className="experience-slide-number">0{active + 1} / 05</span><h3>{slide.title}</h3><p>{slide.text}</p><Link to={slide.to}>Explore this step <ArrowUpRight aria-hidden="true" /></Link></div></div>
    </div>
  </section>;
}
