import { siteUrl } from "@/lib/seo";
import { useState, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, X, Grid2X2, List, ArrowUpRight, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ListingSkeleton } from "@/components/ui/page-container";
import DBPropertyCard, { type DBProperty } from "@/components/DBPropertyCard";
import { supabase } from "@/integrations/supabase/client";

const categories = [["all","All properties"],["for_sale","Buy"],["for_rent","Rent"],["land","Land"],["commercial","Commercial"],["house","Houses"],["apartment","Apartments"],["estate","Estates"],["hotel","Hotels"]];
const kinds = [["all","Any property type"],["house","House"],["apartment","Apartment"],["land","Land"],["commercial","Commercial"],["estate","Estate"],["hotel","Hotel"]];
const prices = [["all","Any budget"],["0-5m","Under ₦5 million"],["5m-20m","₦5–20 million"],["20m-50m","₦20–50 million"],["50m-100m","₦50–100 million"],["100m+","₦100 million and above"]];
const ranges: Record<string,[number,number]> = {"0-5m":[0,5000000],"5m-20m":[5000000,20000000],"20m-50m":[20000000,50000000],"50m-100m":[50000000,100000000],"100m+":[100000000,Infinity]};
const filterKeys = ["q","type","kind","state","price","beds","baths"];
const contexts: Record<string,{title:string;copy:string}> = {
 for_sale:{title:"A place to make your own.",copy:"Explore homes and spaces for sale across Nigeria."},
 for_rent:{title:"Make room for your next move.",copy:"Find a rental that fits your life. Confirm rental periods and terms with the listing professional."},
 land:{title:"Start with a little possibility.",copy:"Explore land by location, price and available size. Independently check ownership and title documents."},
 commercial:{title:"Space for your next ambition.",copy:"Discover commercial properties from the current marketplace."},
};
export default function Properties() {
 const [params,setParams] = useSearchParams();
 const [draft,setDraft] = useState(params.get("q") || "");
 const [filterOpen,setFilterOpen] = useState(false);
 const [layout,setLayout] = useState<"grid"|"list">("grid");
 const [visible,setVisible] = useState(12);
 const [properties,setProperties] = useState<DBProperty[]>([]);
 const [loading,setLoading] = useState(true);
 const [queryError,setQueryError] = useState(false);
 const [retry,setRetry] = useState(0);
 const q = params.get("q") || "";
 const type = params.get("type") || "all";
 const kind = params.get("kind") || "all";
 const state = params.get("state") || "all";
 const price = params.get("price") || "all";
 const beds = params.get("beds") || "all";
 const baths = params.get("baths") || "all";
 const sort = params.get("sort") || "newest";
 const context = contexts[type] || {title:"Find somewhere that feels like you.",copy:"Explore current reviewed listings across Nigeria, at your own pace."};
 useEffect(()=>{setDraft(q);setVisible(12);},[q,type,kind,state,price,beds,baths,sort]);
 useEffect(()=>{
  let active=true;
  setLoading(true);setQueryError(false);setProperties([]);
  void (async()=>{try {
   const {data,error}=await supabase.from("properties").select("*").eq("is_verified",true).in("status",["available","for_sale","for_rent"]).order("created_at",{ascending:false});
   if(error)throw error;
   if(active)setProperties((data as DBProperty[])||[]);
  }catch {if(active)setQueryError(true);}finally {if(active)setLoading(false);}})();
  return ()=>{active=false;};
 },[retry]);
 const states = useMemo(()=>Array.from(new Set(properties.map(p=>p.state).filter((value):value is string=>!!value))).sort(),[properties]);
 const update = (key:string,value:string)=>{const next=new URLSearchParams(params);if((key==="type"||key==="kind")&&value==="land"){next.delete("beds");next.delete("baths");if(key==="type")next.delete("kind");}if(!value||value==="all"||key==="sort"&&value==="newest")next.delete(key);else next.set(key,value);setParams(next);};
 const clear=()=>{const next=new URLSearchParams(params);filterKeys.forEach(key=>next.delete(key));setParams(next);};
 const filtered = useMemo(()=>properties.filter(p=>{
  const propertyType=(p.property_type||"").toLowerCase();
  const matchesQuery=!q||[p.title,p.city,p.state,p.property_type].some(value=>(value||"").toLowerCase().includes(q.toLowerCase()));
  const matchesType=type==="all"||(type==="for_sale"?p.listing_type==="sale":type==="for_rent"?p.listing_type==="rental":propertyType===type);
  const range=ranges[price];
  return matchesQuery&&matchesType&&(kind==="all"||propertyType===kind)&&(state==="all"||p.state===state)&&(!range||p.price>=range[0]&&p.price<range[1])&&(beds==="all"||(p.bedrooms??0)>=Number(beds))&&(baths==="all"||(p.bathrooms??0)>=Number(baths));
 }).sort((a,b)=>sort==="price_asc"?a.price-b.price:sort==="price_desc"?b.price-a.price:sort==="oldest"?(a.created_at||"").localeCompare(b.created_at||""):(b.created_at||"").localeCompare(a.created_at||"")),[properties,q,type,kind,state,price,beds,baths,sort]);
 const activeFilters=filterKeys.filter(key=>!!params.get(key)&&params.get(key)!=="all");
 const label=(key:string,value:string)=>key==="type"?categories.find(item=>item[0]===value)?.[1]||value:key==="kind"?kinds.find(item=>item[0]===value)?.[1]||value:key==="price"?prices.find(item=>item[0]===value)?.[1]||value:key==="beds"?`${value}+ bedrooms`:key==="baths"?`${value}+ bathrooms`:value;
 const filters=(prefix:string)=><div className="marketplace-filter-fields">
  <label htmlFor={`${prefix}-category`}>Listing category<select id={`${prefix}-category`} value={type} onChange={e=>update("type",e.target.value)}>{categories.map(([value,text])=><option key={value} value={value}>{text}</option>)}</select></label>
  <label htmlFor={`${prefix}-kind`}>Property type<select id={`${prefix}-kind`} value={kind} onChange={e=>update("kind",e.target.value)}>{kinds.map(([value,text])=><option key={value} value={value}>{text}</option>)}</select></label>
  <label htmlFor={`${prefix}-state`}>Location<select id={`${prefix}-state`} value={state} onChange={e=>update("state",e.target.value)}><option value="all">All states</option>{states.map(value=><option key={value} value={value}>{value}</option>)}</select></label>
  <label htmlFor={`${prefix}-price`}>Budget<select id={`${prefix}-price`} value={price} onChange={e=>update("price",e.target.value)}>{prices.map(([value,text])=><option key={value} value={value}>{text}</option>)}</select></label>
  {type!=="land"&&kind!=="land"&&<div className="marketplace-room-filters">{[["beds","Bedrooms",beds],["baths","Bathrooms",baths]].map(([key,text,value])=><label key={key} htmlFor={`${prefix}-${key}`}>{text}<select id={`${prefix}-${key}`} value={value} onChange={e=>update(key,e.target.value)}><option value="all">Any</option>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n}+</option>)}</select></label>)}</div>}
  <Button variant="outline" onClick={clear}><X /> Clear filters</Button>
 </div>;
 return <div className="marketplace-page"><Helmet><title>{q?`Results for ${q}`:type==="for_rent"?"Rental properties":type==="land"?"Land listings":type==="commercial"?"Commercial properties":"Discover properties"} | PROP-CONNECT</title><meta name="description" content={context.copy}/><link rel="canonical" href={siteUrl("/properties")}/><meta property="og:url" content={siteUrl("/properties")}/></Helmet><Navbar />
 <main className="marketplace-container"><header className="marketplace-intro"><p className="text-eyebrow">PROP-CONNECT / Discover</p><div><h1>{context.title}</h1><p>{context.copy}</p></div><Link to="/add-property">List a property <ArrowUpRight /></Link></header>
 <nav className="marketplace-category-nav" aria-label="Property categories">{categories.slice(0,5).map(([value,text])=><button type="button" key={value} aria-pressed={type===value} onClick={()=>update("type",value)}>{text}</button>)}</nav>
 <div className="marketplace-layout"><aside className="marketplace-filters" aria-label="Property filters"><h2>A place that fits.</h2><p>Make the search your own.</p>{filters("desktop")}</aside><section className="marketplace-results" aria-label="Property search results">
 <form className="marketplace-search" onSubmit={e=>{e.preventDefault();update("q",draft.trim());}}><Search aria-hidden="true"/><label className="sr-only" htmlFor="marketplace-query">Search properties</label><input id="marketplace-query" placeholder="Search city, neighbourhood or property" value={draft} onChange={e=>setDraft(e.target.value)}/><Button type="submit">Search</Button></form>
 <div className="marketplace-toolbar"><div><Button variant="outline" className="marketplace-mobile-filter" onClick={()=>setFilterOpen(true)}><SlidersHorizontal /> Filters{activeFilters.length?` (${activeFilters.length})`:""}</Button><p role="status">{loading?"Finding your next place...":queryError?"Search unavailable":`${filtered.length} ${filtered.length===1?"property":"properties"}${q?` for “${q}”`:""}`}</p></div><div><label className="sr-only" htmlFor="marketplace-sort">Sort properties</label><select id="marketplace-sort" value={sort} onChange={e=>update("sort",e.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option></select><div className="marketplace-view-switch" aria-label="Results layout"><Button variant="ghost" size="icon" aria-label="Grid view" aria-pressed={layout==="grid"} onClick={()=>setLayout("grid")}><Grid2X2 /></Button><Button variant="ghost" size="icon" aria-label="List view" aria-pressed={layout==="list"} onClick={()=>setLayout("list")}><List /></Button></div></div></div>
 {!!activeFilters.length&&<div className="marketplace-active-filters" aria-label="Active filters">{activeFilters.map(key=><button key={key} type="button" onClick={()=>update(key,"")} aria-label={`Remove ${label(key,params.get(key)!)}`}>{label(key,params.get(key)!)}<X /></button>)}</div>}
 {queryError?<div role="alert" className="marketplace-empty"><Building2 /><h2>Unable to load properties.</h2><p>Please try again. Your filters are preserved.</p><Button onClick={()=>setRetry(n=>n+1)}>Retry</Button></div>:loading?<ListingSkeleton />:filtered.length?<><div className={`marketplace-property-results marketplace-property-results-${layout}`}>{filtered.slice(0,visible).map(property=><DBPropertyCard key={property.id} property={property} layout={layout}/>)}</div><div className="marketplace-pagination"><p>Showing {Math.min(visible,filtered.length)} of {filtered.length} properties</p>{visible<filtered.length&&<Button variant="outline" onClick={()=>setVisible(n=>n+12)}>Load More Properties</Button>}</div></>:<div className="marketplace-empty"><Search /><h2>{properties.length===0&&!activeFilters.length?"No properties yet. Check back soon.":"No properties match your filters"}</h2><p>Try another location or adjust your search. New possibilities take a little space.</p>{!!activeFilters.length&&<Button variant="outline" onClick={clear}>Clear filters</Button>}</div>}
 </section></div></main><Footer />
 <Sheet open={filterOpen} onOpenChange={setFilterOpen}><SheetContent side="bottom" className="marketplace-filter-sheet"><SheetTitle>Filter properties</SheetTitle><SheetDescription>Changes update the results and URL immediately.</SheetDescription>{filters("mobile")}<Button onClick={()=>setFilterOpen(false)}>Show {filtered.length} results</Button></SheetContent></Sheet>
 </div>;
}
