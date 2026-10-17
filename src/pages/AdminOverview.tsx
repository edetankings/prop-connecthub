import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import OperationsOverview from "@/components/admin/OperationsOverview";
export default function AdminOverview() {
  return <AuthenticatedLayout><div className="operations-page"><header className="operations-heading"><p className="buyer-eyebrow">PROP-CONNECT / Administration</p><h1>Operations overview</h1><p>Review activity and keep platform decisions grounded in actual records.</p></header><OperationsOverview /></div></AuthenticatedLayout>;
}
