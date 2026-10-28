import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import OperationsOverview from "@/components/admin/OperationsOverview";
export default function AdminOverview() {
  return <AuthenticatedLayout><OperationsOverview /></AuthenticatedLayout>;
}
