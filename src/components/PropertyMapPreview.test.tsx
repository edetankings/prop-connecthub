import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({map:vi.fn(),tiles:vi.fn(),marker:vi.fn(),circle:vi.fn(),popup:vi.fn(),remove:vi.fn(),enable:vi.fn(),disable:vi.fn(),setView:vi.fn(),events:{} as Record<string,()=>void>}));
vi.mock("leaflet",()=>({default:{map:mocks.map,tileLayer:mocks.tiles,marker:mocks.marker,circle:mocks.circle,divIcon:vi.fn(value=>value)}}));
import PropertyMapPreview from "./PropertyMapPreview";
import { publicMapLocation } from "@/lib/propertyLocation";
beforeEach(()=>{
 vi.clearAllMocks();mocks.events={};
 const map={setView:mocks.setView,remove:mocks.remove,invalidateSize:vi.fn(),dragging:{enable:mocks.enable,disable:mocks.disable},touchZoom:{enable:mocks.enable,disable:mocks.disable}};
 mocks.setView.mockReturnValue(map);mocks.map.mockReturnValue(map);
 const tile={on:vi.fn((event:string,callback:()=>void)=>{mocks.events[event]=callback;return tile;}),addTo:vi.fn()};mocks.tiles.mockReturnValue(tile);
 const marker={addTo:vi.fn(()=>marker),bindPopup:mocks.popup};mocks.marker.mockReturnValue(marker);
 mocks.circle.mockReturnValue({addTo:vi.fn()});
});
afterEach(cleanup);
describe("property location disclosure and interactive map lifecycle",()=>{
 it("rejects missing, invalid and withheld coordinates without loading a map",()=>{
  const {rerender}=render(<PropertyMapPreview lat={null} lng={null}/>);
  expect(screen.getByText("Map location unavailable")).toBeInTheDocument();
  rerender(<PropertyMapPreview lat={100} lng={2}/>);expect(mocks.map).not.toHaveBeenCalled();
  rerender(<PropertyMapPreview lat={6.12345} lng={3.12345} visibility="hidden"/>);
  expect(screen.getByText("Location withheld")).toBeInTheDocument();expect(mocks.map).not.toHaveBeenCalled();
  expect(publicMapLocation(0,0,"exact")).toEqual({lat:0,lng:0,exact:true});
  expect(publicMapLocation(Number.NaN,2)).toBeNull();
 });
 it("rounds approximate coordinates before creating layers and omits exact navigation",()=>{
  render(<PropertyMapPreview lat={6.12345} lng={3.45678} title="<script>sample</script>" price="₦100"/>);
  expect(mocks.setView).toHaveBeenCalledWith([6.12,3.46],13);
  expect(mocks.marker.mock.calls[0][0]).toEqual([6.12,3.46]);
  expect(mocks.circle.mock.calls[0][0]).toEqual([6.12,3.46]);
  expect(screen.getByText("Approximate location")).toBeInTheDocument();
  expect(screen.queryByRole("link",{name:"Open in Google Maps"})).not.toBeInTheDocument();
  const popup=mocks.popup.mock.calls[0][0] as HTMLElement;
  expect(popup.querySelector("script")).toBeNull();expect(popup.textContent).toContain("<script>sample</script>");
  fireEvent.click(screen.getByRole("button",{name:"Enable map panning"}));expect(mocks.enable).toHaveBeenCalled();
  act(()=>mocks.events.load());expect(screen.queryByText("Loading map…")).not.toBeInTheDocument();
 });
 it("supports explicit public exact pins, expanded maps and cleanup",()=>{
  const {unmount}=render(<PropertyMapPreview lat={6.12345} lng={3.45678} visibility="exact"/>);
  expect(screen.getByRole("link",{name:"Open in Google Maps"})).toHaveAttribute("href","https://www.google.com/maps/search/?api=1&query=6.12345,3.45678");
  fireEvent.click(screen.getByRole("button",{name:"Expand map"}));
  expect(screen.getByRole("dialog",{name:"Listing location"})).toBeInTheDocument();expect(mocks.map).toHaveBeenCalledTimes(2);
  unmount();expect(mocks.remove).toHaveBeenCalledTimes(2);
 });
 it("shows a tile failure and lets the visitor retry",()=>{
  render(<PropertyMapPreview lat={6.2} lng={3.4}/>);
  act(()=>mocks.events.tileerror());expect(screen.getByRole("alert")).toHaveTextContent("could not be loaded");
  fireEvent.click(screen.getByRole("button",{name:"Retry map"}));expect(mocks.map).toHaveBeenCalledTimes(2);expect(mocks.remove).toHaveBeenCalledOnce();
 });
});
