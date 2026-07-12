export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {

  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_feed: {
        Row: {
          action: string
          created_at: string | null
          id: string
          metadata: Json | null
          target_id: string | null
          target_type: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_feed_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_comments: {
        Row: {
          asset_id: string
          content: string
          created_at: string | null
          id: string
          timecode: string | null
          user_id: string
        }
        Insert: {
          asset_id: string
          content: string
          created_at?: string | null
          id?: string
          timecode?: string | null
          user_id: string
        }
        Update: {
          asset_id?: string
          content?: string
          created_at?: string | null
          id?: string
          timecode?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_comments_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "studio_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_items: {
        Row: {
          actual_cost: number | null
          amount: number
          category: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          job_id: string | null
          project_id: string
          updated_at: string | null
        }
        Insert: {
          actual_cost?: number | null
          amount?: number
          category: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          job_id?: string | null
          project_id: string
          updated_at?: string | null
        }
        Update: {
          actual_cost?: number | null
          amount?: number
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          job_id?: string | null
          project_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_items_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      call_sheet_calls: {
        Row: {
          call_sheet_id: string
          call_time: string | null
          character_name: string | null
          created_at: string | null
          crew_user_id: string | null
          id: string
          remarks: string | null
          role_label: string | null
        }
        Insert: {
          call_sheet_id: string
          call_time?: string | null
          character_name?: string | null
          created_at?: string | null
          crew_user_id?: string | null
          id?: string
          remarks?: string | null
          role_label?: string | null
        }
        Update: {
          call_sheet_id?: string
          call_time?: string | null
          character_name?: string | null
          created_at?: string | null
          crew_user_id?: string | null
          id?: string
          remarks?: string | null
          role_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_sheet_calls_call_sheet_id_fkey"
            columns: ["call_sheet_id"]
            isOneToOne: false
            referencedRelation: "call_sheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_sheet_calls_crew_user_id_fkey"
            columns: ["crew_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      call_sheets: {
        Row: {
          created_at: string | null
          estimated_wrap: string | null
          general_call: string | null
          id: string
          location_address: string | null
          notes: string | null
          project_id: string
          shoot_date: string | null
          shoot_day: number
          shooting_call: string | null
          updated_at: string | null
          updated_by: string | null
          weather: string | null
        }
        Insert: {
          created_at?: string | null
          estimated_wrap?: string | null
          general_call?: string | null
          id?: string
          location_address?: string | null
          notes?: string | null
          project_id: string
          shoot_date?: string | null
          shoot_day: number
          shooting_call?: string | null
          updated_at?: string | null
          updated_by?: string | null
          weather?: string | null
        }
        Update: {
          created_at?: string | null
          estimated_wrap?: string | null
          general_call?: string | null
          id?: string
          location_address?: string | null
          notes?: string | null
          project_id?: string
          shoot_date?: string | null
          shoot_day?: number
          shooting_call?: string | null
          updated_at?: string | null
          updated_by?: string | null
          weather?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_sheets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_sheets_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          budget: number | null
          created_at: string | null
          created_by: string | null
          end_date: string | null
          id: string
          notes: string | null
          platform: string
          project_id: string
          spend: number | null
          start_date: string | null
          status: string
          target_demographic: string | null
          target_reach: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          budget?: number | null
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          platform?: string
          project_id: string
          spend?: number | null
          start_date?: string | null
          status?: string
          target_demographic?: string | null
          target_reach?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          budget?: number | null
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          platform?: string
          project_id?: string
          spend?: number | null
          start_date?: string | null
          status?: string
          target_demographic?: string | null
          target_reach?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_members: {
        Row: {
          can_manage: boolean
          can_post: boolean
          channel_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          can_manage?: boolean
          can_post?: boolean
          channel_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          can_manage?: boolean
          can_post?: boolean
          channel_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_members_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_private: boolean
          name: string
          position: number | null
          post_policy: string
          project_id: string | null
          topic: string | null
          type: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_private?: boolean
          name: string
          position?: number | null
          post_policy?: string
          project_id?: string | null
          topic?: string | null
          type?: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_private?: boolean
          name?: string
          position?: number | null
          post_policy?: string
          project_id?: string | null
          topic?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "channels_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channels_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      character_castings: {
        Row: {
          character_name: string
          created_at: string | null
          created_by: string | null
          crew_user_id: string
          id: string
          project_id: string
        }
        Insert: {
          character_name: string
          created_at?: string | null
          created_by?: string | null
          crew_user_id: string
          id?: string
          project_id: string
        }
        Update: {
          character_name?: string
          created_at?: string | null
          created_by?: string | null
          crew_user_id?: string
          id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_castings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_castings_crew_user_id_fkey"
            columns: ["crew_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_castings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      character_references: {
        Row: {
          character_id: string
          concept_asset_id: string
          created_at: string | null
          created_by: string | null
          id: string
          project_id: string
        }
        Insert: {
          character_id: string
          concept_asset_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          project_id: string
        }
        Update: {
          character_id?: string
          concept_asset_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_references_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "script_characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_references_concept_asset_id_fkey"
            columns: ["concept_asset_id"]
            isOneToOne: false
            referencedRelation: "concept_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_references_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_references_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_channels: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          members_json: string | null
          name: string
          project_id: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id: string
          members_json?: string | null
          name: string
          project_id?: string | null
          type?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          members_json?: string | null
          name?: string
          project_id?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          attachments_json: string | null
          channel_id: string
          content: string
          created_at: string | null
          edited_at: string | null
          id: string
          reactions_json: string | null
          sender_id: string
          type: string
        }
        Insert: {
          attachments_json?: string | null
          channel_id: string
          content: string
          created_at?: string | null
          edited_at?: string | null
          id: string
          reactions_json?: string | null
          sender_id: string
          type?: string
        }
        Update: {
          attachments_json?: string | null
          channel_id?: string
          content?: string
          created_at?: string | null
          edited_at?: string | null
          id?: string
          reactions_json?: string | null
          sender_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channel_activity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      concept_assets: {
        Row: {
          board: string | null
          created_at: string | null
          created_by: string | null
          id: string
          image_url: string
          project_id: string
          title: string | null
        }
        Insert: {
          board?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          image_url: string
          project_id: string
          title?: string | null
        }
        Update: {
          board?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          image_url?: string
          project_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "concept_assets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concept_assets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      discord_integrations: {
        Row: {
          channel_id: string
          created_at: string | null
          created_by: string | null
          updated_at: string | null
          webhook_url: string
        }
        Insert: {
          channel_id: string
          created_at?: string | null
          created_by?: string | null
          updated_at?: string | null
          webhook_url: string
        }
        Update: {
          channel_id?: string
          created_at?: string | null
          created_by?: string | null
          updated_at?: string | null
          webhook_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "discord_integrations_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: true
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discord_integrations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_applications: {
        Row: {
          applicant_id: string
          applied_at: string | null
          cover_note: string | null
          id: string
          job_id: string
          status: string | null
        }
        Insert: {
          applicant_id: string
          applied_at?: string | null
          cover_note?: string | null
          id?: string
          job_id: string
          status?: string | null
        }
        Update: {
          applicant_id?: string
          applied_at?: string | null
          cover_note?: string | null
          id?: string
          job_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          budget_item_id: string | null
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          project_id: string | null
          rate: number | null
          rate_type: string
          role: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          budget_item_id?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          project_id?: string | null
          rate?: number | null
          rate_type?: string
          role: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          budget_item_id?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          project_id?: string | null
          rate?: number | null
          rate_type?: string
          role?: string
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_budget_item_id_fkey"
            columns: ["budget_item_id"]
            isOneToOne: false
            referencedRelation: "budget_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          channel_id: string | null
          channel_uuid: string | null
          content: string
          created_at: string | null
          id: string
          parent_message_id: string | null
          pinned: boolean | null
          reactions: Json | null
          receiver_id: string | null
          sender_id: string
        }
        Insert: {
          channel_id?: string | null
          channel_uuid?: string | null
          content: string
          created_at?: string | null
          id?: string
          parent_message_id?: string | null
          pinned?: boolean | null
          reactions?: Json | null
          receiver_id?: string | null
          sender_id: string
        }
        Update: {
          channel_id?: string | null
          channel_uuid?: string | null
          content?: string
          created_at?: string | null
          id?: string
          parent_message_id?: string | null
          pinned?: boolean | null
          reactions?: Json | null
          receiver_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_channel_uuid_fkey"
            columns: ["channel_uuid"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          id: string
          link: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string
          link?: string | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_blocks: {
        Row: {
          block_type: string
          body: string | null
          created_at: string
          id: string
          image_url: string | null
          meta: Json | null
          portfolio_project_id: string
          position: number
          source_ref_id: string | null
          title: string | null
        }
        Insert: {
          block_type: string
          body?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          meta?: Json | null
          portfolio_project_id: string
          position?: number
          source_ref_id?: string | null
          title?: string | null
        }
        Update: {
          block_type?: string
          body?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          meta?: Json | null
          portfolio_project_id?: string
          position?: number
          source_ref_id?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_blocks_portfolio_project_id_fkey"
            columns: ["portfolio_project_id"]
            isOneToOne: false
            referencedRelation: "portfolio_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_media: {
        Row: {
          created_at: string | null
          id: string
          media_type: string | null
          project_id: string
          thumbnail_url: string | null
          title: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          media_type?: string | null
          project_id: string
          thumbnail_url?: string | null
          title?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          media_type?: string | null
          project_id?: string
          thumbnail_url?: string | null
          title?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_media_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "portfolio_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_projects: {
        Row: {
          accent_color: string | null
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          role: string | null
          share_token: string | null
          source_project_id: string | null
          title: string
          updated_at: string | null
          user_id: string
          year: number | null
        }
        Insert: {
          accent_color?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          role?: string | null
          share_token?: string | null
          source_project_id?: string | null
          title: string
          updated_at?: string | null
          user_id: string
          year?: number | null
        }
        Update: {
          accent_color?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          role?: string | null
          share_token?: string | null
          source_project_id?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_projects_source_project_id_fkey"
            columns: ["source_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          discord_avatar: string | null
          discord_id: string | null
          discord_username: string | null
          id: string
          is_admin: boolean | null
          location: string | null
          notification_prefs: Json
          role: string | null
          status: string | null
          updated_at: string | null
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          discord_avatar?: string | null
          discord_id?: string | null
          discord_username?: string | null
          id: string
          is_admin?: boolean | null
          location?: string | null
          notification_prefs?: Json
          role?: string | null
          status?: string | null
          updated_at?: string | null
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          discord_avatar?: string | null
          discord_id?: string | null
          discord_username?: string | null
          id?: string
          is_admin?: boolean | null
          location?: string | null
          notification_prefs?: Json
          role?: string | null
          status?: string | null
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      project_assets: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          project_id: string
          thumbnail_url: string | null
          title: string
          type: string
          updated_at: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          project_id: string
          thumbnail_url?: string | null
          title?: string
          type?: string
          updated_at?: string | null
          url?: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          project_id?: string
          thumbnail_url?: string | null
          title?: string
          type?: string
          updated_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_assets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_assets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_audio_references: {
        Row: {
          added_by: string | null
          created_at: string | null
          description: string | null
          id: string
          project_id: string | null
          reference_type: string | null
          scene_id: string | null
          script_id: string | null
          title: string
          uri: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          project_id?: string | null
          reference_type?: string | null
          scene_id?: string | null
          script_id?: string | null
          title: string
          uri: string
        }
        Update: {
          added_by?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          project_id?: string | null
          reference_type?: string | null
          scene_id?: string | null
          script_id?: string | null
          title?: string
          uri?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_audio_references_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_audio_references_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      project_beats: {
        Row: {
          color: string | null
          content: string | null
          created_at: string | null
          created_by: string | null
          id: string
          order_index: number | null
          project_id: string
          scene_number: string | null
          script_id: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          order_index?: number | null
          project_id: string
          scene_number?: string | null
          script_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          order_index?: number | null
          project_id?: string
          scene_number?: string | null
          script_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_beats_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_beats_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_beats_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      project_crew: {
        Row: {
          created_at: string | null
          id: string
          invited_by: string | null
          project_id: string
          role: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          invited_by?: string | null
          project_id: string
          role?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          invited_by?: string | null
          project_id?: string
          role?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_crew_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_crew_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_crew_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tasks: {
        Row: {
          assigned_to: string | null
          completed: boolean | null
          created_at: string | null
          due_date: string | null
          id: string
          project_id: string
          title: string
        }
        Insert: {
          assigned_to?: string | null
          completed?: boolean | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          project_id: string
          title: string
        }
        Update: {
          assigned_to?: string | null
          completed?: boolean | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          project_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          accent_color: string | null
          budget: number | null
          created_at: string | null
          creator_id: string
          description: string | null
          end_date: string | null
          festival_submissions: Json | null
          id: string
          project_type: string
          settings: Json | null
          start_date: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          accent_color?: string | null
          budget?: number | null
          created_at?: string | null
          creator_id: string
          description?: string | null
          end_date?: string | null
          festival_submissions?: Json | null
          id?: string
          project_type?: string
          settings?: Json | null
          start_date?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          accent_color?: string | null
          budget?: number | null
          created_at?: string | null
          creator_id?: string
          description?: string | null
          end_date?: string | null
          festival_submissions?: Json | null
          id?: string
          project_type?: string
          settings?: Json | null
          start_date?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scene_links: {
        Row: {
          asset_id: string
          created_at: string | null
          created_by: string | null
          id: string
          scene_number: string
          script_id: string
        }
        Insert: {
          asset_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          scene_number: string
          script_id: string
        }
        Update: {
          asset_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          scene_number?: string
          script_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scene_links_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "studio_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scene_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scene_links_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      scene_references: {
        Row: {
          concept_asset_id: string
          created_at: string | null
          created_by: string | null
          id: string
          project_id: string
          scene_id: string
        }
        Insert: {
          concept_asset_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          project_id: string
          scene_id: string
        }
        Update: {
          concept_asset_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          project_id?: string
          scene_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scene_references_concept_asset_id_fkey"
            columns: ["concept_asset_id"]
            isOneToOne: false
            referencedRelation: "concept_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scene_references_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scene_references_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scene_references_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      scene_schedule: {
        Row: {
          created_at: string | null
          estimated_hours: number | null
          id: string
          location: string | null
          order_index: number | null
          project_id: string
          scene_heading: string | null
          scene_number: string | null
          script_id: string | null
          shoot_day_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          estimated_hours?: number | null
          id?: string
          location?: string | null
          order_index?: number | null
          project_id: string
          scene_heading?: string | null
          scene_number?: string | null
          script_id?: string | null
          shoot_day_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          estimated_hours?: number | null
          id?: string
          location?: string | null
          order_index?: number | null
          project_id?: string
          scene_heading?: string | null
          scene_number?: string | null
          script_id?: string | null
          shoot_day_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scene_schedule_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scene_schedule_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scene_schedule_shoot_day_id_fkey"
            columns: ["shoot_day_id"]
            isOneToOne: false
            referencedRelation: "shoot_days"
            referencedColumns: ["id"]
          },
        ]
      }
      scenes: {
        Row: {
          cast_list: string | null
          created_at: string | null
          elements: Json
          est_duration: string | null
          id: string
          location: string | null
          project_id: string
          scene_number: number
          shoot_day: number | null
          status: string
          time_of_day: string | null
          title: string
        }
        Insert: {
          cast_list?: string | null
          created_at?: string | null
          elements?: Json
          est_duration?: string | null
          id?: string
          location?: string | null
          project_id: string
          scene_number: number
          shoot_day?: number | null
          status?: string
          time_of_day?: string | null
          title: string
        }
        Update: {
          cast_list?: string | null
          created_at?: string | null
          elements?: Json
          est_duration?: string | null
          id?: string
          location?: string | null
          project_id?: string
          scene_number?: number
          shoot_day?: number | null
          status?: string
          time_of_day?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      screenplay_collaborators: {
        Row: {
          created_at: string | null
          cursor_col: number | null
          cursor_line: number | null
          id: string
          last_activity: string | null
          role: string
          screenplay_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          cursor_col?: number | null
          cursor_line?: number | null
          id?: string
          last_activity?: string | null
          role?: string
          screenplay_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          cursor_col?: number | null
          cursor_line?: number | null
          id?: string
          last_activity?: string | null
          role?: string
          screenplay_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      script_annotations: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          line_index: number
          project_id: string
          script_id: string
          text: string
          type: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          line_index: number
          project_id: string
          script_id: string
          text: string
          type: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          line_index?: number
          project_id?: string
          script_id?: string
          text?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "script_annotations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "script_annotations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "script_annotations_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      script_characters: {
        Row: {
          age: string | null
          arc: string | null
          backstory: string | null
          color: string | null
          created_at: string | null
          description: string | null
          full_name: string | null
          id: string
          motivation: string | null
          name: string
          notes: string | null
          relationships: string | null
          script_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          age?: string | null
          arc?: string | null
          backstory?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          full_name?: string | null
          id?: string
          motivation?: string | null
          name: string
          notes?: string | null
          relationships?: string | null
          script_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          age?: string | null
          arc?: string | null
          backstory?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          full_name?: string | null
          id?: string
          motivation?: string | null
          name?: string
          notes?: string | null
          relationships?: string | null
          script_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "script_characters_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "script_characters_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      script_collaborators: {
        Row: {
          id: string
          joined_at: string | null
          permissions: string | null
          script_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string | null
          permissions?: string | null
          script_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string | null
          permissions?: string | null
          script_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "script_collaborators_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "script_collaborators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      script_metadata: {
        Row: {
          character_bible: Json
          script_id: string
          title_page: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          character_bible?: Json
          script_id: string
          title_page?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          character_bible?: Json
          script_id?: string
          title_page?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "script_metadata_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: true
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      script_notes: {
        Row: {
          created_at: string
          id: string
          line_id: string | null
          note: string
          project_id: string | null
          script_id: string | null
          selected_text: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          line_id?: string | null
          note: string
          project_id?: string | null
          script_id?: string | null
          selected_text?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          line_id?: string | null
          note?: string
          project_id?: string | null
          script_id?: string | null
          selected_text?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "script_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "script_notes_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      script_revisions: {
        Row: {
          color_index: number
          created_at: string | null
          created_by: string | null
          id: string
          label: string
          script_id: string
          snapshot: string
        }
        Insert: {
          color_index?: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          label: string
          script_id: string
          snapshot?: string
        }
        Update: {
          color_index?: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          label?: string
          script_id?: string
          snapshot?: string
        }
        Relationships: [
          {
            foreignKeyName: "script_revisions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "script_revisions_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      script_versions: {
        Row: {
          content: string
          created_at: string | null
          edited_by: string | null
          id: string
          script_id: string
          version: number
        }
        Insert: {
          content: string
          created_at?: string | null
          edited_by?: string | null
          id?: string
          script_id: string
          version: number
        }
        Update: {
          content?: string
          created_at?: string | null
          edited_by?: string | null
          id?: string
          script_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "script_versions_edited_by_fkey"
            columns: ["edited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "script_versions_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      scripts: {
        Row: {
          content: string | null
          created_at: string | null
          created_by: string | null
          daily_goal: number | null
          format: string | null
          id: string
          last_edited_by: string | null
          learned_rules: Json | null
          project_id: string | null
          share_token: string | null
          shared: boolean | null
          sprint_minutes: number | null
          stash_items: Json | null
          status: string | null
          title: string
          title_page: Json | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          daily_goal?: number | null
          format?: string | null
          id?: string
          last_edited_by?: string | null
          learned_rules?: Json | null
          project_id?: string | null
          share_token?: string | null
          shared?: boolean | null
          sprint_minutes?: number | null
          stash_items?: Json | null
          status?: string | null
          title: string
          title_page?: Json | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          daily_goal?: number | null
          format?: string | null
          id?: string
          last_edited_by?: string | null
          learned_rules?: Json | null
          project_id?: string | null
          share_token?: string | null
          shared?: boolean | null
          sprint_minutes?: number | null
          stash_items?: Json | null
          status?: string | null
          title?: string
          title_page?: Json | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scripts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scripts_last_edited_by_fkey"
            columns: ["last_edited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scripts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      sfx_assets: {
        Row: {
          audio_url: string
          created_at: string | null
          duration: number | null
          id: string
          project_id: string
          tags: string[] | null
          title: string
          user_id: string
        }
        Insert: {
          audio_url: string
          created_at?: string | null
          duration?: number | null
          id?: string
          project_id: string
          tags?: string[] | null
          title: string
          user_id: string
        }
        Update: {
          audio_url?: string
          created_at?: string | null
          duration?: number | null
          id?: string
          project_id?: string
          tags?: string[] | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sfx_assets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sfx_assets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shoot_days: {
        Row: {
          created_at: string | null
          day_number: number | null
          id: string
          project_id: string
          shoot_date: string | null
        }
        Insert: {
          created_at?: string | null
          day_number?: number | null
          id?: string
          project_id: string
          shoot_date?: string | null
        }
        Update: {
          created_at?: string | null
          day_number?: number | null
          id?: string
          project_id?: string
          shoot_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shoot_days_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      shots: {
        Row: {
          angle: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          lens: string | null
          movement: string | null
          order_index: number | null
          project_id: string
          scene_id: string
          shot_number: string
          shot_size: string | null
          status: string | null
        }
        Insert: {
          angle?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          lens?: string | null
          movement?: string | null
          order_index?: number | null
          project_id: string
          scene_id: string
          shot_number: string
          shot_size?: string | null
          status?: string | null
        }
        Update: {
          angle?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          lens?: string | null
          movement?: string | null
          order_index?: number | null
          project_id?: string
          scene_id?: string
          shot_number?: string
          shot_size?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shots_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shots_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      spotify_connections: {
        Row: {
          access_token: string
          expires_at: number
          refresh_token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          expires_at: number
          refresh_token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          expires_at?: number
          refresh_token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      studio_assets: {
        Row: {
          asset_type: string | null
          asset_url: string
          board_id: string
          category: string | null
          created_at: string | null
          height: number | null
          id: string
          position_x: number | null
          position_y: number | null
          title: string | null
          user_id: string
          width: number | null
        }
        Insert: {
          asset_type?: string | null
          asset_url: string
          board_id: string
          category?: string | null
          created_at?: string | null
          height?: number | null
          id?: string
          position_x?: number | null
          position_y?: number | null
          title?: string | null
          user_id: string
          width?: number | null
        }
        Update: {
          asset_type?: string | null
          asset_url?: string
          board_id?: string
          category?: string | null
          created_at?: string | null
          height?: number | null
          id?: string
          position_x?: number | null
          position_y?: number | null
          title?: string | null
          user_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "studio_assets_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "studio_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_assets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_boards: {
        Row: {
          background_color: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          project_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          background_color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          project_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          background_color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          project_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_boards_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_boards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      timeline_items: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          project_id: string
          start_date: string | null
          status: string | null
          title: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          project_id: string
          start_date?: string | null
          status?: string | null
          title?: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          project_id?: string
          start_date?: string | null
          status?: string | null
          title?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timeline_items_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_presence: {
        Row: {
          current_activity: string | null
          current_location: string | null
          cursor_col: number | null
          cursor_line: number | null
          id: string
          last_seen: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          current_activity?: string | null
          current_location?: string | null
          cursor_col?: number | null
          cursor_line?: number | null
          id?: string
          last_seen?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          current_activity?: string | null
          current_location?: string | null
          cursor_col?: number | null
          cursor_line?: number | null
          id?: string
          last_seen?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      active_users: {
        Row: {
          current_activity: string | null
          current_location: string | null
          id: string | null
          idle_seconds: number | null
          last_seen: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          current_activity?: string | null
          current_location?: string | null
          id?: string | null
          idle_seconds?: never
          last_seen?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          current_activity?: string | null
          current_location?: string | null
          id?: string | null
          idle_seconds?: never
          last_seen?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      channel_activity: {
        Row: {
          id: string | null
          last_message: string | null
          message_count: number | null
          name: string | null
          unique_senders: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_manage_channel: { Args: { cid: string }; Returns: boolean }
      can_post_channel: { Args: { cid: string }; Returns: boolean }
      clean_old_presences: { Args: never; Returns: undefined }
      has_discord_webhook: { Args: { cid: string }; Returns: boolean }
      toggle_message_reaction: {
        Args: { p_emoji: string; p_message: string }
        Returns: Json
      }
      update_collaborator_cursor: {
        Args: {
          p_col: number
          p_line: number
          p_screenplay_id: string
          p_user_id: string
        }
        Returns: {
          created_at: string | null
          cursor_col: number | null
          cursor_line: number | null
          id: string
          last_activity: string | null
          role: string
          screenplay_id: string
          updated_at: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "screenplay_collaborators"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_user_presence: {
        Args: {
          p_activity?: string
          p_location?: string
          p_status?: string
          p_user_id: string
        }
        Returns: {
          current_activity: string | null
          current_location: string | null
          cursor_col: number | null
          cursor_line: number | null
          id: string
          last_seen: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_presence"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
