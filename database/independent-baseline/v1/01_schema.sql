-- Fresh-install schema only. Run through install.psql after explicit approval.

SET LOCAL search_path = public, pg_temp;

CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');

CREATE TYPE public.profile_type AS ENUM ('buyer','agent','builder');

CREATE TYPE public.property_status AS ENUM ('for_sale','for_rent','sold','rented','draft','available','under_verification','payment_pending','transaction_in_progress');

CREATE TYPE public.verification_status AS ENUM ('pending','approved','rejected');

CREATE TYPE public.reservation_status AS ENUM ('pending','confirmed','rejected','cancelled');

CREATE TYPE public.payment_status AS ENUM ('pending_payment','under_review','secured','released','expired','refunded','rejected');

CREATE TABLE public.profiles (
  id uuid DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  full_name text NOT NULL DEFAULT '',
  profile_type profile_type NOT NULL DEFAULT 'buyer',
  phone text,
  avatar_url text,
  bio text,
  location text,
  trust_score integer NOT NULL DEFAULT 0,
  kyc_verified boolean NOT NULL DEFAULT FALSE,
  properties_listed integer NOT NULL DEFAULT 0,
  completed_transactions integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_visible boolean NOT NULL DEFAULT TRUE,
  welcome_seen boolean NOT NULL DEFAULT FALSE,
  phone_verified boolean NOT NULL DEFAULT FALSE,
  phone_verified_at timestamp with time zone,
  referral_code text,
  referred_by uuid,
  referral_level integer,
  referral_position integer,
  last_login_at timestamptz,
  invited_by uuid,
  kyc_trust_awarded boolean NOT NULL DEFAULT false,
  PRIMARY KEY(id),
  UNIQUE(user_id),
  UNIQUE(referral_code),
  CHECK (trust_score BETWEEN 0 AND 100),
  CHECK (referred_by IS NULL OR referred_by <> id),
  CHECK (referral_position IS NULL OR referral_position IN (1,2))
);

CREATE TABLE public.user_roles (
  id uuid DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role app_role NOT NULL,
  PRIMARY KEY(id),
  UNIQUE(user_id,role)
);

CREATE TABLE public.properties (
  id uuid DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  address text,
  city text,
  state text,
  price bigint NOT NULL DEFAULT 0,
  bedrooms integer DEFAULT 0,
  bathrooms integer DEFAULT 0,
  sqft integer DEFAULT 0,
  property_type text NOT NULL DEFAULT 'house',
  status property_status NOT NULL DEFAULT 'draft',
  image_url text,
  images text[] DEFAULT '{}',
  is_verified boolean NOT NULL DEFAULT FALSE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  latitude double precision,
  longitude double precision,
  zip_code text,
  amenities text[] DEFAULT '{}',
  videos text[] DEFAULT CAST('{}' AS text[]),
  property_code text,
  listing_type text CHECK(listing_type IN ('sale','rental')),
  PRIMARY KEY(id),
  UNIQUE(property_code),
  CHECK (price >= 0)
);

CREATE TABLE public.chat_threads (
  id uuid DEFAULT gen_random_uuid(),
  property_id uuid,
  buyer_id uuid NOT NULL,
  agent_id uuid NOT NULL,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'restricted',
  PRIMARY KEY(id),
  CHECK (buyer_id <> agent_id),
  CHECK (status IN ('restricted','active'))
);

CREATE TABLE public.messages (
  id uuid DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  seen boolean NOT NULL DEFAULT FALSE,
  created_at timestamptz NOT NULL DEFAULT now(),
  is_blocked boolean NOT NULL DEFAULT FALSE,
  attachment_path text,
  PRIMARY KEY(id)
);

CREATE TABLE public.reservations (
  id uuid DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL,
  property_id uuid NOT NULL,
  status reservation_status NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  agent_id uuid,
  buyer_name text,
  buyer_phone text,
  buyer_email text,
  message text,
  viewing_date date,
  inspection_status text NOT NULL DEFAULT 'requested',
  inspection_time text,
  proposed_date date,
  proposed_time text,
  agent_note text,
  PRIMARY KEY(id),
  CHECK (inspection_status IN ('requested','confirmed','declined','cancelled','reschedule_proposed','completed','no_show'))
);

