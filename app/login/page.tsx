"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function LoginPage() {
  const router = useRouter()
  const [correo, setCorreo] = useState("")
  const [contrasena, setContrasena] = useState("")
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState("")
  const [mensaje, setMensaje] = useState("")

  async function iniciarSesion(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setMensaje("")
    setCargando(true)

    const { error } = await supabase.auth.signInWithPassword({
      email: correo.trim(),
      password: contrasena,
    })

    if (error) {
      setError("El correo o la contraseña no son correctos.")
      setCargando(false)
      return
    }

    router.push("/")
    router.refresh()
  }

  async function recuperarContrasena() {
    if (!correo.trim()) {
      setError("Escribe tu correo para recuperar la contraseña.")
      return
    }

    setError("")
    setMensaje("")
    setCargando(true)

    const { error } = await supabase.auth.resetPasswordForEmail(
      correo.trim(),
      {
        redirectTo: `${window.location.origin}/reset-password`,
      }
    )

    if (error) {
      setError(error.message)
    } else {
      setMensaje("Te enviamos un enlace para restablecer tu contraseña.")
    }

    setCargando(false)
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto flex min-h-[80vh] max-w-md items-center">
        <section className="w-full rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <div className="text-center">
            <Link href="/" className="text-2xl font-black text-blue-600">
              Distribuidora JYM
            </Link>

            <h1 className="mt-8 text-3xl font-black text-slate-900">
              Iniciar sesión
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Ingresa a tu cuenta para continuar.
            </p>
          </div>

          <form onSubmit={iniciarSesion} className="mt-8 space-y-5">
            <div>
              <label
                htmlFor="correo"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Correo electrónico
              </label>
              <input
                id="correo"
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="tu@correo.com"
                autoComplete="email"
                required
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="contrasena"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Contraseña
              </label>
              <input
                id="contrasena"
                type="password"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            {mensaje && (
              <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                {mensaje}
              </div>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="w-full rounded-xl bg-blue-600 py-3.5 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {cargando ? "Ingresando..." : "Iniciar sesión"}
            </button>
          </form>

          <button
            type="button"
            onClick={recuperarContrasena}
            disabled={cargando}
            className="mt-4 w-full text-sm font-semibold text-blue-600 hover:text-blue-700 disabled:text-slate-400"
          >
            ¿Olvidaste tu contraseña?
          </button>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs text-slate-400">O</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <p className="text-center text-sm text-slate-600">
            ¿Todavía no tienes una cuenta?{" "}
            <Link
              href="/registro"
              className="font-bold text-blue-600 hover:text-blue-700"
            >
              Crear cuenta
            </Link>
          </p>
        </section>
      </div>
    </main>
  )
}
