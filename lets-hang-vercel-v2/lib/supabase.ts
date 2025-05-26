import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface User {
  id: string
  name: string
  email?: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface Hang {
  id: string
  title: string
  description?: string
  date: string
  time: string
  location: string
  max_attendees: number
  type: "coffee" | "outdoor" | "games" | "social"
  status: "active" | "cancelled" | "completed"
  host_id: string
  created_at: string
  updated_at: string
  // Joined data
  host?: User
  attendees?: Attendee[]
  suggestions?: Suggestion[]
  user_rsvp?: "going" | "maybe" | "not-going" | null
}

export interface Attendee {
  id: string
  hang_id: string
  user_id: string
  status: "going" | "maybe" | "not-going"
  created_at: string
  user?: User
}

export interface Suggestion {
  id: string
  hang_id: string
  user_id: string
  type: "time" | "location" | "general"
  content: string
  votes: number
  created_at: string
  user?: User
}

// Auth functions
export const signInWithEmail = async (email: string) => {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  })
  return { error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

// User functions
export const createOrUpdateUser = async (userData: Partial<User>) => {
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) throw new Error("Not authenticated")

  const { data, error } = await supabase
    .from("users")
    .upsert({
      id: user.user.id,
      ...userData,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  return { data, error }
}

export const getCurrentUser = async () => {
  const { data: authUser } = await supabase.auth.getUser()
  if (!authUser.user) return { data: null, error: null }

  const { data, error } = await supabase.from("users").select("*").eq("id", authUser.user.id).single()

  return { data, error }
}

// Hang functions
export const createHang = async (hangData: Omit<Hang, "id" | "host_id" | "created_at" | "updated_at">) => {
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) throw new Error("Not authenticated")

  const { data, error } = await supabase
    .from("hangs")
    .insert({
      ...hangData,
      host_id: user.user.id,
    })
    .select()
    .single()

  if (data && !error) {
    // Auto-RSVP host as going
    await supabase.from("attendees").insert({
      hang_id: data.id,
      user_id: user.user.id,
      status: "going",
    })
  }

  return { data, error }
}

export const getHangs = async () => {
  const { data: user } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from("hangs")
    .select(`
      *,
      host:users!hangs_host_id_fkey(*),
      attendees(
        *,
        user:users(*)
      ),
      suggestions(
        *,
        user:users(*)
      )
    `)
    .eq("status", "active")
    .order("created_at", { ascending: false })

  // Add user's RSVP status to each hang
  if (data && user.user) {
    const hangsWithRSVP = data.map((hang) => {
      const userAttendee = hang.attendees?.find((a) => a.user_id === user.user.id)
      return {
        ...hang,
        user_rsvp: userAttendee?.status || null,
      }
    })
    return { data: hangsWithRSVP, error }
  }

  return { data, error }
}

export const updateHang = async (hangId: string, updates: Partial<Hang>) => {
  const { data, error } = await supabase
    .from("hangs")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", hangId)
    .select()
    .single()

  return { data, error }
}

export const updateRSVP = async (hangId: string, status: "going" | "maybe" | "not-going") => {
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) throw new Error("Not authenticated")

  const { data, error } = await supabase
    .from("attendees")
    .upsert({
      hang_id: hangId,
      user_id: user.user.id,
      status,
    })
    .select()
    .single()

  return { data, error }
}

export const addSuggestion = async (hangId: string, type: "time" | "location" | "general", content: string) => {
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) throw new Error("Not authenticated")

  const { data, error } = await supabase
    .from("suggestions")
    .insert({
      hang_id: hangId,
      user_id: user.user.id,
      type,
      content,
    })
    .select(`
      *,
      user:users(*)
    `)
    .single()

  return { data, error }
}

export const voteSuggestion = async (suggestionId: string) => {
  const { data, error } = await supabase.rpc("increment_suggestion_votes", { suggestion_id: suggestionId })

  return { data, error }
}

// Create the RPC function for voting
export const createVotingFunction = async () => {
  const { error } = await supabase.rpc("exec_sql", {
    sql: `
      CREATE OR REPLACE FUNCTION increment_suggestion_votes(suggestion_id UUID)
      RETURNS void AS $$
      BEGIN
        UPDATE suggestions 
        SET votes = votes + 1 
        WHERE id = suggestion_id;
      END;
      $$ LANGUAGE plpgsql;
    `,
  })
  return { error }
}
