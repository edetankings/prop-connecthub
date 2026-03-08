import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  User, Lock, Bell, Shield, HelpCircle, MessageSquare, AlertOctagon,
  LogOut, ChevronRight, Camera, CheckCircle, Edit3, Save, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type Section = "profile" | "password" | "notifications" | "security" | "support";

const Settings = () => {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [section, setSection] = useState<Section>("profile");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile edit state
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [location, setLocation] = useState(profile?.location || "");
  const [editingProfile, setEditingProfile] = useState(false);

  // Password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetSent, setResetSent] = useState(false);

  // Preferences state
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  // Support state
  const [supportName, setSupportName] = useState(profile?.full_name || "");
  const [supportEmail, setSupportEmail] = useState(user?.email || "");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [ticketSent, setTicketSent] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
      setBio(profile.bio || "");
      setLocation(profile.location || "");
    }
  }, [profile]);

  useEffect(() => {
    if (user && !prefsLoaded) {
      supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setPushEnabled(data.push_enabled);
            setEmailEnabled(data.email_notifications_enabled);
            setTwoFactorEnabled(data.two_factor_enabled);
          }
          setPrefsLoaded(true);
        });
    }
  }, [user, prefsLoaded]);

  const saveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, phone, bio, location })
      .eq("user_id", user!.id);
    setSaving(false);
    if (error) {
      toast.error("Failed to update profile");
    } else {
      toast.success("Profile updated!");
      setEditingProfile(false);
      await refreshProfile();
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const allowed = ["image/jpeg", "image/png", "image/jpg"];
    if (!allowed.includes(file.type)) {
      toast.error("Only JPG, JPEG, and PNG files are allowed");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File must be under 5MB");
      return;
    }

    setUploadingAvatar(true);
    const ext = file.name.split(".").pop();
    const filePath = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast.error("Failed to upload image");
      setUploadingAvatar(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
    const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: avatarUrl })
      .eq("user_id", user.id);

    setUploadingAvatar(false);
    if (updateError) {
      toast.error("Failed to save avatar");
    } else {
      toast.success("Profile picture updated!");
      await refreshProfile();
    }
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const savePreferences = async (key: string, value: boolean) => {
    if (!user) return;
    const updates: Record<string, boolean> = {
      push_enabled: pushEnabled,
      email_notifications_enabled: emailEnabled,
      two_factor_enabled: twoFactorEnabled,
      [key]: value,
    };
    const { error } = await supabase
      .from("user_preferences")
      .upsert({ user_id: user.id, ...updates }, { onConflict: "user_id" });
    if (error) toast.error("Failed to save preference");
    else toast.success("Preference saved");
  };

  const sendPasswordReset = async () => {
    if (!user?.email) return;
    setSaving(true);
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      setResetSent(true);
      toast.success("Password reset email sent!");
    }
  };

  const submitTicket = async () => {
    if (!user || !subject.trim() || !message.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from("support_tickets")
      .insert({ user_id: user.id, name: supportName, email: supportEmail, subject, message } as any);
    setSaving(false);
    if (error) toast.error("Failed to submit ticket");
    else {
      setTicketSent(true);
      setSubject("");
      setMessage("");
      toast.success("Support ticket submitted!");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const navItems: { key: Section; icon: typeof User; label: string }[] = [
    { key: "profile", icon: User, label: "Edit Profile" },
    { key: "password", icon: Lock, label: "Change Password" },
    { key: "notifications", icon: Bell, label: "Notifications" },
    { key: "security", icon: Shield, label: "Security" },
    { key: "support", icon: HelpCircle, label: "Help & Support" },
  ];

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-6">Settings</h1>

        <div className="grid gap-6 lg:grid-cols-4">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-2">
            {/* Profile card */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-card text-center mb-4">
              <div className="relative inline-block">
                <div className="h-20 w-20 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-2xl mx-auto overflow-hidden">
                  {profile?.avatar_url
                    ? <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                    : (profile?.full_name?.[0] || user?.email?.[0] || "U").toUpperCase()
                  }
                </div>
                <button className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-secondary flex items-center justify-center shadow-md">
                  <Camera className="h-3.5 w-3.5 text-secondary-foreground" />
                </button>
              </div>
              <p className="mt-3 font-display font-bold text-foreground">{profile?.full_name || user?.email}</p>
              <p className="text-xs text-muted-foreground capitalize">{profile?.profile_type}</p>
              {profile?.kyc_verified && (
                <Badge className="mt-2 bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))] text-xs">
                  <CheckCircle className="h-3 w-3 mr-1" /> Verified
                </Badge>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Member since {user ? new Date(user.created_at ?? Date.now()).toLocaleDateString("en-NG", { month: "long", year: "numeric" }) : "—"}
              </p>
            </div>

            {/* Nav */}
            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-card">
              {navItems.map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  onClick={() => setSection(key)}
                  className={`flex w-full items-center justify-between px-4 py-3 text-sm transition-colors border-b border-border last:border-0 ${
                    section === key
                      ? "bg-secondary/10 text-secondary font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <span className="flex items-center gap-2"><Icon className="h-4 w-4" />{label}</span>
                  <ChevronRight className="h-4 w-4 opacity-50" />
                </button>
              ))}
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-2 px-4 py-3 text-sm text-destructive hover:bg-destructive/5 transition-colors"
              >
                <LogOut className="h-4 w-4" /> Sign Out
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            <div className="rounded-xl border border-border bg-card p-6 shadow-card">

              {/* PROFILE */}
              {section === "profile" && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-display text-xl font-bold text-foreground">Edit Profile</h2>
                    {!editingProfile ? (
                      <Button size="sm" variant="outline" className="gap-2" onClick={() => setEditingProfile(true)}>
                        <Edit3 className="h-4 w-4" /> Edit
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setEditingProfile(false)}>
                          <X className="h-4 w-4" />
                        </Button>
                        <Button size="sm" className="gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90" onClick={saveProfile} disabled={saving}>
                          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Label>Full Name</Label>
                      <Input value={fullName} onChange={e => setFullName(e.target.value)} disabled={!editingProfile} className="mt-1" />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input value={user?.email || ""} disabled className="mt-1 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground mt-1">Email cannot be changed here</p>
                    </div>
                    <div>
                      <Label>Phone Number</Label>
                      <Input value={phone} onChange={e => setPhone(e.target.value)} disabled={!editingProfile} className="mt-1" placeholder="+234..." />
                    </div>
                    <div>
                      <Label>Location</Label>
                      <Input value={location} onChange={e => setLocation(e.target.value)} disabled={!editingProfile} className="mt-1" placeholder="Lagos, Nigeria" />
                    </div>
                    <div>
                      <Label>Bio</Label>
                      <Textarea value={bio} onChange={e => setBio(e.target.value)} disabled={!editingProfile} className="mt-1 resize-none" rows={3} placeholder="Tell us about yourself…" />
                    </div>
                  </div>
                </div>
              )}

              {/* PASSWORD */}
              {section === "password" && (
                <div>
                  <h2 className="font-display text-xl font-bold text-foreground mb-6">Change Password</h2>
                  {resetSent ? (
                    <div className="rounded-xl border border-[hsl(var(--success)/0.3)] bg-[hsl(var(--success)/0.05)] p-6 text-center">
                      <CheckCircle className="mx-auto mb-3 h-10 w-10 text-[hsl(var(--success))]" />
                      <p className="font-medium text-foreground">Password reset email sent!</p>
                      <p className="text-sm text-muted-foreground mt-1">Check your email at <strong>{user?.email}</strong> and follow the link to set a new password.</p>
                      <Button variant="ghost" size="sm" className="mt-4" onClick={() => setResetSent(false)}>Send again</Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
                        For security, we'll send a password reset link to <strong className="text-foreground">{user?.email}</strong>. Click the link in the email to set your new password.
                      </div>
                      <Button
                        className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                        onClick={sendPasswordReset}
                        disabled={saving}
                      >
                        {saving ? "Sending…" : "Send Password Reset Email"}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* NOTIFICATIONS */}
              {section === "notifications" && (
                <div>
                  <h2 className="font-display text-xl font-bold text-foreground mb-6">Notification Preferences</h2>
                  <div className="space-y-4">
                    {[
                      {
                        label: "Push Notifications",
                        desc: "Receive alerts on your device",
                        value: pushEnabled,
                        key: "push_enabled",
                        set: setPushEnabled,
                      },
                      {
                        label: "Email Notifications",
                        desc: "Get updates sent to your email",
                        value: emailEnabled,
                        key: "email_notifications_enabled",
                        set: setEmailEnabled,
                      },
                    ].map(({ label, desc, value, key, set }) => (
                      <div key={key} className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-4">
                        <div>
                          <p className="font-medium text-foreground text-sm">{label}</p>
                          <p className="text-xs text-muted-foreground">{desc}</p>
                        </div>
                        <Switch
                          checked={value}
                          onCheckedChange={(v) => {
                            set(v);
                            savePreferences(key, v);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECURITY */}
              {section === "security" && (
                <div>
                  <h2 className="font-display text-xl font-bold text-foreground mb-6">Security Settings</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-4">
                      <div>
                        <p className="font-medium text-foreground text-sm">Two-Factor Authentication</p>
                        <p className="text-xs text-muted-foreground">Add an extra layer of security to your account</p>
                      </div>
                      <Switch
                        checked={twoFactorEnabled}
                        onCheckedChange={(v) => {
                          setTwoFactorEnabled(v);
                          savePreferences("two_factor_enabled", v);
                        }}
                      />
                    </div>
                    <div className="rounded-xl border border-border bg-muted/30 p-4">
                      <p className="font-medium text-foreground text-sm mb-1">Current Session</p>
                      <p className="text-xs text-muted-foreground">Signed in as <strong>{user?.email}</strong></p>
                      <Button size="sm" variant="destructive" className="mt-3" onClick={handleSignOut}>
                        <LogOut className="h-4 w-4 mr-2" /> Sign Out of All Sessions
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* SUPPORT */}
              {section === "support" && (
                <div>
                  <h2 className="font-display text-xl font-bold text-foreground mb-6">Help & Support</h2>
                  <div className="grid gap-3 mb-6 sm:grid-cols-3">
                    {[
                      { icon: HelpCircle, label: "Help Center", desc: "Browse FAQs and guides" },
                      { icon: MessageSquare, label: "Contact Support", desc: "Chat with our team" },
                      { icon: AlertOctagon, label: "Report a Problem", desc: "Flag issues or abuse" },
                    ].map(({ icon: Icon, label, desc }) => (
                      <div key={label} className="rounded-xl border border-border bg-muted/30 p-4 cursor-pointer hover:bg-muted transition-colors">
                        <Icon className="h-5 w-5 text-secondary mb-2" />
                        <p className="font-medium text-sm text-foreground">{label}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                    ))}
                  </div>

                  {ticketSent ? (
                    <div className="rounded-xl border border-[hsl(var(--success)/0.3)] bg-[hsl(var(--success)/0.05)] p-6 text-center">
                      <CheckCircle className="mx-auto mb-3 h-10 w-10 text-[hsl(var(--success))]" />
                      <p className="font-medium text-foreground">Message sent!</p>
                      <p className="text-sm text-muted-foreground mt-1">We'll get back to you within 24 hours.</p>
                      <Button variant="ghost" size="sm" className="mt-4" onClick={() => setTicketSent(false)}>Send another</Button>
                    </div>
                  ) : (
                    <div>
                      <h3 className="font-display font-semibold text-foreground mb-3">Send a Support Message</h3>
                      <div className="space-y-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <Label>Name</Label>
                            <Input value={supportName} onChange={e => setSupportName(e.target.value)} className="mt-1" placeholder="Your full name" />
                          </div>
                          <div>
                            <Label>Email</Label>
                            <Input value={supportEmail} onChange={e => setSupportEmail(e.target.value)} className="mt-1" placeholder="you@example.com" type="email" />
                          </div>
                        </div>
                        <div>
                          <Label>Subject</Label>
                          <Input value={subject} onChange={e => setSubject(e.target.value)} className="mt-1" placeholder="Brief description of your issue" />
                        </div>
                        <div>
                          <Label>Message</Label>
                          <Textarea value={message} onChange={e => setMessage(e.target.value)} className="mt-1 resize-none" rows={4} placeholder="Describe your problem in detail…" />
                        </div>
                        <div className="flex gap-3">
                          <Button
                            variant="outline"
                            onClick={() => { setSubject(""); setMessage(""); }}
                          >
                            Cancel
                          </Button>
                          <Button
                            className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                            onClick={submitTicket}
                            disabled={saving || !subject.trim() || !message.trim() || !supportName.trim() || !supportEmail.trim()}
                          >
                            {saving ? "Sending…" : "Send Message"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
};

export default Settings;
