import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Expand } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export default function PropertyGallery({ images, title }: { images: string[]; title: string }) {
  const photos = images.length ? images : ["/placeholder.svg"];
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const open = (index: number) => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setLightbox(index);
  };
  const move = (index: number) => {
    const next = (index + photos.length) % photos.length;
    setActive(next);
    track.current?.scrollTo?.({ left: next * track.current.clientWidth, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  const fallback = (event: React.SyntheticEvent<HTMLImageElement>) => {
    if (!event.currentTarget.src.endsWith("/placeholder.svg")) event.currentTarget.src = "/placeholder.svg";
  };
  return <section className="property-gallery" aria-label="Property photographs">
    <div className="property-gallery-track" ref={track} onScroll={() => {
      if (track.current?.clientWidth) setActive(Math.round(track.current.scrollLeft / track.current.clientWidth));
    }}>
      {photos.map((image, index) => <button type="button" key={`${image}-${index}`} onClick={() => open(index)} aria-label={`Expand photograph ${index + 1}`}>
        <img src={image} alt={`${title} - photograph ${index + 1}`} onError={fallback} loading={index ? "lazy" : "eager"} width={1200} height={900} />
      </button>)}
    </div>
    <div className="property-gallery-tools"><p aria-live="polite">{active + 1} / {photos.length} photographs</p><div>
      {photos.length > 1 && <><Button variant="outline" size="icon" aria-label="Previous photograph" onClick={() => move(active - 1)}><ChevronLeft /></Button><Button variant="outline" size="icon" aria-label="Next photograph" onClick={() => move(active + 1)}><ChevronRight /></Button></>}
      <Button variant="outline" onClick={() => open(active)}><Expand /> View gallery</Button>
    </div></div>
    <Dialog open={lightbox !== null} onOpenChange={open => { if (!open) setLightbox(null); }}>
      <DialogContent className="property-lightbox" onCloseAutoFocus={event => { event.preventDefault(); opener.current?.focus(); }} onKeyDown={event => {
        if (event.key === "ArrowRight") setLightbox(index => ((index ?? 0) + 1) % photos.length);
        if (event.key === "ArrowLeft") setLightbox(index => ((index ?? 0) - 1 + photos.length) % photos.length);
      }}>
        <DialogTitle className="sr-only">{title} photographs</DialogTitle>
        <DialogDescription className="sr-only">Use the previous and next buttons or arrow keys. Press Escape to close.</DialogDescription>
        <img src={photos[lightbox ?? 0]} alt={`${title} - expanded photograph ${(lightbox ?? 0) + 1}`} onError={fallback} />
        <div className="property-lightbox-controls"><Button variant="outline" size="icon" disabled={photos.length < 2} aria-label="Previous expanded photograph" onClick={() => setLightbox(index => ((index ?? 0) - 1 + photos.length) % photos.length)}><ChevronLeft /></Button><span>{(lightbox ?? 0) + 1} / {photos.length}</span><Button variant="outline" size="icon" disabled={photos.length < 2} aria-label="Next expanded photograph" onClick={() => setLightbox(index => ((index ?? 0) + 1) % photos.length)}><ChevronRight /></Button></div>
      </DialogContent>
    </Dialog>
  </section>;
}
