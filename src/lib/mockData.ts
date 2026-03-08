export interface Property {
  id: string;
  title: string;
  price: number;
  location: string;
  type: "sale" | "rent";
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  image: string;
  agentId: string;
  status: "available" | "reserved" | "sold";
  description: string;
  features: string[];
}

export interface Agent {
  id: string;
  name: string;
  avatar: string;
  trustScore: number;
  verificationLevel: "unverified" | "verified" | "fully_verified";
  rating: number;
  reviewCount: number;
  propertiesListed: number;
  completedTransactions: number;
  specialization: string;
  location: string;
  bio: string;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  seen: boolean;
}

export interface Announcement {
  id: string;
  authorId: string;
  authorName: string;
  title: string;
  content: string;
  type: "update" | "alert" | "announcement";
  createdAt: string;
}

export interface Review {
  id: string;
  buyerName: string;
  rating: number;
  comment: string;
  date: string;
  propertyTitle: string;
}

export const agents: Agent[] = [
  { id: "a1", name: "Adebayo Okonkwo", avatar: "https://i.pravatar.cc/150?img=11", trustScore: 92, verificationLevel: "fully_verified", rating: 4.8, reviewCount: 47, propertiesListed: 23, completedTransactions: 89, specialization: "Luxury Estates", location: "Lagos, Nigeria", bio: "Top-rated luxury property specialist with 10+ years experience." },
  { id: "a2", name: "Chioma Nwankwo", avatar: "https://i.pravatar.cc/150?img=26", trustScore: 78, verificationLevel: "verified", rating: 4.5, reviewCount: 32, propertiesListed: 15, completedTransactions: 56, specialization: "Residential Homes", location: "Abuja, Nigeria", bio: "Dedicated residential agent helping families find their dream homes." },
  { id: "a3", name: "Emeka Uzoma", avatar: "https://i.pravatar.cc/150?img=33", trustScore: 65, verificationLevel: "verified", rating: 4.2, reviewCount: 18, propertiesListed: 8, completedTransactions: 24, specialization: "Commercial Properties", location: "Port Harcourt, Nigeria", bio: "Commercial property expert focused on business spaces." },
  { id: "a4", name: "Fatima Ibrahim", avatar: "https://i.pravatar.cc/150?img=45", trustScore: 45, verificationLevel: "unverified", rating: 3.8, reviewCount: 5, propertiesListed: 3, completedTransactions: 7, specialization: "Land & Plots", location: "Kano, Nigeria", bio: "New agent specializing in land acquisitions." },
];

