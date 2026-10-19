import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Expand, ExternalLink, MapPin } from "lucide-react";
import { publicMapLocation, type LocationVisibility } from "@/lib/propertyLocation";

type Props = { lat?:number|null; lng?:number|null; address?:string|null; title?:string; price?:string; visibility?:LocationVisibility; compact?:boolean };
function MapCanvas({ lat,lng,title,price,exact,expanded=false }:{lat:number;lng:number;title:string;price?:string;exact:boolean;expanded?:boolean}) {
  const container = useRef<HTMLDivElement>(null);
  const [status,setStatus] = useState<"loading"|"ready"|"error">("loading");
  const [retry,setRetry] = useState(0);
  const [interactive,setInteractive] = useState(false);
  const instance = useRef<L.Map|null>(null);
  useEffect(()=>{
    if(!container.current) return;
    let map:L.Map|undefined;
    let disposed=false;
    let timer:ReturnType<typeof setTimeout>|undefined;
    let observer:ResizeObserver|undefined;
    setStatus("loading");
    try {
      const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      map=L.map(container.current,{scrollWheelZoom:false,dragging:false,touchZoom:false,keyboard:true,zoomAnimation:!reduced,fadeAnimation:!reduced,markerZoomAnimation:!reduced}).setView([lat,lng],exact?15:13);
      instance.current=map;
      const tiles=L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',maxZoom:19});
      tiles.on("load",()=>{if(!disposed){setStatus("ready");if(timer)clearTimeout(timer);}});
      tiles.on("tileerror",()=>{if(!disposed)setStatus("error");});
      tiles.addTo(map);
      const popup=document.createElement("div");
      const heading=document.createElement("strong");heading.textContent=title;popup.appendChild(heading);
      const detail=document.createElement("p");detail.textContent=[price,exact?"Listing pin supplied by the professional":"Approximate area · not the property entrance"].filter(Boolean).join(" · ");popup.appendChild(detail);
      L.marker([lat,lng],{icon:L.divIcon({className:"prop-map-marker",html:'<span aria-hidden="true">⌂</span>',iconSize:[38,38],iconAnchor:[19,38]}),title:exact?"Listing location":"Approximate listing area",keyboard:true}).addTo(map).bindPopup(popup);
      if(!exact) L.circle([lat,lng],{radius:1000,color:"#138562",fillColor:"#138562",fillOpacity:.1,weight:1}).addTo(map);
      if(typeof ResizeObserver!=="undefined") {observer=new ResizeObserver(()=>map?.invalidateSize());observer.observe(container.current);}
      timer=setTimeout(()=>{if(!disposed)setStatus(value=>value==="loading"?"error":value);},15000);
    } catch {setStatus("error");}
    return ()=>{disposed=true;if(timer)clearTimeout(timer);observer?.disconnect();map?.remove();instance.current=null;};
  },[lat,lng,title,price,exact,retry]);
  useEffect(()=>{if(interactive){instance.current?.dragging.enable();instance.current?.touchZoom.enable();}else{instance.current?.dragging.disable();instance.current?.touchZoom.disable();}},[interactive,retry]);
  return <div className={`property-map-canvas${expanded?" is-expanded":""}`}><div ref={container} className="property-map-surface" role="region" aria-label={exact?"Interactive listing map":"Interactive approximate area map"} />{status==="loading" && <p role="status" className="property-map-status">Loading map…</p>}{status==="error" && <div className="property-map-status" role="alert">Map tiles could not be loaded. <Button size="sm" variant="outline" onClick={()=>setRetry(value=>value+1)}>Retry map</Button></div>}<button type="button" className="property-map-interact" aria-pressed={interactive} onClick={()=>setInteractive(value=>!value)}>{interactive?"Stop panning":"Enable map panning"}</button></div>;
}
export default function PropertyMapPreview({lat,lng,address,title="Property location",price,visibility="approximate",compact=false}:Props) {
  const [expanded,setExpanded]=useState(false);
  const location=publicMapLocation(lat,lng,visibility);
  if(!location) return <div className="property-map-unavailable"><MapPin aria-hidden="true" /><h3>{visibility==="hidden"?"Location withheld":"Map location unavailable"}</h3><p>{visibility==="hidden"?"This listing does not share its map location.":"The listing has no valid published map coordinates. Ask the professional about the location before arranging a visit."}</p></div>;
  const label=location.exact?"Listing location":"Approximate location";
  return <div className={`property-map-card${compact?" is-compact":""}`}><MapCanvas {...location} title={title} price={price}/><div className="property-map-caption"><div><b>{label}</b><p>{address || (location.exact?"Location supplied by the listing professional.":"Area shown for orientation; not an entrance or viewing address.")}</p></div><Button size="sm" variant="outline" onClick={()=>setExpanded(true)}><Expand />Expand map</Button>{location.exact && <a href={`https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`} target="_blank" rel="noopener noreferrer"><ExternalLink />Open in Google Maps</a>}</div><Dialog open={expanded} onOpenChange={setExpanded}><DialogContent className="property-map-dialog"><DialogTitle>{label}</DialogTitle><DialogDescription>{location.exact?"Listing pin supplied by the professional. Confirm access before travelling.":"Rounded area view. Exact coordinates and navigation directions are not shared."}</DialogDescription>{expanded && <MapCanvas {...location} title={title} price={price} expanded/>}</DialogContent></Dialog></div>;
}
