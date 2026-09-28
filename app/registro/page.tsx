"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function RegistroPage() {
  const router = useRouter()

  const [nombre, setNombre] = useState("")
  const [apellidos, setApellidos] = useState("")
  const [correo, setCorreo] = useState("")
  const [contrasena, setContrasena] = useState("")
  const [confirmarContrasena, setConfirmarContrasena] = useState("")
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState("")
  const [mensaje, setMensaje] = useState("")

  async function registrarse(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setMensaje("")

    if (contrasena.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.")
      return
    }

    if (contrasena !== confirmarContrasena) {
      setError("Las contraseñas no coinciden.")
      return
    }

    setCargando(true)

    const { data, error } = await supabase.auth.signUp({
      email: correo.trim(),
      password: contrasena,
      options: {
        data: {
          nombre: nombre.trim(),
          apellidos: apellidos.trim(),
        },
      },
    })

    if (error) {
      setError(error.message)
      setCargando(false)
      return
    }

    // Si Supabase tiene activada la confirmación por correo,
    // session será null y mostramos el aviso correspondiente.
    if (!data.session) {
      setMensaje(
        "Cuenta creada. Revisa tu correo y confirma tu cuenta antes de iniciar sesión."
      )
      setCargando(false)
      return
    }

    router.push("/")
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto flex min-h-[80vh] max-w-lg items-center">
        <section className="w-full rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <div className="text-center">
            <Link href="/" className="text-2xl font-black text-blue-600">
              Distribuidora JYM
            </Link>

            <h1 className="mt-8 text-3xl font-black text-slate-900">
              Crear cuenta
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Regístrate para guardar tus datos y tu carrito.
            </p>
          </div>

          <form onSubmit={registrarse} className="mt-8 space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="nombre"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Nombre
                </label>
                <input
                  id="nombre"
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Tu nombre"
                  autoComplete="given-name"
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="apellidos"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Apellidos
                </label>
                <input
                  id="apellidos"
                  type="text"
                  value={apellidos}
                  onChange={(e) => setApellidos(e.target.value)}
                  placeholder="Tus apellidos"
                  autoComplete="family-name"
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

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
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                required
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="confirmar"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Confirmar contraseña
              </label>
              <input
                id="confirmar"
                type="password"
                value={confirmarContrasena}
                onChange={(e) => setConfirmarContrasena(e.target.value)}
                placeholder="Repite tu contraseña"
                autoComplete="new-password"
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
              {cargando ? "Creando cuenta..." : "Crear cuenta"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            ¿Ya tienes una cuenta?{" "}
            <Link
              href="/login"
              className="font-bold text-blue-600 hover:text-blue-700"
            >
              Iniciar sesión
            </Link>
          </p>
        </section>
      </div>
    </main>
  )
}
