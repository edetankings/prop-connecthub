import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SignedBucketAsset } from "@/components/SignedBucketAsset";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  FileText,
  Camera,
  CreditCard,
  Building2,
  Phone,
  User,
  Calendar,
  Loader2,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface KYCSubmission {
  id: string;
  user_id: string;
  government_id_url: string | null;
  government_id_type: string | null;
  selfie_url: string | null;
  nin_or_bvn: string | null;
  nin_bvn_type: string | null;
  proof_of_address_url: string | null;
  bank_name: string | null;
  account_number: string | null;
  residential_address: string | null;
  phone_verified: boolean;
  kyc_status: "pending" | "verified" | "rejected";
  rejection_reason: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  profile?: {
    full_name: string;
    profile_type: string;
    phone: string | null;
  };
}

const AdminKYCReview = () => {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<KYCSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<KYCSubmission | null>(
    null
  );
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "verified" | "rejected">(
    "pending"
  );

  const fetchSubmissions = async () => {
    setLoading(true);
    
    let query = (supabase as any)
      .from("kyc_verifications")
      .select("*")
      .order("submitted_at", { ascending: false });

    if (filter !== "all") {
      query = query.eq("kyc_status", filter);
    }

    const { data, error } = await query;

    if (error) { toast.error(error.message); setSubmissions([]); }
    else {
      const ids = [...new Set((data || []).map((row: KYCSubmission) => row.user_id))];
      const { data: profiles, error: profileError } = ids.length
        ? await supabase.from("profiles").select("user_id, full_name, profile_type, phone").in("user_id", ids as string[])
        : { data: [], error: null };
      if (profileError) toast.error(profileError.message);
      setSubmissions((data || []).map((row: KYCSubmission) => ({ ...row, profile: profiles?.find((p) => p.user_id === row.user_id) })));
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchSubmissions();
  }, [filter]);

  const handleApprove = async (submission: KYCSubmission) => {
    setProcessing(true);

    const { error } = await (supabase as any)
      .from("kyc_verifications")
      .update({
        kyc_status: "verified",
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id,
        rejection_reason: null,
      })
      .eq("id", submission.id);

    if (error) {
      toast.error("Failed to approve: " + error.message);
      setProcessing(false);
      return;
    }

    // The database trigger will handle updating the profile and sending notification
    toast.success("KYC verification approved!");
    setReviewDialogOpen(false);
    setSelectedSubmission(null);
    setProcessing(false);
    fetchSubmissions();
  };

  const handleReject = async (submission: KYCSubmission) => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    setProcessing(true);

    const { error } = await (supabase as any)
      .from("kyc_verifications")
      .update({
        kyc_status: "rejected",
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id,
        rejection_reason: rejectionReason,
      })
      .eq("id", submission.id);

    if (error) {
      toast.error("Failed to reject: " + error.message);
      setProcessing(false);
      return;
    }

    toast.success("KYC verification rejected");
    setReviewDialogOpen(false);
    setSelectedSubmission(null);
    setRejectionReason("");
    setProcessing(false);
    fetchSubmissions();
  };

  const openReviewDialog = (submission: KYCSubmission) => {
    setSelectedSubmission(submission);
    setRejectionReason("");
    setReviewDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return (
          <Badge className="bg-[hsl(var(--success))]/15 text-[hsl(var(--success))] border-0">
            <CheckCircle className="h-3 w-3 mr-1" /> Verified
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-destructive/15 text-destructive border-0">
            <XCircle className="h-3 w-3 mr-1" /> Rejected
          </Badge>
        );
      default:
        return (
          <Badge className="bg-[hsl(var(--info))]/15 text-[hsl(var(--info))] border-0">
            <Clock className="h-3 w-3 mr-1" /> Pending
          </Badge>
        );
    }
  };

  const DocumentLink = ({
    url,
    label,
    icon: Icon,
  }: {
    url: string | null;
    label: string;
    icon: React.ElementType;
  }) => {
    if (!url) {
      return (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Icon className="h-4 w-4" />
          <span>{label}: Not provided</span>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-foreground">
          <Icon className="h-4 w-4 text-primary" />
          <span className="font-medium">{label}</span>
        </div>
        <SignedBucketAsset
          bucket="verification-docs"
          value={url}
          label={label}
          imgClassName="w-full max-h-40 object-cover rounded border border-border"
        />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">
            KYC Verification Requests
          </h2>
          <p className="text-sm text-muted-foreground">
            Review and approve user verification documents
          </p>
        </div>
        <div className="flex gap-2">
          {(["all", "pending", "verified", "rejected"] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f === "pending" && submissions.filter(s => s.kyc_status === "pending").length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {submissions.filter(s => s.kyc_status === "pending").length}
                </Badge>
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : submissions.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <ShieldCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No {filter} KYC submissions</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted">
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((submission) => (
                <TableRow key={submission.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {submission.profile?.full_name || "Unknown User"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {submission.profile?.phone || "No phone"}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {submission.profile?.profile_type?.toUpperCase() || "USER"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(submission.submitted_at), "MMM d, yyyy")}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(submission.kyc_status)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openReviewDialog(submission)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              KYC Document Review
            </DialogTitle>
            <DialogDescription>
              Review the submitted documents and approve or decline the verification
            </DialogDescription>
          </DialogHeader>

          {selectedSubmission && (
            <div className="space-y-6 mt-4">
              {/* User Info */}
              <div className="rounded-lg border border-border p-4 bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                    {selectedSubmission.profile?.full_name?.[0]?.toUpperCase() || "U"}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      {selectedSubmission.profile?.full_name || "Unknown User"}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {selectedSubmission.profile?.profile_type?.toUpperCase() || "USER"}
                      </Badge>
                      {getStatusBadge(selectedSubmission.kyc_status)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div className="space-y-4">
                <h4 className="font-semibold text-foreground">Submitted Documents</h4>
                
                <div className="grid gap-3 sm:grid-cols-2">
                  {/* Government ID */}
                  <div className="rounded-lg border border-border p-3">
                    <DocumentLink
                      url={selectedSubmission.government_id_url}
                      label={`Government ID (${selectedSubmission.government_id_type || "Unknown"})`}
                      icon={FileText}
                    />
                  </div>

                  {/* Selfie */}
                  <div className="rounded-lg border border-border p-3">
                    <DocumentLink
                      url={selectedSubmission.selfie_url}
                      label="Selfie Verification"
                      icon={Camera}
                    />
                  </div>

                  {/* NIN/BVN */}
                  <div className="rounded-lg border border-border p-3">
                    <div className="flex items-center gap-2 text-sm">
                      <CreditCard className="h-4 w-4 text-primary" />
                      <span>
                        {selectedSubmission.nin_bvn_type?.toUpperCase() || "NIN/BVN"}:{" "}
                        <span className="font-mono">
                          {selectedSubmission.nin_or_bvn || "Not provided"}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Proof of Address */}
                  <div className="rounded-lg border border-border p-3">
                    <DocumentLink
                      url={selectedSubmission.proof_of_address_url}
                      label="Proof of Address"
                      icon={Building2}
                    />
                  </div>

                  {/* Bank Details */}
                  <div className="rounded-lg border border-border p-3 sm:col-span-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="h-4 w-4 text-primary" />
                      <span>
                        Bank: {selectedSubmission.bank_name || "N/A"} |{" "}
                        Account: {selectedSubmission.account_number || "N/A"}
                      </span>
                    </div>
                    {selectedSubmission.residential_address && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        Address: {selectedSubmission.residential_address}
                      </p>
                    )}
                  </div>

                  {/* Phone */}
                  <div className="rounded-lg border border-border p-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-primary" />
                      <span>
                        Phone:{" "}
                        {selectedSubmission.phone_verified ? (
                          <span className="text-[hsl(var(--success))]">Verified</span>
                        ) : (
                          <span className="text-warning">Not verified</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rejection Reason (for pending) */}
              {selectedSubmission.kyc_status === "pending" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Rejection Reason (required if declining)
                  </label>
                  <Textarea
                    placeholder="Explain why the verification is being declined..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                  />
                </div>
              )}

              {/* Previous rejection reason */}
              {selectedSubmission.kyc_status === "rejected" &&
                selectedSubmission.rejection_reason && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                    <p className="text-sm font-medium text-destructive">
                      Rejection Reason:
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedSubmission.rejection_reason}
                    </p>
                  </div>
                )}

              {/* Action Buttons */}
              {selectedSubmission.kyc_status === "pending" && (
                <div className="flex gap-3 pt-4 border-t border-border">
                  <Button
                    onClick={() => handleApprove(selectedSubmission)}
                    disabled={processing}
                    className="flex-1 bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90"
                  >
                    {processing ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Approve Verification
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleReject(selectedSubmission)}
                    disabled={processing}
                    className="flex-1"
                  >
                    {processing ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-2" />
                    )}
                    Decline Verification
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminKYCReview;
