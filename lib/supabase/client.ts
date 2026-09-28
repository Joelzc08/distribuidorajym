"use client"

import { createBrowserClient } from "@supabase/ssr"
import { supabaseAnonKey, supabaseUrl } from "@/lib/env"

export function createBrowserSupabase() {
  return createBrowserClient(
    supabaseUrl(),
    supabaseAnonKey()
  )
}