import WaitlistAnnouncementComposer from "@/components/admin/WaitlistAnnouncementComposer";
import { Link } from "react-router-dom";
import { CreditCard, LockKeyhole, Mail } from "lucide-react";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import { useAuth } from "@/hooks/useAuth";
import { Switch } from "@/components/ui/switch";
function FutureControl({id,label}:{id:string;label:string}) {
 return <div className="feature-default-control"><div><label htmlFor={id}>{label}</label><p id={`${id}-help`}>Requested default: ON. Backend setup required; this is not a verified live setting.</p></div><Switch id={id} checked disabled aria-describedby={`${id}-help`}/></div>;
}
export default function AdminFeatureManagement() {
 const {isAdmin}=useAuth();
 if(!isAdmin)return <p role="alert">Administrator access is required.</p>;
 return <AuthenticatedLayout><div className="feature-management-page buyer-page">
  <header className="buyer-page-heading"><div><p className="buyer-eyebrow">Administrator workspace</p><h1>Waitlist & subscriptions</h1><p>Platform controls belong to administrators. Existing subscription access remains unchanged.</p></div><span className="feature-admin-badge"><LockKeyhole aria-hidden="true"/>Admin only</span></header>
  <section className="feature-management-panel" aria-labelledby="waitlist-heading"><header><span className="feature-section-icon"><Mail aria-hidden="true"/></span><div><h2 id="waitlist-heading">Waitlist management</h2><p>Registered emails, registration dates and statuses.</p></div><a className="feature-compose-link" href="#waitlist-announcement">Design announcement</a></header>
   <FutureControl id="waitlist-default" label="Waitlist ON / OFF"/>
   <div className="feature-backend-notice" role="status"><h3>Waitlist backend is not configured</h3><p>No waitlist table or supported management endpoint was found in the repository schema. Registration records cannot be displayed until admin-only backend access is implemented and verified.</p></div>
   <div className="feature-waitlist-table"><table><caption>Waitlist records — unavailable until backend setup is complete</caption><thead><tr><th scope="col">Email</th><th scope="col">Registered on</th><th scope="col">Status</th></tr></thead><tbody><tr><td colSpan={3}>Records unavailable. No waitlist query has been made.</td></tr></tbody></table></div>
  </section>
  <WaitlistAnnouncementComposer/>
  <section className="feature-management-panel" aria-labelledby="subscription-heading"><header><span className="feature-section-icon"><CreditCard aria-hidden="true"/></span><div><h2 id="subscription-heading">Subscription settings</h2><p>Existing subscription pages and account records are preserved.</p></div></header>
   <FutureControl id="subscriptions-default" label="Subscriptions ON / OFF"/>
   <p className="feature-backend-notice">No supported global subscription switch was found. This page does not enable, disable, activate or cancel any subscription or payment method.</p>
   <Link className="feature-management-link" to="/admin?view=subscriptions">Review existing subscription records</Link>
  </section>
 </div></AuthenticatedLayout>;
}