export const properties: Property[] = [
  { id: "p1", title: "Modern 4-Bedroom Duplex in Lekki", price: 85000000, location: "Lekki Phase 1, Lagos", type: "sale", bedrooms: 4, bathrooms: 4, sqft: 3200, image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800", agentId: "a1", status: "available", description: "Stunning modern duplex with premium finishes, smart home features, and a private garden.", features: ["Swimming Pool", "Smart Home", "24/7 Security", "Parking"] },
  { id: "p2", title: "Executive 3-Bed Apartment in Ikoyi", price: 120000000, location: "Ikoyi, Lagos", type: "sale", bedrooms: 3, bathrooms: 3, sqft: 2800, image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800", agentId: "a1", status: "available", description: "Premium waterfront apartment with panoramic views of Lagos lagoon.", features: ["Waterfront", "Gym", "Concierge", "Elevator"] },
  { id: "p3", title: "Spacious 5-Bed Villa in Maitama", price: 150000000, location: "Maitama, Abuja", type: "sale", bedrooms: 5, bathrooms: 6, sqft: 5000, image: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800", agentId: "a2", status: "available", description: "Luxurious villa in the heart of Abuja's most prestigious district.", features: ["Garden", "Boys Quarters", "CCTV", "Generator"] },
  { id: "p4", title: "2-Bedroom Flat in Wuse", price: 2500000, location: "Wuse 2, Abuja", type: "rent", bedrooms: 2, bathrooms: 2, sqft: 1200, image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800", agentId: "a2", status: "available", description: "Well-maintained apartment in a serene environment, close to amenities.", features: ["Furnished", "Water Supply", "Security", "Parking"] },
  { id: "p5", title: "Commercial Office Space in Victoria Island", price: 5000000, location: "Victoria Island, Lagos", type: "rent", bedrooms: 0, bathrooms: 2, sqft: 4500, image: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800", agentId: "a3", status: "available", description: "Prime commercial space ideal for corporate offices.", features: ["Open Plan", "Reception", "Conference Room", "Fiber Internet"] },
  { id: "p6", title: "3-Bedroom Bungalow in GRA", price: 45000000, location: "GRA, Port Harcourt", type: "sale", bedrooms: 3, bathrooms: 3, sqft: 2200, image: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800", agentId: "a3", status: "reserved", description: "Charming bungalow in a quiet neighborhood with ample space.", features: ["Large Compound", "Generator", "Borehole", "Fenced"] },
];

export const announcements: Announcement[] = [
  { id: "an1", authorId: "a1", authorName: "Adebayo Okonkwo", title: "New Luxury Listings in Lekki", content: "We've just added 5 exclusive luxury properties in Lekki Phase 1. Schedule viewings now!", type: "alert", createdAt: "2026-02-14T10:00:00Z" },
  { id: "an2", authorId: "a2", authorName: "Chioma Nwankwo", title: "Abuja Market Update - Q1 2026", content: "Property prices in Maitama and Asokoro have shown a 12% increase. Great time for investment.", type: "update", createdAt: "2026-02-13T14:30:00Z" },
  { id: "an3", authorId: "admin", authorName: "Prop Connect", title: "Enhanced Escrow Protection Now Live", content: "All transactions above ₦10M now include additional escrow verification steps for your protection.", type: "announcement", createdAt: "2026-02-12T09:00:00Z" },
];

export const reviews: Review[] = [
  { id: "r1", buyerName: "Kemi A.", rating: 5, comment: "Adebayo made the entire process seamless. Highly recommend!", date: "2026-02-10", propertyTitle: "Modern 4-Bedroom Duplex" },
  { id: "r2", buyerName: "Tunde O.", rating: 4, comment: "Good service, property was exactly as described.", date: "2026-02-08", propertyTitle: "Executive 3-Bed Apartment" },
  { id: "r3", buyerName: "Ngozi I.", rating: 5, comment: "Very professional and trustworthy. Will use again.", date: "2026-02-05", propertyTitle: "Spacious 5-Bed Villa" },
];

export const mockMessages: Message[] = [
  { id: "m1", senderId: "buyer", text: "Hi, I'm interested in the Lekki duplex. Is it still available?", timestamp: "2026-02-14T10:30:00Z", seen: true },
  { id: "m2", senderId: "a1", text: "Yes! It's still available. Would you like to schedule a viewing?", timestamp: "2026-02-14T10:32:00Z", seen: true },
  { id: "m3", senderId: "buyer", text: "That would be great. Is this weekend possible?", timestamp: "2026-02-14T10:35:00Z", seen: true },
  { id: "m4", senderId: "a1", text: "Saturday at 2pm works. I'll send you the details. The property has a swimming pool and smart home features.", timestamp: "2026-02-14T10:38:00Z", seen: false },
];

export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(price);
};

export const getTrustBadge = (score: number) => {
  if (score >= 80) return { label: "Trusted Agent", color: "trust-high" as const };
  if (score >= 50) return { label: "Verified Agent", color: "trust-medium" as const };
  return { label: "Agent", color: "trust-low" as const };
};

export const platformStats = {
  totalUsers: 12847,
  verifiedAgents: 342,
  completedTransactions: 8921,
  escrowSuccessRate: 99.2,
  totalRevenue: 2450000000,
  activeDisputes: 12,
};
