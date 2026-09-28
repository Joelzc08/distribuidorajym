import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

import { supabaseAnonKey, supabaseUrl } from "@/lib/env"

export async function createServerSupabase() {
  const cookieStore = await cookies()

  return createServerClient(
    supabaseUrl(),
    supabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },

        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Puede ocurrir cuando se llama desde un Server Component
            // donde las cookies son de solo lectura.
          }
        },
      },
    }
  )
}