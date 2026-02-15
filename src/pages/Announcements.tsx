import { Megaphone, AlertTriangle, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { announcements } from "@/lib/mockData";

const iconMap = { update: Megaphone, alert: AlertTriangle, announcement: Bell };
const colorMap = { update: "bg-info text-info-foreground", alert: "bg-warning text-warning-foreground", announcement: "bg-primary text-primary-foreground" };

const Announcements = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <div className="container mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold text-foreground">Announcements</h1>
      <p className="mt-1 text-muted-foreground">Latest updates from agents and the platform</p>
      <div className="mt-8 space-y-4">
        {announcements.map((a) => {
          const Icon = iconMap[a.type];
          return (
            <div key={a.id} className="rounded-lg border border-border bg-card p-5 shadow-card">
              <div className="flex items-start gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${colorMap[a.type]}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-semibold text-foreground">{a.title}</h3>
                    <Badge variant="outline" className="text-xs capitalize">{a.type}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{a.content}</p>
                  <p className="mt-2 text-xs text-muted-foreground">By {a.authorName} · {new Date(a.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
    <Footer />
  </div>
);

export default Announcements;
