import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function ResourceState({ loading, error, empty, retry, title, to, action }: { loading?: boolean; error?: boolean; empty?: boolean; retry?: () => void; title: string; to?: string; action?: string }) {
  if (loading) return <div className="buyer-loading" role="status" aria-label={`Loading ${title}`}><span /><span /><span /></div>;
  if (error) return <div className="buyer-empty" role="alert"><h3>Unable to load {title.toLowerCase()}.</h3><p>Your information has not been replaced with sample data.</p><Button variant="outline" onClick={retry}>Retry {title.toLowerCase()}</Button></div>;
  if (!empty) return null;
  return <div className="buyer-empty"><h3>No {title.toLowerCase()} yet.</h3><p>Take the next step when you’re ready.</p>{to && <Button asChild variant="outline"><Link to={to}>{action || "Explore properties"}</Link></Button>}</div>;
}
