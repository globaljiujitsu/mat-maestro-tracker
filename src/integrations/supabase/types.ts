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
      attendance: {
        Row: {
          booking_status: Database["public"]["Enums"]["booking_status"]
          check_in_status: Database["public"]["Enums"]["check_in_status"]
          class_id: string
          created_at: string
          id: string
          student_id: string
          updated_at: string
        }
        Insert: {
          booking_status?: Database["public"]["Enums"]["booking_status"]
          check_in_status?: Database["public"]["Enums"]["check_in_status"]
          class_id: string
          created_at?: string
          id?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          booking_status?: Database["public"]["Enums"]["booking_status"]
          check_in_status?: Database["public"]["Enums"]["check_in_status"]
          class_id?: string
          created_at?: string
          id?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_class_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      certificates: {
        Row: {
          created_at: string
          id: string
          issue_date: string
          metadata: Json | null
          pdf_url: string | null
          student_id: string
          type: Database["public"]["Enums"]["certificate_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          issue_date?: string
          metadata?: Json | null
          pdf_url?: string | null
          student_id: string
          type: Database["public"]["Enums"]["certificate_type"]
        }
        Update: {
          created_at?: string
          id?: string
          issue_date?: string
          metadata?: Json | null
          pdf_url?: string | null
          student_id?: string
          type?: Database["public"]["Enums"]["certificate_type"]
        }
        Relationships: [
          {
            foreignKeyName: "cert_student_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      championships: {
        Row: {
          created_at: string
          date: string
          description: string | null
          id: string
          name: string
          photo_url: string | null
          result: Database["public"]["Enums"]["championship_result"]
          student_id: string
        }
        Insert: {
          created_at?: string
          date: string
          description?: string | null
          id?: string
          name: string
          photo_url?: string | null
          result: Database["public"]["Enums"]["championship_result"]
          student_id: string
        }
        Update: {
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          name?: string
          photo_url?: string | null
          result?: Database["public"]["Enums"]["championship_result"]
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "championships_student_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          branch_id: string
          created_at: string
          date: string
          description: string | null
          duration_hours: number
          id: string
          instructor_id: string
          max_capacity: number
          status: Database["public"]["Enums"]["class_status"]
          time: string
          title: string
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          date: string
          description?: string | null
          duration_hours?: number
          id?: string
          instructor_id: string
          max_capacity?: number
          status?: Database["public"]["Enums"]["class_status"]
          time: string
          title: string
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          date?: string
          description?: string | null
          duration_hours?: number
          id?: string
          instructor_id?: string
          max_capacity?: number
          status?: Database["public"]["Enums"]["class_status"]
          time?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_branch_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_instructor_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      instructor_videos: {
        Row: {
          description: string | null
          id: string
          instructor_id: string
          publication_date: string
          title: string
          youtube_url: string
        }
        Insert: {
          description?: string | null
          id?: string
          instructor_id: string
          publication_date?: string
          title: string
          youtube_url: string
        }
        Update: {
          description?: string | null
          id?: string
          instructor_id?: string
          publication_date?: string
          title?: string
          youtube_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "iv_instructor_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      instructors: {
        Row: {
          age: number | null
          belt_rank: Database["public"]["Enums"]["belt_rank"]
          biography: string | null
          branch_id: string | null
          championships_won: string[] | null
          created_at: string
          id: string
          is_active: boolean
          total_classes_taught: number
          total_hours_taught: number
          years_of_experience: number | null
        }
        Insert: {
          age?: number | null
          belt_rank?: Database["public"]["Enums"]["belt_rank"]
          biography?: string | null
          branch_id?: string | null
          championships_won?: string[] | null
          created_at?: string
          id: string
          is_active?: boolean
          total_classes_taught?: number
          total_hours_taught?: number
          years_of_experience?: number | null
        }
        Update: {
          age?: number | null
          belt_rank?: Database["public"]["Enums"]["belt_rank"]
          biography?: string | null
          branch_id?: string | null
          championships_won?: string[] | null
          created_at?: string
          id?: string
          is_active?: boolean
          total_classes_taught?: number
          total_hours_taught?: number
          years_of_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "instructors_branch_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instructors_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      rankings: {
        Row: {
          branch_id: string | null
          created_at: string
          id: string
          rank_position: number | null
          student_id: string
          type: Database["public"]["Enums"]["ranking_type"]
          week_start: string
          weekly_attendance_count: number
          weekly_hours: number
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          id?: string
          rank_position?: number | null
          student_id: string
          type: Database["public"]["Enums"]["ranking_type"]
          week_start?: string
          weekly_attendance_count?: number
          weekly_hours?: number
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          id?: string
          rank_position?: number | null
          student_id?: string
          type?: Database["public"]["Enums"]["ranking_type"]
          week_start?: string
          weekly_attendance_count?: number
          weekly_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "rankings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rankings_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          age: number | null
          attendance_percentage: number
          belt_rank: Database["public"]["Enums"]["belt_rank"]
          branch_id: string | null
          created_at: string
          id: string
          is_active: boolean
          join_date: string
          ranking_position_branch: number | null
          ranking_position_global: number | null
          total_classes_attended: number
          total_training_hours: number
        }
        Insert: {
          age?: number | null
          attendance_percentage?: number
          belt_rank?: Database["public"]["Enums"]["belt_rank"]
          branch_id?: string | null
          created_at?: string
          id: string
          is_active?: boolean
          join_date?: string
          ranking_position_branch?: number | null
          ranking_position_global?: number | null
          total_classes_attended?: number
          total_training_hours?: number
        }
        Update: {
          age?: number | null
          attendance_percentage?: number
          belt_rank?: Database["public"]["Enums"]["belt_rank"]
          branch_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          join_date?: string
          ranking_position_branch?: number | null
          ranking_position_global?: number | null
          total_classes_attended?: number
          total_training_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "students_branch_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      technique_progress: {
        Row: {
          evaluated_by: string | null
          id: string
          status: Database["public"]["Enums"]["technique_status"]
          student_id: string
          technique_id: string
          updated_at: string
        }
        Insert: {
          evaluated_by?: string | null
          id?: string
          status?: Database["public"]["Enums"]["technique_status"]
          student_id: string
          technique_id: string
          updated_at?: string
        }
        Update: {
          evaluated_by?: string | null
          id?: string
          status?: Database["public"]["Enums"]["technique_status"]
          student_id?: string
          technique_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tp_evaluator_fkey"
            columns: ["evaluated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tp_student_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tp_technique_fkey"
            columns: ["technique_id"]
            isOneToOne: false
            referencedRelation: "techniques"
            referencedColumns: ["id"]
          },
        ]
      }
      techniques: {
        Row: {
          belt_level: Database["public"]["Enums"]["belt_rank"]
          branch_id: string | null
          category: string
          created_at: string
          description: string | null
          display_order: number
          id: string
          learning_objectives: string[] | null
          lottie_url: string | null
          title: string
          uploaded_by: string | null
          video_url: string | null
        }
        Insert: {
          belt_level: Database["public"]["Enums"]["belt_rank"]
          branch_id?: string | null
          category: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          learning_objectives?: string[] | null
          lottie_url?: string | null
          title: string
          uploaded_by?: string | null
          video_url?: string | null
        }
        Update: {
          belt_level?: Database["public"]["Enums"]["belt_rank"]
          branch_id?: string | null
          category?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          learning_objectives?: string[] | null
          lottie_url?: string | null
          title?: string
          uploaded_by?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_exists: { Args: never; Returns: boolean }
      auto_finalize_classes: { Args: never; Returns: undefined }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      monthly_top_students: {
        Args: { _branch_id?: string; _limit?: number; _month: string }
        Returns: {
          avatar_url: string
          branch_id: string
          branch_name: string
          classes_count: number
          full_name: string
          hours: number
          student_id: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "instructor" | "student"
      belt_rank: "white" | "blue" | "purple" | "brown" | "black"
      booking_status: "confirmed" | "cancelled" | "none"
      certificate_type: "student_of_month" | "belt_promotion"
      championship_result: "oro" | "plata" | "bronce" | "participacion"
      check_in_status: "present" | "absent" | "pending"
      class_status: "scheduled" | "cancelled" | "completed"
      ranking_type: "global" | "branch"
      technique_status: "not_evaluated" | "in_progress" | "mastered"
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
      app_role: ["admin", "instructor", "student"],
      belt_rank: ["white", "blue", "purple", "brown", "black"],
      booking_status: ["confirmed", "cancelled", "none"],
      certificate_type: ["student_of_month", "belt_promotion"],
      championship_result: ["oro", "plata", "bronce", "participacion"],
      check_in_status: ["present", "absent", "pending"],
      class_status: ["scheduled", "cancelled", "completed"],
      ranking_type: ["global", "branch"],
      technique_status: ["not_evaluated", "in_progress", "mastered"],
    },
  },
} as const
