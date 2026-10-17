import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, X, ImageIcon, MapPin, Sparkles, Save, Send, AlertTriangle, CreditCard, FileText, ShieldCheck, Video } from "lucide-react";
import LocationPicker from "@/components/LocationPicker";
import PdfUploader, { type PdfFile } from "@/components/PdfUploader";
import VideoUploader, { type VideoFile } from "@/components/VideoUploader";

const AMENITIES = ["Free WiFi", "Swimming Pool", "Gym", "Parking", "Security", "Garden"];
const CATEGORIES = [
  { value: "house", label: "House" },
  { value: "land", label: "Land" },
  { value: "apartment", label: "Apartment" },
  { value: "hotel", label: "Hotel" },
  { value: "estate", label: "Estate" },
  { value: "commercial", label: "Commercial" },
];

const PropertyEditor = ({ editId }: { editId: string | null }) => {
  const { profile, loading: authLoading, isAdmin } = useAuth();
  const { isActive, loading: subLoading, isAgent } = useSubscription();
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [existingVideos, setExistingVideos] = useState<string[]>([]);
  const [existingDocuments, setExistingDocuments] = useState(0);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(!!editId);
  const [editError, setEditError] = useState(false);
  const [editRetry, setEditRetry] = useState(0);
  const [originalVerified, setOriginalVerified] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [videos, setVideos] = useState<VideoFile[]>([]);
  const navigate = useNavigate();
  const submitLock = useRef(false);
  const savedPropertyId = useRef<string | null>(null);
  const writeAcknowledged = useRef(false);
  const uploadedFiles = useRef(new Map<File, string>());
  const savedDocuments = useRef(new Set<File>());
  const [submitting, setSubmitting] = useState(false);
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [pdfs, setPdfs] = useState<PdfFile[]>([]);
  const [mapAddress, setMapAddress] = useState("");

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

  const ownerId = profile?.id;
  useEffect(() => {
    if (!editId || !ownerId) return;
    let active = true;
    setEditLoading(true); setEditError(false);
    void (async () => {
      try {
        const { data: row, error } = await supabase.from("properties").select("*").eq("id", editId).eq("agent_id", ownerId).maybeSingle();
        if (error || !row || row.agent_id !== ownerId || row.id !== editId || ["payment_pending","transaction_in_progress","sold","rented"].includes(row.status)) throw new Error("Listing unavailable for editing");
        const documents = await supabase.from("property_documents").select("id").eq("property_id", editId);
        if (documents.error) throw documents.error;
        if (!active) return;
        savedPropertyId.current = row.id;
        setOriginalVerified(row.is_verified);
        const retained = [...new Set([...(row.image_url ? [row.image_url] : []), ...(row.images || [])])];
        setExistingImages(retained); setCoverImage(row.image_url || retained[0] || null);
        setExistingVideos(row.videos || []); setExistingDocuments(documents.data?.length || 0);
        setForm({ title: row.title, price: String(row.price), property_type: row.property_type,
          listing_type: row.listing_type === "rental" ? "for_rent" : "for_sale", description: row.description || "",
          address: row.address || "", city: row.city || "", state: row.state || "", zip_code: row.zip_code || "",
          latitude: row.latitude == null ? "" : String(row.latitude), longitude: row.longitude == null ? "" : String(row.longitude),
          bedrooms: row.bedrooms == null ? "" : String(row.bedrooms), bathrooms: row.bathrooms == null ? "" : String(row.bathrooms),
          sqft: row.sqft == null ? "" : String(row.sqft), amenities: row.amenities || [] });
      } catch { if (active) setEditError(true); }
      finally { if (active) setEditLoading(false); }
    })();
    return () => { active = false; };
  }, [editId, ownerId, editRetry]);
  const previews = useRef(images); previews.current = images;
  useEffect(() => () => { previews.current.forEach(image => URL.revokeObjectURL(image.preview)); }, []);

  const updateField = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const toggleAmenity = (a: string) =>
    setForm((f) => ({
      ...f,
      amenities: f.amenities.includes(a) ? f.amenities.filter((x) => x !== a) : [...f.amenities, a],
    }));

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || submitting) return;
    const newImages = Array.from(files)
      .filter((f) => { if (["image/jpeg", "image/png", "image/webp"].includes(f.type)) return true; toast.error(`${f.name}: choose JPEG, PNG or WebP`); return false; })
      .map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setImages((prev) => [...prev, ...newImages]);
  }, [submitting]);

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
    if (images.length + existingImages.length === 0) { toast.error("At least one image is required"); return false; }
    if (!form.latitude || !form.longitude) { toast.error("Pin the property location on the map"); return false; }
    // Admin can post without PDFs (platform listings); agents must include them
    if (!isAdmin && pdfs.length + existingDocuments === 0) { toast.error("Upload at least one property document (PDF)"); return false; }
    if (form.title.length > 150) { toast.error("Title too long (max 150 chars)"); return false; }
    if (form.description.length > 5000) { toast.error("Description too long (max 5000 chars)"); return false; }
    return true;
  };

  const uploadPdfs = async (propertyId: string): Promise<void> => {
    if (!profile) return;
    for (const p of pdfs) {
      if (savedDocuments.current.has(p.file)) continue;
      const safeName = p.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${profile.user_id}/${propertyId}/${Date.now()}-${safeName}`;
      const cachedPath = uploadedFiles.current.get(p.file);
      const { error: upErr } = cachedPath ? { error: null } : await supabase.storage.from("property-documents").upload(path, p.file, {
        contentType: "application/pdf",
      });
      if (upErr) throw new Error(`Document upload failed: ${upErr.message}`);
      const confirmedPath = cachedPath || path;
      uploadedFiles.current.set(p.file, confirmedPath);
      const { error: documentError } = await supabase.from("property_documents").insert({
        property_id: propertyId,
        agent_id: profile.id,
        file_url: confirmedPath,
        file_name: p.file.name,
        file_size: p.file.size,
        document_type: "other",
      });
      if (documentError) throw documentError;
      savedDocuments.current.add(p.file);
    }
  };

  const uploadImages = async (): Promise<string[]> => {
    const urls: string[] = [...existingImages];
    for (const img of images) {
      const cached = uploadedFiles.current.get(img.file);
      if (cached) { urls.push(cached); continue; }
      const ext = img.file.name.split(".").pop();
      const path = `${profile!.user_id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      setUploadMessage(`Uploading photograph ${images.indexOf(img) + 1} of ${images.length}…`);
      const { error } = await supabase.storage.from("property-images").upload(path, img.file);
      if (error) throw new Error(`Image upload failed: ${error.message}`);
      const { data } = supabase.storage.from("property-images").getPublicUrl(path);
      uploadedFiles.current.set(img.file, data.publicUrl);
      urls.push(data.publicUrl);
    }
    const selectedFile = images.find(image => image.preview === coverImage)?.file;
    const selected = existingImages.includes(coverImage || "") ? coverImage : selectedFile ? uploadedFiles.current.get(selectedFile) : null;
    return selected && urls.includes(selected) ? [selected, ...urls.filter(url => url !== selected)] : urls;
  };

  const uploadVideos = async (): Promise<string[]> => {
    const urls: string[] = [...existingVideos];
    for (const v of videos) {
      const cached = uploadedFiles.current.get(v.file);
      if (cached) { urls.push(cached); continue; }
      const ext = v.file.name.split(".").pop();
      const path = `${profile!.user_id}/videos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("property-images").upload(path, v.file, { contentType: v.file.type });
      if (error) throw new Error(`Video upload failed: ${error.message}`);
      const { data } = supabase.storage.from("property-images").getPublicUrl(path);
      uploadedFiles.current.set(v.file, data.publicUrl);
      urls.push(data.publicUrl);
    }
    return urls;
  };

  const handleSubmit = async (status: "draft" | "for_sale") => {
    if (submitLock.current) return;
    if (status === "for_sale" && !validate()) return;
    if (status === "draft" && !form.title.trim()) { toast.error("Title is required even for drafts"); return; }
    if (!profile) { toast.error("Please log in first"); return; }
    // Admins bypass KYC + subscription gates and properties auto-approve
    if (status === "for_sale" && isAgent && !isAdmin && !isKycVerified) {
      toast.error("Complete KYC verification before submitting a property for approval.");
      return;
    }

    submitLock.current = true;
    setSubmitting(true);
    try {
      if (editId && (editLoading || editError || savedPropertyId.current !== editId)) throw new Error("Reload this listing before editing.");
      const imageUrls = await uploadImages();
      setUploadMessage("Preparing property videos…");
      const videoUrls = await uploadVideos();
      // Admins auto-approve their listings; agents go through review
      const finalStatus =
        status === "draft" ? "draft" as const :
        isAdmin ? "available" as const : "under_verification" as const;

      const payload = {
          title: form.title.trim(),
          price: Number(form.price) || 0,
          property_type: form.property_type || "house",
          listing_type: form.listing_type === "for_rent" ? "rental" as const : "sale" as const,
          description: form.description.trim(),
          address: form.address.trim() || mapAddress,
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
          videos: videoUrls,
          agent_id: profile.id,
          status: finalStatus,
          ...(!editId ? { is_verified: isAdmin ? true : false } : {}),
        };
      // Retain a confirmed record across document failures so retry does not insert a duplicate.
      const query = savedPropertyId.current
        ? supabase.from("properties").update(payload).eq("id", savedPropertyId.current).eq("agent_id", profile.id)
        : supabase.from("properties").insert(payload);
      setUploadMessage("Saving listing details…");
      const { data: inserted, error } = await query.select("id, status").single();

      if (error) throw error;
      if (!inserted?.id) throw new Error("Property save was not confirmed. Please retry.");
      savedPropertyId.current = inserted.id;
      writeAcknowledged.current = true;
      if (inserted?.id && pdfs.length > 0) {
        setUploadMessage("Saving private property documents…");
        await uploadPdfs(inserted.id);
      }
      toast.success(inserted.status === "draft" ? "Draft saved!" : inserted.status === "under_verification" ? "Property submitted for admin approval!" : inserted.status === "available" && isAdmin ? "Property published!" : "Listing saved. Check its recorded status in your workspace.");
      navigate(isAdmin ? "/admin" : "/dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error || (err && typeof err === "object" && "message" in err) ? String(err.message) : "Failed to save property";
      toast.error(writeAcknowledged.current ? `${message}. The listing was saved but is incomplete; retry here to finish it.` : message);
    } finally {
      submitLock.current = false;
      setSubmitting(false); setUploadMessage("");
    }
  };

  if (editId && (editLoading || editError)) return <AuthenticatedLayout><div className="buyer-empty" role={editError ? "alert" : "status"}>{editError ? <><h1>Listing unavailable for editing</h1><p>Only your own unlocked property can be edited. No changes were saved.</p><Button variant="outline" onClick={() => setEditRetry(value => value + 1)}>Retry listing</Button><Button asChild variant="ghost"><Link to="/dashboard">Return to workspace</Link></Button></> : <p>Loading your listing…</p>}</div></AuthenticatedLayout>;

  // Loading guard - prevent blank screen while auth/subscription state resolves
  if (authLoading || (isAgent && subLoading)) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </AuthenticatedLayout>
    );
  }

  if (!isAdmin && profile?.profile_type !== "agent" && profile?.profile_type !== "builder") return <AuthenticatedLayout><div className="buyer-empty"><h1>Professional account required</h1><p>Property listing tools are available only to the supported professional account types.</p><Button asChild><Link to="/dashboard">Return to your dashboard</Link></Button></div></AuthenticatedLayout>;

  // Subscription gate for agents (admins bypass)
  if (isAgent && !isAdmin && !isActive) {
    return (
      <AuthenticatedLayout>
        <div className="container mx-auto max-w-xl px-4 py-16 text-center">
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-8">
              <CreditCard className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="font-display text-xl font-bold text-foreground mb-2">Subscription Required</h2>
              <p className="text-muted-foreground mb-6">
                Your subscription is inactive. Please complete payment to access Add Property and other agent features.
              </p>
              <Link to="/payments">
                <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90 gap-2">
                  <CreditCard className="h-4 w-4" /> Go to Payments
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="professional-listing-form container mx-auto max-w-3xl px-4 py-8">
        <h1 className="font-display text-2xl font-bold text-foreground mb-4">
          {editId ? "Edit your listing" : isAdmin ? "Post Property (Admin)" : "Create a considered listing."}
        </h1>
        <p className="professional-form-intro">Clear details. Thoughtful photography. A location buyers can understand. {editId ? "Changes remain subject to the existing moderation rules." : "Non-admin submissions are reviewed before publication."}</p>
        <nav className="professional-form-jump" aria-label="Listing sections">{[["photography","Photography"],["details","Details"],["location","Location"],["documents","Documents"],["amenities","Amenities"],["review","Review"]].map(([id,title]) => <a key={id} href={`#listing-${id}`}>{title}</a>)}</nav>
        {isAdmin && (
          <div className="mb-6 rounded-xl border-2 border-secondary/30 bg-secondary/5 p-4 flex gap-3">
            <ShieldCheck className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">Posting as Admin</p>
              <p className="text-xs text-muted-foreground mt-1">This listing will be auto-approved and immediately visible. Documents are optional.</p>
            </div>
          </div>
        )}

        {/* KYC Warning - hidden for admins */}
        {!isAdmin && !isKycVerified && (
          <div className="mb-6 rounded-xl border-2 border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/5 p-4 flex gap-3">
            <AlertTriangle className="h-5 w-5 text-[hsl(var(--warning))] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">Identity verification required</p>
              <p className="text-xs text-muted-foreground mt-1">Complete identity review before submission. Financial operations remain locked.</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => navigate("/verification")}>Complete Verification</Button>
            </div>
          </div>
        )}

        <fieldset className="professional-editor-fields" disabled={submitting} aria-busy={submitting} aria-label="Listing details and media">
        {/* Upload Section */}
        <section id="listing-photography" className="mb-8">
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
            <label className="professional-file-input">
              <Button variant="outline" size="sm" asChild><span>Browse Files</span></Button>
              <input type="file" multiple accept="image/*" aria-label="Property photographs" className="sr-only" onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} />
            </label>
          </div>
          <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-secondary" /> Choose clear photographs. The first saved image is the cover; photography does not grant verification.
          </p>
          {existingImages.length > 0 && <div className="professional-retained-images">{existingImages.map((url,index) => <div key={`${url}-${index}`}><img src={url} alt={`Saved photograph ${index+1}`} /><button type="button" aria-label={`Remove saved photograph ${index+1}`} onClick={() => setExistingImages(values => values.filter((_,i) => i!==index))}>Remove</button><button type="button" aria-label={`Use saved photograph ${index+1} as cover`} aria-pressed={coverImage===url} onClick={() => setCoverImage(url)}>Use as cover</button></div>)}</div>}
          {images.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-3">
              {images.map((img, i) => (
                <div key={i} className="relative h-24 w-24 rounded-lg overflow-hidden border border-border group">
                  <img src={img.preview} alt={`New photograph ${i+1}`} className="h-full w-full object-cover" />
                  <button
                    type="button" aria-label={`Remove new photograph ${i+1}`} onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 rounded-full bg-destructive p-0.5 text-destructive-foreground opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <button type="button" className="professional-cover-button" aria-label={`Use new photograph ${i+1} as cover`} aria-pressed={coverImage === img.preview} onClick={() => setCoverImage(img.preview)}>Cover</button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Video Upload */}
        <section className="mb-8">
          <h2 className="font-display text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <Video className="h-5 w-5 text-secondary" /> Property Tour Videos <span className="text-xs text-muted-foreground font-normal">(optional)</span>
          </h2>
          {existingVideos.length > 0 && <p>{existingVideos.length} saved videos will be retained.</p>}
          <VideoUploader files={videos} onChange={setVideos} maxFiles={3} maxSizeMb={100} />
        </section>

        {/* Property Details */}
        <section id="listing-details" className="mb-8">
          <h2 className="font-display text-lg font-semibold text-foreground mb-3">Property Details</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="listing-title" className="text-sm font-medium text-foreground mb-1 block">Title *</label>
              <Input id="listing-title" placeholder="e.g. Modern 3-Bedroom Apartment" value={form.title} onChange={(e) => updateField("title", e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="listing-price" className="text-sm font-medium text-foreground mb-1 block">Price (₦) *</label>
                <Input id="listing-price" type="number" placeholder="0" min="0" value={form.price} onChange={(e) => updateField("price", e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Category *</label>
                <Select value={form.property_type} onValueChange={(v) => updateField("property_type", v)}>
                  <SelectTrigger aria-label="Property category"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Listing Type *</label>
                <Select value={form.listing_type} onValueChange={(v) => setForm(f => ({ ...f, listing_type: v as "for_sale" | "for_rent" }))}>
                  <SelectTrigger aria-label="Listing purpose"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="for_sale">For Sale</SelectItem>
                    <SelectItem value="for_rent">For Rent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label htmlFor="listing-sqft" className="text-sm font-medium text-foreground mb-1 block">Sq Ft</label>
                <Input id="listing-sqft" type="number" placeholder="0" min="0" value={form.sqft} onChange={(e) => updateField("sqft", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="listing-bedrooms" className="text-sm font-medium text-foreground mb-1 block">Bedrooms</label>
                <Input id="listing-bedrooms" type="number" placeholder="0" min="0" value={form.bedrooms} onChange={(e) => updateField("bedrooms", e.target.value)} />
              </div>
              <div>
                <label htmlFor="listing-bathrooms" className="text-sm font-medium text-foreground mb-1 block">Bathrooms</label>
                <Input id="listing-bathrooms" type="number" placeholder="0" min="0" value={form.bathrooms} onChange={(e) => updateField("bathrooms", e.target.value)} />
              </div>
            </div>
            <div>
              <label htmlFor="listing-description" className="text-sm font-medium text-foreground mb-1 block">Description *</label>
              <Textarea id="listing-description" placeholder="Describe the property..." rows={4} value={form.description} onChange={(e) => updateField("description", e.target.value)} />
            </div>
          </div>
        </section>

        {/* Location */}
        <section id="listing-location" className="mb-8">
          <h2 className="font-display text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-secondary" /> Location <span className="text-destructive">*</span>
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input aria-label="City" placeholder="City *" value={form.city} onChange={(e) => updateField("city", e.target.value)} />
              <Input aria-label="State" placeholder="State *" value={form.state} onChange={(e) => updateField("state", e.target.value)} />
              <Input aria-label="Zip code" placeholder="Zip Code" value={form.zip_code} onChange={(e) => updateField("zip_code", e.target.value)} />
            </div>
            <LocationPicker
              initialLat={form.latitude ? parseFloat(form.latitude) : null}
              initialLng={form.longitude ? parseFloat(form.longitude) : null}
              initialAddress={form.address}
              onChange={({ lat, lng, address }) => {
                setForm((f) => ({
                  ...f,
                  latitude: String(lat),
                  longitude: String(lng),
                  address: f.address || address,
                }));
                setMapAddress(address);
              }}
            />
            <Input aria-label="Street address" placeholder="Street Address (auto-filled from map, editable)" value={form.address} onChange={(e) => updateField("address", e.target.value)} />
          </div>
        </section>

        {/* Property Documents (PDF) */}
        <section id="listing-documents" className="mb-8">
          <h2 className="font-display text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <FileText className="h-5 w-5 text-secondary" /> Upload Property Documents (PDF) <span className="text-destructive">*</span>
          </h2>
          <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-secondary" />
            Required: ownership proof, survey plan, agreement, land docs. Stored privately and accessible only through existing document permissions.
          </p>
          {existingDocuments > 0 && <p>{existingDocuments} existing private documents will be retained.</p>}
          <PdfUploader files={pdfs} onChange={setPdfs} maxFiles={3} maxSizeMb={20} />
        </section>


        {/* Amenities */}
        <section id="listing-amenities" className="mb-8">
          <h2 className="font-display text-lg font-semibold text-foreground mb-3">Amenities</h2>
          <div className="flex flex-wrap gap-2">
            {AMENITIES.map((a) => (
              <button
                key={a}
                type="button" aria-pressed={form.amenities.includes(a)} onClick={() => toggleAmenity(a)}
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

        <section id="listing-review" className="professional-review"><h2>Review before submitting</h2><p>Confirm the location, price and ownership documents. Only the server can confirm the saved status. Non-admin changes to reviewed listings require moderation.</p><dl><div><dt>Title</dt><dd>{form.title || "Not entered"}</dd></div><div><dt>Location</dt><dd>{[form.city,form.state].filter(Boolean).join(", ") || "Not entered"}</dd></div><div><dt>Photographs selected</dt><dd>{images.length + existingImages.length}</dd></div></dl>{uploadMessage && <p role="status">{uploadMessage}</p>}</section>
        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pb-8">
          <Button variant="outline" className="flex-1 gap-2" onClick={() => handleSubmit("draft")} disabled={submitting || !!editId && originalVerified}>
            <Save className="h-4 w-4" /> Save as Draft
          </Button>
          <Button className="flex-1 gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90" onClick={() => handleSubmit("for_sale")} disabled={submitting}>
           <Send className="h-4 w-4" /> {submitting ? "Saving listing…" : isAdmin ? "Publish Listing" : "Submit for review"}
          </Button>
        </div>
        </fieldset>
      </div>
    </AuthenticatedLayout>
  );
};

const AddProperty = () => {
  const [params] = useSearchParams();
  const editId = params.get("edit");
  return <PropertyEditor key={editId || "new"} editId={editId} />;
};
export default AddProperty;
