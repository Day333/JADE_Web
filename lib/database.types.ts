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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          description: string
          icon: string
          id: string
          name: string
          points: number
          sort: number
          tier: string
        }
        Insert: {
          description: string
          icon: string
          id: string
          name: string
          points?: number
          sort?: number
          tier: string
        }
        Update: {
          description?: string
          icon?: string
          id?: string
          name?: string
          points?: number
          sort?: number
          tier?: string
        }
        Relationships: []
      }
      application_events: {
        Row: {
          actor_id: string | null
          application_id: string
          created_at: string
          id: string
          note: string | null
          status: Database["public"]["Enums"]["application_status"]
        }
        Insert: {
          actor_id?: string | null
          application_id: string
          created_at?: string
          id?: string
          note?: string | null
          status: Database["public"]["Enums"]["application_status"]
        }
        Update: {
          actor_id?: string | null
          application_id?: string
          created_at?: string
          id?: string
          note?: string | null
          status?: Database["public"]["Enums"]["application_status"]
        }
        Relationships: [
          {
            foreignKeyName: "application_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_events_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          cover_letter: string | null
          created_at: string
          id: string
          job_id: string
          resume_id: string | null
          share_portfolio: boolean
          share_profile: boolean
          shortlisted: boolean
          status: Database["public"]["Enums"]["application_status"]
          submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_letter?: string | null
          created_at?: string
          id?: string
          job_id: string
          resume_id?: string | null
          share_portfolio?: boolean
          share_profile?: boolean
          shortlisted?: boolean
          status?: Database["public"]["Enums"]["application_status"]
          submitted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_letter?: string | null
          created_at?: string
          id?: string
          job_id?: string
          resume_id?: string | null
          share_portfolio?: boolean
          share_profile?: boolean
          shortlisted?: boolean
          status?: Database["public"]["Enums"]["application_status"]
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      career_goals: {
        Row: {
          career_id: string
          set_at: string
          user_id: string
        }
        Insert: {
          career_id: string
          set_at?: string
          user_id: string
        }
        Update: {
          career_id?: string
          set_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "career_goals_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "careers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "career_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      career_plans: {
        Row: {
          career_id: string
          content: Json
          created_at: string
          id: string
          model: string | null
          source: string
          user_id: string
        }
        Insert: {
          career_id: string
          content: Json
          created_at?: string
          id?: string
          model?: string | null
          source: string
          user_id: string
        }
        Update: {
          career_id?: string
          content?: Json
          created_at?: string
          id?: string
          model?: string | null
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "career_plans_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "careers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "career_plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      career_preferences: {
        Row: {
          answers: Json
          company_types: string[]
          interested_careers: string[]
          interested_industries: string[]
          preferred_locations: string[]
          scores: Json
          updated_at: string
          user_id: string
          work_types: string[]
        }
        Insert: {
          answers?: Json
          company_types?: string[]
          interested_careers?: string[]
          interested_industries?: string[]
          preferred_locations?: string[]
          scores?: Json
          updated_at?: string
          user_id: string
          work_types?: string[]
        }
        Update: {
          answers?: Json
          company_types?: string[]
          interested_careers?: string[]
          interested_industries?: string[]
          preferred_locations?: string[]
          scores?: Json
          updated_at?: string
          user_id?: string
          work_types?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "career_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      career_skills: {
        Row: {
          career_id: string
          importance: number
          skill_id: string
          target_level: number
          why: string | null
        }
        Insert: {
          career_id: string
          importance?: number
          skill_id: string
          target_level?: number
          why?: string | null
        }
        Update: {
          career_id?: string
          importance?: number
          skill_id?: string
          target_level?: number
          why?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "career_skills_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "careers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "career_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      careers: {
        Row: {
          career_path: string[]
          created_at: string
          field: string
          id: string
          preference_profile: Json
          responsibilities: string[]
          summary: string
          title: string
          traits: string[]
        }
        Insert: {
          career_path?: string[]
          created_at?: string
          field: string
          id: string
          preference_profile?: Json
          responsibilities?: string[]
          summary: string
          title: string
          traits?: string[]
        }
        Update: {
          career_path?: string[]
          created_at?: string
          field?: string
          id?: string
          preference_profile?: Json
          responsibilities?: string[]
          summary?: string
          title?: string
          traits?: string[]
        }
        Relationships: []
      }
      certifications: {
        Row: {
          created_at: string
          id: string
          issuer: string | null
          name: string
          url: string | null
          user_id: string
          year: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          issuer?: string | null
          name: string
          url?: string | null
          user_id: string
          year?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          issuer?: string | null
          name?: string
          url?: string | null
          user_id?: string
          year?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          post_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          post_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      communities: {
        Row: {
          career_id: string | null
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          kind: Database["public"]["Enums"]["community_kind"]
          name: string
          slug: string
        }
        Insert: {
          career_id?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          kind: Database["public"]["Enums"]["community_kind"]
          name: string
          slug: string
        }
        Update: {
          career_id?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["community_kind"]
          name?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "communities_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "careers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          industry: string | null
          is_sample: boolean
          location: string | null
          name: string
          size: string | null
          slug: string
          website: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          industry?: string | null
          is_sample?: boolean
          location?: string | null
          name: string
          size?: string | null
          slug: string
          website?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          industry?: string | null
          is_sample?: boolean
          location?: string | null
          name?: string
          size?: string | null
          slug?: string
          website?: string | null
        }
        Relationships: []
      }
      conversation_members: {
        Row: {
          conversation_id: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          job_id: string | null
          last_message_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          job_id?: string | null
          last_message_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          job_id?: string | null
          last_message_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      educations: {
        Row: {
          courses: string[]
          created_at: string
          degree: string | null
          end_date: string | null
          field: string | null
          id: string
          position: number
          school: string
          start_date: string | null
          user_id: string
        }
        Insert: {
          courses?: string[]
          created_at?: string
          degree?: string | null
          end_date?: string | null
          field?: string | null
          id?: string
          position?: number
          school: string
          start_date?: string | null
          user_id: string
        }
        Update: {
          courses?: string[]
          created_at?: string
          degree?: string | null
          end_date?: string | null
          field?: string | null
          id?: string
          position?: number
          school?: string
          start_date?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "educations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      experiences: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          kind: Database["public"]["Enums"]["experience_kind"]
          organization: string | null
          position: number
          skills: string[]
          start_date: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["experience_kind"]
          organization?: string | null
          position?: number
          skills?: string[]
          start_date?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["experience_kind"]
          organization?: string | null
          position?: number
          skills?: string[]
          start_date?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "experiences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          target_id: string
          target_type: Database["public"]["Enums"]["follow_target"]
        }
        Insert: {
          created_at?: string
          follower_id: string
          target_id: string
          target_type: Database["public"]["Enums"]["follow_target"]
        }
        Update: {
          created_at?: string
          follower_id?: string
          target_id?: string
          target_type?: Database["public"]["Enums"]["follow_target"]
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          candidate_id: string
          created_at: string
          id: string
          job_id: string
          kind: Database["public"]["Enums"]["invitation_kind"]
          message: string | null
          recruiter_id: string
          status: Database["public"]["Enums"]["invitation_status"]
        }
        Insert: {
          candidate_id: string
          created_at?: string
          id?: string
          job_id: string
          kind: Database["public"]["Enums"]["invitation_kind"]
          message?: string | null
          recruiter_id: string
          status?: Database["public"]["Enums"]["invitation_status"]
        }
        Update: {
          candidate_id?: string
          created_at?: string
          id?: string
          job_id?: string
          kind?: Database["public"]["Enums"]["invitation_kind"]
          message?: string | null
          recruiter_id?: string
          status?: Database["public"]["Enums"]["invitation_status"]
        }
        Relationships: [
          {
            foreignKeyName: "invitations_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          career_id: string | null
          company_id: string
          created_at: string
          deadline: string | null
          description: string | null
          description_is_excerpt: boolean
          education_requirement: string | null
          experience_level: string | null
          grad_years: number[]
          id: string
          industry: string | null
          is_sample: boolean
          job_type: Database["public"]["Enums"]["job_type"]
          location: string | null
          posted_by: string | null
          preferred_qualifications: string[]
          preferred_skills: string[]
          required_skills: string[]
          requirements: string[]
          responsibilities: string[]
          salary_range: string | null
          source_board: string | null
          source_external_id: string | null
          source_group: string | null
          source_posted_at: string | null
          source_url: string | null
          status: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at: string
        }
        Insert: {
          career_id?: string | null
          company_id: string
          created_at?: string
          deadline?: string | null
          description?: string | null
          description_is_excerpt?: boolean
          education_requirement?: string | null
          experience_level?: string | null
          grad_years?: number[]
          id?: string
          industry?: string | null
          is_sample?: boolean
          job_type?: Database["public"]["Enums"]["job_type"]
          location?: string | null
          posted_by?: string | null
          preferred_qualifications?: string[]
          preferred_skills?: string[]
          required_skills?: string[]
          requirements?: string[]
          responsibilities?: string[]
          salary_range?: string | null
          source_board?: string | null
          source_external_id?: string | null
          source_group?: string | null
          source_posted_at?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at?: string
        }
        Update: {
          career_id?: string | null
          company_id?: string
          created_at?: string
          deadline?: string | null
          description?: string | null
          description_is_excerpt?: boolean
          education_requirement?: string | null
          experience_level?: string | null
          grad_years?: number[]
          id?: string
          industry?: string | null
          is_sample?: boolean
          job_type?: Database["public"]["Enums"]["job_type"]
          location?: string | null
          posted_by?: string | null
          preferred_qualifications?: string[]
          preferred_skills?: string[]
          required_skills?: string[]
          requirements?: string[]
          responsibilities?: string[]
          salary_range?: string | null
          source_board?: string | null
          source_external_id?: string | null
          source_group?: string | null
          source_posted_at?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "careers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      journey_entries: {
        Row: {
          created_at: string
          description: string | null
          id: string
          subtitle: string | null
          title: string
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          subtitle?: string | null
          title: string
          user_id: string
          year: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          subtitle?: string | null
          title?: string
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "journey_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment: Json | null
          body: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          attachment?: Json | null
          body?: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          attachment?: Json | null
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
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
          actor_id: string | null
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          kind: string
          link: string | null
          title: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          kind: string
          link?: string | null
          title: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          kind?: string
          link?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          kind: string
          title: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          kind?: string
          title: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          kind?: string
          title?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_saves: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_saves_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_saves_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          body: string
          comment_count: number
          community_id: string | null
          created_at: string
          id: string
          like_count: number
          tags: string[]
          title: string
          type: Database["public"]["Enums"]["post_type"]
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          comment_count?: number
          community_id?: string | null
          created_at?: string
          id?: string
          like_count?: number
          tags?: string[]
          title: string
          type?: Database["public"]["Enums"]["post_type"]
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          comment_count?: number
          community_id?: string | null
          created_at?: string
          id?: string
          like_count?: number
          tags?: string[]
          title?: string
          type?: Database["public"]["Enums"]["post_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_progress: {
        Row: {
          done_at: string
          question_id: string
          user_id: string
        }
        Insert: {
          done_at?: string
          question_id: string
          user_id: string
        }
        Update: {
          done_at?: string
          question_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_progress_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "practice_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_questions: {
        Row: {
          answer: string
          category: string
          created_at: string
          difficulty: string
          id: string
          question: string
          sort: number
          tags: string[]
        }
        Insert: {
          answer: string
          category: string
          created_at?: string
          difficulty: string
          id: string
          question: string
          sort?: number
          tags?: string[]
        }
        Update: {
          answer?: string
          category?: string
          created_at?: string
          difficulty?: string
          id?: string
          question?: string
          sort?: number
          tags?: string[]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          allow_recruiter_contact: boolean
          avatar_url: string | null
          bio: string | null
          company_id: string | null
          created_at: string
          degree: string | null
          dm_policy: Database["public"]["Enums"]["dm_policy"]
          full_name: string | null
          github_url: string | null
          goal_public: boolean
          graduation_year: number | null
          headline: string | null
          id: string
          is_pro: boolean
          linkedin_url: string | null
          location: string | null
          major: string | null
          onboarding_step: string
          open_to_opportunities: boolean
          profile_public: boolean
          resume_public: boolean
          role: Database["public"]["Enums"]["user_role"]
          show_status_to_recruiters: boolean
          university: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          allow_recruiter_contact?: boolean
          avatar_url?: string | null
          bio?: string | null
          company_id?: string | null
          created_at?: string
          degree?: string | null
          dm_policy?: Database["public"]["Enums"]["dm_policy"]
          full_name?: string | null
          github_url?: string | null
          goal_public?: boolean
          graduation_year?: number | null
          headline?: string | null
          id: string
          is_pro?: boolean
          linkedin_url?: string | null
          location?: string | null
          major?: string | null
          onboarding_step?: string
          open_to_opportunities?: boolean
          profile_public?: boolean
          resume_public?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          show_status_to_recruiters?: boolean
          university?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          allow_recruiter_contact?: boolean
          avatar_url?: string | null
          bio?: string | null
          company_id?: string | null
          created_at?: string
          degree?: string | null
          dm_policy?: Database["public"]["Enums"]["dm_policy"]
          full_name?: string | null
          github_url?: string | null
          goal_public?: boolean
          graduation_year?: number | null
          headline?: string | null
          id?: string
          is_pro?: boolean
          linkedin_url?: string | null
          location?: string | null
          major?: string | null
          onboarding_step?: string
          open_to_opportunities?: boolean
          profile_public?: boolean
          resume_public?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          show_status_to_recruiters?: boolean
          university?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          roadmap_stage_id: string | null
          role: string | null
          skills: string[]
          url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          roadmap_stage_id?: string | null
          role?: string | null
          skills?: string[]
          url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          roadmap_stage_id?: string | null
          role?: string | null
          skills?: string[]
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_roadmap_stage_fk"
            columns: ["roadmap_stage_id"]
            isOneToOne: false
            referencedRelation: "roadmap_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      resumes: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          id: string
          is_primary: boolean
          parsed: Json | null
          raw_text: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          id?: string
          is_primary?: boolean
          parsed?: Json | null
          raw_text?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          id?: string
          is_primary?: boolean
          parsed?: Json | null
          raw_text?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resumes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      roadmap_stages: {
        Row: {
          completed_at: string | null
          description: string | null
          evidence_note: string | null
          evidence_url: string | null
          id: string
          kind: Database["public"]["Enums"]["roadmap_stage_kind"]
          period_label: string
          position: number
          roadmap_id: string
          skill_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          description?: string | null
          evidence_note?: string | null
          evidence_url?: string | null
          id?: string
          kind: Database["public"]["Enums"]["roadmap_stage_kind"]
          period_label: string
          position: number
          roadmap_id: string
          skill_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          description?: string | null
          evidence_note?: string | null
          evidence_url?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["roadmap_stage_kind"]
          period_label?: string
          position?: number
          roadmap_id?: string
          skill_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_stages_roadmap_id_fkey"
            columns: ["roadmap_id"]
            isOneToOne: false
            referencedRelation: "roadmaps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roadmap_stages_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roadmap_stages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      roadmap_tasks: {
        Row: {
          done_at: string | null
          id: string
          is_done: boolean
          position: number
          skill_id: string | null
          stage_id: string
          target_level: number | null
          title: string
          user_id: string
        }
        Insert: {
          done_at?: string | null
          id?: string
          is_done?: boolean
          position?: number
          skill_id?: string | null
          stage_id: string
          target_level?: number | null
          title: string
          user_id: string
        }
        Update: {
          done_at?: string | null
          id?: string
          is_done?: boolean
          position?: number
          skill_id?: string | null
          stage_id?: string
          target_level?: number | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_tasks_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roadmap_tasks_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "roadmap_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roadmap_tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      roadmaps: {
        Row: {
          career_id: string
          created_at: string
          id: string
          is_active: boolean
          user_id: string
        }
        Insert: {
          career_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          user_id: string
        }
        Update: {
          career_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roadmaps_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "careers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roadmaps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_candidates: {
        Row: {
          candidate_id: string
          created_at: string
          recruiter_id: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          recruiter_id: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          recruiter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_candidates_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_candidates_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          aliases: string[]
          category: Database["public"]["Enums"]["skill_category"]
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_custom: boolean
          learn_hint: string | null
          name: string
        }
        Insert: {
          aliases?: string[]
          category?: Database["public"]["Enums"]["skill_category"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          id: string
          is_custom?: boolean
          learn_hint?: string | null
          name: string
        }
        Update: {
          aliases?: string[]
          category?: Database["public"]["Enums"]["skill_category"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_custom?: boolean
          learn_hint?: string | null
          name?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          earned_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_skills: {
        Row: {
          level: number
          skill_id: string
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          level?: number
          skill_id: string
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          level?: number
          skill_id?: string
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_skills_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_invite: {
        Args: { p_candidate: string; p_job: string }
        Returns: boolean
      }
      can_read_resume_path: { Args: { p_path: string }; Returns: boolean }
      can_view_profile: { Args: { p_user: string }; Returns: boolean }
      can_view_resume: { Args: { p_resume: string }; Returns: boolean }
      is_conversation_member: {
        Args: { p_conversation: string }
        Returns: boolean
      }
      is_job_manager: { Args: { p_job: string }; Returns: boolean }
      is_recruiter: { Args: never; Returns: boolean }
      mark_conversation_read: {
        Args: { p_conversation: string }
        Returns: undefined
      }
      my_company_id: { Args: never; Returns: string }
      notify: {
        Args: {
          p_actor: string
          p_body: string
          p_kind: string
          p_link: string
          p_title: string
          p_user: string
        }
        Returns: undefined
      }
      public_activity: {
        Args: { p_user: string }
        Returns: {
          day: string
          total: number
        }[]
      }
      refresh_achievements: { Args: never; Returns: string[] }
      set_application_shortlisted: {
        Args: { p_application: string; p_value: boolean }
        Returns: undefined
      }
      set_application_status: {
        Args: {
          p_application: string
          p_note?: string
          p_status: Database["public"]["Enums"]["application_status"]
        }
        Returns: undefined
      }
      start_conversation: {
        Args: { p_job?: string; p_other: string }
        Returns: string
      }
    }
    Enums: {
      application_status:
        | "saved"
        | "applied"
        | "viewed"
        | "screening"
        | "interview"
        | "offer"
        | "rejected"
        | "withdrawn"
      community_kind: "career" | "company" | "university" | "topic"
      dm_policy: "everyone" | "followers" | "none"
      experience_kind:
        | "internship"
        | "work"
        | "research"
        | "volunteer"
        | "other"
      follow_target: "user" | "career" | "company" | "community" | "topic"
      invitation_kind: "apply" | "interview"
      invitation_status: "pending" | "accepted" | "declined"
      job_status: "draft" | "open" | "closed"
      job_type: "internship" | "graduate" | "part_time" | "full_time"
      post_type:
        | "experience"
        | "career_journey"
        | "interview"
        | "company_review"
        | "graduate_program"
        | "internship"
        | "question"
        | "resource"
      roadmap_stage_kind: "skill" | "project" | "portfolio" | "apply"
      skill_category: "technical" | "tool" | "domain" | "soft"
      user_role: "seeker" | "recruiter"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      application_status: [
        "saved",
        "applied",
        "viewed",
        "screening",
        "interview",
        "offer",
        "rejected",
        "withdrawn",
      ],
      community_kind: ["career", "company", "university", "topic"],
      dm_policy: ["everyone", "followers", "none"],
      experience_kind: ["internship", "work", "research", "volunteer", "other"],
      follow_target: ["user", "career", "company", "community", "topic"],
      invitation_kind: ["apply", "interview"],
      invitation_status: ["pending", "accepted", "declined"],
      job_status: ["draft", "open", "closed"],
      job_type: ["internship", "graduate", "part_time", "full_time"],
      post_type: [
        "experience",
        "career_journey",
        "interview",
        "company_review",
        "graduate_program",
        "internship",
        "question",
        "resource",
      ],
      roadmap_stage_kind: ["skill", "project", "portfolio", "apply"],
      skill_category: ["technical", "tool", "domain", "soft"],
      user_role: ["seeker", "recruiter"],
    },
  },
} as const
