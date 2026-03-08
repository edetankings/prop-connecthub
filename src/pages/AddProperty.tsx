import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, X, ImageIcon, MapPin, Sparkles, Save, Send, AlertTriangle } from "lucide-react";

const AMENITIES = ["Free WiFi", "Swimming Pool", "Gym", "Parking", "Security", "Garden"];
const CATEGORIES = [
  { value: "house", label: "House" },
  { value: "land", label: "Land" },
  { value: "apartment", label: "Apartment" },
  { value: "commercial", label: "Commercial" },
];

const AddProperty = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const [form, setForm] = useState({
    title: "",
    price: "",
    property_type: "",
    listing_type: "for_sale" as "for_sale" | "for_rent",
    description: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    latitude: "",
    longitude: "",
    bedrooms: "",
    bathrooms: "",
    sqft: "",
    amenities: [] as string[],
  });

  const updateField = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const toggleAmenity = (a: string) =>
    setForm((f) => ({
      ...f,
      amenities: f.amenities.includes(a) ? f.amenities.filter((x) => x !== a) : [...f.amenities, a],
    }));

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const newImages = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setImages((prev) => [...prev, ...newImages]);
  }, []);

  const removeImage = (index: number) => {
    setImages((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const isKycVerified = profile?.kyc_verified ?? false;

  const validate = () => {
    if (!form.title.trim()) { toast.error("Title is required"); return false; }
    if (!form.price || Number(form.price) <= 0) { toast.error("Valid price is required"); return false; }
    if (!form.property_type) { toast.error("Category is required"); return false; }
    if (!form.description.trim()) { toast.error("Description is required"); return false; }
    if (!form.city.trim()) { toast.error("City is required"); return false; }
    if (!form.state.trim()) { toast.error("State is required"); return false; }
    if (images.length === 0) { toast.error("At least one image is required"); return false; }
    if (form.title.length > 150) { toast.error("Title too long (max 150 chars)"); return false; }
    if (form.description.length > 5000) { toast.error("Description too long (max 5000 chars)"); return false; }
    return true;
  };

  const uploadImages = async (): Promise<string[]> => {
    const urls: string[] = [];
    for (const img of images) {
      const ext = img.file.name.split(".").pop();
      const path = `${profile!.user_id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("property-images").upload(path, img.file);
      if (error) { toast.error(`Upload failed: ${error.message}`); continue; }
      const { data } = supabase.storage.from("property-images").getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  };

  const handleSubmit = async (status: "draft" | "for_sale") => {
    if (status === "for_sale" && !validate()) return;
    if (status === "draft" && !form.title.trim()) { toast.error("Title is required even for drafts"); return; }
    if (!profile) { toast.error("Please log in first"); return; }

    setSubmitting(true);
    try {
      const imageUrls = await uploadImages();
      // All published properties go to under_verification for admin approval
      const finalStatus = status === "draft" ? "draft" : "under_verification";

      const { error } = await supabase.from("properties").insert({
        title: form.title.trim(),
        price: Number(form.price) || 0,
        property_type: form.property_type || "house",
        description: form.description.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        zip_code: form.zip_code.trim(),
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
        bedrooms: form.bedrooms ? parseInt(form.bedrooms) : null,
        bathrooms: form.bathrooms ? parseInt(form.bathrooms) : null,
        sqft: form.sqft ? parseInt(form.sqft) : null,
        amenities: form.amenities,
        images: imageUrls,
        image_url: imageUrls[0] || null,
        agent_id: profile.id,
        status: (status === "draft" ? "draft" : "under_verification") as any,
      });

      if (error) throw error;
      toast.success(status === "draft" ? "Draft saved!" : "Property submitted for admin approval!");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Failed to save property");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <h1 className="font-display text-2xl font-bold text-foreground mb-4">Add New Property</h1>

        {/* KYC Warning */}
        {!isKycVerified && (
          <div className="mb-6 rounded-xl border-2 border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/5 p-4 flex gap-3">
            <AlertTriangle className="h-5 w-5 text-[hsl(var(--warning))] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">Identity verification required</p>
              <p className="text-xs text-muted-foreground mt-1">Complete your KYC verification to build buyer trust and unlock escrow payouts.</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => navigate("/verification")}>Complete Verification</Button>
            </div>
          </div>
        )}

        {/* Upload Section */}
        <section className="mb-8">
          <h2 className="font-display text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <Upload className="h-5 w-5 text-secondary" /> Upload Photos & Videos
          </h2>
          <div
            className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors ${dragOver ? "border-secondary bg-secondary/5" : "border-border bg-muted/30"}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
          >
            <ImageIcon className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-2">Drag & drop images here, or</p>
            <label className="cursor-pointer">
              <Button variant="outline" size="sm" asChild><span>Browse Files</span></Button>
              <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
            </label>
          </div>
          <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-secondary" /> High-res images improve trust scores by up to 40%.
          </p>
          {images.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-3">
              {images.map((img, i) => (
                <div key={i} className="relative h-24 w-24 rounded-lg overflow-hidden border border-border group">
                  <img src={img.preview} alt="" className="h-full w-full object-cover" />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 rounded-full bg-destructive p-0.5 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Property Details */}
        <section className="mb-8">
          <h2 className="font-display text-lg font-semibold text-foreground mb-3">Property Details</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Title *</label>
              <Input placeholder="e.g. Modern 3-Bedroom Apartment" value={form.title} onChange={(e) => updateField("title", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Price (₦) *</label>
                <Input type="number" placeholder="0" min="0" value={form.price} onChange={(e) => updateField("price", e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Category *</label>
                <Select value={form.property_type} onValueChange={(v) => updateField("property_type", v)}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Listing Type *</label>
                <Select value={form.listing_type} onValueChange={(v) => setForm(f => ({ ...f, listing_type: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="for_sale">For Sale</SelectItem>
                    <SelectItem value="for_rent">For Rent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Sq Ft</label>
                <Input type="number" placeholder="0" min="0" value={form.sqft} onChange={(e) => updateField("sqft", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Bedrooms</label>
                <Input type="number" placeholder="0" min="0" value={form.bedrooms} onChange={(e) => updateField("bedrooms", e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Bathrooms</label>
                <Input type="number" placeholder="0" min="0" value={form.bathrooms} onChange={(e) => updateField("bathrooms", e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Description *</label>
              <Textarea placeholder="Describe the property..." rows={4} value={form.description} onChange={(e) => updateField("description", e.target.value)} />
            </div>
          </div>
        </section>

        {/* Location */}
        <section className="mb-8">
          <h2 className="font-display text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-secondary" /> Location
          </h2>
          <div className="space-y-4">
            <Input placeholder="Street Address" value={form.address} onChange={(e) => updateField("address", e.target.value)} />
            <div className="grid grid-cols-3 gap-4">
              <Input placeholder="City" value={form.city} onChange={(e) => updateField("city", e.target.value)} />
              <Input placeholder="State" value={form.state} onChange={(e) => updateField("state", e.target.value)} />
              <Input placeholder="Zip Code" value={form.zip_code} onChange={(e) => updateField("zip_code", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input type="number" placeholder="Latitude" value={form.latitude} onChange={(e) => updateField("latitude", e.target.value)} />
              <Input type="number" placeholder="Longitude" value={form.longitude} onChange={(e) => updateField("longitude", e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">Enter coordinates manually or use a map service to find them.</p>
          </div>
        </section>

        {/* Amenities */}
        <section className="mb-8">
          <h2 className="font-display text-lg font-semibold text-foreground mb-3">Amenities</h2>
          <div className="flex flex-wrap gap-2">
            {AMENITIES.map((a) => (
              <button
                key={a}
                onClick={() => toggleAmenity(a)}
                className={`rounded-full px-4 py-2 text-sm font-medium border transition-colors ${
                  form.amenities.includes(a)
                    ? "bg-secondary text-secondary-foreground border-secondary"
                    : "bg-card text-muted-foreground border-border hover:border-secondary/50"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </section>

        {/* Actions */}
        <div className="flex gap-3 pb-8">
          <Button variant="outline" className="flex-1 gap-2" onClick={() => handleSubmit("draft")} disabled={submitting}>
            <Save className="h-4 w-4" /> Save as Draft
          </Button>
          <Button className="flex-1 gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90" onClick={() => handleSubmit("for_sale")} disabled={submitting}>
           <Send className="h-4 w-4" /> Publish Listing
          </Button>
        </div>
      </div>
    </AuthenticatedLayout>
  );
};

export default AddProperty;