CREATE TABLE public.ratings (
  id uuid DEFAULT gen_random_uuid(),
  reviewer_id uuid NOT NULL,
  agent_id uuid NOT NULL,
  property_id uuid,
  rating integer NOT NULL,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(id),
  CHECK (rating BETWEEN 1 AND 5)
);

CREATE TABLE public.verification_documents (
  id uuid DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  document_type text NOT NULL,
  file_url text NOT NULL,
  status verification_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(id)
);

CREATE TABLE public.announcements (
  id uuid DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  author_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  type text NOT NULL DEFAULT 'update',
  PRIMARY KEY(id)
);

CREATE TABLE public.disputes (
  id uuid DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  reported_id uuid NOT NULL,
  property_id uuid,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  transaction_id uuid,
  resolution text,
  resolved_by uuid,
  resolved_at timestamptz,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY(id)
);

CREATE TABLE public.audit_logs (
  id uuid DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(id)
);

CREATE TABLE public.wallets (
  id uuid DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  balance bigint NOT NULL DEFAULT 0,
  escrow_balance bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(id),
  withdrawal_reserved bigint NOT NULL DEFAULT 0 CHECK (withdrawal_reserved >= 0),
  UNIQUE(user_id),
  CHECK (balance >= 0 AND escrow_balance >= 0)
);

CREATE TABLE public.transactions (
  id uuid DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  property_id uuid,
  amount bigint NOT NULL DEFAULT 0,
  commission bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending_payment',
  type text NOT NULL ,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  property_code text,
  commission_amount bigint NOT NULL DEFAULT 0,
  total_payable bigint NOT NULL DEFAULT 0,
  payment_status public.payment_status NOT NULL DEFAULT 'pending_payment',
  proof_url text,
  proof_uploaded_at timestamptz,
  expires_at timestamptz,
  released_at timestamptz,
  rejection_reason text,
  receipt_reference text,
  PRIMARY KEY(id),
  CHECK (buyer_id <> seller_id),
  CHECK (amount > 0 AND total_payable = amount),
  CHECK (commission_amount BETWEEN 0 AND amount AND commission = commission_amount),
  CHECK (status = payment_status::text),
  CHECK (type IN ('sale','rental'))
);

CREATE TABLE public.support_tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name text,
  email text,
  PRIMARY KEY(id)
);

CREATE TABLE public.user_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  push_enabled boolean NOT NULL DEFAULT TRUE,
  email_notifications_enabled boolean NOT NULL DEFAULT TRUE,
  two_factor_enabled boolean NOT NULL DEFAULT FALSE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY(id),
  UNIQUE(user_id)
);

CREATE TABLE public.verification_steps (
  id uuid DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  step_name text NOT NULL,
  status text NOT NULL DEFAULT 'not_started',
  document_url text,
  rejection_reason text,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY(id),
  UNIQUE(user_id,step_name)
);

CREATE TABLE public.notifications (
  id uuid DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  is_read boolean NOT NULL DEFAULT FALSE,
  link text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY(id)
);

CREATE TABLE public.phone_otp_challenges (
  id uuid DEFAULT gen_random_uuid(),
  user_id uuid,
  phone text NOT NULL,
  purpose text NOT NULL DEFAULT 'verify_phone',
  otp_hash text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,
  last_sent_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY(id)
);

CREATE TABLE public.kyc_verifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  government_id_url text,
  government_id_type text,
  selfie_url text,
  nin_or_bvn text,
  nin_bvn_type text,
  proof_of_address_url text,
  bank_name text,
  account_number text,
  residential_address text,
  phone_verified boolean DEFAULT FALSE,
  kyc_status text NOT NULL DEFAULT 'pending',
  rejection_reason text,
  submitted_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_at timestamp with time zone,
  reviewed_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY(id),
  UNIQUE(user_id),
  CHECK (kyc_status IN ('pending','verified','rejected'))
);

CREATE TABLE public.earnings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount bigint NOT NULL DEFAULT 0,
  type text NOT NULL,
  description text,
  transaction_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  from_user_id uuid,
  level integer,
  source text DEFAULT 'subscription',
  PRIMARY KEY(id),
  subscription_id uuid,
  event_key text NOT NULL UNIQUE,
  CHECK (amount >= 0),
  CHECK (type IN ('referral','rent_reward','sale_reward','direct_referral','matrix','company_fee','bonus','adjustment','sale_payout','verification_referral_bonus')),
  CHECK (num_nonnulls(transaction_id,subscription_id) <= 1)
);

