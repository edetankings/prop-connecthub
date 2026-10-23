import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useKYCVerification } from "@/hooks/useKYCVerification";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Camera, CreditCard, Building2, Phone, CheckCircle, Clock, XCircle, AlertTriangle, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface FileUploadProps {
  label: string;
  description: string;
  icon: React.ElementType;
  accept: string;
  file: File | null;
  existingUrl?: string | null;
  onFileChange: (file: File | null) => void;
  required?: boolean;
}

const FileUploadField = ({
  label,
  description,
  icon: Icon,
  accept,
  file,
  existingUrl,
  onFileChange,
  required,
}: FileUploadProps) => (
  <div className="space-y-2">
    <Label className="text-sm font-medium flex items-center gap-2">
      <Icon className="h-4 w-4 text-primary" />
      {label}
      {required && <span className="text-destructive">*</span>}
    </Label>
    <label className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-primary/50 transition-colors cursor-pointer block bg-muted/20">

      <p className="text-sm text-muted-foreground mb-1">
        {file ? file.name : existingUrl ? "File already uploaded" : description}
      </p>
      <p className="text-xs text-muted-foreground">
        {accept.includes("pdf") ? "JPG, PNG, PDF (max 10MB)" : "JPG, PNG (max 10MB)"}
      </p>
      <input
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onFileChange(e.target.files?.[0] || null)}
      />
    </label>
    {(file || existingUrl) && (
      <div className="flex items-center gap-2 text-xs">
        <CheckCircle className="h-3 w-3 text-[hsl(var(--success))]" />
        <span className="text-[hsl(var(--success))]">
          {file ? "New file selected" : "Previously uploaded"}
        </span>
        {existingUrl && !file && (
          <a
            href={existingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline ml-2"
          >
            View
          </a>
        )}
      </div>
    )}
  </div>
);

