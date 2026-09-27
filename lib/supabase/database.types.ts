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
          location_address: string | null;
          notes: string | null;
          project_id: string;
          shoot_date: string | null;
          shoot_day: number;
          shooting_call: string | null;
          updated_at: string | null;
          updated_by: string | null;
          weather: string | null;
        };
        Insert: {
          created_at?: string | null;
          estimated_wrap?: string | null;
          general_call?: string | null;
          id?: string;
          location_address?: string | null;
          notes?: string | null;
          project_id: string;
          shoot_date?: string | null;
          shoot_day: number;
          shooting_call?: string | null;
          updated_at?: string | null;
          updated_by?: string | null;
          weather?: string | null;
        };
        Update: {
          created_at?: string | null;
          estimated_wrap?: string | null;
          general_call?: string | null;
          id?: string;
          location_address?: string | null;
          notes?: string | null;
          project_id?: string;
          shoot_date?: string | null;
          shoot_day?: number;
          shooting_call?: string | null;
          updated_at?: string | null;
          updated_by?: string | null;
          weather?: string | null;
        };
        Relationships: [
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
          platform?: string;
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
      channels: {
        Row: {
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
      crafts: {
        Row: {
          color: string;
          created_at: string;
          department: string;
          name: string;
          position: number;
        };
        Insert: {
          color: string;
          created_at?: string;
          department: string;
          name: string;
          position?: number;
        };
        Update: {
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
          id: string;
          parent_message_id: string | null;
          pinned: boolean | null;
          reactions: Json | null;
          receiver_id: string | null;
          sender_id: string;
        };
        Insert: {
          channel_id?: string | null;
          channel_uuid?: string | null;
          content: string;
          created_at?: string | null;
          id?: string;
          parent_message_id?: string | null;
          pinned?: boolean | null;
          reactions?: Json | null;
          receiver_id?: string | null;
          sender_id: string;
        };
        Update: {
          channel_id?: string | null;
          channel_uuid?: string | null;
          content?: string;
          created_at?: string | null;
          id?: string;
          parent_message_id?: string | null;
          pinned?: boolean | null;
          reactions?: Json | null;
          receiver_id?: string | null;
          sender_id?: string;
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
          discord_avatar: string | null;
          discord_id: string | null;
          discord_username: string | null;
          id: string;
          is_admin: boolean | null;
          location: string | null;
          notification_prefs: NonNullable<Json>;
          role: string | null;
          status: string | null;
          updated_at: string | null;
          username: string;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string | null;
          discord_avatar?: string | null;
          discord_id?: string | null;
          discord_username?: string | null;
          id: string;
          is_admin?: boolean | null;
          location?: string | null;
          notification_prefs?: NonNullable<Json>;
          role?: string | null;
          status?: string | null;
          updated_at?: string | null;
          username: string;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string | null;
          discord_avatar?: string | null;
          discord_id?: string | null;
          discord_username?: string | null;
          id?: string;
          is_admin?: boolean | null;
          location?: string | null;
          notification_prefs?: NonNullable<Json>;
          role?: string | null;
          status?: string | null;
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
          budget: number | null;
          created_at: string | null;
          creator_id: string;
          description: string | null;
          end_date: string | null;
          festival_submissions: Json | null;
          id: string;
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
          budget?: number | null;
          created_at?: string | null;
          creator_id: string;
          description?: string | null;
          end_date?: string | null;
          festival_submissions?: Json | null;
          id?: string;
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
          budget?: number | null;
          created_at?: string | null;
          creator_id?: string;
          description?: string | null;
          end_date?: string | null;
          festival_submissions?: Json | null;
          id?: string;
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
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
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
      get_my_account: {
        Args: Record<PropertyKey, never>;
        Returns: {
          discord_id: string;
          is_admin: boolean;
          notification_prefs: Json;
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
      project_progress: { Args: { p_project: string }; Returns: Json };
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
