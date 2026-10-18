import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowLeft, ArrowUpRight, Bath, Bed, CalendarCheck, Check, ChevronRight, Heart, Home, MapPin, Maximize, MessageCircle, Search, Signal, UserRound, Wifi } from "lucide-react";
import type { DBProperty } from "@/components/DBPropertyCard";
import conceptHome from "@/assets/architecture-forest-v2.jpg";

gsap.registerPlugin(ScrollTrigger);
const sceneStarts = [0, 3, 7, 11, 17, 21];
const demoProperty = { title: "Woodland residence", price: 250000000, city: "Illustrative location", state: null, bedrooms: 4, bathrooms: 4, sqft: 3200, image_url: "/images/categories/houses.jpg", images: ["/images/categories/houses.jpg", conceptHome], description: "An architectural concept with generous living spaces and room for your next chapter." };
function Tap({ name }: { name: string }) { return <span className="showcase-tap" data-demo-tap={name} />; }
function ScreenBrand() { return <span className="showcase-screen-brand"><Home /><b>PROP-CONNECT</b></span>; }

export default function InspectionShowcase({ listings = [] }: { listings?: DBProperty[] }) {
  const root = useRef<HTMLElement>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const inView = useRef(false);
  const currentScene = useRef(5);
  const [scene, setScene] = useState(5);
  const property = listings[0] || demoProperty;
  const photos = Array.from(new Set([property.image_url, ...(property.images || [])].filter((image): image is string => !!image)));
  if (!photos.length) photos.push("/placeholder.svg");
  const price = Number.isFinite(property.price) ? `₦${property.price.toLocaleString("en-NG")}` : "Price on listing";
  const location = [property.city, property.state].filter(Boolean).join(", ") || "Location on listing";
  const dateChoices = useMemo(() => Array.from({ length: 5 }, (_, index) => { const day = new Date(); day.setDate(day.getDate() + index + 1); return { weekday: day.toLocaleDateString("en-NG", { weekday: "short" }), day: day.getDate(), full: day.toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" }) }; }), []);
  const listingCards = listings.length ? listings.slice(0, 3) : [demoProperty, { ...demoProperty, title: "City apartment concept", image_url: "/images/categories/apartments.jpg", price: 180000000 }];

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: reduce)", () => {
      currentScene.current = 5; setScene(5);
    });
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const context = gsap.context(() => {
        const screens = Array.from(element.querySelectorAll<HTMLElement>("[data-phone-scene]"));
        const updateScene = () => {
          const time = timeline.current?.time() || 0;
          const index = sceneStarts.reduce((value, start, next) => time >= start ? next : value, 0);
          if (index !== currentScene.current) { currentScene.current = index; setScene(index); }
        };
        const sequence = gsap.timeline({ paused: true, onUpdate: updateScene });
        timeline.current = sequence;
        gsap.set(screens, { autoAlpha: 0 });
        gsap.set(screens[0], { autoAlpha: 1 });
        currentScene.current = 0; setScene(0);
        sequence.fromTo(".showcase-device", { y: 28, rotationY: -17, rotationZ: -7 }, { y: 0, rotationY: -7, rotationZ: 3, duration: 2.6, ease: "power2.out" }, 0);
        sequence.fromTo(".showcase-launch-brand", { y: 12, opacity: .35 }, { y: 0, opacity: 1, duration: 1.5, ease: "power2.out" }, .4);
        for (let index = 1; index < screens.length; index++) {
          sequence.to(screens[index - 1], { autoAlpha: 0, x: -16, duration: .38, ease: "power2.inOut" }, sceneStarts[index]);
          sequence.fromTo(screens[index], { autoAlpha: 0, x: 20 }, { autoAlpha: 1, x: 0, duration: .5, ease: "power2.out" }, sceneStarts[index]);
        }
        sequence.fromTo(".showcase-list-scroll", { y: 0 }, { y: -42, duration: 2.1, ease: "sine.inOut" }, 3.7);
        sequence.fromTo(".showcase-gallery-next", { xPercent: 100, opacity: 0 }, { xPercent: 0, opacity: 1, duration: .85, ease: "power2.inOut" }, 8.8);
        sequence.to(".showcase-gallery-counter-first", { autoAlpha: 0, duration: .2 }, 9);
        sequence.fromTo(".showcase-gallery-counter-next", { autoAlpha: 0 }, { autoAlpha: 1, duration: .2 }, 9);
        sequence.to(".showcase-demo-date", { backgroundColor: "#0B4938", color: "#ffffff", duration: .4 }, 12.8);
        sequence.to(".showcase-demo-time", { backgroundColor: "#0B4938", color: "#ffffff", duration: .4 }, 14.1);
        sequence.fromTo(".showcase-demo-note", { opacity: 0, y: 4 }, { opacity: 1, y: 0, duration: .65 }, 15);
        sequence.fromTo(".showcase-success-check", { scale: .6, opacity: 0 }, { scale: 1, opacity: 1, duration: .8, ease: "back.out(1.4)" }, 17.4);
        sequence.fromTo(".showcase-success-rays", { scale: .7, opacity: 0 }, { scale: 1.15, opacity: 1, duration: 1.1, ease: "power2.out" }, 17.5);
        for (const [name, time] of [["property", 6.2], ["inspection", 10.4], ["date", 12.5], ["time", 13.8], ["submit", 16.2]] as const) {
          sequence.fromTo(`[data-demo-tap="${name}"]`, { scale: .5, opacity: .7 }, { scale: 1.75, opacity: 0, duration: .65, ease: "power2.out", immediateRender: false }, time);
        }
        sequence.to(".showcase-device", { rotationY: -12, rotationZ: -3, y: -6, duration: 3, ease: "sine.inOut" }, 21);
        sequence.set({}, {}, 24);
        const syncPlayback = () => {
          if (inView.current && !document.hidden && sequence.progress() < 1) { sequence.play(); }
          else { sequence.pause(); }
        };
        const trigger = ScrollTrigger.create({ trigger: element, start: "top 82%", end: "bottom 15%", onEnter: () => { inView.current = true; syncPlayback(); }, onEnterBack: () => { inView.current = true; syncPlayback(); }, onLeave: () => { inView.current = false; syncPlayback(); }, onLeaveBack: () => { inView.current = false; syncPlayback(); } });
        document.addEventListener("visibilitychange", syncPlayback);
        return () => { trigger.kill(); document.removeEventListener("visibilitychange", syncPlayback); };
      }, element);
      return () => { context.revert(); timeline.current = null; };
    });
    return () => media.revert();
  }, []);

  const fallbackImage = (event: React.SyntheticEvent<HTMLImageElement>) => { if (!event.currentTarget.src.endsWith("/placeholder.svg")) event.currentTarget.src = "/placeholder.svg"; };

  return <section ref={root} data-home-section="final-cta" className="home-final-cta inspection-showcase" aria-labelledby="showcase-heading">
    <div className="page-container showcase-layout">
      <div className="showcase-copy"><p className="home-cta-eyebrow">Find. View. Connect.</p><h2 id="showcase-heading">Your Next<br />Chapter<br /><span>Starts Here.</span></h2><p className="home-cta-copy">Discover your ideal property. Explore every detail. Request an inspection with confidence.</p><Link className="showcase-explore" to="/properties">Explore Properties <ArrowUpRight aria-hidden="true" /></Link></div>
      <div className="showcase-stage" data-current-scene={scene}>
        <div className="showcase-floor" />
        <div className="showcase-device" aria-hidden="true"><span className="showcase-side-button showcase-side-button-one" /><span className="showcase-side-button showcase-side-button-two" /><div className="showcase-display"><div className="showcase-status"><b>9:41</b><span><Signal /><Wifi /><i /></span></div><div className="showcase-island"><i /></div>
          <div className="showcase-phone-scene showcase-launch" data-phone-scene="0"><div className="showcase-launch-brand"><Home /><b>PROP-CONNECT</b><span>Find. View. Connect.</span></div><div className="showcase-launch-wave" /><img src={conceptHome} alt="" loading="lazy" decoding="async" /><p>Nigeria’s real estate marketplace</p></div>
          <div className="showcase-phone-scene showcase-discovery" data-phone-scene="1"><header><ScreenBrand /><span className="showcase-icon-dot"><MapPin /></span></header><div className="showcase-search"><Search />Search by location, property type…</div><div className="showcase-screen-chips"><b>All</b><span>House</span><span>Apartment</span><span>Land</span></div><div className="showcase-screen-heading"><b>Featured properties</b><span>See all</span></div><div className="showcase-discovery-window"><div className="showcase-list-scroll">{listingCards.map((listing, index) => <article className="showcase-listing" key={index}><div><img src={listing.image_url || listing.images?.[0] || "/placeholder.svg"} alt="" loading="lazy" decoding="async" onError={fallbackImage} /><Heart /><span><MapPin />{[listing.city, listing.state].filter(Boolean).join(", ") || "Location on listing"}</span></div><b>{Number.isFinite(listing.price) ? `₦${listing.price.toLocaleString("en-NG")}` : "Price on listing"}</b><p>{listing.title}</p><ChevronRight />{index === 0 && <Tap name="property" />}</article>)}</div></div><div className="showcase-bottom-nav"><Home /><Heart /><MessageCircle /><UserRound /></div></div>
          <div className="showcase-phone-scene showcase-details" data-phone-scene="2"><div className="showcase-gallery"><img src={photos[0]} alt="" loading="lazy" decoding="async" onError={fallbackImage} /><img className="showcase-gallery-next" src={photos[1] || photos[0]} alt="" loading="lazy" decoding="async" onError={fallbackImage} /><span className="showcase-gallery-back"><ArrowLeft /></span><span className="showcase-gallery-save"><Heart /></span><span className="showcase-gallery-count showcase-gallery-counter-first">1 / {photos.length}</span><span className="showcase-gallery-count showcase-gallery-counter-next">{Math.min(2, photos.length)} / {photos.length}</span></div><div className="showcase-detail-copy"><h3>{property.title}</h3><strong>{price}</strong><p><MapPin />{location}</p><div className="showcase-specs">{property.bedrooms != null && <span><Bed />{property.bedrooms} beds</span>}{property.bathrooms != null && <span><Bath />{property.bathrooms} baths</span>}{property.sqft != null && <span><Maximize />{property.sqft.toLocaleString("en-NG")} sqft</span>}</div><div className="showcase-screen-tabs"><b>Overview</b><span>Photos</span><span>Location</span></div><h4>Description</h4><p className="showcase-detail-description">{property.description || "Explore the listing details and contact the property professional to learn more."}</p></div><div className="showcase-detail-actions"><span>Chat</span><span className="showcase-screen-button">Request inspection<Tap name="inspection" /></span></div></div>
          <div className="showcase-phone-scene showcase-booking" data-phone-scene="3"><header><ArrowLeft /><b>Request an inspection</b></header><div className="showcase-property-summary"><img src={photos[0]} alt="" loading="lazy" decoding="async" onError={fallbackImage} /><div><b>{property.title}</b><strong>{price}</strong><small>{location}</small></div></div><div className="showcase-name-preview"><b>Full name</b><span>Your name</span></div><h4>Preferred date</h4><div className="showcase-date-choices">{dateChoices.map((date, index) => <span className={index === 2 ? "showcase-demo-date" : ""} key={index}><small>{date.weekday}</small><b>{date.day}</b>{index === 2 && <Tap name="date" />}</span>)}</div><h4>Preferred time</h4><div className="showcase-time-choices">{["10:00 AM", "12:00 PM", "2:00 PM", "4:00 PM", "6:00 PM"].map(time => <span key={time} className={time === "12:00 PM" ? "showcase-demo-time" : ""}>{time}{time === "12:00 PM" && <Tap name="time" />}</span>)}</div><h4>Message to the professional</h4><div className="showcase-note"><p className="showcase-demo-note">I’d like to view this property.</p></div><span className="showcase-screen-button showcase-submit">Submit request<Tap name="submit" /></span></div>
          <div className="showcase-phone-scene showcase-confirmation" data-phone-scene="4"><div className="showcase-success"><div className="showcase-success-rays" /><div className="showcase-success-check"><Check /></div></div><h3>Inspection request sent</h3><p>Your property professional must respond before a viewing is confirmed.</p><div className="showcase-request-summary"><h4>Request details</h4><p><Home />{property.title}</p><p><MapPin />{location}</p><p><CalendarCheck />{dateChoices[2].full} · 12:00 PM</p></div><span className="showcase-screen-button">Back to property</span></div>
          <div className="showcase-phone-scene showcase-ending" data-phone-scene="5"><ScreenBrand /><h3>Your Next<br />Chapter<br /><span>Starts Here</span></h3><p>Discover your ideal property.<br />Explore every detail.</p><span className="showcase-ending-cta">Explore Properties <ArrowUpRight /></span><img src={photos[0]} alt="" loading="lazy" decoding="async" onError={fallbackImage} /></div>
          <span className="showcase-home-indicator" />
        </div></div>
      </div>
    </div>

  </section>;
}