const KYCSubmissionForm = () => {
  const { profile } = useAuth();
  const { kycData, submitting, submitKYC, kycStatus, isVerified, isPending, isRejected } =
    useKYCVerification();

  // Form state
  const [governmentIdFile, setGovernmentIdFile] = useState<File | null>(null);
  const [governmentIdType, setGovernmentIdType] = useState(
    kycData?.government_id_type || "national_id"
  );
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [ninOrBvn, setNinOrBvn] = useState(kycData?.nin_or_bvn || "");
  const [ninBvnType, setNinBvnType] = useState(kycData?.nin_bvn_type || "nin");
  const [proofOfAddressFile, setProofOfAddressFile] = useState<File | null>(null);
  const [bankName, setBankName] = useState(kycData?.bank_name || "");
  const [accountNumber, setAccountNumber] = useState(kycData?.account_number || "");
  const [residentialAddress, setResidentialAddress] = useState(
    kycData?.residential_address || ""
  );

  // Calculate completion progress
  const calculateProgress = () => {
    let completed = 0;
    const total = 6;

    if (governmentIdFile || kycData?.government_id_url) completed++;
    if (selfieFile || kycData?.selfie_url) completed++;
    if (ninOrBvn || kycData?.nin_or_bvn) completed++;
    if (proofOfAddressFile || kycData?.proof_of_address_url) completed++;
    if ((bankName && accountNumber) || (kycData?.bank_name && kycData?.account_number)) completed++;
    if (profile?.phone_verified || kycData?.phone_verified) completed++;

    return Math.round((completed / total) * 100);
  };

  const handleSubmit = async () => {
    // Validation
    if (!governmentIdFile && !kycData?.government_id_url) {
      toast.error("Please upload your Government ID");
      return;
    }
    if (!selfieFile && !kycData?.selfie_url) {
      toast.error("Please upload your selfie verification photo");
      return;
    }
    if (!ninOrBvn.trim()) {
      toast.error("Please enter your NIN or BVN");
      return;
    }
    if (!proofOfAddressFile && !kycData?.proof_of_address_url) {
      toast.error("Please upload your proof of address");
      return;
    }
    if (!bankName.trim() || !accountNumber.trim()) {
      toast.error("Please fill in your bank details");
      return;
    }
    if (!residentialAddress.trim()) {
      toast.error("Please enter your residential address");
      return;
    }

    await submitKYC({
      governmentIdFile,
      governmentIdType,
      selfieFile,
      ninOrBvn,
      ninBvnType,
      proofOfAddressFile,
      bankName,
      accountNumber,
      residentialAddress,
    });
  };

  if (isVerified) {
    return (
      <div className="rounded-xl border-2 border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/5 p-8 text-center">
        <ShieldCheck className="h-16 w-16 mx-auto text-[hsl(var(--success))] mb-4" />
        <h3 className="font-display text-2xl font-bold text-foreground mb-2">
          KYC Verified
        </h3>
        <p className="text-muted-foreground">
          Your identity has been verified. You now have full access to all platform
          features.
        </p>
        <Badge className="mt-4 bg-[hsl(var(--success))]/15 text-[hsl(var(--success))] border-0 px-4 py-2 text-sm">
          <CheckCircle className="h-4 w-4 mr-2" />
          Verified Account
        </Badge>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      {isPending && (
        <div className="rounded-xl border border-[hsl(var(--info))]/30 bg-[hsl(var(--info))]/5 p-4 flex items-start gap-3">
          <Clock className="h-5 w-5 text-[hsl(var(--info))] shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-foreground">Verification Pending</p>
            <p className="text-sm text-muted-foreground">
              Your KYC documents are under admin review. You will be notified once the
              verification is complete.
            </p>
          </div>
        </div>
      )}

      {isRejected && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
          <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-foreground">Verification Declined</p>
            <p className="text-sm text-destructive">
              {kycData?.rejection_reason ||
                "Your verification was declined. Please upload correct documents and try again."}
            </p>
          </div>
        </div>
      )}

      {/* Progress */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-foreground">
            Document Upload Progress
          </p>
          <span className="text-sm font-bold text-primary">{calculateProgress()}%</span>
        </div>
        <Progress value={calculateProgress()} className="h-3" />
        <p className="text-xs text-muted-foreground mt-2">
          Complete all 6 steps to submit your KYC verification
        </p>
      </div>

      {/* Document Upload Form */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-6">
        <h3 className="font-display text-lg font-semibold text-foreground border-b border-border pb-3">
          KYC Documents
        </h3>

        {/* 1. Government ID */}
        <div className="space-y-3">
          <div>
            <Label className="text-sm">ID Document Type</Label>
            <Select value={governmentIdType} onValueChange={setGovernmentIdType}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="national_id">National ID Card</SelectItem>
                <SelectItem value="passport">International Passport</SelectItem>
                <SelectItem value="drivers_license">Driver&apos;s License</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <FileUploadField
            label="Government ID"
            description="Upload your government-issued ID"
            icon={FileText}
            accept="image/*,.pdf"
            file={governmentIdFile}
            existingUrl={kycData?.government_id_url}
            onFileChange={setGovernmentIdFile}
            required
          />
        </div>

        {/* 2. Selfie Verification */}
        <FileUploadField
          label="Selfie Verification"
          description="Take a clear selfie photo"
          icon={Camera}
          accept="image/*"
          file={selfieFile}
          existingUrl={kycData?.selfie_url}
          onFileChange={setSelfieFile}
          required
        />

        {/* 3. NIN or BVN */}
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            NIN or BVN <span className="text-destructive">*</span>
          </Label>
          <div className="flex gap-2">
            <Select value={ninBvnType} onValueChange={setNinBvnType}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nin">NIN</SelectItem>
                <SelectItem value="bvn">BVN</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder={`Enter your 11-digit ${ninBvnType.toUpperCase()}`}
              value={ninOrBvn}
              onChange={(e) => setNinOrBvn(e.target.value)}
              maxLength={11}
              className="flex-1"
            />
          </div>
        </div>

        {/* 4. Proof of Address */}
        <FileUploadField
          label="Proof of Address"
          description="Upload utility bill or bank statement"
          icon={Building2}
          accept="image/*,.pdf"
          file={proofOfAddressFile}
          existingUrl={kycData?.proof_of_address_url}
          onFileChange={setProofOfAddressFile}
          required
        />

        {/* 5. Bank Details */}
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Bank Details <span className="text-destructive">*</span>
          </Label>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              placeholder="Bank Name (e.g. GTBank)"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
            />
            <Input
              placeholder="Account Number"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              maxLength={10}
            />
          </div>
          <div>
            <Label className="text-sm">Residential Address</Label>
            <Textarea
              placeholder="Enter your full residential address"
              value={residentialAddress}
              onChange={(e) => setResidentialAddress(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        {/* 6. Phone Verification Status */}
        <div className="rounded-lg border border-border p-4 flex items-center gap-3">
          <div
            className={`h-10 w-10 rounded-xl flex items-center justify-center ${
              profile?.phone_verified
                ? "bg-[hsl(var(--success))]/10"
                : "bg-muted"
            }`}
          >
            <Phone
              className={`h-5 w-5 ${
                profile?.phone_verified
                  ? "text-[hsl(var(--success))]"
                  : "text-muted-foreground"
              }`}
            />
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground text-sm">Phone Verification</p>
            <p className="text-xs text-muted-foreground">
              {profile?.phone_verified
                ? "Phone number verified"
                : "Please verify your phone number above"}
            </p>
          </div>
          {profile?.phone_verified ? (
            <CheckCircle className="h-5 w-5 text-[hsl(var(--success))]" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-warning" />
          )}
        </div>
      </div>

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        disabled={submitting || isPending}
        className="w-full h-12 font-semibold text-base rounded-xl shadow-elevated"
      >
        {submitting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Submitting...
          </>
        ) : isPending ? (
          <>
            <Clock className="h-5 w-5 mr-2" />
            Pending Admin Review
          </>
        ) : isRejected ? (
          "Resubmit Verification"
        ) : (
          "Submit Verification"
        )}
      </Button>

      {!isPending && (
        <p className="text-xs text-center text-muted-foreground">
          By submitting, you confirm that all documents are authentic and belong to you.
        </p>
      )}
    </div>
  );
};

export default KYCSubmissionForm;
