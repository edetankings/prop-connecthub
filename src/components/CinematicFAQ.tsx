import { useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { Plus, Sparkles } from "lucide-react";

const FAQS = [
  {
    q: "What is PROP-CONNECT?",
    a: "PROP-CONNECT is a secure real estate platform that connects buyers, renters, and verified agents. Users can discover verified properties, communicate safely, and complete transactions confidently.",
  },
  {
    q: "How do property payments work?",
    a: "Buyers pay through PROP-CONNECT's secure payment process. Funds are verified and held in escrow before being released to the agent — only after the buyer confirms satisfaction with the inspection and documentation.",
  },
  {
    q: "Can I pay agents directly?",
    a: "No. PROP-CONNECT does not protect payments made outside the platform. Always use the secure payment flow so your money is held in escrow until the transaction is complete.",
  },
  {
    q: "How do I verify my account?",
    a: "Go to Verification and upload all required documents. Once all documents are submitted, Admin reviews them and approves verification.",
  },
  {
    q: "How do I become an agent?",
    a: "Register as an Agent account, complete profile setup, upload verification documents, complete subscription, and wait for approval.",
  },
  {
    q: "How does the referral system work?",
    a: "Every user receives a referral link. If another agent joins using your link and completes verification + subscription, referral rewards are triggered automatically.",
  },
  {
    q: "How do reservations work?",
    a: "Users can reserve a property directly through the platform. Reservation requests are sent to agents and monitored through the admin system.",
  },
  {
    q: "How do subscription payments work?",
    a: "Agents pay a monthly subscription fee of ₦7,500. Subscription status controls access to agent functions.",
  },
  {
    q: "How do earnings and matrix rewards work?",
    a: "PROP-CONNECT uses a 2x2 matrix structure with referral rewards and generation payouts. Earnings are automatically calculated.",
  },
  {
    q: "How do I contact support?",
    a: "Use the Help & Support section in your dashboard and messages are sent directly to Admin.",
  },
];

const CinematicFAQ = () => {
  const [open, setOpen] = useState<number | null>(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      ref={ref}
      className="relative overflow-hidden bg-primary py-24 md:py-32 text-primary-foreground"
    >
      {/* Cinematic background layers */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(var(--secondary)/0.18)_0%,_transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(255,255,255,0.06)_0%,_transparent_60%)]" />
        <div className="absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-secondary/10 blur-3xl" />
        <div className="absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
      </div>

      <div className="container relative mx-auto grid gap-12 px-4 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
        {/* Left: heading */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-secondary/30 bg-secondary/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.3em] text-secondary backdrop-blur-md">
            <Sparkles className="h-3 w-3" /> FAQ
          </div>
          <h2 className="mt-6 font-display text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
            Questions,<br />
            <span className="italic text-gradient-gold">answered.</span>
          </h2>
          <p className="mt-6 max-w-md text-sm leading-relaxed text-primary-foreground/65 md:text-base">
            Everything you need to know about discovering, verifying, and securing your next home on PROP-CONNECT.
          </p>
        </motion.div>

        {/* Right: glassmorphism accordion */}
        <div className="space-y-3">
          {FAQS.map((item, i) => {
            const isOpen = open === i;
            return (
              <motion.div
                key={item.q}
                initial={{ opacity: 0, y: 24 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.7, delay: 0.15 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -2 }}
                className={`group relative overflow-hidden rounded-2xl border backdrop-blur-xl transition-all duration-500 ${
                  isOpen
                    ? "border-secondary/50 bg-white/[0.08] shadow-[0_20px_60px_-20px_hsl(var(--secondary)/0.4)]"
                    : "border-white/10 bg-white/[0.04] hover:border-secondary/30 hover:bg-white/[0.06] hover:shadow-[0_15px_40px_-15px_rgba(0,0,0,0.5)]"
                }`}
              >
                {/* glow on hover */}
                <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-r from-secondary/0 via-secondary/20 to-secondary/0 opacity-0 blur-md transition-opacity duration-500 group-hover:opacity-100" />

                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="relative flex w-full items-center justify-between gap-6 px-5 py-5 text-left md:px-7 md:py-6"
                >
                  <span className="font-display text-base font-medium leading-snug md:text-lg">
                    {item.q}
                  </span>
                  <motion.span
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors ${
                      isOpen
                        ? "border-secondary bg-secondary text-secondary-foreground"
                        : "border-white/20 bg-white/5 text-primary-foreground/80"
                    }`}
                  >
                    <Plus className="h-4 w-4" />
                  </motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      className="relative overflow-hidden"
                    >
                      <div className="px-5 pb-6 md:px-7 md:pb-7">
                        <div className="h-px w-full bg-gradient-to-r from-transparent via-secondary/30 to-transparent" />
                        <p className="mt-5 max-w-2xl text-sm leading-relaxed text-primary-foreground/75 md:text-[15px]">
                          {item.a}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CinematicFAQ;
