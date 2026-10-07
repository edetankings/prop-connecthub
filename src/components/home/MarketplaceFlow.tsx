import { Link } from "react-router-dom";
import { Search, MessageCircle, CalendarCheck, Handshake, BadgeCheck, Home, KeyRound, Trees, Building2, ArrowUpRight } from "lucide-react";

const categories = [
  { label: "Buy", desc: "Homes for sale", icon: Home, to: "/properties?type=for_sale" },
  { label: "Rent", desc: "Yearly rentals", icon: KeyRound, to: "/properties?type=for_rent" },
  { label: "Land", desc: "Plots & acreage", icon: Trees, to: "/properties?type=land" },
  { label: "Commercial", desc: "Offices & retail", icon: Building2, to: "/properties?type=commercial" },
];

const steps = [
  { title: "Discover", text: "Browse admin-reviewed listings from KYC-verified agents.", icon: Search },
  { title: "Connect", text: "Chat with the agent safely inside PROP-connect.", icon: MessageCircle },
  { title: "Inspect", text: "Book an inspection time the agent confirms.", icon: CalendarCheck },
  { title: "Deal", text: "Request to buy or rent and follow it in your Deal Room.", icon: Handshake },
  { title: "Complete", text: "Pay through protected escrow and close with confidence.", icon: BadgeCheck },
];

const MarketplaceFlow = () => (
  <>
    <section className="container mx-auto px-4 pt-20 md:pt-28">
      <p className="text-eyebrow">Marketplace</p>
      <h2 className="text-section mt-2">What are you looking for?</h2>
      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        {categories.map(({ label, desc, icon: Icon, to }) => (
          <Link
            key={label}
            to={to}
            className="group flex flex-col justify-between rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elevated"
          >
            <div className="flex items-start justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-primary"><Icon className="h-5 w-5" /></span>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
            </div>
            <div className="mt-8">
              <p className="font-display text-lg font-semibold text-foreground">{label}</p>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>

    <section id="how-it-works" className="container mx-auto scroll-mt-20 px-4 py-20 md:py-28">
      <p className="text-eyebrow">How PROP-connect works</p>
      <h2 className="text-section mt-2 max-w-xl">From first search to keys in hand, every step in one place.</h2>
      <ol className="mt-10 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-5">
        {steps.map(({ title, text, icon: Icon }, i) => (
          <li key={title} className="bg-card p-6">
            <div className="flex items-center gap-3">
              <span className="font-display text-sm font-semibold tabular-nums text-secondary">0{i + 1}</span>
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <p className="mt-5 font-display text-lg font-semibold text-foreground">{title}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{text}</p>
          </li>
        ))}
      </ol>
    </section>
  </>
);

export default MarketplaceFlow;
