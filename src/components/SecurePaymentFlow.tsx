import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  Home,
  MessageCircle,
  BadgeCheck,
  ShieldCheck,
  Search,
  Handshake,
  Wallet,
  CheckCircle2,
  Lock,
  Sparkles,
} from "lucide-react";

const STEPS = [
  { n: "01", icon: Home, title: "Find Property", desc: "Browse verified listings and choose one that fits your needs." },
  { n: "02", icon: MessageCircle, title: "Chat Agent", desc: "Start a guided conversation with the listing agent inside Prop-Connect." },
  { n: "03", icon: BadgeCheck, title: "Agent Confirms", desc: "Agent verifies availability and accepts the deal to unlock payment." },
  { n: "04", icon: ShieldCheck, title: "Secure Payment", desc: "Pay into the Prop-Connect escrow account. Funds are safely held." },
  { n: "05", icon: Search, title: "Inspection & Docs", desc: "Inspection, documentation and verification are completed." },
  { n: "06", icon: Handshake, title: "Buyer Confirms", desc: "Buyer confirms satisfaction with the property and paperwork." },
  { n: "07", icon: Wallet, title: "Funds Released", desc: "Prop-Connect releases the funds to the agent's wallet." },
  { n: "08", icon: CheckCircle2, title: "Completed", desc: "Transaction closed, receipts saved, both parties protected." },
];

const SecurePaymentFlow = () => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="relative bg-background py-20 md:py-28">
      {/* Cinematic backdrop (clipped to this layer only) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_hsl(var(--primary)/0.10)_0%,_transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_hsl(var(--secondary)/0.12)_0%,_transparent_60%)]" />
        <div className="absolute -left-32 top-1/3 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -right-32 bottom-10 h-96 w-96 rounded-full bg-secondary/10 blur-3xl" />
      </div>

      <div className="container relative mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-3xl text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-secondary/40 bg-secondary/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.3em] text-secondary backdrop-blur-md">
            <Lock className="h-3 w-3" /> Escrow Protected
          </div>
          <h2 className="mt-6 font-display text-3xl font-semibold leading-[1.1] tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
            How Prop-Connect
            <br />
            <span className="italic text-gradient-gold">Secure Payments</span> Work
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
            Eight protected steps from discovery to release. Funds stay in escrow until the buyer confirms — no agent can be paid directly.
          </p>
        </motion.div>

        {/* Responsive grid: 1 col mobile · 2 sm · 4 lg */}
        <div className="mt-16 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <StepCard key={s.n} step={s} index={i} inView={inView} />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.9, delay: 0.6 }}
          className="mx-auto mt-16 flex max-w-3xl flex-wrap items-center justify-center gap-x-8 gap-y-3 rounded-2xl border border-border/60 bg-card/60 px-6 py-5 text-xs text-muted-foreground backdrop-blur-xl md:text-sm"
        >
          <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-secondary" /> Funds held in escrow</span>
          <span className="flex items-center gap-2"><Lock className="h-4 w-4 text-secondary" /> Verified transactions</span>
          <span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-secondary" /> 100% fraud protected</span>
        </motion.div>
      </div>
    </section>
  );
};

type Step = (typeof STEPS)[number];

const StepCard = ({ step, index, inView }: { step: Step; index: number; inView: boolean }) => {
  const Icon = step.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: 0.15 + index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="group relative h-full"
    >
      <div className="relative flex h-full flex-col rounded-2xl border border-border/60 bg-card/70 p-5 backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:border-secondary/40 hover:shadow-[0_25px_60px_-20px_hsl(var(--primary)/0.4)]">
        <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-br from-secondary/0 via-secondary/15 to-secondary/0 opacity-0 blur transition-opacity duration-500 group-hover:opacity-100" />

        <div className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-full border-2 border-secondary/30 bg-gradient-to-br from-primary to-primary/80 text-secondary shadow-[0_12px_30px_-8px_hsl(var(--primary)/0.6)]">
          <Icon className="h-6 w-6" />
          <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border border-secondary/40 bg-background text-[10px] font-semibold text-secondary">
            {step.n}
          </span>
        </div>

        <h3 className="font-display text-base font-semibold leading-snug sm:text-lg">{step.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
      </div>
    </motion.div>
  );
};

export default SecurePaymentFlow;
