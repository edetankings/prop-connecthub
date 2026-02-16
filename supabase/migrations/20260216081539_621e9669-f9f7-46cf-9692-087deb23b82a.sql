
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TYPE public.profile_type AS ENUM ('buyer', 'agent', 'builder');
CREATE TYPE public.property_status AS ENUM ('for_sale', 'for_rent', 'sold', 'rented', 'draft');
CREATE TYPE public.verification_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.reservation_status AS ENUM ('pending', 'confirmed', 'rejected', 'cancelled');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  profile_type profile_type NOT NULL DEFAULT 'buyer',
  phone TEXT,
  avatar_url TEXT,
  bio TEXT,
  location TEXT,
  trust_score INTEGER NOT NULL DEFAULT 0 CHECK (trust_score >= 0 AND trust_score <= 100),
  kyc_verified BOOLEAN NOT NULL DEFAULT FALSE,
  properties_listed INTEGER NOT NULL DEFAULT 0,
  completed_transactions INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- Properties table
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  price BIGINT NOT NULL DEFAULT 0,
  bedrooms INTEGER DEFAULT 0,
  bathrooms INTEGER DEFAULT 0,
  sqft INTEGER DEFAULT 0,
  property_type TEXT NOT NULL DEFAULT 'house',
  status property_status NOT NULL DEFAULT 'for_sale',
  image_url TEXT,
  images TEXT[] DEFAULT '{}',
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Chat threads
CREATE TABLE public.chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  buyer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  agent_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Chat messages
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES public.chat_threads(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  seen BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reservations
CREATE TABLE public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  status reservation_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ratings
CREATE TABLE public.ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  agent_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Verification documents
CREATE TABLE public.verification_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  document_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  status verification_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Announcements
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Disputes
CREATE TABLE public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  reported_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit logs
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========== HELPER FUNCTIONS ==========

-- has_role function (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Get profile id for current user
CREATE OR REPLACE FUNCTION public.get_my_profile_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, profile_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'profile_type')::profile_type, 'buyer')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON public.reservations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ========== ENABLE RLS ==========
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ========== RLS POLICIES ==========

-- Profiles: anyone can read, users update own
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- User roles: only admins can manage
CREATE POLICY "Admins can view roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') AND user_id != auth.uid());
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Properties: public read, agent CRUD own
CREATE POLICY "Properties are viewable by everyone" ON public.properties FOR SELECT USING (status != 'draft' OR agent_id = public.get_my_profile_id());
CREATE POLICY "Agents can create properties" ON public.properties FOR INSERT TO authenticated WITH CHECK (agent_id = public.get_my_profile_id());
CREATE POLICY "Agents can update own properties" ON public.properties FOR UPDATE TO authenticated USING (agent_id = public.get_my_profile_id());
CREATE POLICY "Agents can delete own properties" ON public.properties FOR DELETE TO authenticated USING (agent_id = public.get_my_profile_id());
CREATE POLICY "Admins can manage all properties" ON public.properties FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Chat threads
CREATE POLICY "Users can view own threads" ON public.chat_threads FOR SELECT TO authenticated USING (buyer_id = public.get_my_profile_id() OR agent_id = public.get_my_profile_id());
CREATE POLICY "Users can create threads" ON public.chat_threads FOR INSERT TO authenticated WITH CHECK (buyer_id = public.get_my_profile_id());

-- Messages
CREATE POLICY "Users can view messages in their threads" ON public.messages FOR SELECT TO authenticated USING (thread_id IN (SELECT id FROM public.chat_threads WHERE buyer_id = public.get_my_profile_id() OR agent_id = public.get_my_profile_id()));
CREATE POLICY "Users can send messages in their threads" ON public.messages FOR INSERT TO authenticated WITH CHECK (sender_id = public.get_my_profile_id() AND thread_id IN (SELECT id FROM public.chat_threads WHERE buyer_id = public.get_my_profile_id() OR agent_id = public.get_my_profile_id()));
CREATE POLICY "Users can update own messages" ON public.messages FOR UPDATE TO authenticated USING (thread_id IN (SELECT id FROM public.chat_threads WHERE buyer_id = public.get_my_profile_id() OR agent_id = public.get_my_profile_id()));

-- Reservations
CREATE POLICY "Users can view own reservations" ON public.reservations FOR SELECT TO authenticated USING (buyer_id = public.get_my_profile_id() OR property_id IN (SELECT id FROM public.properties WHERE agent_id = public.get_my_profile_id()));
CREATE POLICY "Buyers can create reservations" ON public.reservations FOR INSERT TO authenticated WITH CHECK (buyer_id = public.get_my_profile_id());
CREATE POLICY "Users can update own reservations" ON public.reservations FOR UPDATE TO authenticated USING (buyer_id = public.get_my_profile_id() OR property_id IN (SELECT id FROM public.properties WHERE agent_id = public.get_my_profile_id()));

-- Ratings
CREATE POLICY "Ratings are viewable by everyone" ON public.ratings FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create ratings" ON public.ratings FOR INSERT TO authenticated WITH CHECK (reviewer_id = public.get_my_profile_id());

-- Verification documents
CREATE POLICY "Users can view own documents" ON public.verification_documents FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can upload documents" ON public.verification_documents FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can update documents" ON public.verification_documents FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Announcements: public read, admin/agent write
CREATE POLICY "Announcements are viewable by everyone" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "Admins can manage announcements" ON public.announcements FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Agents can create announcements" ON public.announcements FOR INSERT TO authenticated WITH CHECK (author_id = public.get_my_profile_id());

-- Disputes
CREATE POLICY "Users can view own disputes" ON public.disputes FOR SELECT TO authenticated USING (reporter_id = public.get_my_profile_id() OR reported_id = public.get_my_profile_id() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can create disputes" ON public.disputes FOR INSERT TO authenticated WITH CHECK (reporter_id = public.get_my_profile_id());
CREATE POLICY "Admins can update disputes" ON public.disputes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Audit logs: admin only
CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
