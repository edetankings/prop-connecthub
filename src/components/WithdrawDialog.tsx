import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useFinancialAvailability } from "@/hooks/useFinancialAvailability";

interface Props {
  open: boolean;
  onClose: () => void;
  availableBalance: number;
  onSuccess: () => void;
}

const WithdrawDialog = ({ open, onClose, availableBalance, onSuccess }: Props) => {
  const { user } = useAuth();
  const finance = useFinancialAvailability();
  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!finance.enabled) { toast.error(finance.unavailableMessage); return; }
    const amt = Number(amount);
    if (!amt || amt < 5000) {
      toast.error("Minimum withdrawal is ₦5,000");
      return;
    }
    if (amt > availableBalance) {
      toast.error(`Amount exceeds available balance (₦${availableBalance.toLocaleString()})`);
      return;
    }
    if (!bankName.trim() || !accountNumber.trim() || !accountName.trim()) {
      toast.error("Please fill in all bank details");
      return;
    }

    setLoading(true);
    const { error } = await (supabase as any).rpc("request_withdrawal", {
      _amount: amt,
      _bank_name: bankName.trim(),
      _account_number: accountNumber.trim(),
      _account_name: accountName.trim(),
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Withdrawal request submitted! Admin will review it shortly.");
    setAmount(""); setBankName(""); setAccountNumber(""); setAccountName("");
    onSuccess();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request Withdrawal</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {!finance.enabled && <p role="status">{finance.unavailableMessage}</p>}
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-3">
            <p className="text-xs text-muted-foreground">Available Balance</p>
            <p className="font-display text-2xl font-bold text-emerald-700 dark:text-emerald-400">₦{availableBalance.toLocaleString()}</p>
          </div>
          <div>
            <Label>Amount (₦)</Label>
            <Input type="number" min={5000} placeholder="Min ₦5,000" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Bank Name</Label>
            <Input placeholder="e.g. Access Bank" value={bankName} onChange={(e) => setBankName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Account Number</Label>
            <Input placeholder="10-digit number" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Account Name</Label>
            <Input placeholder="Account holder name" value={accountName} onChange={(e) => setAccountName(e.target.value)} className="mt-1" />
          </div>
          <p className="text-xs text-muted-foreground">
            ⓘ Withdrawals are processed bi-weekly. Submitting more than once per 14 days is allowed but only one will be processed per cycle.
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading || !finance.enabled}>{loading ? "Submitting…" : "Submit Request"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WithdrawDialog;
