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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      _prisma_migrations: {
        Row: {
          applied_steps_count: number
          checksum: string
          finished_at: string | null
          id: string
          logs: string | null
          migration_name: string
          rolled_back_at: string | null
          started_at: string
        }
        Insert: {
          applied_steps_count?: number
          checksum: string
          finished_at?: string | null
          id: string
          logs?: string | null
          migration_name: string
          rolled_back_at?: string | null
          started_at?: string
        }
        Update: {
          applied_steps_count?: number
          checksum?: string
          finished_at?: string | null
          id?: string
          logs?: string | null
          migration_name?: string
          rolled_back_at?: string | null
          started_at?: string
        }
        Relationships: []
      }
      application_documents: {
        Row: {
          application_id: string
          checksum_sha256: string | null
          created_at: string
          customer_id: string
          deleted_at: string | null
          document_type_id: string
          file_size: number
          id: string
          mime_type: string
          original_filename: string
          r2_object_key: string
          rejection_reason: string | null
          retention_until: string | null
          reupload_message: string | null
          status: Database["public"]["Enums"]["document_status"]
          updated_at: string
          uploaded_at: string
          uploaded_by: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          application_id: string
          checksum_sha256?: string | null
          created_at?: string
          customer_id: string
          deleted_at?: string | null
          document_type_id: string
          file_size: number
          id?: string
          mime_type: string
          original_filename: string
          r2_object_key: string
          rejection_reason?: string | null
          retention_until?: string | null
          reupload_message?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          application_id?: string
          checksum_sha256?: string | null
          created_at?: string
          customer_id?: string
          deleted_at?: string | null
          document_type_id?: string
          file_size?: number
          id?: string
          mime_type?: string
          original_filename?: string
          r2_object_key?: string
          rejection_reason?: string | null
          retention_until?: string | null
          reupload_message?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_documents_document_type_id_fkey"
            columns: ["document_type_id"]
            isOneToOne: false
            referencedRelation: "document_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_documents_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      application_financials: {
        Row: {
          application_id: string
          created_at: string
          internal_cost_snapshot: number
        }
        Insert: {
          application_id: string
          created_at?: string
          internal_cost_snapshot?: number
        }
        Update: {
          application_id?: string
          created_at?: string
          internal_cost_snapshot?: number
        }
        Relationships: [
          {
            foreignKeyName: "application_financials_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      application_internal_notes: {
        Row: {
          application_id: string
          author_profile_id: string
          created_at: string
          id: string
          note: string
        }
        Insert: {
          application_id: string
          author_profile_id: string
          created_at?: string
          id?: string
          note: string
        }
        Update: {
          application_id?: string
          author_profile_id?: string
          created_at?: string
          id?: string
          note?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_internal_notes_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_internal_notes_author_profile_id_fkey"
            columns: ["author_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      application_messages: {
        Row: {
          application_id: string
          created_at: string
          id: string
          message: string
          read_at: string | null
          sender_profile_id: string
          sender_role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          application_id: string
          created_at?: string
          id?: string
          message: string
          read_at?: string | null
          sender_profile_id: string
          sender_role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          application_id?: string
          created_at?: string
          id?: string
          message?: string
          read_at?: string | null
          sender_profile_id?: string
          sender_role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "application_messages_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_messages_sender_profile_id_fkey"
            columns: ["sender_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      application_status_history: {
        Row: {
          application_id: string
          changed_by: string | null
          created_at: string
          id: string
          new_status: Database["public"]["Enums"]["application_status"]
          note: string | null
          previous_status:
            | Database["public"]["Enums"]["application_status"]
            | null
        }
        Insert: {
          application_id: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status: Database["public"]["Enums"]["application_status"]
          note?: string | null
          previous_status?:
            | Database["public"]["Enums"]["application_status"]
            | null
        }
        Update: {
          application_id?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status?: Database["public"]["Enums"]["application_status"]
          note?: string | null
          previous_status?:
            | Database["public"]["Enums"]["application_status"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "application_status_history_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          answers: Json
          application_number: string | null
          assigned_profile_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          customer_price_snapshot: number
          id: string
          notes: string | null
          retailer_id: string | null
          service_id: string
          status: Database["public"]["Enums"]["application_status"]
          submitted_at: string | null
          total_price_snapshot: number | null
          updated_at: string
        }
        Insert: {
          answers?: Json
          application_number?: string | null
          assigned_profile_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          customer_price_snapshot: number
          id?: string
          notes?: string | null
          retailer_id?: string | null
          service_id: string
          status?: Database["public"]["Enums"]["application_status"]
          submitted_at?: string | null
          total_price_snapshot?: number | null
          updated_at?: string
        }
        Update: {
          answers?: Json
          application_number?: string | null
          assigned_profile_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          customer_price_snapshot?: number
          id?: string
          notes?: string | null
          retailer_id?: string | null
          service_id?: string
          status?: Database["public"]["Enums"]["application_status"]
          submitted_at?: string | null
          total_price_snapshot?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_assigned_profile_id_fkey"
            columns: ["assigned_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_retailer_id_fkey"
            columns: ["retailer_id"]
            isOneToOne: false
            referencedRelation: "retailers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          metadata: Json
          resource_id: string | null
          resource_type: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          resource_id?: string | null
          resource_type: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          resource_id?: string | null
          resource_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      Booking: {
        Row: {
          createdAt: string
          customerName: string
          customerPhone: string
          durationHours: number
          endAt: string
          id: string
          notes: string | null
          startAt: string
          stationId: string
          status: Database["public"]["Enums"]["BookingStatus"]
          totalAmount: number
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          customerName: string
          customerPhone: string
          durationHours: number
          endAt: string
          id: string
          notes?: string | null
          startAt: string
          stationId: string
          status?: Database["public"]["Enums"]["BookingStatus"]
          totalAmount: number
          updatedAt: string
        }
        Update: {
          createdAt?: string
          customerName?: string
          customerPhone?: string
          durationHours?: number
          endAt?: string
          id?: string
          notes?: string | null
          startAt?: string
          stationId?: string
          status?: Database["public"]["Enums"]["BookingStatus"]
          totalAmount?: number
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Booking_stationId_fkey"
            columns: ["stationId"]
            isOneToOne: false
            referencedRelation: "Station"
            referencedColumns: ["id"]
          },
        ]
      }
      CourseEnquiry: {
        Row: {
          courseName: string
          createdAt: string
          id: string
          phone: string
          status: Database["public"]["Enums"]["EnquiryStatus"]
          studentName: string
          updatedAt: string
        }
        Insert: {
          courseName: string
          createdAt?: string
          id: string
          phone: string
          status?: Database["public"]["Enums"]["EnquiryStatus"]
          studentName: string
          updatedAt: string
        }
        Update: {
          courseName?: string
          createdAt?: string
          id?: string
          phone?: string
          status?: Database["public"]["Enums"]["EnquiryStatus"]
          studentName?: string
          updatedAt?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          created_by: string | null
          date_of_birth: string | null
          email: string | null
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          profile_id: string | null
          retailer_id: string | null
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          profile_id?: string | null
          retailer_id?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          profile_id?: string | null
          retailer_id?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_retailer_id_fkey"
            columns: ["retailer_id"]
            isOneToOne: false
            referencedRelation: "retailers"
            referencedColumns: ["id"]
          },
        ]
      }
      document_types: {
        Row: {
          allowed_mime_types: string[]
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          max_file_size_bytes: number
          name: string
          updated_at: string
        }
        Insert: {
          allowed_mime_types?: string[]
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_file_size_bytes?: number
          name: string
          updated_at?: string
        }
        Update: {
          allowed_mime_types?: string[]
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_file_size_bytes?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          profile_id: string
          related_application_id: string | null
          title: string
          type: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          profile_id: string
          related_application_id?: string | null
          title: string
          type: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          profile_id?: string
          related_application_id?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_application_id_fkey"
            columns: ["related_application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Relationships: []
      }
      retailers: {
        Row: {
          address: string | null
          business_name: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          owner_profile_id: string | null
          settings: Json
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          business_name: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          owner_profile_id?: string | null
          settings?: Json
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          business_name?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          owner_profile_id?: string | null
          settings?: Json
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "retailers_owner_profile_id_fkey"
            columns: ["owner_profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      service_costs: {
        Row: {
          internal_cost: number
          service_id: string
          updated_at: string
        }
        Insert: {
          internal_cost?: number
          service_id: string
          updated_at?: string
        }
        Update: {
          internal_cost?: number
          service_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_costs_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: true
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_document_types: {
        Row: {
          condition_key: string | null
          created_at: string
          display_order: number
          document_type_id: string
          id: string
          is_mandatory: boolean
          service_id: string
        }
        Insert: {
          condition_key?: string | null
          created_at?: string
          display_order?: number
          document_type_id: string
          id?: string
          is_mandatory?: boolean
          service_id: string
        }
        Update: {
          condition_key?: string | null
          created_at?: string
          display_order?: number
          document_type_id?: string
          id?: string
          is_mandatory?: boolean
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_document_types_document_type_id_fkey"
            columns: ["document_type_id"]
            isOneToOne: false
            referencedRelation: "document_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_document_types_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_extra_charges: {
        Row: {
          amount: number
          condition_key: string
          created_at: string
          display_order: number
          id: string
          label: string
          service_id: string
        }
        Insert: {
          amount: number
          condition_key: string
          created_at?: string
          display_order?: number
          id?: string
          label: string
          service_id: string
        }
        Update: {
          amount?: number
          condition_key?: string
          created_at?: string
          display_order?: number
          id?: string
          label?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_extra_charges_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          category: string | null
          created_at: string
          customer_price: number
          description: string | null
          id: string
          is_active: boolean
          name: string
          retailer_id: string | null
          slug: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          customer_price: number
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          retailer_id?: string | null
          slug?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          customer_price?: number
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          retailer_id?: string | null
          slug?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_retailer_id_fkey"
            columns: ["retailer_id"]
            isOneToOne: false
            referencedRelation: "retailers"
            referencedColumns: ["id"]
          },
        ]
      }
      SevaRequest: {
        Row: {
          applicantName: string
          createdAt: string
          id: string
          notes: string | null
          phone: string
          serviceType: string
          status: Database["public"]["Enums"]["SevaStatus"]
          updatedAt: string
        }
        Insert: {
          applicantName: string
          createdAt?: string
          id: string
          notes?: string | null
          phone: string
          serviceType: string
          status?: Database["public"]["Enums"]["SevaStatus"]
          updatedAt: string
        }
        Update: {
          applicantName?: string
          createdAt?: string
          id?: string
          notes?: string | null
          phone?: string
          serviceType?: string
          status?: Database["public"]["Enums"]["SevaStatus"]
          updatedAt?: string
        }
        Relationships: []
      }
      Station: {
        Row: {
          createdAt: string
          hourlyRate: number
          id: string
          isActive: boolean
          name: string
          specs: string
          type: Database["public"]["Enums"]["StationType"]
        }
        Insert: {
          createdAt?: string
          hourlyRate: number
          id: string
          isActive?: boolean
          name: string
          specs: string
          type: Database["public"]["Enums"]["StationType"]
        }
        Update: {
          createdAt?: string
          hourlyRate?: number
          id?: string
          isActive?: boolean
          name?: string
          specs?: string
          type?: Database["public"]["Enums"]["StationType"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      change_application_status: {
        Args: {
          p_application_id: string
          p_new_status: Database["public"]["Enums"]["application_status"]
          p_note?: string
        }
        Returns: undefined
      }
      delete_draft_application: {
        Args: { p_application_id: string }
        Returns: string[]
      }
      current_customer_id: { Args: never; Returns: string }
      current_retailer_id: { Args: never; Returns: string }
      current_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      log_audit_event: {
        Args: {
          p_action: string
          p_metadata?: Json
          p_resource_id?: string
          p_resource_type: string
        }
        Returns: undefined
      }
    }
    Enums: {
      account_status: "active" | "inactive" | "suspended"
      app_role: "customer" | "retailer" | "admin"
      application_status:
        | "draft"
        | "submitted"
        | "under_review"
        | "documents_required"
        | "processing"
        | "completed"
        | "rejected"
        | "cancelled"
      BookingStatus:
        | "PENDING"
        | "CONFIRMED"
        | "ACTIVE"
        | "COMPLETED"
        | "CANCELLED"
      document_status:
        | "uploaded"
        | "verified"
        | "rejected"
        | "deleted"
        | "under_review"
        | "approved"
        | "reupload_required"
      EnquiryStatus: "NEW" | "FOLLOW_UP" | "ENROLLED" | "CLOSED"
      SevaStatus: "PENDING" | "IN_PROGRESS" | "VERIFIED" | "COMPLETED"
      StationType: "PC" | "CONSOLE"
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
      account_status: ["active", "inactive", "suspended"],
      app_role: ["customer", "retailer", "admin"],
      application_status: [
        "draft",
        "submitted",
        "under_review",
        "documents_required",
        "processing",
        "completed",
        "rejected",
        "cancelled",
      ],
      BookingStatus: [
        "PENDING",
        "CONFIRMED",
        "ACTIVE",
        "COMPLETED",
        "CANCELLED",
      ],
      document_status: [
        "uploaded",
        "verified",
        "rejected",
        "deleted",
        "under_review",
        "approved",
        "reupload_required",
      ],
      EnquiryStatus: ["NEW", "FOLLOW_UP", "ENROLLED", "CLOSED"],
      SevaStatus: ["PENDING", "IN_PROGRESS", "VERIFIED", "COMPLETED"],
      StationType: ["PC", "CONSOLE"],
    },
  },
} as const
