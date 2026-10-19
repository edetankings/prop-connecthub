import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("recharts",()=>{const Box=({children}:{children?:ReactNode})=><div>{children}</div>;const Chart=({children}:{children?:ReactNode})=><svg>{children}</svg>;const Group=({children}:{children?:ReactNode})=><g>{children}</g>;return {ResponsiveContainer:Box,AreaChart:Chart,PieChart:Chart,Area:()=>null,Pie:Group,Cell:()=>null,CartesianGrid:()=>null,Tooltip:()=>null,XAxis:()=>null,YAxis:()=>null};});
import AgentOverview from "./AgentOverview";
type Props=ComponentProps<typeof AgentOverview>;
function resource<T>(data:T[]){return {data,loading:false,error:false,retry:vi.fn()};}
const row={id:"posted-home",agent_id:"agent-profile",title:"Returned garden home",price:5000000,status:"available",is_verified:true,property_type:"house",listing_type:"sale",city:"Lagos",state:"Lagos",created_at:"2026-10-18T10:00:00Z",image_url:null,images:[],bedrooms:3,bathrooms:2} as Props["listings"]["data"][number];
afterEach(()=>{cleanup();vi.useRealTimers();});
it("renders actual account records and filters the overview portfolio without changing financial gates",()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date("2026-10-19T10:00:00Z"));
 const inquiry={id:"thread-id",property_id:row.id,created_at:"2026-10-18T10:00:00Z",last_message_at:"2026-10-18T12:00:00Z",buyer:"Returned buyer",messages:[{content:"Can I view it?",created_at:"2026-10-18T12:00:00Z",sender_id:"buyer",seen:false}],properties:{title:row.title}} as Props["inquiries"]["data"][number];
 render(<MemoryRouter future={{v7_startTransition:true,v7_relativeSplatPath:true}}><AgentOverview profile={{full_name:"Alex Ada",kyc_verified:true,completed_transactions:1}} listings={resource([row,{...row,id:"review-home",title:"Returned review home",status:"under_verification",is_verified:false}])} inquiries={resource([inquiry])} reservations={resource([])}/></MemoryRouter>);
 expect(screen.getByRole("heading",{level:1,name:/Good morning, Alex/})).toBeInTheDocument();
 expect(screen.getByRole("link",{name:/Total listings/})).toHaveTextContent("2");
 expect(screen.getByRole("link",{name:/Active listings/})).toHaveTextContent("1");
 expect(screen.getByRole("link",{name:/Returned buyer/})).toHaveAttribute("href","/chat/thread-id");
 expect(screen.getByRole("img",{name:/2 listings and 1 enquiries/})).toBeInTheDocument();
 const portfolio=within(screen.getByRole("heading",{name:"My listings"}).closest("section")!);
 fireEvent.click(portfolio.getByRole("button",{name:"Under review (1)"}));
 expect(portfolio.getByRole("heading",{name:"Returned review home"})).toBeInTheDocument();
 expect(portfolio.queryByRole("heading",{name:"Returned garden home"})).not.toBeInTheDocument();
 expect(screen.getByText("Financial operations are locked.")).toBeInTheDocument();
 expect(screen.queryByRole("button",{name:/withdraw|pay|upgrade/i})).not.toBeInTheDocument();
 fireEvent.change(screen.getByLabelText("Activity period"),{target:{value:"7"}});expect(screen.getByRole("img",{name:/last 7 days/})).toBeInTheDocument();
});
it("keeps failed reads distinct from zero metrics and provides retry",()=>{
 const failed={...resource([]),error:true};
 render(<MemoryRouter future={{v7_startTransition:true,v7_relativeSplatPath:true}}><AgentOverview profile={{full_name:null,kyc_verified:false}} listings={failed} inquiries={failed} reservations={failed}/></MemoryRouter>);
 expect(screen.getByRole("link",{name:/Total listings/})).toHaveTextContent("—");
 fireEvent.click(screen.getByRole("button",{name:"Retry activity"}));expect(failed.retry).toHaveBeenCalled();
 expect(screen.queryByText("No property listings yet.")).not.toBeInTheDocument();
});
