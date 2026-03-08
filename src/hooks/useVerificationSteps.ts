import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type StepName = "phone_otp" | "email_auth" | "id_document" | "selfie" | "nin_bvn" | "bank_address";
export type StepStatus = "not_started" | "pending" | "approved" | "rejected";

export interface VerificationStep {
  id: string;
  step_name: StepName;
  status: StepStatus;
  document_url: string | null;
  rejection_reason: string | null;
  metadata: Record<string, any> | null;
  updated_at: string;
}

const STEP_ORDER: StepName[] = ["phone_otp", "email_auth", "id_document", "selfie", "nin_bvn", "bank_address"];

const STEP_LABELS: Record<StepName, string> = {
  phone_otp: "Phone OTP Verification",
  email_auth: "Email Authentication",
  id_document: "ID Document Upload",
  selfie: "Live Selfie Verification",
  nin_bvn: "NIN / BVN Validation",
  bank_address: "Bank & Address Authorization",
};

export function useVerificationSteps() {
  const { user } = useAuth();
  const [steps, setSteps] = useState<VerificationStep[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSteps = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await (supabase as any)
      .from("verification_steps")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching steps:", error);
      setLoading(false);
      return;
    }

    if (!data || data.length === 0) {
      const inserts = STEP_ORDER.map((step_name) => ({
        user_id: user.id,
        step_name,
        status: "not_started",
      }));
      if (user.phone) inserts[0].status = "approved";
      if (user.email_confirmed_at) inserts[1].status = "approved";

      const { data: created, error: insertErr } = await (supabase as any)
        .from("verification_steps")
        .insert(inserts)
        .select();

      if (insertErr) console.error("Error initializing steps:", insertErr);
      setSteps((created as VerificationStep[]) || []);
    } else {
      const updates: Promise<any>[] = [];
      const phoneStep = data.find((s: any) => s.step_name === "phone_otp");
      const emailStep = data.find((s: any) => s.step_name === "email_auth");

      if (phoneStep && phoneStep.status === "not_started" && user.phone) {
        updates.push(
          (supabase as any).from("verification_steps").update({ status: "approved" }).eq("id", phoneStep.id).then(() => {})
        );
      }
      if (emailStep && emailStep.status === "not_started" && user.email_confirmed_at) {
        updates.push(
          (supabase as any).from("verification_steps").update({ status: "approved" }).eq("id", emailStep.id).then(() => {})
        );
      }

      if (updates.length > 0) {
        await Promise.all(updates);
        const { data: refreshed } = await (supabase as any)
          .from("verification_steps")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true });
        setSteps((refreshed as VerificationStep[]) || []);
      } else {
        setSteps(data as VerificationStep[]);
      }
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchSteps();
  }, [fetchSteps]);

  const getStepByName = (name: StepName) => steps.find((s) => s.step_name === name);

  const completedCount = steps.filter((s) => s.status === "approved").length;
  const totalSteps = STEP_ORDER.length;
  const progressPercent = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

  const isStepUnlocked = (_name: StepName): boolean => {
    // All steps are unlocked — users can submit all verification details at once
    return true;
  };

  const nextIncompleteStep = (): StepName | null => {
    for (const name of STEP_ORDER) {
      const step = getStepByName(name);
      if (!step || step.status !== "approved") return name;
    }
    return null;
  };

  const updateStep = async (name: StepName, updates: Partial<Pick<VerificationStep, "status" | "document_url" | "metadata">>) => {
    const step = getStepByName(name);
    if (!step) return;
    const { error } = await (supabase as any)
      .from("verification_steps")
      .update(updates)
      .eq("id", step.id);
    if (error) {
      toast.error("Failed to update verification step");
      return;
    }
    toast.success("Verification step updated");
    await fetchSteps();
  };

  const overallStatus = (): "unverified" | "pending" | "verified" => {
    if (completedCount === totalSteps) return "verified";
    if (steps.some((s) => s.status === "pending" || s.status === "approved")) return "pending";
    return "unverified";
  };

  return {
    steps,
    loading,
    completedCount,
    totalSteps,
    progressPercent,
    isStepUnlocked,
    nextIncompleteStep,
    getStepByName,
    updateStep,
    overallStatus,
    refetch: fetchSteps,
    STEP_ORDER,
    STEP_LABELS,
  };
}
