import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Phone,
  Mail,
  FileText,
  Camera,
  CreditCard,
  Building2,
  CheckCircle,
  Clock,
  XCircle,
  Lock,
  AlertTriangle,
  ChevronRight,
  Upload,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useVerificationSteps, StepName } from "@/hooks/useVerificationSteps";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";

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
  id_document: "Upload a government-issued ID (Passport, Driver License, or NIN)",
  selfie: "Take a live selfie photo for identity matching",
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

  // Phone OTP state
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone || "");
  const [otpCode, setOtpCode] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpExpiresAt, setOtpExpiresAt] = useState<number | null>(null);
  const [otpResendAvailableAt, setOtpResendAvailableAt] = useState<number | null>(null);

  // Ticker for countdowns
  const [nowMs, setNowMs] = useState(() => Date.now());

  const userId = user?.id;
  const userCode = userId ? `PC-${userId.slice(0, 5).toUpperCase()}` : "PC-00000";

  useEffect(() => {
    setPhoneNumber(profile?.phone || "");
  }, [profile?.phone]);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  const otpSecondsLeft = useMemo(() => {
    if (!otpExpiresAt) return 0;
    return Math.max(0, Math.ceil((otpExpiresAt - nowMs) / 1000));
  }, [otpExpiresAt, nowMs]);

  const resendSecondsLeft = useMemo(() => {
    if (!otpResendAvailableAt) return 0;
    return Math.max(0, Math.ceil((otpResendAvailableAt - nowMs) / 1000));
  }, [otpResendAvailableAt, nowMs]);

  const formatCountdown = (seconds: number) => {
    const mm = Math.floor(seconds / 60);
    const ss = seconds % 60;
    return `${mm}:${String(ss).padStart(2, "0")}`;
  };

  const statusBadge = () => {
    const s = overallStatus();
    if (s === "verified") return <Badge className="bg-[hsl(var(--success))]/15 text-[hsl(var(--success))] border-0 gap-1"><CheckCircle className="h-3 w-3" /> Verified</Badge>;
    if (s === "pending") return <Badge className="bg-[hsl(var(--info))]/15 text-[hsl(var(--info))] border-0 gap-1"><Clock className="h-3 w-3" /> Pending Review</Badge>;
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
    
    // Also save to verification_documents table for admin review
    await supabase.from("verification_documents").insert({
      user_id: userId,
      document_type: stepName,
      file_url: urlData.publicUrl,
      status: "pending",
    });

    // Create self-notification
    await (supabase as any).from("notifications").insert({
      user_id: userId,
      title: "Document Submitted",
      message: `Your ${STEP_LABELS[stepName]} document has been submitted for review.`,
      type: "info",
      link: "/verification",
    });

    toast.success("Document uploaded and sent for admin review!");
    setUploading(false);
  };

  const sendPhoneOtp = async () => {
    if (!userId) return;
    if (!phoneNumber.trim()) {
      toast.error("Please enter your phone number");
      return;
    }

    setOtpSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-phone-otp", {
        body: { phone: phoneNumber },
      });

      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      await updateStep("phone_otp", { status: "pending" });
      setOtpExpiresAt(Date.now() + 5 * 60 * 1000);
      setOtpResendAvailableAt(Date.now() + 30 * 1000);
      toast.success("OTP sent to your phone");
    } catch (e: any) {
      toast.error(e.message || "Failed to send OTP");
    } finally {
      setOtpSending(false);
    }
  };

  const verifyPhoneOtp = async () => {
    if (!userId) return;
    if (!otpCode || otpCode.length < 4) {
      toast.error("Enter the OTP code");
      return;
    }

    setOtpVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-phone-otp", {
        body: { phone: phoneNumber, code: otpCode },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      await updateStep("phone_otp", { status: "approved" });
      setOtpCode("");
      setOtpExpiresAt(null);
      setOtpResendAvailableAt(null);
      toast.success("Phone number verified");
    } catch (e: any) {
      toast.error(e.message || "Invalid OTP");
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleEmailAuth = async () => {
    if (!userId) return;
    if (user?.email_confirmed_at) {
      await updateStep("email_auth", { status: "approved" });
      toast.success("Email already verified!");
    } else {
      await updateStep("email_auth", { status: "pending" });
      toast.info("Email verification submitted. Please verify your email.");
    }
  };

  const handleNinBvnSubmit = async () => {
    if (!ninBvnValue.trim()) { toast.error("Enter your NIN or BVN"); return; }
    if (!userId) return;
    await updateStep("nin_bvn", { status: "pending", metadata: { nin_bvn: ninBvnValue, type: idType } });
    await (supabase as any).from("notifications").insert({
      user_id: userId,
      title: "NIN/BVN Submitted",
      message: "Your NIN/BVN has been submitted for validation.",
      type: "info",
      link: "/verification",
    });
    toast.success("NIN/BVN submitted for admin review!");
  };

  const handleBankSubmit = async () => {
    if (!bankName || !accountNumber || !address) { toast.error("Fill all fields"); return; }
    if (!userId) return;
    await updateStep("bank_address", { status: "pending", metadata: { bank_name: bankName, account_number: accountNumber, address } });
    
    // Upload address as verification document  
    await supabase.from("verification_documents").insert({
      user_id: userId,
      document_type: "bank_address",
      file_url: "metadata-only",
      status: "pending",
    });

    await (supabase as any).from("notifications").insert({
      user_id: userId,
      title: "Bank & Address Submitted",
      message: "Your bank and address details have been submitted for verification.",
      type: "info",
      link: "/verification",
    });
    toast.success("Bank & Address submitted for admin review!");
  };

  const handleContinue = () => {
    const next = nextIncompleteStep();
    if (next) setExpandedStep(next);
    else toast.success("All steps completed!");
  };

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Profile Header */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-card mb-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl shrink-0">
              {profile?.full_name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-xl font-bold text-foreground truncate">{profile?.full_name || "User"}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {statusBadge()}
                <Badge variant="outline" className="text-xs">{profile?.profile_type?.toUpperCase()}</Badge>
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
            {progressPercent === 100 ? "All steps completed! 🎉" : `${progressPercent}% complete. Continue to unlock all features.`}
          </p>
        </div>

        {/* Agent/Builder Notice */}
        {(profile?.profile_type === "agent" || profile?.profile_type === "builder") && (
          <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 mb-6 flex gap-3">
            <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-foreground">
              <span className="font-semibold">Important:</span> Full verification is required to publish properties, receive escrow payouts, and build buyer trust.
            </p>
          </div>
        )}

        {/* Verification Steps */}
        <div className="space-y-3 mb-8">
          {STEP_ORDER.map((stepName) => {
            const step = getStepByName(stepName);
            const unlocked = isStepUnlocked(stepName);
            const status = step?.status || "not_started";
            const Icon = STEP_ICONS[stepName];
            const isExpanded = expandedStep === stepName;

            return (
              <div key={stepName} className={`rounded-xl border bg-card shadow-card overflow-hidden transition-all ${
                !unlocked ? "border-border/50 opacity-60" : status === "approved" ? "border-[hsl(var(--success))]/30" : status === "rejected" ? "border-destructive/30" : status === "pending" ? "border-[hsl(var(--info))]/30" : "border-border"
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

                {/* Pending notice */}
                {status === "pending" && !isExpanded && (
                  <div className="mx-4 mb-3 p-2 rounded-lg bg-[hsl(var(--info))]/5 border border-[hsl(var(--info))]/20">
                    {stepName === "phone_otp" ? (
                      <p className="text-xs text-[hsl(var(--info))] flex items-center gap-1">
                        <Clock className="h-3 w-3" /> OTP sent – awaiting confirmation
                      </p>
                    ) : (
                      <p className="text-xs text-[hsl(var(--info))] flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Submitted – awaiting admin review
                      </p>
                    )}
                  </div>
                )}

                {/* Rejection reason */}
                {step?.rejection_reason && status === "rejected" && (
                  <div className="mx-4 mb-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                    <p className="text-xs text-destructive"><span className="font-semibold">Declined:</span> {step.rejection_reason}</p>
                    <p className="text-xs text-muted-foreground mt-1">Please re-submit the correct documents.</p>
                  </div>
                )}

                {/* Expanded Step Content */}
                {isExpanded && unlocked && status !== "approved" && (
                  <div className="border-t border-border p-4 space-y-4">
                    {/* Phone OTP */}
                    {stepName === "phone_otp" && (
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm">Phone Number</Label>
                          <Input
                            className="mt-1"
                            placeholder="+234..."
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                          />
                        </div>

                        <Button
                          onClick={sendPhoneOtp}
                          disabled={otpSending || resendSecondsLeft > 0}
                          className="w-full"
                          variant={status === "pending" ? "outline" : "default"}
                        >
                          {otpSending
                            ? "Sending OTP…"
                            : resendSecondsLeft > 0
                              ? `Resend available in ${resendSecondsLeft}s`
                              : status === "pending"
                                ? "Resend OTP"
                                : "Send OTP"}
                        </Button>

                        {otpExpiresAt && (
                          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-foreground">Enter OTP</p>
                              <p className="text-xs text-muted-foreground">Expires in {formatCountdown(otpSecondsLeft)}</p>
                            </div>

                            <div className="flex justify-center">
                              <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                                <InputOTPGroup>
                                  {Array.from({ length: 6 }).map((_, i) => (
                                    <InputOTPSlot key={i} index={i} />
                                  ))}
                                </InputOTPGroup>
                              </InputOTP>
                            </div>

                            <Button onClick={verifyPhoneOtp} disabled={otpVerifying || otpSecondsLeft === 0} className="w-full">
                              {otpVerifying ? "Verifying…" : "Verify OTP"}
                            </Button>

                            {otpSecondsLeft === 0 && (
                              <p className="text-xs text-destructive">OTP expired — please resend.</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Email Auth */}
                    {stepName === "email_auth" && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-3">Your email: <span className="font-medium text-foreground">{user?.email}</span></p>
                        <Button onClick={handleEmailAuth} disabled={status === "pending"} className="w-full">
                          {user?.email_confirmed_at ? "Confirm Email Verified" : status === "pending" ? "Pending..." : "Verify Email"}
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
                              <SelectItem value="passport">International Passport</SelectItem>
                              <SelectItem value="drivers_license">Driver License</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-sm">Upload Document</Label>
                          <label className="mt-1 border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer block">
                            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground mb-1">Click to upload your {idType === "nin" ? "NIN Slip" : idType === "passport" ? "Passport" : "Driver License"}</p>
                            <p className="text-xs text-muted-foreground">Accepted: JPG, PNG, PDF (max 10MB)</p>
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload("id_document", file);
                              }}
                              disabled={uploading}
                            />
                          </label>
                        </div>
                        {step?.document_url && (
                          <div className="p-2 rounded-lg bg-muted/50">
                            <a href={step.document_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">View uploaded document</a>
                          </div>
                        )}
                        {status === "pending" && (
                          <p className="text-xs text-[hsl(var(--info))] flex items-center gap-1"><Clock className="h-3 w-3" /> Document submitted – under admin review</p>
                        )}
                      </div>
                    )}

                    {/* Live Selfie */}
                    {stepName === "selfie" && (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">Upload a clear selfie photo for identity matching.</p>
                        <label className="mt-1 border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer block">
                          <Camera className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground mb-1">Click to upload selfie photo</p>
                          <p className="text-xs text-muted-foreground">Accepted: JPG, PNG (max 10MB)</p>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload("selfie", file);
                            }}
                            disabled={uploading}
                          />
                        </label>
                        {step?.document_url && (
                          <div className="p-2 rounded-lg bg-muted/50">
                            <a href={step.document_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">View uploaded selfie</a>
                          </div>
                        )}
                        {status === "pending" && (
                          <p className="text-xs text-[hsl(var(--info))] flex items-center gap-1"><Clock className="h-3 w-3" /> Selfie submitted – under admin review</p>
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
                            placeholder="Enter your 11-digit NIN or BVN"
                            value={ninBvnValue}
                            onChange={(e) => setNinBvnValue(e.target.value)}
                            maxLength={11}
                          />
                        </div>
                        <Button onClick={handleNinBvnSubmit} disabled={status === "pending"} className="w-full">
                          {status === "pending" ? "Under Admin Review" : status === "rejected" ? "Re-submit NIN/BVN" : "Submit for Validation"}
                        </Button>
                      </div>
                    )}

                    {/* Bank & Address */}
                    {stepName === "bank_address" && (
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm">Bank Name</Label>
                          <Input className="mt-1" placeholder="e.g. First Bank, GTBank" value={bankName} onChange={(e) => setBankName(e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-sm">Account Number</Label>
                          <Input className="mt-1" placeholder="10-digit account number" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} maxLength={10} />
                        </div>
                        <div>
                          <Label className="text-sm">Residential Address</Label>
                          <Textarea className="mt-1" placeholder="Enter your full residential address" value={address} onChange={(e) => setAddress(e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-sm">Utility Bill (Optional proof of address)</Label>
                          <label className="mt-1 border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-primary/50 transition-colors cursor-pointer block">
                            <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                            <p className="text-xs text-muted-foreground">Upload utility bill</p>
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload("bank_address", file);
                              }}
                              disabled={uploading}
                            />
                          </label>
                        </div>
                        <Button onClick={handleBankSubmit} disabled={status === "pending"} className="w-full">
                          {status === "pending" ? "Under Admin Review" : status === "rejected" ? "Re-submit Details" : "Submit Bank & Address"}
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
          <Button onClick={handleContinue} className="w-full h-12 font-semibold text-base rounded-xl shadow-elevated">
            Continue Verification
          </Button>
        )}

        {progressPercent === 100 && (
          <div className="rounded-xl border-2 border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/5 p-6 text-center">
            <CheckCircle className="h-10 w-10 mx-auto text-[hsl(var(--success))] mb-2" />
            <h3 className="font-display text-lg font-bold text-foreground">Fully Verified!</h3>
            <p className="text-sm text-muted-foreground mt-1">Your identity has been verified. You now have full access to all platform features.</p>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
};

export default IdentityVerification;
