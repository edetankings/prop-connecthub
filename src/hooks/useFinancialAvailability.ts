import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/** Backend permission checks remain authoritative; errors leave actions disabled. */
export function useFinancialAvailability() {
  const { user } = useAuth();
  const userId = user?.id;
  const [details, setDetails] = useState<{ company_bank_name: string; company_account_name: string; company_account_number: string } | null>(null);
  useEffect(() => {
    let active = true;
    setDetails(null);
    if (userId) supabase.rpc("get_company_payment_details").then(({ data, error }) => {
      if (active && !error && data?.[0]) setDetails(data[0]);
    });
    return () => { active = false; };
  }, [userId]);
  return { enabled: !!details, details, unavailableMessage: "Payments are currently unavailable. Do not transfer funds." };
}
