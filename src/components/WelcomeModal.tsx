import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Home, Building2, Users, Search, Star, DollarSign, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const WelcomeModal = () => {
  const [open, setOpen] = useState(false);
  const { profile, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!profile || !user) return;
    // Check if welcome_seen is false
    if (!(profile as any).welcome_seen) {
      setOpen(true);
    }
  }, [profile, user]);

  const handleClose = async () => {
    setOpen(false);
    if (profile) {
      await supabase
        .from("profiles")
        .update({ welcome_seen: true } as any)
        .eq("user_id", user!.id);
    }
  };

  const handleCTA = async () => {
    await handleClose();
    if (profile?.profile_type === "buyer") {
      navigate("/properties");
    } else {
      navigate("/dashboard");
    }
  };

  if (!profile) return null;

  const isBuyer = profile.profile_type === "buyer";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden rounded-2xl border-border shadow-elevated max-h-[90vh]">
        {/* Header */}
        <div className="relative bg-primary px-6 pt-8 pb-6 text-primary-foreground">
          <button
            onClick={handleClose}
            className="absolute right-4 top-4 rounded-full p-1 hover:bg-primary-foreground/20 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3 mb-2">
            {isBuyer ? <Home className="h-8 w-8" /> : <Building2 className="h-8 w-8" />}
          </div>
          <h2 className="font-display text-xl font-bold leading-tight">
            {isBuyer
              ? "Welcome to PROP-CONNECT! 🏡"
              : "Welcome to the PROP-CONNECT Agent Network! 🚀"}
          </h2>
        </div>

        <ScrollArea className="max-h-[55vh]">
          <div className="px-6 py-5 space-y-5 text-sm text-foreground">
            {isBuyer ? <BuyerContent /> : <AgentContent />}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4">
          <Button onClick={handleCTA} className="w-full rounded-xl text-base font-semibold h-12">
            {isBuyer ? "Start Exploring" : "Go to Dashboard"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const BuyerContent = () => (
  <>
    <p className="text-muted-foreground">
      We're excited to have you here.
    </p>
    <p>
      <strong>PROP-CONNECT</strong> is designed to help you find verified properties, connect with trusted agents, and buy or rent with confidence.
    </p>

    <div>
      <p className="font-semibold mb-2">On this platform you can:</p>
      <ul className="space-y-2">
        <ListItem icon={Search} text="Discover verified properties in your preferred location" />
        <ListItem icon={Users} text="Connect directly with trusted real estate agents" />
        <ListItem icon={DollarSign} text="Compare prices and explore different property options" />
        <ListItem icon={Star} text="Buy or rent properties safely and transparently" />
      </ul>
    </div>

    <div>
      <p className="font-semibold mb-2">To get started:</p>
      <ol className="space-y-1.5 list-decimal list-inside text-muted-foreground">
        <li>Search for properties by location, price, or property type</li>
        <li>Contact agents directly from the listing</li>
        <li>Save properties you love for easy access later</li>
      </ol>
    </div>

    <div className="rounded-xl bg-muted p-4 text-center">
      <p className="font-semibold text-foreground">Our mission is simple:</p>
      <p className="text-muted-foreground mt-1">Make property buying and renting easier, safer, and faster.</p>
    </div>

    <p className="text-center text-muted-foreground">
      Start exploring your next home today! 🏠
      <br />
      <span className="font-medium text-foreground">– The PROP-CONNECT Team</span>
    </p>
  </>
);

const AgentContent = () => (
  <>
    <p className="text-muted-foreground">
      Congratulations on joining <strong>PROP-CONNECT</strong>.
    </p>
    <p>
      You are now part of a growing network of real estate professionals connecting buyers and properties across Nigeria.
    </p>

    <div>
      <p className="font-semibold mb-2">PROP-CONNECT helps you:</p>
      <ul className="space-y-2">
        <ListItem icon={Building2} text="List your properties online and reach more buyers" />
        <ListItem icon={Users} text="Receive direct inquiries from serious buyers" />
        <ListItem icon={Star} text="Build your professional reputation with verified listings" />
        <ListItem icon={DollarSign} text="Close deals faster using our digital platform" />
      </ul>
    </div>

    <div>
      <p className="font-semibold mb-2">To get started:</p>
      <ol className="space-y-1.5 list-decimal list-inside text-muted-foreground">
        <li>Complete your agent profile</li>
        <li>Upload your first property listing</li>
        <li>Add clear photos and accurate property details</li>
        <li>Respond quickly to buyer inquiries</li>
      </ol>
    </div>

    <p className="text-muted-foreground">
      The more properties you list, the higher your chances of closing deals.
    </p>

    {/* Referral Bonus Section */}
    <div className="rounded-xl border-2 border-secondary bg-secondary/10 p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Gift className="h-5 w-5 text-secondary" />
        <p className="font-bold text-foreground">MAKE MONEY EVEN WITHOUT SELLING A PROPERTY YET</p>
      </div>
      <p className="text-muted-foreground text-xs font-medium">You can earn through referrals:</p>
      <ul className="space-y-1 text-sm text-foreground">
        <li>• Refer another property agent or realtor and earn a commission</li>
        <li>• Earn <span className="font-bold text-secondary">₦10,000</span> when your referred agent rents out a property</li>
        <li>• Earn <span className="font-bold text-secondary">₦50,000</span> when your referred agent sells a property through PROP-CONNECT</li>
      </ul>
    </div>

    <p className="text-center text-muted-foreground">
      Let's start closing deals! 🏡🤝
      <br />
      <span className="font-medium text-foreground">– The PROP-CONNECT Team</span>
    </p>
  </>
);

const ListItem = ({ icon: Icon, text }: { icon: any; text: string }) => (
  <li className="flex items-start gap-2.5">
    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
      <Icon className="h-3 w-3 text-primary" />
    </div>
    <span className="text-muted-foreground">{text}</span>
  </li>
);

export default WelcomeModal;
