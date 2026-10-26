import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CreditCard, Clock, CheckCircle, XCircle, Building, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useFinancialAvailability } from "@/hooks/useFinancialAvailability";

const Payments = () => {
  const { user } = useAuth();
  const finance = useFinancialAvailability();
  const { subscription, pendingRequest, loading, isActive, subscriptionsEnabled, settingsError, refreshSettings, daysRemaining, refetch } = useSubscription();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");

  const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
    active: { color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", icon: CheckCircle, label: "Active" },
    expired: { color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", icon: XCircle, label: "Expired" },
    pending: { color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: Clock, label: "Pending Approval" },
  };

  const currentStatus = pendingRequest ? "pending" : isActive ? "active" : "expired";
  const cfg = statusConfig[currentStatus] || statusConfig.expired;

  const handleSubmit = async () => {
    if (subscriptionsEnabled !== true) { toast.error("Subscription payments are currently unavailable."); return; }
    if (!finance.enabled) { toast.error(finance.unavailableMessage); return; }
    if (!file || !user || uploading) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("payment-screenshots").upload(path, file);
      if (uploadErr) throw uploadErr;

      // Bucket is private: store the storage path; admin UI resolves a signed URL on demand.
      const { error } = await (supabase as any).from("subscription_requests").insert({
        user_id: user.id,
        screenshot_url: path,
        note: note || null,
      });
      if (error) throw error;

      toast.success("Payment submitted, awaiting admin approval");
      setOpen(false);
      setFile(null);
      setNote("");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit payment");
    } finally {
      setUploading(false);
    }
  };

  return (
    <AuthenticatedLayout>
      <div className="agent-payment-page container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground">Subscription & Payments 💳</h1>
          <p className="mt-1 text-muted-foreground">Manage your agent subscription</p>
          {subscriptionsEnabled === false && <p role="status" className="mt-3">Subscriptions are OFF. Verified agents and builders can submit listings without a subscription. Existing subscription records are preserved.</p>}
          {settingsError && <div role="alert"><p>Subscription settings could not be loaded.</p><Button variant="outline" onClick={refreshSettings}>Retry subscription setting</Button></div>}
        </div>

        {/* Subscription Status Card */}
        <Card className="mb-6 border-border shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="h-5 w-5 text-secondary" /> Subscription Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Plan</p>
                  <p className="font-display font-bold text-foreground">Pending business approval</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge className={`mt-1 ${cfg.color}`}>
                    <cfg.icon className="h-3 w-3 mr-1" /> {cfg.label}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Expiry Date</p>
                  <p className="font-medium text-foreground">
                    {subscription?.end_date ? new Date(subscription.end_date).toLocaleDateString() : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Days Remaining</p>
                  <p className="font-display font-bold text-foreground">{isActive ? daysRemaining : 0}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bank details are shown only while subscriptions are enabled. */}
        {subscriptionsEnabled === true && <>
        <Card className="mb-6 border-border shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building className="h-5 w-5 text-secondary" /> Company Bank Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              {!finance.enabled && <p role="status">{finance.unavailableMessage}</p>}
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Bank Name</span>
                <span className="font-semibold text-foreground">{finance.details?.company_bank_name ?? "Unavailable"}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Account Name</span>
                <span className="font-semibold text-foreground">{finance.details?.company_account_name ?? "Unavailable"}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">Account Number</span>
                <span className="font-display font-bold text-foreground text-lg">{finance.details?.company_account_number ?? "Unavailable"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action */}
        {pendingRequest ? (
          <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <p className="font-semibold text-foreground">Payment Under Review</p>
                <p className="text-sm text-muted-foreground">
                  Submitted {new Date(pendingRequest.created_at).toLocaleDateString()}. Awaiting admin approval.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button disabled={!finance.enabled} size="lg" className="w-full gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90">
                 {isActive ? "Renew Subscription" : "I Have Made Payment"} 👉
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Submit Payment Proof</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <label className="text-sm font-medium text-foreground">Payment Screenshot *</label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Note (optional)</label>
                  <Textarea
                    placeholder="Transaction reference, date, etc."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <Button
                  onClick={handleSubmit}
                  disabled={!file || uploading || !finance.enabled}
                  className="w-full bg-primary text-primary-foreground"
                >
                  {uploading ? "Submitting..." : "Submit Payment"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {!isActive && !pendingRequest && (
          <Card className="mt-4 border-destructive/30 bg-destructive/5">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
              <p className="text-sm text-foreground">
                Your subscription is inactive. Payment collection remains unavailable until platform configuration is approved.
              </p>
            </CardContent>
          </Card>
        )}
        </>}
      </div>
    </AuthenticatedLayout>
  );
};

export default Payments;
