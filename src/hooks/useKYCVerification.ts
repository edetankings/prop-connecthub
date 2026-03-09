import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface KYCVerification {
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
  created_at: string;
  updated_at: string;
}

export function useKYCVerification() {
  const { user, profile } = useAuth();
  const [kycData, setKycData] = useState<KYCVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchKYC = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await (supabase as any)
      .from("kyc_verifications")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching KYC:", error);
    }

    setKycData(data as KYCVerification | null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchKYC();
  }, [fetchKYC]);

  const uploadDocument = async (file: File, docType: string): Promise<string | null> => {
    if (!user) return null;

    const ext = file.name.split(".").pop();
    const path = `${user.id}/kyc-${docType}-${Date.now()}.${ext}`;
    
    const { error } = await supabase.storage
      .from("verification-docs")
      .upload(path, file);

    if (error) {
      toast.error(`Failed to upload ${docType}: ${error.message}`);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("verification-docs")
      .getPublicUrl(path);

    return urlData.publicUrl;
  };

  const submitKYC = async (data: {
    governmentIdFile: File | null;
    governmentIdType: string;
    selfieFile: File | null;
    ninOrBvn: string;
    ninBvnType: string;
    proofOfAddressFile: File | null;
    bankName: string;
    accountNumber: string;
    residentialAddress: string;
  }) => {
    if (!user) {
      toast.error("You must be logged in");
      return false;
    }

    setSubmitting(true);

    try {
      // Upload documents
      let governmentIdUrl = kycData?.government_id_url || null;
      let selfieUrl = kycData?.selfie_url || null;
      let proofOfAddressUrl = kycData?.proof_of_address_url || null;

      if (data.governmentIdFile) {
        governmentIdUrl = await uploadDocument(data.governmentIdFile, "government-id");
        if (!governmentIdUrl) {
          setSubmitting(false);
          return false;
        }
      }

      if (data.selfieFile) {
        selfieUrl = await uploadDocument(data.selfieFile, "selfie");
        if (!selfieUrl) {
          setSubmitting(false);
          return false;
        }
      }

      if (data.proofOfAddressFile) {
        proofOfAddressUrl = await uploadDocument(data.proofOfAddressFile, "proof-of-address");
        if (!proofOfAddressUrl) {
          setSubmitting(false);
          return false;
        }
      }

      const kycRecord = {
        user_id: user.id,
        government_id_url: governmentIdUrl,
        government_id_type: data.governmentIdType,
        selfie_url: selfieUrl,
        nin_or_bvn: data.ninOrBvn,
        nin_bvn_type: data.ninBvnType,
        proof_of_address_url: proofOfAddressUrl,
        bank_name: data.bankName,
        account_number: data.accountNumber,
        residential_address: data.residentialAddress,
        phone_verified: profile?.phone_verified || false,
        kyc_status: "pending",
        submitted_at: new Date().toISOString(),
      };

      let result;
      if (kycData) {
        // Update existing submission
        result = await (supabase as any)
          .from("kyc_verifications")
          .update(kycRecord)
          .eq("id", kycData.id)
          .select()
          .single();
      } else {
        // Insert new submission
        result = await (supabase as any)
          .from("kyc_verifications")
          .insert(kycRecord)
          .select()
          .single();
      }

      if (result.error) {
        toast.error("Failed to submit KYC: " + result.error.message);
        setSubmitting(false);
        return false;
      }

      // Create notification for user
      await (supabase as any).from("notifications").insert({
        user_id: user.id,
        title: "KYC Submission Received",
        message: "Your KYC documents have been submitted for admin review. You will be notified once the verification is complete.",
        type: "info",
        link: "/identity-verification",
      });

      toast.success("KYC documents submitted successfully! Awaiting admin review.");
      await fetchKYC();
      setSubmitting(false);
      return true;
    } catch (error: any) {
      toast.error("An error occurred: " + error.message);
      setSubmitting(false);
      return false;
    }
  };

  const kycStatus = kycData?.kyc_status || null;
  const isVerified = kycStatus === "verified";
  const isPending = kycStatus === "pending";
  const isRejected = kycStatus === "rejected";

  return {
    kycData,
    loading,
    submitting,
    submitKYC,
    refetch: fetchKYC,
    kycStatus,
    isVerified,
    isPending,
    isRejected,
  };
}
