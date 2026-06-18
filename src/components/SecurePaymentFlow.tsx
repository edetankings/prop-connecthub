import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  Home,
  CreditCard,
  ShieldCheck,
  Search,
  Handshake,
  Wallet,
  Lock,
  AlertTriangle,
  Sparkles,
} from "lucide-react";

const STEPS = [
  {
    n: "01",
    icon: Home,
    title: "Find Your Property",
    desc: "Browse verified listings and select a property that fits your needs.",
  },
  {
    n: "02",
    icon: CreditCard,
    title: "Secure Payment",
    desc: "Pay into PROP-CONNECT's secure company account. Your money is safely held.",
    warning:
      "Never pay agents directly. Payments made outside PROP-CONNECT are not protected.",
  },
  {
    n: "03",
    icon: ShieldCheck,
    title: "Payment Verification",
    desc: "PROP-CONNECT verifies and secures the payment before anything moves forward.",
  },
  {
    n: "04",
    icon: Search,
    title: "Inspection & Documentation",
    desc: "Buyer and agent proceed with inspection, documentation, and negotiation.",
  },
  {
    n: "05",
    icon: Handshake,
    title: "Confirmation",
    desc: "Buyer and agent confirm satisfaction with the transaction.",
  },
  {
    n: "06",
    icon: Wallet,
    title: "Funds Released",
    desc: "PROP-CONNECT safely releases payment to the agent. Transaction complete.",
  },
];

const SecurePaymentFlow = () => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      ref={ref}
      className="relative overflow-hidden bg-background py-24 md:py-32"
    >
      {/* Cinematic backdrop */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_hsl(var(--primary)/0.10)_0%,_transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_hsl(var(--secondary)/0.12)_0%,_transparent_60%)]" />
        <div className="absolute -left-32 top-1/3 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -right-32 bottom-10 h-96 w-96 rounded-full bg-secondary/10 blur-3xl" />
      </div>

      <div className="container relative mx-auto px-4">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-3xl text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-secondary/40 bg-secondary/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.3em] text-secondary backdrop-blur-md">
            <Lock className="h-3 w-3" /> Escrow Protected
          </div>
          <h2 className="mt-6 font-display text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
            How PROP-CONNECT
            <br />
            <span className="italic text-gradient-gold">Secure Payments</span> Work
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
            Every transaction is protected end-to-end. Your money stays in our
            secure account until you confirm satisfaction — buyers and agents
            both shielded from fraud.
          </p>
        </motion.div>

        {/* Horizontal connector line — desktop */}
        <div className="relative mt-20 hidden lg:block">
          <motion.div
            initial={{ scaleX: 0 }}
            animate={inView ? { scaleX: 1 } : {}}
            transition={{ duration: 1.6, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-0 right-0 top-[88px] mx-auto h-px max-w-[88%] origin-left bg-gradient-to-r from-transparent via-primary/40 to-transparent"
          />
          <div className="grid grid-cols-6 gap-4">
            {STEPS.map((s, i) => (
              <StepCard key={s.n} step={s} index={i} inView={inView} />
            ))}
          </div>
        </div>

        {/* Vertical timeline — mobile/tablet */}
        <div className="relative mt-16 space-y-6 lg:hidden">
          <div className="absolute bottom-0 left-7 top-0 w-px bg-gradient-to-b from-transparent via-primary/30 to-transparent" />
          {STEPS.map((s, i) => (
            <StepCard key={s.n} step={s} index={i} inView={inView} mobile />
          ))}
        </div>

        {/* Trust strip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.9, delay: 0.6 }}
          className="mx-auto mt-20 flex max-w-3xl flex-wrap items-center justify-center gap-x-8 gap-y-3 rounded-2xl border border-border/60 bg-card/60 px-6 py-5 text-xs text-muted-foreground backdrop-blur-xl md:text-sm"
        >
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-secondary" /> Funds held in escrow
          </span>
          <span className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-secondary" /> Verified transactions
          </span>
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-secondary" /> 100% fraud protected
          </span>
        </motion.div>
      </div>
    </section>
  );
};

type Step = (typeof STEPS)[number];

const StepCard = ({
  step,
  index,
  inView,
  mobile,
}: {
  step: Step;
  index: number;
  inView: boolean;
  mobile?: boolean;
}) => {
  const Icon = step.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: 0.7,
        delay: 0.2 + index * 0.12,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={`relative ${mobile ? "pl-20" : ""}`}
    >
      {/* Glass card */}
      <div
        className={`group relative overflow-hidden rounded-2xl border border-border/60 bg-card/70 p-5 backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:border-secondary/40 hover:shadow-[0_25px_60px_-20px_hsl(var(--primary)/0.4)] ${
          mobile ? "" : "h-full"
        }`}
      >
        {/* Gold shimmer on hover */}
        <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-br from-secondary/0 via-secondary/15 to-secondary/0 opacity-0 blur transition-opacity duration-500 group-hover:opacity-100" />

        {/* Icon node */}
        <div
          className={
            mobile
              ? "absolute left-0 top-4 flex h-14 w-14 items-center justify-center rounded-full border-2 border-secondary/30 bg-gradient-to-br from-primary to-primary/80 text-secondary shadow-[0_8px_24px_-6px_hsl(var(--primary)/0.5)]"
              : "relative mx-auto -mt-12 mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-secondary/30 bg-gradient-to-br from-primary to-primary/80 text-secondary shadow-[0_12px_30px_-8px_hsl(var(--primary)/0.6)]"
          }
        >
          <Icon className="h-6 w-6" />
          <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border border-secondary/40 bg-background text-[10px] font-semibold text-secondary">
            {step.n}
          </span>
        </div>

        <h3
          className={`font-display font-semibold leading-snug ${
            mobile ? "text-lg" : "text-center text-base"
          }`}
        >
          {step.title}
        </h3>
        <p
          className={`mt-2 text-xs leading-relaxed text-muted-foreground md:text-sm ${
            mobile ? "" : "text-center"
          }`}
        >
          {step.desc}
        </p>

        {step.warning && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-[11px] leading-relaxed text-destructive/90 md:text-xs">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{step.warning}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default SecurePaymentFlow;
