export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      activity_feed: {
        Row: {
          action: string;
          created_at: string | null;
          id: string;
          metadata: Json | null;
          target_id: string | null;
          target_type: string | null;
          user_id: string;
        };
        Insert: {
          action: string;
          created_at?: string | null;
          id?: string;
          metadata?: Json | null;
          target_id?: string | null;
          target_type?: string | null;
          user_id: string;
        };
        Update: {
          action?: string;
          created_at?: string | null;
          id?: string;
          metadata?: Json | null;
          target_id?: string | null;
          target_type?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activity_feed_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          action: string;
          created_at: string | null;
          details: Json | null;
          id: string;
          ip_address: string | null;
          resource_id: string | null;
          resource_type: string;
          user_agent: string | null;
          user_id: string | null;
        };
        Insert: {
          action: string;
          created_at?: string | null;
          details?: Json | null;
          id?: string;
          ip_address?: string | null;
          resource_id?: string | null;
          resource_type: string;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Update: {
          action?: string;
          created_at?: string | null;
          details?: Json | null;
          id?: string;
          ip_address?: string | null;
          resource_id?: string | null;
          resource_type?: string;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      breakdown_categories: {
        Row: {
          color: string;
          created_at: string;
          id: string;
          key: string;
          label: string;
          position: number;
          project_id: string;
          unit_cost: number;
        };
        Insert: {
          color: string;
          created_at?: string;
          id?: string;
          key: string;
          label: string;
          position?: number;
          project_id: string;
          unit_cost?: number;
        };
        Update: {
          color?: string;
          created_at?: string;
          id?: string;
          key?: string;
          label?: string;
          position?: number;
          project_id?: string;
          unit_cost?: number;
        };
        Relationships: [
          {
            foreignKeyName: "breakdown_categories_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      breakdown_dismissals: {
        Row: {
          created_at: string;
          created_by: string | null;
          name_key: string;
          project_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          name_key: string;
          project_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          name_key?: string;
          project_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "breakdown_dismissals_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "breakdown_dismissals_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      breakdown_elements: {
        Row: {
          assigned_to: string | null;
          category_id: string;
          cost: number | null;
          created_at: string;
          created_by: string | null;
          id: string;
          name: string;
          notes: string | null;
          project_id: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          assigned_to?: string | null;
          category_id: string;
          cost?: number | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name: string;
          notes?: string | null;
          project_id: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          assigned_to?: string | null;
          category_id?: string;
          cost?: number | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name?: string;
          notes?: string | null;
          project_id?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "breakdown_elements_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "breakdown_elements_category_fkey";
            columns: ["category_id", "project_id"];
            isOneToOne: false;
            referencedRelation: "breakdown_categories";
            referencedColumns: ["id", "project_id"];
          },
          {
            foreignKeyName: "breakdown_elements_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "breakdown_elements_project_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      brief_questions: {
        Row: {
          ask_when: NonNullable<Json>;
          created_at: string;
          hint: string;
          key: string;
          kind: string;
          label: string;
          max_value: number | null;
          min_value: number | null;
          options: NonNullable<Json>;
          phase: string;
          position: number;
          unit: string | null;
        };
        Insert: {
          ask_when?: NonNullable<Json>;
          created_at?: string;
          hint?: string;
          key: string;
          kind: string;
          label: string;
          max_value?: number | null;
          min_value?: number | null;
          options?: NonNullable<Json>;
          phase: string;
          position?: number;
          unit?: string | null;
        };
        Update: {
          ask_when?: NonNullable<Json>;
          created_at?: string;
          hint?: string;
          key?: string;
          kind?: string;
          label?: string;
          max_value?: number | null;
          min_value?: number | null;
          options?: NonNullable<Json>;
          phase?: string;
          position?: number;
          unit?: string | null;
        };
        Relationships: [];
      };
      budget_items: {
        Row: {
          actual_cost: number | null;
          amount: number;
          category: string;
          created_at: string | null;
          created_by: string | null;
          description: string | null;
          id: string;
          job_id: string | null;
          project_id: string;
          updated_at: string | null;
        };
        Insert: {
          actual_cost?: number | null;
          amount?: number;
          category: string;
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          job_id?: string | null;
          project_id: string;
          updated_at?: string | null;
        };
        Update: {
          actual_cost?: number | null;
          amount?: number;
          category?: string;
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          job_id?: string | null;
          project_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "budget_items_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "budget_items_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "budget_items_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      call_sheet_acks: {
        Row: {
          acked_at: string;
          call_sheet_id: string;
          project_id: string;
          user_id: string;
          version: number;
        };
        Insert: {
          acked_at?: string;
          call_sheet_id: string;
          project_id: string;
          user_id: string;
          version: number;
        };
        Update: {
          acked_at?: string;
          call_sheet_id?: string;
          project_id?: string;
          user_id?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "call_sheet_acks_sheet_fkey";
            columns: ["call_sheet_id", "project_id"];
            isOneToOne: false;
            referencedRelation: "call_sheets";
            referencedColumns: ["id", "project_id"];
          },
          {
            foreignKeyName: "call_sheet_acks_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      call_sheet_calls: {
        Row: {
          call_sheet_id: string;
          call_time: string | null;
          character_name: string | null;
          created_at: string | null;
          crew_user_id: string | null;
          id: string;
          project_id: string;
          remarks: string | null;
          role_label: string | null;
        };
        Insert: {
          call_sheet_id: string;
          call_time?: string | null;
          character_name?: string | null;
          created_at?: string | null;
          crew_user_id?: string | null;
          id?: string;
          project_id: string;
          remarks?: string | null;
          role_label?: string | null;
        };
        Update: {
          call_sheet_id?: string;
          call_time?: string | null;
          character_name?: string | null;
          created_at?: string | null;
          crew_user_id?: string | null;
          id?: string;
          project_id?: string;
          remarks?: string | null;
          role_label?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "call_sheet_calls_crew_user_id_fkey";
            columns: ["crew_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "call_sheet_calls_sheet_fkey";
            columns: ["call_sheet_id", "project_id"];
            isOneToOne: false;
            referencedRelation: "call_sheets";
            referencedColumns: ["id", "project_id"];
          },
        ];
      };
      call_sheets: {
        Row: {
          created_at: string | null;
          estimated_wrap: string | null;
          general_call: string | null;
          id: string;
          issued: Json | null;
          issued_at: string | null;
          issued_by: string | null;
          location_address: string | null;
          notes: string | null;
          project_id: string;
          reminded_at: string | null;
          shoot_date: string | null;
          shoot_day: number;
          shooting_call: string | null;
          updated_at: string | null;
          updated_by: string | null;
          version: number;
          weather: string | null;
        };
        Insert: {
          created_at?: string | null;
          estimated_wrap?: string | null;
          general_call?: string | null;
          id?: string;
          issued?: Json | null;
          issued_at?: string | null;
          issued_by?: string | null;
          location_address?: string | null;
          notes?: string | null;
          project_id: string;
          reminded_at?: string | null;
          shoot_date?: string | null;
          shoot_day: number;
          shooting_call?: string | null;
          updated_at?: string | null;
          updated_by?: string | null;
          version?: number;
          weather?: string | null;
        };
        Update: {
          created_at?: string | null;
          estimated_wrap?: string | null;
          general_call?: string | null;
          id?: string;
          issued?: Json | null;
          issued_at?: string | null;
          issued_by?: string | null;
          location_address?: string | null;
          notes?: string | null;
          project_id?: string;
          reminded_at?: string | null;
          shoot_date?: string | null;
          shoot_day?: number;
          shooting_call?: string | null;
          updated_at?: string | null;
          updated_by?: string | null;
          version?: number;
          weather?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "call_sheets_issued_by_fkey";
            columns: ["issued_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "call_sheets_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "call_sheets_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      campaigns: {
        Row: {
          budget: number | null;
          created_at: string | null;
          created_by: string | null;
          end_date: string | null;
          id: string;
          notes: string | null;
          platform: string;
          project_id: string;
          spend: number | null;
          start_date: string | null;
          status: string;
          target_demographic: string | null;
          target_reach: string | null;
          title: string;
          updated_at: string | null;
        };
        Insert: {
          budget?: number | null;
          created_at?: string | null;
          created_by?: string | null;
          end_date?: string | null;
          id?: string;
          notes?: string | null;
          platform: string;
          project_id: string;
          spend?: number | null;
          start_date?: string | null;
          status?: string;
          target_demographic?: string | null;
          target_reach?: string | null;
          title: string;
          updated_at?: string | null;
        };
        Update: {
          budget?: number | null;
          created_at?: string | null;
          created_by?: string | null;
          end_date?: string | null;
          id?: string;
          notes?: string | null;
          platform?: string;
          project_id?: string;
          spend?: number | null;
          start_date?: string | null;
          status?: string;
          target_demographic?: string | null;
          target_reach?: string | null;
          title?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "campaigns_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "campaigns_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      channel_members: {
        Row: {
          can_manage: boolean;
          can_post: boolean;
          channel_id: string;
          created_at: string | null;
          id: string;
          user_id: string;
        };
        Insert: {
          can_manage?: boolean;
          can_post?: boolean;
          channel_id: string;
          created_at?: string | null;
          id?: string;
          user_id: string;
        };
        Update: {
          can_manage?: boolean;
          can_post?: boolean;
          channel_id?: string;
          created_at?: string | null;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "channel_members_channel_id_fkey";
            columns: ["channel_id"];
            isOneToOne: false;
            referencedRelation: "channels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "channel_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      channel_presets: {
        Row: {
          audience: string;
          key: string;
          name: string;
          phase: string;
          position: number;
          post_policy: string;
          topic: string;
          type: string;
          why: string;
        };
        Insert: {
          audience?: string;
          key: string;
          name: string;
          phase?: string;
          position?: number;
          post_policy?: string;
          topic?: string;
          type?: string;
          why?: string;
        };
        Update: {
          audience?: string;
          key?: string;
          name?: string;
          phase?: string;
          position?: number;
          post_policy?: string;
          topic?: string;
          type?: string;
          why?: string;
        };
        Relationships: [];
      };
      channels: {
        Row: {
          audience: string;
          created_at: string | null;
          created_by: string | null;
          id: string;
          is_private: boolean;
          name: string;
          position: number | null;
          post_policy: string;
          project_id: string | null;
          topic: string | null;
          type: string;
        };
        Insert: {
          audience?: string;
          created_at?: string | null;
          created_by?: string | null;
          id?: string;
          is_private?: boolean;
          name: string;
          position?: number | null;
          post_policy?: string;
          project_id?: string | null;
          topic?: string | null;
          type?: string;
        };
        Update: {
          audience?: string;
          created_at?: string | null;
          created_by?: string | null;
          id?: string;
          is_private?: boolean;
          name?: string;
          position?: number | null;
          post_policy?: string;
          project_id?: string | null;
          topic?: string | null;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "channels_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "channels_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      character_castings: {
        Row: {
          character_name: string;
          created_at: string | null;
          created_by: string | null;
          crew_user_id: string;
          id: string;
          project_id: string;
        };
        Insert: {
          character_name: string;
          created_at?: string | null;
          created_by?: string | null;
          crew_user_id: string;
          id?: string;
          project_id: string;
        };
        Update: {
          character_name?: string;
          created_at?: string | null;
          created_by?: string | null;
          crew_user_id?: string;
          id?: string;
          project_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "character_castings_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "character_castings_crew_user_id_fkey";
            columns: ["crew_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "character_castings_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      character_media: {
        Row: {
          character_id: string;
          created_at: string;
          created_by: string | null;
          media_id: string;
          position: number;
          project_id: string;
        };
        Insert: {
          character_id: string;
          created_at?: string;
          created_by?: string | null;
          media_id: string;
          position?: number;
          project_id: string;
        };
        Update: {
          character_id?: string;
          created_at?: string;
          created_by?: string | null;
          media_id?: string;
          position?: number;
          project_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "character_media_character_fkey";
            columns: ["character_id"];
            isOneToOne: false;
            referencedRelation: "script_characters";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "character_media_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "character_media_media_fkey";
            columns: ["media_id", "project_id"];
            isOneToOne: false;
            referencedRelation: "media";
            referencedColumns: ["id", "project_id"];
          },
        ];
      };
      client_errors: {
        Row: {
          created_at: string;
          digest: string | null;
          id: number;
          kind: string;
          message: string;
          path: string | null;
          release: string | null;
          stack: string | null;
          user_agent: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          digest?: string | null;
          id?: never;
          kind: string;
          message: string;
          path?: string | null;
          release?: string | null;
          stack?: string | null;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          digest?: string | null;
          id?: never;
          kind?: string;
          message?: string;
          path?: string | null;
          release?: string | null;
          stack?: string | null;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "client_errors_user_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      crafts: {
        Row: {
          above_the_line: boolean;
          color: string;
          created_at: string;
          department: string;
          name: string;
          position: number;
        };
        Insert: {
          above_the_line?: boolean;
          color: string;
          created_at?: string;
          department: string;
          name: string;
          position?: number;
        };
        Update: {
          above_the_line?: boolean;
          color?: string;
          created_at?: string;
          department?: string;
          name?: string;
          position?: number;
        };
        Relationships: [];
      };
      discord_integrations: {
        Row: {
          channel_id: string;
          created_at: string | null;
          created_by: string | null;
          updated_at: string | null;
          webhook_url: string;
        };
        Insert: {
          channel_id: string;
          created_at?: string | null;
          created_by?: string | null;
          updated_at?: string | null;
          webhook_url: string;
        };
        Update: {
          channel_id?: string;
          created_at?: string | null;
          created_by?: string | null;
          updated_at?: string | null;
          webhook_url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "discord_integrations_channel_id_fkey";
            columns: ["channel_id"];
            isOneToOne: true;
            referencedRelation: "channels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "discord_integrations_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      expenses: {
        Row: {
          amount: number;
          budget_item_id: string | null;
          created_at: string;
          created_by: string | null;
          description: string;
          id: string;
          paid_at: string | null;
          po_number: string | null;
          project_id: string;
          receipt_media_id: string | null;
          spent_on: string;
          status: string;
          vendor_id: string | null;
        };
        Insert: {
          amount: number;
          budget_item_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          description: string;
          id?: string;
          paid_at?: string | null;
          po_number?: string | null;
          project_id: string;
          receipt_media_id?: string | null;
          spent_on?: string;
          status?: string;
          vendor_id?: string | null;
        };
        Update: {
          amount?: number;
          budget_item_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string;
          id?: string;
          paid_at?: string | null;
          po_number?: string | null;
          project_id?: string;
          receipt_media_id?: string | null;
          spent_on?: string;
          status?: string;
          vendor_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "expenses_budget_item_fkey";
            columns: ["budget_item_id", "project_id"];
            isOneToOne: false;
            referencedRelation: "budget_items";
            referencedColumns: ["id", "project_id"];
          },
          {
            foreignKeyName: "expenses_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_receipt_fkey";
            columns: ["receipt_media_id"];
            isOneToOne: false;
            referencedRelation: "media";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_vendor_fkey";
            columns: ["vendor_id", "project_id"];
            isOneToOne: false;
            referencedRelation: "vendors";
            referencedColumns: ["id", "project_id"];
          },
        ];
      };
      guide_progress: {
        Row: {
          done: string[];
          hidden: boolean;
          project_id: string;
          updated_at: string;
          user_id: string;
          workflow: string | null;
        };
        Insert: {
          done?: string[];
          hidden?: boolean;
          project_id: string;
          updated_at?: string;
          user_id?: string;
          workflow?: string | null;
        };
        Update: {
          done?: string[];
          hidden?: boolean;
          project_id?: string;
          updated_at?: string;
          user_id?: string;
          workflow?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "guide_progress_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "guide_progress_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      job_applications: {
        Row: {
          applicant_id: string;
          applied_at: string | null;
          cover_note: string | null;
          id: string;
          job_id: string;
          status: string | null;
        };
        Insert: {
          applicant_id: string;
          applied_at?: string | null;
          cover_note?: string | null;
          id?: string;
          job_id: string;
          status?: string | null;
        };
        Update: {
          applicant_id?: string;
          applied_at?: string | null;
          cover_note?: string | null;
          id?: string;
          job_id?: string;
          status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "job_applications_applicant_id_fkey";
            columns: ["applicant_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_applications_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      jobs: {
        Row: {
          budget_item_id: string | null;
          character_name: string | null;
          created_at: string | null;
          created_by: string;
          description: string | null;
          id: string;
          project_id: string | null;
          rate: number | null;
          rate_type: string;
          role: string;
          status: string | null;
          title: string;
          updated_at: string | null;
        };
        Insert: {
          budget_item_id?: string | null;
          character_name?: string | null;
          created_at?: string | null;
          created_by: string;
          description?: string | null;
          id?: string;
          project_id?: string | null;
          rate?: number | null;
          rate_type?: string;
          role: string;
          status?: string | null;
          title: string;
          updated_at?: string | null;
        };
        Update: {
          budget_item_id?: string | null;
          character_name?: string | null;
          created_at?: string | null;
          created_by?: string;
          description?: string | null;
          id?: string;
          project_id?: string | null;
          rate?: number | null;
          rate_type?: string;
          role?: string;
          status?: string | null;
          title?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "jobs_budget_item_id_fkey";
            columns: ["budget_item_id"];
            isOneToOne: false;
            referencedRelation: "budget_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "jobs_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "jobs_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "jobs_role_fkey";
            columns: ["role"];
            isOneToOne: false;
            referencedRelation: "crafts";
            referencedColumns: ["name"];
          },
        ];
      };
      lounge_reads: {
        Row: {
          channel_id: string | null;
          id: string;
          last_read_at: string;
          partner_id: string | null;
          user_id: string;
        };
        Insert: {
          channel_id?: string | null;
          id?: string;
          last_read_at?: string;
          partner_id?: string | null;
          user_id: string;
        };
        Update: {
          channel_id?: string | null;
          id?: string;
          last_read_at?: string;
          partner_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lounge_reads_channel_id_fkey";
            columns: ["channel_id"];
            isOneToOne: false;
            referencedRelation: "channels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lounge_reads_partner_id_fkey";
            columns: ["partner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lounge_reads_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      media: {
        Row: {
          board: string | null;
          created_at: string;
          created_by: string | null;
          duration_seconds: number | null;
          external_url: string | null;
          height: number | null;
          id: string;
          kind: string;
          mime_type: string | null;
          notes: string | null;
          project_id: string;
          shared: boolean;
          size_bytes: number | null;
          storage_path: string | null;
          title: string;
          updated_at: string;
          width: number | null;
        };
        Insert: {
          board?: string | null;
          created_at?: string;
          created_by?: string | null;
          duration_seconds?: number | null;
          external_url?: string | null;
          height?: number | null;
          id?: string;
          kind: string;
          mime_type?: string | null;
          notes?: string | null;
          project_id: string;
          shared?: boolean;
          size_bytes?: number | null;
          storage_path?: string | null;
          title?: string;
          updated_at?: string;
          width?: number | null;
        };
        Update: {
          board?: string | null;
          created_at?: string;
          created_by?: string | null;
          duration_seconds?: number | null;
          external_url?: string | null;
          height?: number | null;
          id?: string;
          kind?: string;
          mime_type?: string | null;
          notes?: string | null;
          project_id?: string;
          shared?: boolean;
          size_bytes?: number | null;
          storage_path?: string | null;
          title?: string;
          updated_at?: string;
          width?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "media_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "media_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          channel_id: string | null;
          channel_uuid: string | null;
          content: string;
          created_at: string | null;
          edited_at: string | null;
          id: string;
          parent_message_id: string | null;
          pinned: boolean | null;
          pinned_at: string | null;
          pinned_by: string | null;
          reactions: Json | null;
          receiver_id: string | null;
          sender_id: string | null;
        };
        Insert: {
          channel_id?: string | null;
          channel_uuid?: string | null;
          content: string;
          created_at?: string | null;
          edited_at?: string | null;
          id?: string;
          parent_message_id?: string | null;
          pinned?: boolean | null;
          pinned_at?: string | null;
          pinned_by?: string | null;
          reactions?: Json | null;
          receiver_id?: string | null;
          sender_id?: string | null;
        };
        Update: {
          channel_id?: string | null;
          channel_uuid?: string | null;
          content?: string;
          created_at?: string | null;
          edited_at?: string | null;
          id?: string;
          parent_message_id?: string | null;
          pinned?: boolean | null;
          pinned_at?: string | null;
          pinned_by?: string | null;
          reactions?: Json | null;
          receiver_id?: string | null;
          sender_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "messages_channel_uuid_fkey";
            columns: ["channel_uuid"];
            isOneToOne: false;
            referencedRelation: "channels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_parent_message_id_fkey";
            columns: ["parent_message_id"];
            isOneToOne: false;
            referencedRelation: "messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_pinned_by_fkey";
            columns: ["pinned_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_receiver_id_fkey";
            columns: ["receiver_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          body: string | null;
          created_at: string | null;
          created_by: string | null;
          id: string;
          link: string | null;
          read: boolean;
          title: string;
          type: string;
          user_id: string;
        };
        Insert: {
          body?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          id?: string;
          link?: string | null;
          read?: boolean;
          title: string;
          type: string;
          user_id: string;
        };
        Update: {
          body?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          id?: string;
          link?: string | null;
          read?: boolean;
          title?: string;
          type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      portfolio_blocks: {
        Row: {
          block_type: string;
          body: string | null;
          created_at: string;
          id: string;
          image_url: string | null;
          meta: Json | null;
          portfolio_project_id: string;
          position: number;
          source_ref_id: string | null;
          title: string | null;
        };
        Insert: {
          block_type: string;
          body?: string | null;
          created_at?: string;
          id?: string;
          image_url?: string | null;
          meta?: Json | null;
          portfolio_project_id: string;
          position?: number;
          source_ref_id?: string | null;
          title?: string | null;
        };
        Update: {
          block_type?: string;
          body?: string | null;
          created_at?: string;
          id?: string;
          image_url?: string | null;
          meta?: Json | null;
          portfolio_project_id?: string;
          position?: number;
          source_ref_id?: string | null;
          title?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "portfolio_blocks_portfolio_project_id_fkey";
            columns: ["portfolio_project_id"];
            isOneToOne: false;
            referencedRelation: "portfolio_projects";
            referencedColumns: ["id"];
          },
        ];
      };
      portfolio_media: {
        Row: {
          created_at: string | null;
          id: string;
          media_type: string | null;
          project_id: string;
          thumbnail_url: string | null;
          title: string | null;
          url: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          media_type?: string | null;
          project_id: string;
          thumbnail_url?: string | null;
          title?: string | null;
          url: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          media_type?: string | null;
          project_id?: string;
          thumbnail_url?: string | null;
          title?: string | null;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "portfolio_media_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "portfolio_projects";
            referencedColumns: ["id"];
          },
        ];
      };
      portfolio_projects: {
        Row: {
          accent_color: string | null;
          category: string | null;
          created_at: string | null;
          description: string | null;
          id: string;
          role: string | null;
          share_token: string | null;
          source_project_id: string | null;
          title: string;
          updated_at: string | null;
          user_id: string;
          year: number | null;
        };
        Insert: {
          accent_color?: string | null;
          category?: string | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          role?: string | null;
          share_token?: string | null;
          source_project_id?: string | null;
          title: string;
          updated_at?: string | null;
          user_id: string;
          year?: number | null;
        };
        Update: {
          accent_color?: string | null;
          category?: string | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          role?: string | null;
          share_token?: string | null;
          source_project_id?: string | null;
          title?: string;
          updated_at?: string | null;
          user_id?: string;
          year?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "portfolio_projects_category_fkey";
            columns: ["category"];
            isOneToOne: false;
            referencedRelation: "project_formats";
            referencedColumns: ["name"];
          },
          {
            foreignKeyName: "portfolio_projects_source_project_id_fkey";
            columns: ["source_project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "portfolio_projects_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      post_cuts: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          media_id: string | null;
          project_id: string;
          title: string;
          url: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          media_id?: string | null;
          project_id: string;
          title: string;
          url?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          media_id?: string | null;
          project_id?: string;
          title?: string;
          url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "post_cuts_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "post_cuts_media_fkey";
            columns: ["media_id", "project_id"];
            isOneToOne: false;
            referencedRelation: "media";
            referencedColumns: ["id", "project_id"];
          },
          {
            foreignKeyName: "post_cuts_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      post_items: {
        Row: {
          assigned_to: string | null;
          created_at: string;
          created_by: string | null;
          department: string | null;
          due_date: string | null;
          id: string;
          kind: string;
          notes: string | null;
          position: number;
          project_id: string;
          status: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          assigned_to?: string | null;
          created_at?: string;
          created_by?: string | null;
          department?: string | null;
          due_date?: string | null;
          id?: string;
          kind: string;
          notes?: string | null;
          position?: number;
          project_id: string;
          status?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          assigned_to?: string | null;
          created_at?: string;
          created_by?: string | null;
          department?: string | null;
          due_date?: string | null;
          id?: string;
          kind?: string;
          notes?: string | null;
          position?: number;
          project_id?: string;
          status?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "post_items_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "post_items_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "post_items_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      post_notes: {
        Row: {
          at_seconds: number;
          body: string;
          created_at: string;
          created_by: string | null;
          cut_id: string;
          department: string;
          id: string;
          line_offset: number | null;
          line_text: string | null;
          project_id: string;
          resolved_at: string | null;
          resolved_by: string | null;
          scene_id: string | null;
        };
        Insert: {
          at_seconds: number;
          body: string;
          created_at?: string;
          created_by?: string | null;
          cut_id: string;
          department?: string;
          id?: string;
          line_offset?: number | null;
          line_text?: string | null;
          project_id: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
          scene_id?: string | null;
        };
        Update: {
          at_seconds?: number;
          body?: string;
          created_at?: string;
          created_by?: string | null;
          cut_id?: string;
          department?: string;
          id?: string;
          line_offset?: number | null;
          line_text?: string | null;
          project_id?: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
          scene_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "post_notes_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "post_notes_cut_fkey";
            columns: ["cut_id", "project_id"];
            isOneToOne: false;
            referencedRelation: "post_cuts";
            referencedColumns: ["id", "project_id"];
          },
          {
            foreignKeyName: "post_notes_resolved_by_fkey";
            columns: ["resolved_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "post_notes_scene_fkey";
            columns: ["scene_id", "project_id"];
            isOneToOne: false;
            referencedRelation: "scenes";
            referencedColumns: ["id", "project_id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          created_at: string | null;
          daily_word_goal: number;
          discord_avatar: string | null;
          discord_id: string | null;
          discord_username: string | null;
          id: string;
          is_admin: boolean | null;
          is_sample: boolean;
          location: string | null;
          notification_prefs: NonNullable<Json>;
          role: string | null;
          sprint_minutes: number;
          status: string | null;
          ui_prefs: NonNullable<Json>;
          updated_at: string | null;
          username: string;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string | null;
          daily_word_goal?: number;
          discord_avatar?: string | null;
          discord_id?: string | null;
          discord_username?: string | null;
          id: string;
          is_admin?: boolean | null;
          is_sample?: boolean;
          location?: string | null;
          notification_prefs?: NonNullable<Json>;
          role?: string | null;
          sprint_minutes?: number;
          status?: string | null;
          ui_prefs?: NonNullable<Json>;
          updated_at?: string | null;
          username: string;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string | null;
          daily_word_goal?: number;
          discord_avatar?: string | null;
          discord_id?: string | null;
          discord_username?: string | null;
          id?: string;
          is_admin?: boolean | null;
          is_sample?: boolean;
          location?: string | null;
          notification_prefs?: NonNullable<Json>;
          role?: string | null;
          sprint_minutes?: number;
          status?: string | null;
          ui_prefs?: NonNullable<Json>;
          updated_at?: string | null;
          username?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_role_fkey";
            columns: ["role"];
            isOneToOne: false;
            referencedRelation: "crafts";
            referencedColumns: ["name"];
          },
        ];
      };
      project_audio_references: {
        Row: {
          added_by: string | null;
          created_at: string | null;
          description: string | null;
          id: string;
          project_id: string | null;
          reference_type: string | null;
          scene_id: string | null;
          script_id: string | null;
          title: string;
          uri: string;
        };
        Insert: {
          added_by?: string | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          project_id?: string | null;
          reference_type?: string | null;
          scene_id?: string | null;
          script_id?: string | null;
          title: string;
          uri: string;
        };
        Update: {
          added_by?: string | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          project_id?: string | null;
          reference_type?: string | null;
          scene_id?: string | null;
          script_id?: string | null;
          title?: string;
          uri?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_audio_references_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_audio_references_script_id_fkey";
            columns: ["script_id"];
            isOneToOne: false;
            referencedRelation: "scripts";
            referencedColumns: ["id"];
          },
        ];
      };
      project_beats: {
        Row: {
          color: string | null;
          content: string | null;
          created_at: string | null;
          created_by: string | null;
          id: string;
          order_index: number | null;
          project_id: string;
          scene_number: string | null;
          script_id: string | null;
          title: string | null;
          updated_at: string | null;
        };
        Insert: {
          color?: string | null;
          content?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          id?: string;
          order_index?: number | null;
          project_id: string;
          scene_number?: string | null;
          script_id?: string | null;
          title?: string | null;
          updated_at?: string | null;
        };
        Update: {
          color?: string | null;
          content?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          id?: string;
          order_index?: number | null;
          project_id?: string;
          scene_number?: string | null;
          script_id?: string | null;
          title?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "project_beats_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_beats_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_beats_script_id_fkey";
            columns: ["script_id"];
            isOneToOne: false;
            referencedRelation: "scripts";
            referencedColumns: ["id"];
          },
        ];
      };
      project_brief: {
        Row: {
          answered_by: string | null;
          project_id: string;
          question: string;
          updated_at: string;
          value: NonNullable<Json>;
        };
        Insert: {
          answered_by?: string | null;
          project_id: string;
          question: string;
          updated_at?: string;
          value: NonNullable<Json>;
        };
        Update: {
          answered_by?: string | null;
          project_id?: string;
          question?: string;
          updated_at?: string;
          value?: NonNullable<Json>;
        };
        Relationships: [
          {
            foreignKeyName: "project_brief_answered_by_fkey";
            columns: ["answered_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_brief_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_brief_question_fkey";
            columns: ["question"];
            isOneToOne: false;
            referencedRelation: "brief_questions";
            referencedColumns: ["key"];
          },
        ];
      };
      project_crew: {
        Row: {
          craft: string | null;
          created_at: string | null;
          id: string;
          invited_by: string | null;
          project_id: string;
          role: string;
          status: string | null;
          user_id: string;
        };
        Insert: {
          craft?: string | null;
          created_at?: string | null;
          id?: string;
          invited_by?: string | null;
          project_id: string;
          role?: string;
          status?: string | null;
          user_id: string;
        };
        Update: {
          craft?: string | null;
          created_at?: string | null;
          id?: string;
          invited_by?: string | null;
          project_id?: string;
          role?: string;
          status?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_crew_craft_fkey";
            columns: ["craft"];
            isOneToOne: false;
            referencedRelation: "crafts";
            referencedColumns: ["name"];
          },
          {
            foreignKeyName: "project_crew_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_crew_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_crew_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      project_documents: {
        Row: {
          created_at: string;
          created_by: string | null;
          expires_on: string | null;
          file_name: string | null;
          id: string;
          kind: string;
          location_id: string | null;
          mime_type: string | null;
          notes: string | null;
          party: string | null;
          person_id: string | null;
          project_id: string;
          size_bytes: number | null;
          status: string;
          storage_path: string | null;
          title: string;
          updated_at: string;
          vendor_id: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          expires_on?: string | null;
          file_name?: string | null;
          id?: string;
          kind: string;
          location_id?: string | null;
          mime_type?: string | null;
          notes?: string | null;
          party?: string | null;
          person_id?: string | null;
          project_id: string;
          size_bytes?: number | null;
          status?: string;
          storage_path?: string | null;
          title: string;
          updated_at?: string;
          vendor_id?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          expires_on?: string | null;
          file_name?: string | null;
          id?: string;
          kind?: string;
          location_id?: string | null;
          mime_type?: string | null;
          notes?: string | null;
          party?: string | null;
          person_id?: string | null;
          project_id?: string;
          size_bytes?: number | null;
          status?: string;
          storage_path?: string | null;
          title?: string;
          updated_at?: string;
          vendor_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "project_documents_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_documents_location_fkey";
            columns: ["location_id", "project_id"];
            isOneToOne: false;
            referencedRelation: "project_locations";
            referencedColumns: ["id", "project_id"];
          },
          {
            foreignKeyName: "project_documents_person_fkey";
            columns: ["person_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_documents_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_documents_vendor_fkey";
            columns: ["vendor_id", "project_id"];
            isOneToOne: false;
            referencedRelation: "vendors";
            referencedColumns: ["id", "project_id"];
          },
        ];
      };
      project_formats: {
        Row: {
          blurb: string;
          created_at: string;
          icon: string;
          name: string;
          phase_labels: NonNullable<Json>;
          position: number;
          script_format: string;
          skip_milestones: string[];
          skip_phases: string[];
        };
        Insert: {
          blurb?: string;
          created_at?: string;
          icon?: string;
          name: string;
          phase_labels?: NonNullable<Json>;
          position?: number;
          script_format?: string;
          skip_milestones?: string[];
          skip_phases?: string[];
        };
        Update: {
          blurb?: string;
          created_at?: string;
          icon?: string;
          name?: string;
          phase_labels?: NonNullable<Json>;
          position?: number;
          script_format?: string;
          skip_milestones?: string[];
          skip_phases?: string[];
        };
        Relationships: [];
      };
      project_locations: {
        Row: {
          address: string | null;
          contact: string | null;
          cost: number | null;
          created_at: string;
          created_by: string | null;
          id: string;
          name: string;
          notes: string | null;
          permit: string;
          project_id: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          contact?: string | null;
          cost?: number | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name: string;
          notes?: string | null;
          permit?: string;
          project_id: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          contact?: string | null;
          cost?: number | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name?: string;
          notes?: string | null;
          permit?: string;
          project_id?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_locations_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_locations_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      project_tasks: {
        Row: {
          assigned_to: string | null;
          completed: boolean | null;
          created_at: string | null;
          due_date: string | null;
          id: string;
          project_id: string;
          title: string;
        };
        Insert: {
          assigned_to?: string | null;
          completed?: boolean | null;
          created_at?: string | null;
          due_date?: string | null;
          id?: string;
          project_id: string;
          title: string;
        };
        Update: {
          assigned_to?: string | null;
          completed?: boolean | null;
          created_at?: string | null;
          due_date?: string | null;
          id?: string;
          project_id?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_tasks_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_tasks_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      projects: {
        Row: {
          accent_color: string | null;
          archived_at: string | null;
          budget: number | null;
          created_at: string | null;
          creator_id: string;
          description: string | null;
          end_date: string | null;
          festival_submissions: Json | null;
          id: string;
          is_sample: boolean;
          project_type: string;
          settings: Json | null;
          share_token: string;
          start_date: string | null;
          status: string | null;
          title: string;
          updated_at: string | null;
          visibility: string;
        };
        Insert: {
          accent_color?: string | null;
          archived_at?: string | null;
          budget?: number | null;
          created_at?: string | null;
          creator_id: string;
          description?: string | null;
          end_date?: string | null;
          festival_submissions?: Json | null;
          id?: string;
          is_sample?: boolean;
          project_type?: string;
          settings?: Json | null;
          share_token?: string;
          start_date?: string | null;
          status?: string | null;
          title: string;
          updated_at?: string | null;
          visibility?: string;
        };
        Update: {
          accent_color?: string | null;
          archived_at?: string | null;
          budget?: number | null;
          created_at?: string | null;
          creator_id?: string;
          description?: string | null;
          end_date?: string | null;
          festival_submissions?: Json | null;
          id?: string;
          is_sample?: boolean;
          project_type?: string;
          settings?: Json | null;
          share_token?: string;
          start_date?: string | null;
          status?: string | null;
          title?: string;
          updated_at?: string | null;
          visibility?: string;
        };
        Relationships: [
          {
            foreignKeyName: "projects_creator_id_fkey";
            columns: ["creator_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "projects_project_type_fkey";
            columns: ["project_type"];
            isOneToOne: false;
            referencedRelation: "project_formats";
            referencedColumns: ["name"];
          },
        ];
      };
      scene_elements: {
        Row: {
          created_at: string;
          created_by: string | null;
          element_id: string;
          project_id: string;
          scene_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          element_id: string;
          project_id: string;
          scene_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          element_id?: string;
          project_id?: string;
          scene_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "scene_elements_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scene_elements_element_fkey";
            columns: ["element_id", "project_id"];
            isOneToOne: false;
            referencedRelation: "breakdown_elements";
            referencedColumns: ["id", "project_id"];
          },
          {
            foreignKeyName: "scene_elements_scene_fkey";
            columns: ["scene_id", "project_id"];
            isOneToOne: false;
            referencedRelation: "scenes";
            referencedColumns: ["id", "project_id"];
          },
        ];
      };
      scene_media: {
        Row: {
          created_at: string;
          created_by: string | null;
          media_id: string;
          note: string | null;
          position: number;
          project_id: string;
          scene_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          media_id: string;
          note?: string | null;
          position?: number;
          project_id: string;
          scene_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          media_id?: string;
          note?: string | null;
          position?: number;
          project_id?: string;
          scene_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "scene_media_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scene_media_media_fkey";
            columns: ["media_id", "project_id"];
            isOneToOne: false;
            referencedRelation: "media";
            referencedColumns: ["id", "project_id"];
          },
          {
            foreignKeyName: "scene_media_scene_fkey";
            columns: ["scene_id", "project_id"];
            isOneToOne: false;
            referencedRelation: "scenes";
            referencedColumns: ["id", "project_id"];
          },
        ];
      };
      scenes: {
        Row: {
          cast_list: string | null;
          color: string | null;
          created_at: string | null;
          est_duration: string | null;
          heading: string | null;
          id: string;
          location: string | null;
          note: string | null;
          ordinal: number | null;
          project_id: string;
          read_at: string | null;
          read_seconds: number | null;
          removed_at: string | null;
          scene_number: number;
          script_id: string | null;
          shoot_day: number | null;
          status: string;
          time_of_day: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          cast_list?: string | null;
          color?: string | null;
          created_at?: string | null;
          est_duration?: string | null;
          heading?: string | null;
          id?: string;
          location?: string | null;
          note?: string | null;
          ordinal?: number | null;
          project_id: string;
          read_at?: string | null;
          read_seconds?: number | null;
          removed_at?: string | null;
          scene_number: number;
          script_id?: string | null;
          shoot_day?: number | null;
          status?: string;
          time_of_day?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          cast_list?: string | null;
          color?: string | null;
          created_at?: string | null;
          est_duration?: string | null;
          heading?: string | null;
          id?: string;
          location?: string | null;
          note?: string | null;
          ordinal?: number | null;
          project_id?: string;
          read_at?: string | null;
          read_seconds?: number | null;
          removed_at?: string | null;
          scene_number?: number;
          script_id?: string | null;
          shoot_day?: number | null;
          status?: string;
          time_of_day?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "scenes_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scenes_script_id_fkey";
            columns: ["script_id"];
            isOneToOne: false;
            referencedRelation: "scripts";
            referencedColumns: ["id"];
          },
        ];
      };
      script_annotations: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          id: string;
          line_index: number;
          project_id: string;
          routed_id: string | null;
          routed_table: string | null;
          script_id: string;
          text: string;
          type: string;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          id?: string;
          line_index: number;
          project_id: string;
          routed_id?: string | null;
          routed_table?: string | null;
          script_id: string;
          text: string;
          type: string;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          id?: string;
          line_index?: number;
          project_id?: string;
          routed_id?: string | null;
          routed_table?: string | null;
          script_id?: string;
          text?: string;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "script_annotations_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "script_annotations_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "script_annotations_script_id_fkey";
            columns: ["script_id"];
            isOneToOne: false;
            referencedRelation: "scripts";
            referencedColumns: ["id"];
          },
        ];
      };
      script_characters: {
        Row: {
          age: string | null;
          arc: string | null;
          backstory: string | null;
          color: string | null;
          created_at: string | null;
          description: string | null;
          full_name: string | null;
          id: string;
          motivation: string | null;
          name: string;
          notes: string | null;
          relationships: string | null;
          script_id: string;
          updated_at: string | null;
          updated_by: string | null;
        };
        Insert: {
          age?: string | null;
          arc?: string | null;
          backstory?: string | null;
          color?: string | null;
          created_at?: string | null;
          description?: string | null;
          full_name?: string | null;
          id?: string;
          motivation?: string | null;
          name: string;
          notes?: string | null;
          relationships?: string | null;
          script_id: string;
          updated_at?: string | null;
          updated_by?: string | null;
        };
        Update: {
          age?: string | null;
          arc?: string | null;
          backstory?: string | null;
          color?: string | null;
          created_at?: string | null;
          description?: string | null;
          full_name?: string | null;
          id?: string;
          motivation?: string | null;
          name?: string;
          notes?: string | null;
          relationships?: string | null;
          script_id?: string;
          updated_at?: string | null;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "script_characters_script_id_fkey";
            columns: ["script_id"];
            isOneToOne: false;
            referencedRelation: "scripts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "script_characters_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      script_metadata: {
        Row: {
          character_bible: NonNullable<Json>;
          script_id: string;
          title_page: NonNullable<Json>;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          character_bible?: NonNullable<Json>;
          script_id: string;
          title_page?: NonNullable<Json>;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          character_bible?: NonNullable<Json>;
          script_id?: string;
          title_page?: NonNullable<Json>;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "script_metadata_script_id_fkey";
            columns: ["script_id"];
            isOneToOne: true;
            referencedRelation: "scripts";
            referencedColumns: ["id"];
          },
        ];
      };
      script_revisions: {
        Row: {
          color_index: number;
          created_at: string | null;
          created_by: string | null;
          id: string;
          label: string;
          script_id: string;
          snapshot: string;
        };
        Insert: {
          color_index?: number;
          created_at?: string | null;
          created_by?: string | null;
          id?: string;
          label: string;
          script_id: string;
          snapshot?: string;
        };
        Update: {
          color_index?: number;
          created_at?: string | null;
          created_by?: string | null;
          id?: string;
          label?: string;
          script_id?: string;
          snapshot?: string;
        };
        Relationships: [
          {
            foreignKeyName: "script_revisions_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "script_revisions_script_id_fkey";
            columns: ["script_id"];
            isOneToOne: false;
            referencedRelation: "scripts";
            referencedColumns: ["id"];
          },
        ];
      };
      script_stash: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          script_id: string;
          text: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          script_id: string;
          text: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          script_id?: string;
          text?: string;
        };
        Relationships: [
          {
            foreignKeyName: "script_stash_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "script_stash_script_id_fkey";
            columns: ["script_id"];
            isOneToOne: false;
            referencedRelation: "scripts";
            referencedColumns: ["id"];
          },
        ];
      };
      scripts: {
        Row: {
          content: string | null;
          created_at: string | null;
          created_by: string | null;
          daily_goal: number | null;
          format: string | null;
          id: string;
          last_edited_by: string | null;
          learned_rules: Json | null;
          project_id: string | null;
          share_token: string | null;
          shared: boolean | null;
          sprint_minutes: number | null;
          status: string | null;
          title: string;
          title_page: Json | null;
          updated_at: string | null;
          version: number | null;
        };
        Insert: {
          content?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          daily_goal?: number | null;
          format?: string | null;
          id?: string;
          last_edited_by?: string | null;
          learned_rules?: Json | null;
          project_id?: string | null;
          share_token?: string | null;
          shared?: boolean | null;
          sprint_minutes?: number | null;
          status?: string | null;
          title: string;
          title_page?: Json | null;
          updated_at?: string | null;
          version?: number | null;
        };
        Update: {
          content?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          daily_goal?: number | null;
          format?: string | null;
          id?: string;
          last_edited_by?: string | null;
          learned_rules?: Json | null;
          project_id?: string | null;
          share_token?: string | null;
          shared?: boolean | null;
          sprint_minutes?: number | null;
          status?: string | null;
          title?: string;
          title_page?: Json | null;
          updated_at?: string | null;
          version?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "scripts_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scripts_last_edited_by_fkey";
            columns: ["last_edited_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scripts_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      set_log: {
        Row: {
          at: string;
          body: string | null;
          call_sheet_id: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          kind: string;
          media_id: string | null;
          project_id: string;
          scene_id: string | null;
          shot_id: string | null;
          take: number | null;
        };
        Insert: {
          at?: string;
          body?: string | null;
          call_sheet_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          kind: string;
          media_id?: string | null;
          project_id: string;
          scene_id?: string | null;
          shot_id?: string | null;
          take?: number | null;
        };
        Update: {
          at?: string;
          body?: string | null;
          call_sheet_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          kind?: string;
          media_id?: string | null;
          project_id?: string;
          scene_id?: string | null;
          shot_id?: string | null;
          take?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "set_log_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "set_log_day_fkey";
            columns: ["call_sheet_id", "project_id"];
            isOneToOne: false;
            referencedRelation: "call_sheets";
            referencedColumns: ["id", "project_id"];
          },
          {
            foreignKeyName: "set_log_media_fkey";
            columns: ["media_id", "project_id"];
            isOneToOne: false;
            referencedRelation: "media";
            referencedColumns: ["id", "project_id"];
          },
          {
            foreignKeyName: "set_log_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "set_log_scene_fkey";
            columns: ["scene_id", "project_id"];
            isOneToOne: false;
            referencedRelation: "scenes";
            referencedColumns: ["id", "project_id"];
          },
          {
            foreignKeyName: "set_log_shot_fkey";
            columns: ["shot_id", "project_id"];
            isOneToOne: false;
            referencedRelation: "shots";
            referencedColumns: ["id", "project_id"];
          },
        ];
      };
      sfx_assets: {
        Row: {
          audio_url: string;
          created_at: string | null;
          duration: number | null;
          id: string;
          project_id: string;
          tags: string[] | null;
          title: string;
          user_id: string;
        };
        Insert: {
          audio_url: string;
          created_at?: string | null;
          duration?: number | null;
          id?: string;
          project_id: string;
          tags?: string[] | null;
          title: string;
          user_id: string;
        };
        Update: {
          audio_url?: string;
          created_at?: string | null;
          duration?: number | null;
          id?: string;
          project_id?: string;
          tags?: string[] | null;
          title?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sfx_assets_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sfx_assets_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      shots: {
        Row: {
          angle: string | null;
          created_at: string | null;
          created_by: string | null;
          description: string | null;
          frame_media_id: string | null;
          id: string;
          lens: string | null;
          movement: string | null;
          order_index: number | null;
          project_id: string;
          scene_id: string;
          shot_number: string;
          shot_size: string | null;
          status: string | null;
        };
        Insert: {
          angle?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          frame_media_id?: string | null;
          id?: string;
          lens?: string | null;
          movement?: string | null;
          order_index?: number | null;
          project_id: string;
          scene_id: string;
          shot_number: string;
          shot_size?: string | null;
          status?: string | null;
        };
        Update: {
          angle?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          frame_media_id?: string | null;
          id?: string;
          lens?: string | null;
          movement?: string | null;
          order_index?: number | null;
          project_id?: string;
          scene_id?: string;
          shot_number?: string;
          shot_size?: string | null;
          status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "shots_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shots_frame_fkey";
            columns: ["frame_media_id", "project_id"];
            isOneToOne: false;
            referencedRelation: "media";
            referencedColumns: ["id", "project_id"];
          },
          {
            foreignKeyName: "shots_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shots_scene_fkey";
            columns: ["scene_id", "project_id"];
            isOneToOne: false;
            referencedRelation: "scenes";
            referencedColumns: ["id", "project_id"];
          },
        ];
      };
      spotify_connections: {
        Row: {
          access_token: string;
          expires_at: number;
          refresh_token: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          access_token: string;
          expires_at: number;
          refresh_token: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          access_token?: string;
          expires_at?: number;
          refresh_token?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      timeline_items: {
        Row: {
          assigned_to: string | null;
          created_at: string | null;
          created_by: string | null;
          description: string | null;
          end_date: string | null;
          id: string;
          project_id: string;
          start_date: string | null;
          status: string | null;
          title: string;
          type: string | null;
          updated_at: string | null;
        };
        Insert: {
          assigned_to?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          end_date?: string | null;
          id?: string;
          project_id: string;
          start_date?: string | null;
          status?: string | null;
          title?: string;
          type?: string | null;
          updated_at?: string | null;
        };
        Update: {
          assigned_to?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          end_date?: string | null;
          id?: string;
          project_id?: string;
          start_date?: string | null;
          status?: string | null;
          title?: string;
          type?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "timeline_items_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "timeline_items_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "timeline_items_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      timesheets: {
        Row: {
          created_at: string;
          decided_at: string | null;
          decided_by: string | null;
          hours: number;
          id: string;
          note: string | null;
          project_id: string;
          rate: number | null;
          status: string;
          user_id: string | null;
          work_date: string;
        };
        Insert: {
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          hours: number;
          id?: string;
          note?: string | null;
          project_id: string;
          rate?: number | null;
          status?: string;
          user_id?: string | null;
          work_date: string;
        };
        Update: {
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          hours?: number;
          id?: string;
          note?: string | null;
          project_id?: string;
          rate?: number | null;
          status?: string;
          user_id?: string | null;
          work_date?: string;
        };
        Relationships: [
          {
            foreignKeyName: "timesheets_decided_by_fkey";
            columns: ["decided_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "timesheets_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "timesheets_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      transcript_lines: {
        Row: {
          created_at: string;
          created_by: string | null;
          end_ms: number | null;
          id: string;
          media_id: string;
          paper_order: number | null;
          position: number;
          project_id: string;
          speaker: string | null;
          start_ms: number | null;
          text: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          end_ms?: number | null;
          id?: string;
          media_id: string;
          paper_order?: number | null;
          position: number;
          project_id: string;
          speaker?: string | null;
          start_ms?: number | null;
          text: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          end_ms?: number | null;
          id?: string;
          media_id?: string;
          paper_order?: number | null;
          position?: number;
          project_id?: string;
          speaker?: string | null;
          start_ms?: number | null;
          text?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transcript_lines_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transcript_lines_media_fkey";
            columns: ["media_id", "project_id"];
            isOneToOne: false;
            referencedRelation: "media";
            referencedColumns: ["id", "project_id"];
          },
          {
            foreignKeyName: "transcript_lines_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      unavailability: {
        Row: {
          created_at: string;
          ends_on: string;
          id: string;
          note: string | null;
          starts_on: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          ends_on: string;
          id?: string;
          note?: string | null;
          starts_on: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          ends_on?: string;
          id?: string;
          note?: string | null;
          starts_on?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "unavailability_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      vendors: {
        Row: {
          category: string | null;
          contact: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          name: string;
          notes: string | null;
          project_id: string;
        };
        Insert: {
          category?: string | null;
          contact?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name: string;
          notes?: string | null;
          project_id: string;
        };
        Update: {
          category?: string | null;
          contact?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name?: string;
          notes?: string | null;
          project_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vendors_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vendors_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      writing_days: {
        Row: {
          day: string;
          goal: number;
          sprints: number;
          updated_at: string;
          user_id: string;
          words: number;
        };
        Insert: {
          day: string;
          goal: number;
          sprints?: number;
          updated_at?: string;
          user_id: string;
          words?: number;
        };
        Update: {
          day?: string;
          goal?: number;
          sprints?: number;
          updated_at?: string;
          user_id?: string;
          words?: number;
        };
        Relationships: [
          {
            foreignKeyName: "writing_days_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      account_deletion_plan: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      ack_call_sheet: { Args: { p_sheet: string }; Returns: number };
      add_script_annotation: {
        Args: {
          p_line: number;
          p_scene_heading?: string;
          p_scene_ordinal?: number;
          p_script: string;
          p_text: string;
          p_type: string;
        };
        Returns: {
          created_at: string | null;
          created_by: string | null;
          id: string;
          line_index: number;
          project_id: string;
          routed_id: string | null;
          routed_table: string | null;
          script_id: string;
          text: string;
          type: string;
        };
        SetofOptions: {
          from: "*";
          to: "script_annotations";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      admin_list_users: {
        Args: Record<PropertyKey, never>;
        Returns: {
          avatar_url: string;
          created_at: string;
          id: string;
          is_admin: boolean;
          role: string;
          status: string;
          username: string;
        }[];
      };
      admin_platform_analytics: {
        Args: { p_since: string };
        Returns: {
          active_users: number;
          avg_project_days: number;
          completed_projects: number;
        }[];
      };
      breakdown_memory: {
        Args: { p_exclude?: string };
        Returns: {
          category_key: string;
          name: string;
          projects: number;
        }[];
      };
      can_manage_channel: { Args: { cid: string }; Returns: boolean };
      can_post_channel: { Args: { cid: string }; Returns: boolean };
      delete_my_account: { Args: { p_confirm: string }; Returns: undefined };
      edit_message: {
        Args: { p_content: string; p_message: string };
        Returns: {
          channel_id: string | null;
          channel_uuid: string | null;
          content: string;
          created_at: string | null;
          edited_at: string | null;
          id: string;
          parent_message_id: string | null;
          pinned: boolean | null;
          pinned_at: string | null;
          pinned_by: string | null;
          reactions: Json | null;
          receiver_id: string | null;
          sender_id: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "messages";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      get_my_account: {
        Args: Record<PropertyKey, never>;
        Returns: {
          discord_id: string;
          is_admin: boolean;
          notification_prefs: Json;
        }[];
      };
      get_my_ui_prefs: { Args: Record<PropertyKey, never>; Returns: Json };
      get_my_writing_prefs: {
        Args: Record<PropertyKey, never>;
        Returns: {
          daily_word_goal: number;
          sprint_minutes: number;
        }[];
      };
      get_person_credits: {
        Args: { p_user: string };
        Returns: {
          accent_color: string;
          character_name: string;
          credit: string;
          department: string;
          kind: string;
          portfolio_project_id: string;
          project_id: string;
          project_type: string;
          title: string;
          year: number;
        }[];
      };
      get_platform_stats: {
        Args: Record<PropertyKey, never>;
        Returns: {
          creators: number;
          jobs: number;
          media: number;
          projects: number;
          scripts: number;
        }[];
      };
      get_press_kit: { Args: { p_token: string }; Returns: Json };
      get_public_showcase: {
        Args: { p_limit?: number };
        Returns: {
          external_url: string;
          kind: string;
          media_id: string;
          project_title: string;
          share_token: string;
          storage_path: string;
          title: string;
        }[];
      };
      get_published_media: {
        Args: { p_media_id: string };
        Returns: {
          kind: string;
          mime_type: string;
          storage_path: string;
        }[];
      };
      get_recent_work: {
        Args: { p_limit?: number };
        Returns: {
          accent_color: string;
          category: string;
          role: string;
          title: string;
          year: number;
        }[];
      };
      get_shared_lookbook: { Args: { p_token: string }; Returns: Json };
      get_shared_project: {
        Args: { p_token: string };
        Returns: {
          accent_color: string;
          creator_username: string;
          description: string;
          status: string;
          title: string;
          visibility: string;
        }[];
      };
      has_discord_webhook: { Args: { cid: string }; Returns: boolean };
      issue_call_sheet: {
        Args: { p_note?: string; p_sheet: string };
        Returns: {
          created_at: string | null;
          estimated_wrap: string | null;
          general_call: string | null;
          id: string;
          issued: Json | null;
          issued_at: string | null;
          issued_by: string | null;
          location_address: string | null;
          notes: string | null;
          project_id: string;
          reminded_at: string | null;
          shoot_date: string | null;
          shoot_day: number;
          shooting_call: string | null;
          updated_at: string | null;
          updated_by: string | null;
          version: number;
          weather: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "call_sheets";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      log_writing: {
        Args: { p_day: string; p_sprint?: boolean; p_words: number };
        Returns: {
          day: string;
          goal: number;
          sprints: number;
          updated_at: string;
          user_id: string;
          words: number;
        };
        SetofOptions: {
          from: "*";
          to: "writing_days";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      lounge_unread: {
        Args: Record<PropertyKey, never>;
        Returns: {
          channel_id: string;
          last_at: string;
          partner_id: string;
          unread: number;
        }[];
      };
      mark_lounge_read: {
        Args: { p_channel?: string; p_partner?: string };
        Returns: undefined;
      };
      pin_message: {
        Args: { p_message: string; p_pinned: boolean };
        Returns: {
          channel_id: string | null;
          channel_uuid: string | null;
          content: string;
          created_at: string | null;
          edited_at: string | null;
          id: string;
          parent_message_id: string | null;
          pinned: boolean | null;
          pinned_at: string | null;
          pinned_by: string | null;
          reactions: Json | null;
          receiver_id: string | null;
          sender_id: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "messages";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      project_availability: {
        Args: { p_from?: string; p_project: string; p_to?: string };
        Returns: {
          ends_on: string;
          starts_on: string;
          user_id: string;
        }[];
      };
      project_context: { Args: { p_project: string }; Returns: Json };
      project_progress: { Args: { p_project: string }; Returns: Json };
      projects_progress: { Args: { p_projects: string[] }; Returns: Json };
      report_client_error: {
        Args: {
          p_digest: string;
          p_kind: string;
          p_message: string;
          p_path: string;
          p_release: string;
          p_stack: string;
          p_user_agent: string;
        };
        Returns: undefined;
      };
      respond_to_application: {
        Args: { p_application: string; p_close?: boolean; p_status: string };
        Returns: Json;
      };
      search_lounge: {
        Args: { p_channel?: string; p_limit?: number; p_query: string };
        Returns: {
          channel_name: string;
          channel_uuid: string;
          content: string;
          created_at: string;
          id: string;
          parent_message_id: string;
          project_id: string;
          receiver_id: string;
          sender: string;
          sender_id: string;
        }[];
      };
      search_suite: {
        Args: { p_limit?: number; p_query: string };
        Returns: {
          detail: string;
          id: string;
          kind: string;
          project_id: string;
          rank: number;
          title: string;
        }[];
      };
      send_call_sheet_reminders: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      set_my_ui_prefs: { Args: { p_patch: Json }; Returns: Json };
      set_paper_edit: {
        Args: { p_line_ids: string[]; p_project: string };
        Returns: undefined;
      };
      set_user_admin: {
        Args: { p_admin: boolean; p_user: string };
        Returns: undefined;
      };
      sync_script_scenes: {
        Args: { p_base_ids: string[]; p_scenes: Json; p_script_id: string };
        Returns: string[];
      };
      tag_scene_element: {
        Args: { p_category: string; p_name: string; p_scene: string };
        Returns: string;
      };
      toggle_message_reaction: {
        Args: { p_emoji: string; p_message: string };
        Returns: Json;
      };
      transfer_project: {
        Args: { p_project: string; p_to: string };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
