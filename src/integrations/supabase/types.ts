export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          title: string
          type: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          title: string
          type?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      chat_threads: {
        Row: {
          agent_id: string
          buyer_id: string
          created_at: string
          id: string
          last_message_at: string | null
          property_id: string | null
          status: string
        }
        Insert: {
          agent_id: string
          buyer_id: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          property_id?: string | null
          status?: string
        }
        Update: {
          agent_id?: string
          buyer_id?: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          property_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_threads_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_threads_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_threads_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_threads_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_threads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      company_wallet: {
        Row: {
          balance: number
          id: string
          total_earned: number
          updated_at: string
        }
        Insert: {
          balance?: number
          id?: string
          total_earned?: number
          updated_at?: string
        }
        Update: {
          balance?: number
          id?: string
          total_earned?: number
          updated_at?: string
        }
        Relationships: []
      }
      disputes: {
        Row: {
          created_at: string
          id: string
          property_id: string | null
          reason: string
          reported_id: string
          reporter_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          property_id?: string | null
          reason: string
          reported_id: string
          reporter_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          property_id?: string | null
          reason?: string
          reported_id?: string
          reporter_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_reported_id_fkey"
            columns: ["reported_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_reported_id_fkey"
            columns: ["reported_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      earnings: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          from_user_id: string | null
          id: string
          level: number | null
          source: string | null
          transaction_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          description?: string | null
          from_user_id?: string | null
          id?: string
          level?: number | null
          source?: string | null
          transaction_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          from_user_id?: string | null
          id?: string
          level?: number | null
          source?: string | null
          transaction_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      escrow_holds: {
        Row: {
          amount: number
          created_at: string
          from_user_id: string
          hold_until: string
          id: string
          intended_user_id: string
          level: number
          resolved_at: string | null
          status: string
          subscription_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          from_user_id: string
          hold_until?: string
          id?: string
          intended_user_id: string
          level: number
          resolved_at?: string | null
          status?: string
          subscription_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          from_user_id?: string
          hold_until?: string
          id?: string
          intended_user_id?: string
          level?: number
          resolved_at?: string | null
          status?: string
          subscription_id?: string | null
        }
        Relationships: []
      }
      kyc_verifications: {
        Row: {
          account_number: string | null
          bank_name: string | null
          created_at: string
          government_id_type: string | null
          government_id_url: string | null
          id: string
          kyc_status: string
          nin_bvn_type: string | null
          nin_or_bvn: string | null
          phone_verified: boolean | null
          proof_of_address_url: string | null
          rejection_reason: string | null
          residential_address: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          selfie_url: string | null
          submitted_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_number?: string | null
          bank_name?: string | null
          created_at?: string
          government_id_type?: string | null
          government_id_url?: string | null
          id?: string
          kyc_status?: string
          nin_bvn_type?: string | null
          nin_or_bvn?: string | null
          phone_verified?: boolean | null
          proof_of_address_url?: string | null
          rejection_reason?: string | null
          residential_address?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string | null
          submitted_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_number?: string | null
          bank_name?: string | null
          created_at?: string
          government_id_type?: string | null
          government_id_url?: string | null
          id?: string
          kyc_status?: string
          nin_bvn_type?: string | null
          nin_or_bvn?: string | null
          phone_verified?: boolean | null
          proof_of_address_url?: string | null
          rejection_reason?: string | null
          residential_address?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string | null
          submitted_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_blocked: boolean
          seen: boolean
          sender_id: string
          thread_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_blocked?: boolean
          seen?: boolean
          sender_id: string
          thread_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_blocked?: boolean
          seen?: boolean
          sender_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      phone_otp_challenges: {
        Row: {
          attempts: number
          created_at: string
          expires_at: string
          id: string
          last_sent_at: string
          max_attempts: number
          otp_hash: string
          phone: string
          purpose: string
          user_id: string | null
        }
        Insert: {
          attempts?: number
          created_at?: string
          expires_at: string
          id?: string
          last_sent_at?: string
          max_attempts?: number
          otp_hash: string
          phone: string
          purpose?: string
          user_id?: string | null
        }
        Update: {
          attempts?: number
          created_at?: string
          expires_at?: string
          id?: string
          last_sent_at?: string
          max_attempts?: number
          otp_hash?: string
          phone?: string
          purpose?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          completed_transactions: number
          created_at: string
          full_name: string
          id: string
          is_visible: boolean
          kyc_verified: boolean
          last_login_at: string | null
          location: string | null
          phone: string | null
          phone_verified: boolean
          phone_verified_at: string | null
          profile_type: Database["public"]["Enums"]["profile_type"]
          properties_listed: number
          referral_code: string | null
          referral_level: number | null
          referral_position: number | null
          referred_by: string | null
          trust_score: number
          updated_at: string
          user_id: string
          welcome_seen: boolean
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          completed_transactions?: number
          created_at?: string
          full_name?: string
          id?: string
          is_visible?: boolean
          kyc_verified?: boolean
          last_login_at?: string | null
          location?: string | null
          phone?: string | null
          phone_verified?: boolean
          phone_verified_at?: string | null
          profile_type?: Database["public"]["Enums"]["profile_type"]
          properties_listed?: number
          referral_code?: string | null
          referral_level?: number | null
          referral_position?: number | null
          referred_by?: string | null
          trust_score?: number
          updated_at?: string
          user_id: string
          welcome_seen?: boolean
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          completed_transactions?: number
          created_at?: string
          full_name?: string
          id?: string
          is_visible?: boolean
          kyc_verified?: boolean
          last_login_at?: string | null
          location?: string | null
          phone?: string | null
          phone_verified?: boolean
          phone_verified_at?: string | null
          profile_type?: Database["public"]["Enums"]["profile_type"]
          properties_listed?: number
          referral_code?: string | null
          referral_level?: number | null
          referral_position?: number | null
          referred_by?: string | null
          trust_score?: number
          updated_at?: string
          user_id?: string
          welcome_seen?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address: string | null
          agent_id: string
          amenities: string[] | null
          bathrooms: number | null
          bedrooms: number | null
          city: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          images: string[] | null
          is_verified: boolean
          latitude: number | null
          longitude: number | null
          price: number
          property_type: string
          sqft: number | null
          state: string | null
          status: Database["public"]["Enums"]["property_status"]
          title: string
          updated_at: string
          videos: string[] | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          agent_id: string
          amenities?: string[] | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          images?: string[] | null
          is_verified?: boolean
          latitude?: number | null
          longitude?: number | null
          price?: number
          property_type?: string
          sqft?: number | null
          state?: string | null
          status?: Database["public"]["Enums"]["property_status"]
          title: string
          updated_at?: string
          videos?: string[] | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          agent_id?: string
          amenities?: string[] | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          images?: string[] | null
          is_verified?: boolean
          latitude?: number | null
          longitude?: number | null
          price?: number
          property_type?: string
          sqft?: number | null
          state?: string | null
          status?: Database["public"]["Enums"]["property_status"]
          title?: string
          updated_at?: string
          videos?: string[] | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      property_documents: {
        Row: {
          agent_id: string
          document_type: string
          file_name: string
          file_size: number
          file_url: string
          id: string
          property_id: string
          uploaded_at: string
        }
        Insert: {
          agent_id: string
          document_type?: string
          file_name: string
          file_size?: number
          file_url: string
          id?: string
          property_id: string
          uploaded_at?: string
        }
        Update: {
          agent_id?: string
          document_type?: string
          file_name?: string
          file_size?: number
          file_url?: string
          id?: string
          property_id?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      ratings: {
        Row: {
          agent_id: string
          comment: string | null
          created_at: string
          id: string
          property_id: string | null
          rating: number
          reviewer_id: string
        }
        Insert: {
          agent_id: string
          comment?: string | null
          created_at?: string
          id?: string
          property_id?: string | null
          rating: number
          reviewer_id: string
        }
        Update: {
          agent_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          property_id?: string | null
          rating?: number
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          agent_id: string | null
          buyer_email: string | null
          buyer_id: string
          buyer_name: string | null
          buyer_phone: string | null
          created_at: string
          id: string
          message: string | null
          notes: string | null
          property_id: string
          status: Database["public"]["Enums"]["reservation_status"]
          updated_at: string
          viewing_date: string | null
        }
        Insert: {
          agent_id?: string | null
          buyer_email?: string | null
          buyer_id: string
          buyer_name?: string | null
          buyer_phone?: string | null
          created_at?: string
          id?: string
          message?: string | null
          notes?: string | null
          property_id: string
          status?: Database["public"]["Enums"]["reservation_status"]
          updated_at?: string
          viewing_date?: string | null
        }
        Update: {
          agent_id?: string | null
          buyer_email?: string | null
          buyer_id?: string
          buyer_name?: string | null
          buyer_phone?: string | null
          created_at?: string
          id?: string
          message?: string | null
          notes?: string | null
          property_id?: string
          status?: Database["public"]["Enums"]["reservation_status"]
          updated_at?: string
          viewing_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_requests: {
        Row: {
          created_at: string
          id: string
          note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          screenshot_url: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          screenshot_url: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          screenshot_url?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          end_date: string
          id: string
          start_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date?: string
          id?: string
          start_date?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          created_at: string
          email: string | null
          id: string
          message: string
          name: string | null
          status: string
          subject: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          message: string
          name?: string | null
          status?: string
          subject: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          message?: string
          name?: string | null
          status?: string
          subject?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          buyer_id: string
          commission: number
          created_at: string
          id: string
          notes: string | null
          property_id: string | null
          seller_id: string
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          amount?: number
          buyer_id: string
          commission?: number
          created_at?: string
          id?: string
          notes?: string | null
          property_id?: string | null
          seller_id: string
          status?: string
          type?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          buyer_id?: string
          commission?: number
          created_at?: string
          id?: string
          notes?: string | null
          property_id?: string | null
          seller_id?: string
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string
          email_notifications_enabled: boolean
          id: string
          push_enabled: boolean
          two_factor_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_notifications_enabled?: boolean
          id?: string
          push_enabled?: boolean
          two_factor_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_notifications_enabled?: boolean
          id?: string
          push_enabled?: boolean
          two_factor_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      verification_documents: {
        Row: {
          created_at: string
          document_type: string
          file_url: string
          id: string
          reviewed_by: string | null
          status: Database["public"]["Enums"]["verification_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          document_type: string
          file_url: string
          id?: string
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          document_type?: string
          file_url?: string
          id?: string
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_documents_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_documents_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_steps: {
        Row: {
          created_at: string
          document_url: string | null
          id: string
          metadata: Json | null
          rejection_reason: string | null
          status: string
          step_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_url?: string | null
          id?: string
          metadata?: Json | null
          rejection_reason?: string | null
          status?: string
          step_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_url?: string | null
          id?: string
          metadata?: Json | null
          rejection_reason?: string | null
          status?: string
          step_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          escrow_balance: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          escrow_balance?: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          escrow_balance?: number
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          account_name: string
          account_number: string
          admin_note: string | null
          amount: number
          bank_name: string
          created_at: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_name: string
          account_number: string
          admin_note?: string | null
          amount: number
          bank_name: string
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_name?: string
          account_number?: string
          admin_note?: string | null
          amount?: number
          bank_name?: string
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          completed_transactions: number | null
          created_at: string | null
          full_name: string | null
          id: string | null
          is_visible: boolean | null
          kyc_verified: boolean | null
          location: string | null
          profile_type: Database["public"]["Enums"]["profile_type"] | null
          properties_listed: number | null
          referral_code: string | null
          referred_by: string | null
          trust_score: number | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          completed_transactions?: number | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          is_visible?: boolean | null
          kyc_verified?: boolean | null
          location?: string | null
          profile_type?: Database["public"]["Enums"]["profile_type"] | null
          properties_listed?: number | null
          referral_code?: string | null
          referred_by?: string | null
          trust_score?: number | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          completed_transactions?: number | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          is_visible?: boolean | null
          kyc_verified?: boolean | null
          location?: string | null
          profile_type?: Database["public"]["Enums"]["profile_type"] | null
          properties_listed?: number | null
          referral_code?: string | null
          referred_by?: string | null
          trust_score?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      distribute_subscription_payment: {
        Args: { _subscription_id: string }
        Returns: undefined
      }
      generate_referral_code: { Args: never; Returns: string }
      get_my_profile_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      pay_verification_referral_bonus: {
        Args: { _referred_user_id: string }
        Returns: undefined
      }
      place_in_matrix: {
        Args: { _referrer_profile_id: string }
        Returns: {
          lvl: number
          parent_id: string
          pos: number
        }[]
      }
      touch_last_login: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      profile_type: "buyer" | "agent" | "builder"
      property_status:
        | "for_sale"
        | "for_rent"
        | "sold"
        | "rented"
        | "draft"
        | "available"
        | "under_verification"
      reservation_status: "pending" | "confirmed" | "rejected" | "cancelled"
      verification_status: "pending" | "approved" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      profile_type: ["buyer", "agent", "builder"],
      property_status: [
        "for_sale",
        "for_rent",
        "sold",
        "rented",
        "draft",
        "available",
        "under_verification",
      ],
      reservation_status: ["pending", "confirmed", "rejected", "cancelled"],
      verification_status: ["pending", "approved", "rejected"],
    },
  },
} as const
