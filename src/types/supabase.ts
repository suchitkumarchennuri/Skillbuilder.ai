export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      resume_analyses: {
        Row: {
          id: string
          user_id: string
          resume_text: string
          job_description: string
          matching_skills: string[]
          missing_skills: string[]
          score: number
          suggestions: string[]
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          resume_text: string
          job_description: string
          matching_skills?: string[]
          missing_skills?: string[]
          score: number
          suggestions?: string[]
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          resume_text?: string
          job_description?: string
          matching_skills?: string[]
          missing_skills?: string[]
          score?: number
          suggestions?: string[]
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}