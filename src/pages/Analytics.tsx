import { useEffect, useState } from "react";
import { Users, Home, MessageSquare, CalendarCheck, TrendingUp, BarChart3, ShieldCheck, Wallet, AlertTriangle, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { format, subDays, startOfDay, startOfWeek } from "date-fns";

interface Stats {
  totalUsers: number;
  totalAgents: number;
  totalProperties: number;
  totalReservations: number;
  totalMessages: number;
  totalConversations: number;
  messagesToday: number;
  messagesThisWeek: number;
}

interface DailyMessages {
  date: string;
  count: number;
}

interface PropertyByType {
  type: string;
  count: number;
}

const Analytics = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [dailyMessages, setDailyMessages] = useState<DailyMessages[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<PropertyByType[]>([]);
  const [loading, setLoading] = useState(true);
  const [escrow, setEscrow] = useState({ total: 0, gmv: 0, revenue: 0, secured: 0, pending: 0, refunded: 0, disputes: 0 });

  useEffect(() => {
    const fetchAnalytics = async () => {
      const now = new Date();
      const todayStart = startOfDay(now).toISOString();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();

      const [
        usersRes,
        agentsRes,
        propertiesRes,
        reservationsRes,
        messagesRes,
        threadsRes,
        messagesTodayRes,
        messagesWeekRes,
        allPropsRes,
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("profile_type", "agent"),
        supabase.from("properties").select("id", { count: "exact", head: true }),
        supabase.from("reservations").select("id", { count: "exact", head: true }),
        supabase.from("messages").select("id", { count: "exact", head: true }),
        supabase.from("chat_threads").select("id", { count: "exact", head: true }),
        supabase.from("messages").select("id", { count: "exact", head: true }).gte("created_at", todayStart),
        supabase.from("messages").select("id", { count: "exact", head: true }).gte("created_at", weekStart),
        supabase.from("properties").select("property_type, created_at"),
      ]);

      setStats({
        totalUsers: usersRes.count ?? 0,
        totalAgents: agentsRes.count ?? 0,
        totalProperties: propertiesRes.count ?? 0,
        totalReservations: reservationsRes.count ?? 0,
        totalMessages: messagesRes.count ?? 0,
        totalConversations: threadsRes.count ?? 0,
        messagesToday: messagesTodayRes.count ?? 0,
        messagesThisWeek: messagesWeekRes.count ?? 0,
      });

      // Build daily message activity for last 7 days
      const days: DailyMessages[] = [];
      for (let i = 6; i >= 0; i--) {
        const day = subDays(now, i);
        const dayStart = startOfDay(day).toISOString();
        const dayEnd = startOfDay(subDays(now, i - 1)).toISOString();
        const { count } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .gte("created_at", dayStart)
          .lt("created_at", dayEnd);
        days.push({ date: format(day, "EEE"), count: count ?? 0 });
      }
      setDailyMessages(days);

      // Property type distribution
      if (allPropsRes.data) {
        const typeCounts: Record<string, number> = {};
        allPropsRes.data.forEach((p) => {
          typeCounts[p.property_type] = (typeCounts[p.property_type] || 0) + 1;
        });
        setPropertyTypes(
          Object.entries(typeCounts).map(([type, count]) => ({
            type: type.charAt(0).toUpperCase() + type.slice(1),
            count,
          }))
        );
      }

      setLoading(false);
    };

    fetchAnalytics();
  }, []);

  useEffect(() => {
    (async () => {
      const [txAll, txSecured, txPending, txRefunded, dispOpen, cw] = await Promise.all([
        (supabase as any).from("transactions").select("total_payable, commission_amount, payment_status"),
        (supabase as any).from("transactions").select("id", { count: "exact", head: true }).eq("payment_status", "secured"),
        (supabase as any).from("transactions").select("id", { count: "exact", head: true }).in("payment_status", ["pending_payment", "under_review"]),
        (supabase as any).from("transactions").select("id", { count: "exact", head: true }).eq("payment_status", "refunded"),
        (supabase as any).from("disputes").select("id", { count: "exact", head: true }).in("status", ["open", "under_review"]),
        (supabase as any).from("company_wallet").select("total_earned").maybeSingle(),
      ]);
      const rows = txAll.data || [];
      const released = rows.filter((r: any) => r.payment_status === "released");
      const gmv = released.reduce((a: number, r: any) => a + (r.total_payable || 0), 0);
      setEscrow({
        total: rows.length,
        gmv,
        revenue: cw.data?.total_earned || 0,
        secured: txSecured.count || 0,
        pending: txPending.count || 0,
        refunded: txRefunded.count || 0,
        disputes: dispOpen.count || 0,
      });
    })();
  }, []);

  const statCards = stats
    ? [
        { label: "Total Users", value: stats.totalUsers, icon: Users, color: "text-info" },
        { label: "Total Agents", value: stats.totalAgents, icon: Users, color: "text-secondary" },
        { label: "Properties Listed", value: stats.totalProperties, icon: Home, color: "text-primary" },
        { label: "Reservations", value: stats.totalReservations, icon: CalendarCheck, color: "text-accent-foreground" },
        { label: "Messages Sent", value: stats.totalMessages, icon: MessageSquare, color: "text-success" },
        { label: "Conversations", value: stats.totalConversations, icon: MessageSquare, color: "text-muted-foreground" },
      ]
    : [];

  const messageChartConfig = { count: { label: "Messages", color: "hsl(var(--primary))" } };
  const propertyChartConfig = { count: { label: "Properties", color: "hsl(var(--secondary))" } };

  return (
    <AuthenticatedLayout><div className="admin-analytics-page">

      <div className="container mx-auto px-4 py-8">
        <h1 className="font-display text-3xl font-bold text-foreground">Platform Analytics</h1>
        <p className="mt-1 text-muted-foreground">Real-time platform performance metrics</p>

        {/* Stat Cards */}
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>
              ))
            : statCards.map((s) => (
                <Card key={s.label}>
                  <CardContent className="p-5">
                    <s.icon className={`mb-2 h-6 w-6 ${s.color}`} />
                    <p className="font-display text-2xl font-bold text-foreground">{s.value.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
        </div>

        {/* Chat Analytics */}
        {stats && (
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-5">
                <TrendingUp className="mb-2 h-6 w-6 text-primary" />
                <p className="font-display text-2xl font-bold text-foreground">{stats.messagesToday}</p>
                <p className="text-sm text-muted-foreground">Messages Today</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <TrendingUp className="mb-2 h-6 w-6 text-secondary" />
                <p className="font-display text-2xl font-bold text-foreground">{stats.messagesThisWeek}</p>
                <p className="text-sm text-muted-foreground">Messages This Week</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <MessageSquare className="mb-2 h-6 w-6 text-info" />
                <p className="font-display text-2xl font-bold text-foreground">{stats.totalConversations}</p>
                <p className="text-sm text-muted-foreground">Total Conversations</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Escrow & Revenue */}
        <div className="mt-8">
          <h2 className="font-display text-xl font-bold mb-3">Secure Payments</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card><CardContent className="p-5"><BarChart3 className="mb-2 h-6 w-6 text-primary" /><p className="font-display text-2xl font-bold">{escrow.total}</p><p className="text-sm text-muted-foreground">Total Transactions</p></CardContent></Card>
            <Card><CardContent className="p-5"><TrendingUp className="mb-2 h-6 w-6 text-success" /><p className="font-display text-2xl font-bold">₦{escrow.gmv.toLocaleString()}</p><p className="text-sm text-muted-foreground">GMV (Released)</p></CardContent></Card>
            <Card><CardContent className="p-5"><Wallet className="mb-2 h-6 w-6 text-secondary" /><p className="font-display text-2xl font-bold">₦{escrow.revenue.toLocaleString()}</p><p className="text-sm text-muted-foreground">Company Revenue</p></CardContent></Card>
            <Card><CardContent className="p-5"><ShieldCheck className="mb-2 h-6 w-6 text-info" /><p className="font-display text-2xl font-bold">{escrow.secured}</p><p className="text-sm text-muted-foreground">Currently Secured</p></CardContent></Card>
            <Card><CardContent className="p-5"><TrendingUp className="mb-2 h-6 w-6 text-warning" /><p className="font-display text-2xl font-bold">{escrow.pending}</p><p className="text-sm text-muted-foreground">Pending Review</p></CardContent></Card>
            <Card><CardContent className="p-5"><RotateCcw className="mb-2 h-6 w-6 text-muted-foreground" /><p className="font-display text-2xl font-bold">{escrow.refunded}</p><p className="text-sm text-muted-foreground">Refunded</p></CardContent></Card>
            <Card><CardContent className="p-5"><AlertTriangle className="mb-2 h-6 w-6 text-destructive" /><p className="font-display text-2xl font-bold">{escrow.disputes}</p><p className="text-sm text-muted-foreground">Active Disputes</p></CardContent></Card>
          </div>
        </div>

        {/* Charts */}
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {/* Message Activity Line Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5 text-primary" />
                Message Activity (Last 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[250px] w-full" />
              ) : (
                <ChartContainer config={messageChartConfig} className="h-[250px] w-full">
                  <LineChart data={dailyMessages}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="count" stroke="var(--color-count)" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Property Listings Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Home className="h-5 w-5 text-secondary" />
                Property Listings by Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[250px] w-full" />
              ) : propertyTypes.length === 0 ? (
                <p className="flex h-[250px] items-center justify-center text-muted-foreground">No properties yet</p>
              ) : (
                <ChartContainer config={propertyChartConfig} className="h-[250px] w-full">
                  <BarChart data={propertyTypes}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" />
                    <YAxis allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div></AuthenticatedLayout>
  );
};

export default Analytics;
