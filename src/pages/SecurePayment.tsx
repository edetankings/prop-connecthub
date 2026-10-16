import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import {
  Lock,
  ShieldCheck,
  AlertTriangle,
  Copy,
  Upload,
  CheckCircle,
  ArrowLeft,
  Loader2,
  Clock,
  Building2,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const formatNaira = (n: number) =>
  "₦" + Number(n || 0).toLocaleString("en-NG");

type Property = {
  id: string;
  title: string;
  price: number;
  property_code: string | null;
  status: string;
  city: string | null;
  state: string | null;
  image_url: string | null;
  agent_id: string;
  listing_type: "sale" | "rental" | null;
};

type Settings = {
  company_account_name: string;
  company_account_number: string;
  company_bank_name: string;
};

type Commission = {
  sales_percent: number;
  rental_percent: number;
};

type Tx = {
  id: string;
  amount: number;
  commission_amount: number;
  total_payable: number;
  payment_status: string;
  proof_url: string | null;
  expires_at: string | null;
  property_code: string | null;
};

const SecurePayment = () => {
  const { propertyId } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [property, setProperty] = useState<Property | null>(null);
  const [agentName, setAgentName] = useState<string>("");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [commission, setCommission] = useState<Commission | null>(null);
  const [tx, setTx] = useState<Tx | null>(null);
  const [loading, setLoading] = useState(true);
  const [initiating, setInitiating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!propertyId || !user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [propRes, settingsRes, commRes, txRes] = await Promise.all([
        supabase
          .from("properties")
          .select("id,title,price,property_code,status,city,state,image_url,agent_id,listing_type")
          .eq("id", propertyId)
          .maybeSingle(),
        supabase.rpc("get_company_payment_details"),
        supabase
          .from("commission_settings")
          .select("sales_percent,rental_percent")
          .limit(1)
          .maybeSingle(),
        supabase
          .from("transactions")
          .select("id,amount,commission_amount,total_payable,payment_status,proof_url,expires_at,property_code")
          .eq("property_id", propertyId)
          .eq("buyer_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      if (propRes.data) {
        setProperty(propRes.data as Property);
        // fetch agent name
        const { data: ag } = await supabase
          .from("public_profiles")
          .select("full_name")
          .eq("id", propRes.data.agent_id)
          .maybeSingle();
        setAgentName((ag as any)?.full_name || "Verified Agent");
      }
      if (settingsRes.data) setSettings(((settingsRes.data as any)[0] ?? settingsRes.data) as Settings);
      if (commRes.data) setCommission(commRes.data as Commission);
      if (txRes.data) setTx(txRes.data as Tx);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [propertyId, user]);

  const handleInitiate = async () => {
    if (!settings) { toast.error("Payments are unavailable. Do not transfer funds."); return; }
    if (!propertyId) return;
    setInitiating(true);
    const { data, error } = await supabase.rpc("initiate_secure_payment", {
      _property_id: propertyId,
    });
    setInitiating(false);
    if (error) {
      toast.error(error.message || "Could not start secure payment");
      return;
    }
    toast.success("Secure transaction created. Complete the transfer below.");
    // refresh
    const { data: txData } = await supabase
      .from("transactions")
      .select("id,amount,commission_amount,total_payable,payment_status,proof_url,expires_at,property_code")
      .eq("id", data as string)
      .maybeSingle();
    if (txData) setTx(txData as Tx);
  };

  const handleUpload = async () => {
    if (!file || !tx || !user || uploading) return;
    const valid = ["image/jpeg", "image/png", "application/pdf"];
    if (!valid.includes(file.type)) {
      toast.error("Only JPG, PNG or PDF are accepted");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large (max 10 MB)");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${user.id}/${tx.id}/proof.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("payment-screenshots")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) {
        toast.error(upErr.message);
        return;
      }
      const { error: rpcErr } = await supabase.rpc("submit_payment_proof", {
        _transaction_id: tx.id,
        _proof_url: path,
      });
      if (rpcErr) {
        toast.error(rpcErr.message);
        return;
      }
      toast.success("Payment proof submitted — PROP-CONNECT is reviewing.");
      setTx({ ...tx, payment_status: "under_review", proof_url: path });
    } catch {
      toast.error("Could not submit payment proof. Please retry.");
    } finally {
      setUploading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto flex items-center justify-center px-4 py-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-32 text-center">
          <h1 className="font-display text-2xl">Property not found</h1>
          <Link to="/properties">
            <Button className="mt-6">Browse Properties</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isRent = property.listing_type === "rental";
  const rate = commission
    ? isRent
      ? commission.rental_percent
      : commission.sales_percent
    : 1;
  const computedCommission = tx?.commission_amount ?? Math.round((property.price * Number(rate)) / 100);
  const computedTotal = tx?.total_payable ?? property.price;

  const status = tx?.payment_status;
  const showAwaitingApproval = !tx;
  const showProofUpload = !!settings && !!tx && (status === "pending_payment" || status === "under_review");
  const isUnderReview = status === "under_review";
  const isSecured = status === "secured" || status === "released";


  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Secure Payment · {property.title.slice(0, 40)}</title>
        <meta name="description" content="Complete your secure payment through PROP-CONNECT escrow." />
      </Helmet>
      <Navbar />

      <div className="container mx-auto max-w-5xl px-4 py-10">
        <Link
          to={`/property/${property.id}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to property
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mt-4"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-secondary/40 bg-secondary/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.3em] text-secondary">
            <Lock className="h-3 w-3" /> Escrow Protected
          </div>
          <h1 className="mt-3 font-display text-3xl font-semibold md:text-4xl">
            Secure Payment
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Your payment is held safely by PROP-CONNECT until inspection and confirmation. Funds are never sent directly to the agent.
          </p>
        </motion.div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          {/* Left column */}
          <div className="space-y-6">
            {/* Property summary */}
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
              <div className="flex flex-col gap-4 p-5 sm:flex-row">
                {property.image_url && (
                  <img
                    src={property.image_url}
                    alt={property.title}
                    className="h-32 w-full rounded-lg object-cover sm:w-44"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <Badge variant="outline" className="text-[10px]">
                    {property.property_code || "PROP-PENDING"}
                  </Badge>
                  <h2 className="mt-2 font-display text-lg font-semibold leading-snug line-clamp-2">
                    {property.title}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[property.city, property.state].filter(Boolean).join(", ") || "Nigeria"}
                  </p>
                  <p className="mt-2 text-sm">
                    <span className="text-muted-foreground">Agent: </span>
                    <span className="font-medium">{agentName}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Transaction summary */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <h3 className="font-display text-lg font-semibold">Transaction Summary</h3>
              <div className="mt-4 space-y-3 text-sm">
                <Row label={isRent ? "Rent Amount" : "Property Amount"} value={formatNaira(property.price)} />
                <Row
                  label={`Company Commission (${rate}%)`}
                  value={formatNaira(computedCommission)}
                  muted
                />
                <div className="border-t border-border pt-3">
                  <Row
                    label="Total Payable"
                    value={formatNaira(computedTotal)}
                    bold
                  />
                </div>
              </div>
              {tx?.expires_at && (status === "pending_payment" || status === "under_review") && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  Upload payment proof before{" "}
                  <strong className="text-foreground">
                    {new Date(tx.expires_at).toLocaleString()}
                  </strong>
                  . After 72 hours without proof, this transaction expires and the property is released.
                </div>
              )}
            </div>

            {/* Company account */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-secondary" />
                <h3 className="font-display text-lg font-semibold">PROP-CONNECT Company Account</h3>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {settings ? "Use the verified account details below only when payment collection is enabled." : "Payments are unavailable. Do not transfer funds."}
              </p>
              <div className="mt-4 space-y-3">
                <AccountRow
                  label="Account Name"
                  value={settings?.company_account_name || "Unavailable"}
                  onCopy={() =>
                    copyToClipboard(settings?.company_account_name || "", "Account name")
                  }
                />
                <AccountRow
                  label="Account Number"
                  value={settings?.company_account_number || "—"}
                  onCopy={() =>
                    copyToClipboard(settings?.company_account_number || "", "Account number")
                  }
                  mono
                />
                <AccountRow
                  label="Bank"
                  value={settings?.company_bank_name || "—"}
                  onCopy={() =>
                    copyToClipboard(settings?.company_bank_name || "", "Bank")
                  }
                />
                {property.property_code && (
                  <AccountRow
                    label="Narration / Property ID"
                    value={property.property_code}
                    onCopy={() =>
                      copyToClipboard(property.property_code as string, "Property ID")
                    }
                    mono
                  />
                )}
              </div>

              <div className="mt-5 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-xs leading-relaxed text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  <strong>Do not transfer money directly to agents.</strong> Payments
                  made outside PROP-CONNECT are not protected by our escrow system
                  and we cannot help recover them.
                </span>
              </div>
            </div>
          </div>

          {/* Right column — action panel */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-secondary/5 p-5 shadow-card">
              {showAwaitingApproval ? (
                <>
                  <Lock className="h-8 w-8 text-secondary" />
                  <h3 className="mt-3 font-display text-lg font-semibold">
                    Awaiting agent approval
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Secure payment is locked until the listing agent accepts your deal request. Once they accept, you'll receive a notification and can complete payment from here.
                  </p>
                  <Link to={`/property/${property.id}`} className="mt-4 block">
                    <Button variant="outline" className="w-full">
                      Back to property
                    </Button>
                  </Link>
                  <Link to="/messages" className="mt-3 block">
                    <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                      Chat with agent
                    </Button>
                  </Link>
                </>
              ) : showProofUpload ? (

                <>
                  <Upload className="h-8 w-8 text-secondary" />
                  <h3 className="mt-3 font-display text-lg font-semibold">
                    {isUnderReview ? "Proof received — under review" : "I have made payment"}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Upload your transfer screenshot or receipt (JPG, PNG, or PDF, up to 10 MB).
                  </p>
                  <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-background p-6 text-center text-xs text-muted-foreground hover:border-secondary">
                    <Upload className="h-5 w-5" />
                    {file ? file.name : "Click to choose a file"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,application/pdf"
                      className="hidden"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                  </label>
                  <Button
                    onClick={handleUpload}
                    disabled={!file || uploading}
                    className="mt-4 w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading…
                      </>
                    ) : isUnderReview ? (
                      <>Re-upload proof</>
                    ) : (
                      <>Submit payment proof</>
                    )}
                  </Button>
                  {isUnderReview && (
                    <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" /> PROP-CONNECT is verifying your transfer. You'll be notified shortly.
                    </p>
                  )}
                </>
              ) : isSecured ? (
                <>
                  <CheckCircle className="h-8 w-8 text-[hsl(var(--success))]" />
                  <h3 className="mt-3 font-display text-lg font-semibold">
                    Payment Secured
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Your payment is safely held in escrow. Proceed with inspection and documentation with the agent. You'll be able to release funds from your dashboard once you're satisfied.
                  </p>
                  <Link to="/buyer-dashboard" className="mt-4 block">
                    <Button className="w-full">Go to dashboard</Button>
                  </Link>
                </>
              ) : (
                <>
                  <h3 className="font-display text-lg font-semibold">
                    Transaction status: {status}
                  </h3>
                </>
              )}
            </div>

            {/* Trust strip */}
            <div className="rounded-2xl border border-border bg-card p-5 text-xs text-muted-foreground shadow-card">
              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-secondary" />
                <span>Funds held in escrow until you confirm satisfaction.</span>
              </div>
              <div className="mt-3 flex items-start gap-2">
                <Lock className="mt-0.5 h-4 w-4 text-secondary" />
                <span>All transfers logged and tied to a unique Property ID.</span>
              </div>
              <div className="mt-3 flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-secondary" />
                <span>Disputes can be raised at any point during the transaction.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Row = ({
  label,
  value,
  bold,
  muted,
}: {
  label: string;
  value: string;
  bold?: boolean;
  muted?: boolean;
}) => (
  <div className="flex items-center justify-between">
    <span className={muted ? "text-muted-foreground" : ""}>{label}</span>
    <span className={bold ? "font-display text-lg font-semibold" : "font-medium"}>
      {value}
    </span>
  </div>
);

const AccountRow = ({
  label,
  value,
  onCopy,
  mono,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  mono?: boolean;
}) => (
  <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 p-3">
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-0.5 truncate text-sm font-medium ${mono ? "font-mono" : ""}`}>
        {value}
      </p>
    </div>
    <Button variant="ghost" size="icon" onClick={onCopy} className="shrink-0">
      <Copy className="h-4 w-4" />
    </Button>
  </div>
);

export default SecurePayment;