CREATE TABLE public.subscription_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  screenshot_url text NOT NULL,
  note text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  payment_reference text,
  review_note text,
  PRIMARY KEY(id)
);

CREATE TABLE public.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'expired',
  start_date timestamptz NOT NULL DEFAULT now(),
  end_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(id),
  activation_version integer NOT NULL DEFAULT 0 CHECK (activation_version >= 0),
  distribution_version integer NOT NULL DEFAULT 0 CHECK (distribution_version >= 0),
  activation_request_id uuid UNIQUE,
  paid_amount bigint CHECK (paid_amount > 0),
  UNIQUE(user_id),
  CHECK (end_date >= start_date),
  CHECK (status IN ('active','expired','cancelled'))
);

CREATE TABLE public.withdrawals (
  id uuid DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount bigint NOT NULL,
  bank_name text NOT NULL,
  account_number text NOT NULL,
  account_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  payment_reference text,
  PRIMARY KEY(id),
  CHECK (amount >= 5000),
  CHECK (status IN ('pending','paid','rejected'))
);

CREATE TABLE public.company_wallet (
  id uuid DEFAULT gen_random_uuid(),
  balance bigint NOT NULL DEFAULT 0,
  total_earned bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(id),
  singleton boolean NOT NULL DEFAULT true UNIQUE CHECK (singleton),
  CHECK (balance >= 0 AND total_earned >= 0)
);

CREATE TABLE public.escrow_holds (
  id uuid DEFAULT gen_random_uuid(),
  intended_user_id uuid NOT NULL,
  from_user_id uuid NOT NULL,
  subscription_id uuid,
  level integer NOT NULL,
  amount bigint NOT NULL,
  status text NOT NULL DEFAULT 'held',
  hold_until timestamptz NOT NULL DEFAULT now() + CAST('30 days' AS interval),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  PRIMARY KEY(id),
  event_key text NOT NULL UNIQUE,
  CHECK (amount > 0),
  CHECK (status IN ('held','released','forfeited'))
);

CREATE TABLE public.property_documents (
  id uuid DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  agent_id uuid NOT NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  document_type text NOT NULL DEFAULT 'other',
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(id)
);

CREATE TABLE public.commission_settings (
  id uuid DEFAULT gen_random_uuid(),
  sales_percent numeric(5, 2) NOT NULL DEFAULT 1.00,
  rental_percent numeric(5, 2) NOT NULL DEFAULT 5.00,
  reservation_flat bigint NOT NULL DEFAULT 5000,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  PRIMARY KEY(id),
  singleton boolean NOT NULL DEFAULT true UNIQUE CHECK (singleton)
);

CREATE TABLE public.platform_settings (
  id uuid DEFAULT gen_random_uuid(),
  company_account_name text,
  company_account_number text,
  company_bank_name text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  PRIMARY KEY(id),
  singleton boolean NOT NULL DEFAULT true UNIQUE CHECK (singleton),
  money_rules_approved boolean NOT NULL DEFAULT false,
  referral_rules_approved boolean NOT NULL DEFAULT false,
  monetary_unit text CHECK (monetary_unit IN ('NGN_MAJOR','NGN_MINOR')),
  subscription_amount bigint CHECK (subscription_amount > 0),
  referral_policy text,
  verification_bonus_policy text
);

CREATE TABLE public.deal_requests (
  id uuid DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL,
  agent_user_id uuid NOT NULL,
  agent_profile_id uuid NOT NULL,
  property_id uuid NOT NULL,
  property_code text,
  buyer_message text,
  decline_reason text,
  status text NOT NULL DEFAULT 'pending',
  transaction_id uuid,
  accepted_at timestamptz,
  declined_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deal_number text,
  stage text NOT NULL DEFAULT 'pending_agent',
  PRIMARY KEY(id),
  UNIQUE(deal_number),
  CHECK (status IN ('pending','accepted','declined','cancelled'))
);

CREATE TABLE public.deal_events (
  id uuid DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL,
  actor_id uuid,
  event text NOT NULL,
  details text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(id)
);

CREATE SEQUENCE public.deal_number_seq;

CREATE SEQUENCE public.property_number_seq;
