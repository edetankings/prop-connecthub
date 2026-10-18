import { useState } from "react";
import { ArrowUpRight, Bath, Bed, Heart, MapPin, Maximize } from "lucide-react";
import { Link } from "react-router-dom";



export default function PropertyListingPreview({ layout }: { layout: "grid" | "list" }) {
  const [saved, setSaved] = useState(false);
  const images = ["/images/categories/houses.jpg", "/images/categories/apartments.jpg"];
  return <article data-sample-listing className={`marketplace-card marketplace-card-${layout}`}><div className="marketplace-card-image"><Link to="/property/preview-garden-duplex" aria-label="View sample Garden Duplex"><img src={images[0]} alt="Architectural illustration of the sample Garden Duplex" loading="lazy" width={960} height={720} /></Link><div className="marketplace-card-labels"><span>Design preview</span><span>For sale</span></div><button type="button" className="marketplace-save" aria-label="Save sample Garden Duplex" aria-pressed={saved} onClick={() => setSaved(value => !value)}><Heart className={saved ? "fill-current" : ""} /></button></div><div className="marketplace-card-copy"><p className="marketplace-card-kind">House<span>Illustrative</span></p><Link to="/property/preview-garden-duplex"><h2>Sample Garden Duplex</h2></Link><p className="marketplace-location"><MapPin />Lekki, Lagos</p><p className="marketplace-card-price">₦85,000,000</p><div className="marketplace-card-facts"><span><Bed />4 beds</span><span><Bath />4 baths</span><span><Maximize />3,200 sqft</span></div><p className="marketplace-card-description">A sample home with generous living space and a private garden. Images and price are illustrative.</p><div className="marketplace-card-actions"><Link to="/property/preview-garden-duplex">View Property <ArrowUpRight /></Link></div></div></article>;
}
