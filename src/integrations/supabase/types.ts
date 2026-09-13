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
      ai_sammanfattningar: {
        Row: {
          arende_id: string
          granskad: boolean
          id: string
          modell: string
          sammanfattning: string
          skapad: string
          tillrackligt_underlag: boolean
          underlag_url: string | null
        }
        Insert: {
          arende_id: string
          granskad?: boolean
          id?: string
          modell: string
          sammanfattning: string
          skapad?: string
          tillrackligt_underlag?: boolean
          underlag_url?: string | null
        }
        Update: {
          arende_id?: string
          granskad?: boolean
          id?: string
          modell?: string
          sammanfattning?: string
          skapad?: string
          tillrackligt_underlag?: boolean
          underlag_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_sammanfattningar_arende_id_fkey"
            columns: ["arende_id"]
            isOneToOne: true
            referencedRelation: "arenden"
            referencedColumns: ["id"]
          },
        ]
      }
      anvandarroller: {
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
      arende_sakfragor: {
        Row: {
          arende_id: string
          kalla: string
          sakfraga: string
        }
        Insert: {
          arende_id: string
          kalla?: string
          sakfraga: string
        }
        Update: {
          arende_id?: string
          kalla?: string
          sakfraga?: string
        }
        Relationships: [
          {
            foreignKeyName: "arende_sakfragor_arende_id_fkey"
            columns: ["arende_id"]
            isOneToOne: false
            referencedRelation: "arenden"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arende_sakfragor_sakfraga_fkey"
            columns: ["sakfraga"]
            isOneToOne: false
            referencedRelation: "sakfragor"
            referencedColumns: ["slug"]
          },
        ]
      }
      arenden: {
        Row: {
          beteckning: string | null
          datum: string | null
          doktyp: string | null
          id: string
          kalla_url_html: string | null
          kalla_url_text: string | null
          organ: string | null
          publicerad: string | null
          rm: string | null
          tidslinje: Json | null
          titel: string | null
          undertitel: string | null
          uppdaterad: string
        }
        Insert: {
          beteckning?: string | null
          datum?: string | null
          doktyp?: string | null
          id: string
          kalla_url_html?: string | null
          kalla_url_text?: string | null
          organ?: string | null
          publicerad?: string | null
          rm?: string | null
          tidslinje?: Json | null
          titel?: string | null
          undertitel?: string | null
          uppdaterad?: string
        }
        Update: {
          beteckning?: string | null
          datum?: string | null
          doktyp?: string | null
          id?: string
          kalla_url_html?: string | null
          kalla_url_text?: string | null
          organ?: string | null
          publicerad?: string | null
          rm?: string | null
          tidslinje?: Json | null
          titel?: string | null
          undertitel?: string | null
          uppdaterad?: string
        }
        Relationships: []
      }
      beslutspunkter: {
        Row: {
          arende_id: string
          beslutstyp: string | null
          forslag: string | null
          id: string
          motforslag_nummer: string | null
          motforslag_partier: string | null
          punkt: string
          rubrik: string | null
          vinnare: string | null
          votering_id: string | null
          voteringskrav: string | null
        }
        Insert: {
          arende_id: string
          beslutstyp?: string | null
          forslag?: string | null
          id: string
          motforslag_nummer?: string | null
          motforslag_partier?: string | null
          punkt: string
          rubrik?: string | null
          vinnare?: string | null
          votering_id?: string | null
          voteringskrav?: string | null
        }
        Update: {
          arende_id?: string
          beslutstyp?: string | null
          forslag?: string | null
          id?: string
          motforslag_nummer?: string | null
          motforslag_partier?: string | null
          punkt?: string
          rubrik?: string | null
          vinnare?: string | null
          votering_id?: string | null
          voteringskrav?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "beslutspunkter_arende_id_fkey"
            columns: ["arende_id"]
            isOneToOne: false
            referencedRelation: "arenden"
            referencedColumns: ["id"]
          },
        ]
      }
      felrapporter: {
        Row: {
          beskrivning: string
          epost: string | null
          id: string
          sida: string | null
          skapad: string
          status: string
        }
        Insert: {
          beskrivning: string
          epost?: string | null
          id?: string
          sida?: string | null
          skapad?: string
          status?: string
        }
        Update: {
          beskrivning?: string
          epost?: string | null
          id?: string
          sida?: string | null
          skapad?: string
          status?: string
        }
        Relationships: []
      }
      inlasningar: {
        Row: {
          antal: number
          avslutad: string | null
          detalj: string | null
          id: string
          rm: string | null
          startad: string
          status: string
          typ: string
        }
        Insert: {
          antal?: number
          avslutad?: string | null
          detalj?: string | null
          id?: string
          rm?: string | null
          startad?: string
          status: string
          typ: string
        }
        Update: {
          antal?: number
          avslutad?: string | null
          detalj?: string | null
          id?: string
          rm?: string | null
          startad?: string
          status?: string
          typ?: string
        }
        Relationships: []
      }
      ledamoter: {
        Row: {
          bild_url: string | null
          bild_url_liten: string | null
          efternamn: string
          fodd_ar: number | null
          fornamn: string
          id: string
          kalla_url: string | null
          kon: string | null
          parti: string | null
          sorteringsnamn: string | null
          sourceid: string | null
          status: string | null
          uppdaterad: string
          valkrets: string | null
        }
        Insert: {
          bild_url?: string | null
          bild_url_liten?: string | null
          efternamn: string
          fodd_ar?: number | null
          fornamn: string
          id: string
          kalla_url?: string | null
          kon?: string | null
          parti?: string | null
          sorteringsnamn?: string | null
          sourceid?: string | null
          status?: string | null
          uppdaterad?: string
          valkrets?: string | null
        }
        Update: {
          bild_url?: string | null
          bild_url_liten?: string | null
          efternamn?: string
          fodd_ar?: number | null
          fornamn?: string
          id?: string
          kalla_url?: string | null
          kon?: string | null
          parti?: string | null
          sorteringsnamn?: string | null
          sourceid?: string | null
          status?: string | null
          uppdaterad?: string
          valkrets?: string | null
        }
        Relationships: []
      }
      partier: {
        Row: {
          farg: string | null
          forkortning: string
          kod: string
          namn: string
          ordning: number
        }
        Insert: {
          farg?: string | null
          forkortning: string
          kod: string
          namn: string
          ordning?: number
        }
        Update: {
          farg?: string | null
          forkortning?: string
          kod?: string
          namn?: string
          ordning?: number
        }
        Relationships: []
      }
      partitotaler: {
        Row: {
          avstar: number
          franvarande: number
          ja: number
          nej: number
          parti: string
          votering_id: string
        }
        Insert: {
          avstar?: number
          franvarande?: number
          ja?: number
          nej?: number
          parti: string
          votering_id: string
        }
        Update: {
          avstar?: number
          franvarande?: number
          ja?: number
          nej?: number
          parti?: string
          votering_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partitotaler_votering_id_fkey"
            columns: ["votering_id"]
            isOneToOne: false
            referencedRelation: "voteringar"
            referencedColumns: ["id"]
          },
        ]
      }
      roster: {
        Row: {
          avser: string | null
          ledamot_id: string
          parti: string | null
          rost: string
          valkrets: string | null
          votering_id: string
        }
        Insert: {
          avser?: string | null
          ledamot_id: string
          parti?: string | null
          rost: string
          valkrets?: string | null
          votering_id: string
        }
        Update: {
          avser?: string | null
          ledamot_id?: string
          parti?: string | null
          rost?: string
          valkrets?: string | null
          votering_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roster_votering_id_fkey"
            columns: ["votering_id"]
            isOneToOne: false
            referencedRelation: "voteringar"
            referencedColumns: ["id"]
          },
        ]
      }
      sakfragor: {
        Row: {
          beskrivning: string | null
          namn: string
          nyckelord: string[]
          ordning: number
          slug: string
          utskott: string[]
        }
        Insert: {
          beskrivning?: string | null
          namn: string
          nyckelord?: string[]
          ordning?: number
          slug: string
          utskott?: string[]
        }
        Update: {
          beskrivning?: string | null
          namn?: string
          nyckelord?: string[]
          ordning?: number
          slug?: string
          utskott?: string[]
        }
        Relationships: []
      }
      uppdrag: {
        Row: {
          fran: string | null
          id: number
          ledamot_id: string
          organ_kod: string | null
          organ_namn: string | null
          roll: string | null
          status: string | null
          till: string | null
          typ: string | null
        }
        Insert: {
          fran?: string | null
          id?: number
          ledamot_id: string
          organ_kod?: string | null
          organ_namn?: string | null
          roll?: string | null
          status?: string | null
          till?: string | null
          typ?: string | null
        }
        Update: {
          fran?: string | null
          id?: number
          ledamot_id?: string
          organ_kod?: string | null
          organ_namn?: string | null
          roll?: string | null
          status?: string | null
          till?: string | null
          typ?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "uppdrag_ledamot_id_fkey"
            columns: ["ledamot_id"]
            isOneToOne: false
            referencedRelation: "ledamoter"
            referencedColumns: ["id"]
          },
        ]
      }
      voteringar: {
        Row: {
          arende_id: string | null
          avser: string | null
          avstar: number
          beslutspunkt_id: string | null
          beteckning: string | null
          datum: string | null
          franvarande: number
          gallde: string | null
          id: string
          ja: number
          kalla_url: string | null
          nej: number
          punkt: string | null
          rm: string | null
          rubrik: string | null
          typ: string | null
          uppdaterad: string
          vinnare: string | null
        }
        Insert: {
          arende_id?: string | null
          avser?: string | null
          avstar?: number
          beslutspunkt_id?: string | null
          beteckning?: string | null
          datum?: string | null
          franvarande?: number
          gallde?: string | null
          id: string
          ja?: number
          kalla_url?: string | null
          nej?: number
          punkt?: string | null
          rm?: string | null
          rubrik?: string | null
          typ?: string | null
          uppdaterad?: string
          vinnare?: string | null
        }
        Update: {
          arende_id?: string | null
          avser?: string | null
          avstar?: number
          beslutspunkt_id?: string | null
          beteckning?: string | null
          datum?: string | null
          franvarande?: number
          gallde?: string | null
          id?: string
          ja?: number
          kalla_url?: string | null
          nej?: number
          punkt?: string | null
          rm?: string | null
          rubrik?: string | null
          typ?: string | null
          uppdaterad?: string
          vinnare?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voteringar_arende_id_fkey"
            columns: ["arende_id"]
            isOneToOne: false
            referencedRelation: "arenden"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voteringar_beslutspunkt_id_fkey"
            columns: ["beslutspunkt_id"]
            isOneToOne: false
            referencedRelation: "beslutspunkter"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_partimajoritet: {
        Row: {
          avstar: number | null
          franvarande: number | null
          ja: number | null
          majoritetsrost: string | null
          nej: number | null
          parti: string | null
          votering_id: string | null
        }
        Insert: {
          avstar?: number | null
          franvarande?: number | null
          ja?: number | null
          majoritetsrost?: never
          nej?: number | null
          parti?: string | null
          votering_id?: string | null
        }
        Update: {
          avstar?: number | null
          franvarande?: number | null
          ja?: number | null
          majoritetsrost?: never
          nej?: number | null
          parti?: string | null
          votering_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partitotaler_votering_id_fkey"
            columns: ["votering_id"]
            isOneToOne: false
            referencedRelation: "voteringar"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
