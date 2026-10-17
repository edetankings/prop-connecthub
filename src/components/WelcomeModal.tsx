import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const journeys = {
  buyer: {
    title: "Make yourself at home.", intro: "A few simple ways to find your next place in Nigeria.",
    steps: ["Explore homes, rentals, land and commercial spaces using location and budget filters.", "Save properties on this device. Favorites are local to this browser, not synced to your account.", "Message the listing professional and request a preferred inspection time. The agent confirms availability."],
    cta: "Start exploring", destination: "/properties",
  },
  agent: {
    title: "Your professional journey starts here.", intro: "Introduce yourself and prepare clear, accurate property listings.",
    steps: ["Complete your profile and contact details in Settings.", "Review identity verification requirements before submitting documents. Registration does not verify your identity.", "Use the listing workspace to add property details and respond to enquiries. Existing verification and approval rules apply."],
    cta: "Go to your workspace", destination: "/dashboard",
  },
  builder: {
    title: "Build your presence, thoughtfully.", intro: "Your builder workspace brings property listings and enquiries together.",
    steps: ["Complete your builder profile and contact details in Settings.", "Review identity verification requirements. Creating this account does not approve you or your developments.", "Access your existing property listing workspace and respond to enquiries. This is not a construction or project-inventory management system."],
    cta: "Go to your workspace", destination: "/dashboard",
  },
};

export default function WelcomeModal() {
  const [open, setOpen] = useState(false);
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { setOpen(!!profile && !!user && !profile.welcome_seen); }, [profile, user]);
  const close = async () => {
    setOpen(false);
    if (profile && user) {
      // Preserve the existing dismissal preference without changing roles or verification.
      try { await supabase.from("profiles").update({ welcome_seen: true }).eq("user_id", user.id); }
      catch { /* Closing the introduction must never block the existing workspace. */ }
    }
  };
  if (!profile) return null;
  const journey = journeys[profile.profile_type];
  return <Dialog open={open} onOpenChange={value => { if (!value) void close(); }}><DialogContent className="onboarding-dialog"><p className="auth-eyebrow">Welcome to PROP-CONNECT</p><DialogTitle>{journey.title}</DialogTitle><DialogDescription>{journey.intro}</DialogDescription><ol className="onboarding-steps">{journey.steps.map(text => <li key={text}>{text}</li>)}</ol>{profile.profile_type !== "buyer" && <p>Identity checks use the existing form: identity documents, selfie, NIN or BVN, address evidence, bank details and phone verification. Approval requires review. Financial operations remain locked.</p>}<nav aria-label="Getting started"><Link to="/settings" onClick={() => void close()}>Profile settings</Link>{profile.profile_type !== "buyer" && <Link to="/verification" onClick={() => void close()}>Verification requirements</Link>}<Link to="/trust/safety-center" onClick={() => void close()}>Safety guidance</Link></nav><Button onClick={() => { void close(); navigate(journey.destination); }}>{journey.cta}</Button><Button variant="ghost" onClick={() => void close()}>Explore later</Button></DialogContent></Dialog>;
}
