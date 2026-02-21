import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Phone, Mail, FileText, Camera, CreditCard, Building2, CheckCircle, Clock, XCircle, Lock, AlertTriangle, ChevronRight, Upload, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useVerificationSteps, StepName } from "@/hooks/useVerificationSteps";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const STEP_ICONS: Record<StepName, React.ElementType> = {
  phone_otp: Phone,
  email_auth: Mail,
  id_document: FileText,
  selfie: Camera,
  nin_bvn: CreditCard,
  bank_address: Building2,
};

const STEP_DESCRIPTIONS: Record<StepName, string> = {
  phone_otp: "Verify your phone number via OTP code",
  email_auth: "Confirm your email address",
  id_document: "Upload a government-issued ID document",
  selfie: "Record a 5-second live selfie video",
  nin_bvn: "Submit your NIN or BVN for validation",
  bank_address: "Provide bank details and residential address",
};

const IdentityVerification = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const {
    steps, loading, completedCount, totalSteps, progressPercent,
    isStepUnlocked, nextIncompleteStep, getStepByName, updateStep,
    overallStatus, STEP_ORDER, STEP_LABELS,
  } = useVerificationSteps();

  const [expandedStep, setExpandedStep] = useState<StepName | null>(null);
  const [uploading, setUploading] = useState(false);

  // Form states
  const [idType, setIdType] = useState("nin");
  const [ninBvnValue, setNinBvnValue] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [address, setAddress] = useState("");

  const userId = user?.id;
  const userCode = userId ? `PC-${userId.slice(0, 5).toUpperCase()}` : "PC-00000";

  const statusBadge = () => {
    const s = overallStatus();
    if (s === "verified") return <Badge className="bg-[hsl(var(--success))]/15 text-[hsl(var(--success))] border-0 gap-1"><CheckCircle className="h-3 w-3" /> Verified</Badge>;
    if (s === "pending") return <Badge className="bg-[hsl(var(--info))]/15 text-[hsl(var(--info))] border-0 gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
    return <Badge className="bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))] border-0 gap-1"><AlertTriangle className="h-3 w-3" /> Unverified</Badge>;
  };

  const stepStatusIcon = (status: string, unlocked: boolean) => {
    if (!unlocked) return <Lock className="h-5 w-5 text-muted-foreground/40" />;
    if (status === "approved") return <CheckCircle className="h-5 w-5 text-[hsl(var(--success))]" />;
    if (status === "pending") return <Clock className="h-5 w-5 text-[hsl(var(--info))]" />;
    if (status === "rejected") return <XCircle className="h-5 w-5 text-destructive" />;
    return <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />;
  };

  const handleFileUpload = async (stepName: StepName, file: File) => {
    if (!userId) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${userId}/${stepName}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("verification-docs").upload(path, file);
    if (error) {
      toast.error("Upload failed: " + error.message);
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("verification-docs").getPublicUrl(path);
    await updateStep(stepName, { status: "pending", document_url: urlData.publicUrl });
    setUploading(false);
  };

  const handlePhoneOtp = async () => {
    // For now, mark as pending (in production, trigger OTP)
    await updateStep("phone_otp", { status: "pending" });
    toast.info("Phone OTP sent! (Demo: auto-approving)");
    // Auto-approve for demo
    setTimeout(() => updateStep("phone_otp", { status: "approved" }), 1500);
  };

  const handleEmailAuth = async () => {
    if (user?.email_confirmed_at) {
      await updateStep("email_auth", { status: "approved" });
      toast.success("Email already verified!");
    } else {
      toast.info("Please verify your email first");
    }
  };

  const handleNinBvnSubmit = async () => {
    if (!ninBvnValue.trim()) { toast.error("Enter your NIN or BVN"); return; }
    await updateStep("nin_bvn", { status: "pending", metadata: { nin_bvn: ninBvnValue, type: idType } });
  };

  const handleBankSubmit = async () => {
    if (!bankName || !accountNumber || !address) { toast.error("Fill all fields"); return; }
    await updateStep("bank_address", { status: "pending", metadata: { bank_name: bankName, account_number: accountNumber, address } });
  };

  const handleContinue = () => {
    const next = nextIncompleteStep();
    if (next) setExpandedStep(next);
    else toast.success("All steps completed!");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <div className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-lg">
        <div className="container mx-auto flex h-14 items-center gap-3 px-4">
          <button onClick={() => navigate(-1)} className="rounded-lg p-2 hover:bg-muted transition-colors">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h1 className="font-display text-lg font-bold text-foreground">Identity Verification</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Profile Header */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-card mb-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl shrink-0">
              {profile?.full_name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-display text-xl font-bold text-foreground truncate">{profile?.full_name || "User"}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {statusBadge()}
                <span className="text-xs text-muted-foreground font-mono">{userCode}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-card mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-foreground">
              Verification Progress – {completedCount} of {totalSteps} steps
            </p>
            <span className="text-sm font-bold text-primary">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-3 mb-2" />
          <p className="text-xs text-muted-foreground">
            {progressPercent}% Completed. {progressPercent < 100 ? "Almost there!" : "All steps completed! 🎉"}
          </p>
        </div>

        {/* Agent Notice */}
        {profile?.profile_type === "agent" && (
          <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 mb-6 flex gap-3">
            <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-foreground">
              <span className="font-semibold">Important:</span> Only fully verified agents can receive escrow payouts. Complete verification to unlock withdrawals.
            </p>
          </div>
        )}

        {/* Verification Steps */}
        <div className="space-y-3 mb-8">
          {STEP_ORDER.map((stepName, idx) => {
            const step = getStepByName(stepName);
            const unlocked = isStepUnlocked(stepName);
            const status = step?.status || "not_started";
            const Icon = STEP_ICONS[stepName];
            const isExpanded = expandedStep === stepName;

            return (
              <div key={stepName} className={`rounded-xl border bg-card shadow-card overflow-hidden transition-all ${
                !unlocked ? "border-border/50 opacity-60" : status === "approved" ? "border-[hsl(var(--success))]/30" : status === "rejected" ? "border-destructive/30" : "border-border"
              }`}>
                {/* Step Header */}
                <button
                  disabled={!unlocked}
                  onClick={() => setExpandedStep(isExpanded ? null : stepName)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors disabled:cursor-not-allowed"
                >
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                    status === "approved" ? "bg-[hsl(var(--success))]/10" : status === "pending" ? "bg-[hsl(var(--info))]/10" : status === "rejected" ? "bg-destructive/10" : "bg-muted"
                  }`}>
                    <Icon className={`h-5 w-5 ${
                      status === "approved" ? "text-[hsl(var(--success))]" : status === "pending" ? "text-[hsl(var(--info))]" : status === "rejected" ? "text-destructive" : "text-muted-foreground"
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground">{STEP_LABELS[stepName]}</p>
                    <p className="text-xs text-muted-foreground">{STEP_DESCRIPTIONS[stepName]}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {stepStatusIcon(status, unlocked)}
                    {unlocked && status !== "approved" && (
                      <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                    )}
                  </div>
                </button>

                {/* Step rejection reason */}
                {step?.rejection_reason && status === "rejected" && (
                  <div className="mx-4 mb-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                    <p className="text-xs text-destructive"><span className="font-semibold">Rejected:</span> {step.rejection_reason}</p>
                  </div>
                )}

                {/* Expanded Step Content */}
                {isExpanded && unlocked && status !== "approved" && (
                  <div className="border-t border-border p-4 space-y-4">
                    {/* Phone OTP */}
                    {stepName === "phone_otp" && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-3">We'll send a one-time code to your registered phone number.</p>
                        <Button onClick={handlePhoneOtp} disabled={status === "pending"} className="bg-primary text-primary-foreground hover:bg-primary/90 w-full">
                          {status === "pending" ? "Verifying..." : "Send OTP Code"}
                        </Button>
                      </div>
                    )}

                    {/* Email Auth */}
                    {stepName === "email_auth" && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-3">Your email: <span className="font-medium text-foreground">{user?.email}</span></p>
                        <Button onClick={handleEmailAuth} disabled={status === "pending"} className="bg-primary text-primary-foreground hover:bg-primary/90 w-full">
                          {user?.email_confirmed_at ? "Confirm Email Verified" : "Verify Email"}
                        </Button>
                      </div>
                    )}

                    {/* ID Document Upload */}
                    {stepName === "id_document" && (
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm">Document Type</Label>
                          <Select value={idType} onValueChange={setIdType}>
                            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="nin">NIN Slip</SelectItem>
                              <SelectItem value="bvn">BVN Card</SelectItem>
                              <SelectItem value="drivers_license">Driver License</SelectItem>
                              <SelectItem value="passport">International Passport</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-sm">Upload Document</Label>
                          <div className="mt-1 border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors">
                            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground mb-2">Click or drag to upload</p>
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              className="absolute inset-0 opacity-0 cursor-pointer"
                              style={{ position: "relative" }}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload("id_document", file);
                              }}
                              disabled={uploading}
                            />
                          </div>
                        </div>
                        {status === "pending" && (
                          <p className="text-xs text-[hsl(var(--info))] flex items-center gap-1"><Clock className="h-3 w-3" /> Document under review</p>
                        )}
                      </div>
                    )}

                    {/* Live Selfie */}
                    {stepName === "selfie" && (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">Record a 5-second live selfie video for identity matching.</p>
                        <div>
                          <Label className="text-sm">Upload Selfie Video</Label>
                          <div className="mt-1 border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors">
                            <Camera className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground mb-2">Upload a short selfie video</p>
                            <input
                              type="file"
                              accept="video/*"
                              style={{ position: "relative" }}
                              className="opacity-0 cursor-pointer"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload("selfie", file);
                              }}
                              disabled={uploading}
                            />
                          </div>
                        </div>
                        {status === "pending" && (
                          <p className="text-xs text-[hsl(var(--info))] flex items-center gap-1"><Clock className="h-3 w-3" /> Selfie under review</p>
                        )}
                      </div>
                    )}

                    {/* NIN/BVN */}
                    {stepName === "nin_bvn" && (
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm">NIN or BVN Number</Label>
                          <Input
                            className="mt-1"
                            placeholder="Enter your NIN or BVN"
                            value={ninBvnValue}
                            onChange={(e) => setNinBvnValue(e.target.value)}
                          />
                        </div>
                        <Button onClick={handleNinBvnSubmit} disabled={status === "pending"} className="bg-primary text-primary-foreground hover:bg-primary/90 w-full">
                          {status === "pending" ? "Under Review" : "Submit for Validation"}
                        </Button>
                      </div>
                    )}

                    {/* Bank & Address */}
                    {stepName === "bank_address" && (
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm">Bank Name</Label>
                          <Input className="mt-1" placeholder="e.g. First Bank" value={bankName} onChange={(e) => setBankName(e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-sm">Account Number</Label>
                          <Input className="mt-1" placeholder="10-digit account number" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-sm">Residential Address</Label>
                          <Textarea className="mt-1" placeholder="Enter your full residential address" value={address} onChange={(e) => setAddress(e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-sm">Utility Bill (Optional)</Label>
                          <div className="mt-1 border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-primary/50 transition-colors">
                            <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                            <p className="text-xs text-muted-foreground">Upload utility bill</p>
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              style={{ position: "relative" }}
                              className="opacity-0 cursor-pointer"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload("bank_address", file);
                              }}
                              disabled={uploading}
                            />
                          </div>
                        </div>
                        <Button onClick={handleBankSubmit} disabled={status === "pending"} className="bg-primary text-primary-foreground hover:bg-primary/90 w-full">
                          {status === "pending" ? "Under Review" : "Submit Bank & Address"}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Continue Button */}
        {progressPercent < 100 && (
          <Button onClick={handleContinue} className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-base rounded-xl shadow-elevated">
            Continue Verification
          </Button>
        )}

        {progressPercent === 100 && (
          <div className="rounded-xl border-2 border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/5 p-6 text-center">
            <CheckCircle className="h-10 w-10 mx-auto text-[hsl(var(--success))] mb-2" />
            <h3 className="font-display text-lg font-bold text-foreground">Fully Verified!</h3>
            <p className="text-sm text-muted-foreground mt-1">Your identity has been verified. You can now access all platform features.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default IdentityVerification;
