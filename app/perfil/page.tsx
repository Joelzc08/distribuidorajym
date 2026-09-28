"use client"

import { FormEvent, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

type Perfil = {
  id: string
  nombre: string
  apellidos: string
  telefono: string
  direccion: string
  rol: "cliente" | "admin"
}

export default function PerfilPage() {
  const router = useRouter()

  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [correo, setCorreo] = useState("")

  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)

  const [mensaje, setMensaje] = useState("")
  const [error, setError] = useState("")

  const [nuevaPassword, setNuevaPassword] = useState("")
  const [confirmarPassword, setConfirmarPassword] = useState("")
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [cambiandoPassword, setCambiandoPassword] = useState(false)

  useEffect(() => {
    cargarPerfil()
  }, [])

  async function cargarPerfil() {
    setCargando(true)
    setError("")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.replace("/login")
      return
    }

    setCorreo(user.email ?? "")

    const { data, error } = await supabase
      .from("profiles")
      .select("id, nombre, apellidos, telefono, direccion, rol")
      .eq("id", user.id)
      .maybeSingle()

    if (error) {
      console.error(error)
      setError("No se pudo cargar tu perfil.")
      setCargando(false)
      return
    }

    if (!data) {
      const nuevoPerfil: Perfil = {
        id: user.id,
        nombre: user.user_metadata?.nombre ?? "",
        apellidos: user.user_metadata?.apellidos ?? "",
        telefono: "",
        direccion: "",
        rol: "cliente",
      }

      const { data: creado, error: crearError } = await supabase
        .from("profiles")
        .insert(nuevoPerfil)
        .select()
        .single()

      if (crearError) {
        console.error(crearError)
        setError("No se pudo crear tu perfil.")
      } else {
        setPerfil(creado)
      }
    } else {
      setPerfil(data)
    }

    setCargando(false)
  }

  async function guardarPerfil(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!perfil) return

    setGuardando(true)
    setMensaje("")
    setError("")

    const { data, error } = await supabase
      .from("profiles")
      .update({
        nombre: perfil.nombre.trim(),
        apellidos: perfil.apellidos.trim(),
        telefono: perfil.telefono.trim(),
        direccion: perfil.direccion.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", perfil.id)
      .select()
      .single()

    if (error) {
      console.error(error)
      setError("No se pudieron guardar los cambios.")
    } else {
      setPerfil(data)
      setMensaje("Perfil actualizado correctamente.")

      setTimeout(() => {
        setMensaje("")
      }, 4000)
    }

    setGuardando(false)
  }

  async function cambiarPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    setMensaje("")
    setError("")

    if (nuevaPassword.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres.")
      return
    }

    if (nuevaPassword !== confirmarPassword) {
      setError("Las contraseñas no coinciden.")
      return
    }

    setCambiandoPassword(true)

    const { error } = await supabase.auth.updateUser({
      password: nuevaPassword,
    })

    if (error) {
      console.error(error)
      setError("No se pudo cambiar la contraseña.")
    } else {
      setNuevaPassword("")
      setConfirmarPassword("")
      setMensaje("Contraseña actualizada correctamente.")

      setTimeout(() => {
        setMensaje("")
      }, 4000)
    }

    setCambiandoPassword(false)
  }

  async function cerrarSesion() {
    await supabase.auth.signOut()

    router.replace("/login")
    router.refresh()
  }

  function obtenerIniciales() {
    if (!perfil) return "U"

    const nombre = perfil.nombre?.trim() || ""
    const apellidos = perfil.apellidos?.trim() || ""

    const inicialNombre = nombre.charAt(0)
    const inicialApellido = apellidos.charAt(0)

    return `${inicialNombre}${inicialApellido}`.toUpperCase() || "U"
  }

  if (cargando) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-12">
        <div className="mx-auto max-w-4xl rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

          <p className="mt-4 text-slate-600">
            Cargando tu perfil...
          </p>
        </div>
      </main>
    )
  }

  if (!perfil) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-12">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200">
          <div className="text-5xl">👤</div>

          <p className="mt-4 text-red-600">
            {error || "No se encontró el perfil."}
          </p>

          <Link
            href="/login"
            className="mt-5 inline-block rounded-xl bg-blue-600 px-5 py-3 font-bold text-white transition hover:bg-blue-700"
          >
            Iniciar sesión
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">

        {/* ENCABEZADO */}
        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
            Mi cuenta
          </p>

          <h1 className="mt-1 text-3xl font-black text-slate-900 sm:text-4xl">
            Mi perfil
          </h1>

          <p className="mt-2 text-slate-500">
            Administra tus datos personales y la seguridad de tu cuenta.
          </p>
        </div>

        {/* PERFIL SUPERIOR */}
        <section className="mb-6 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-8 sm:px-8">
            <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">

              {/* AVATAR */}
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-white text-3xl font-black text-blue-600 shadow-lg ring-4 ring-white/30">
                {obtenerIniciales()}
              </div>

              <div className="text-white">
                <h2 className="text-2xl font-black">
                  {perfil.nombre} {perfil.apellidos}
                </h2>

                <p className="mt-1 text-blue-100">
                  {correo}
                </p>

                <div className="mt-3 inline-flex rounded-full bg-white/20 px-3 py-1 text-sm font-bold capitalize">
                  {perfil.rol === "admin"
                    ? "Administrador"
                    : "Cliente"}
                </div>
              </div>
            </div>
          </div>

          {/* ACCIONES RÁPIDAS */}
          <div className="grid divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">

            <Link
              href="/"
              className="px-6 py-4 text-center text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              🏠 Ir a la tienda
            </Link>

            <Link
              href="/pedidos"
              className="px-6 py-4 text-center text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              📦 Mis pedidos
            </Link>

            {perfil.rol === "admin" ? (
              <Link
                href="/admin"
                className="px-6 py-4 text-center text-sm font-bold text-blue-600 transition hover:bg-blue-50"
              >
                ⚙️ Administración
              </Link>
            ) : (
              <button
                type="button"
                onClick={cerrarSesion}
                className="px-6 py-4 text-center text-sm font-bold text-red-600 transition hover:bg-red-50"
              >
                🚪 Cerrar sesión
              </button>
            )}
          </div>
        </section>

        {/* MENSAJES */}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
            ⚠️ {error}
          </div>
        )}

        {mensaje && (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700">
            ✓ {mensaje}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">

          {/* DATOS PERSONALES */}
          <form
            onSubmit={guardarPerfil}
            className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xl">
                👤
              </div>

              <div>
                <h2 className="text-xl font-black text-slate-900">
                  Datos personales
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Mantén actualizada tu información de contacto.
                </p>
              </div>
            </div>

            <div className="mt-7 grid gap-5 sm:grid-cols-2">

              {/* NOMBRE */}
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Nombre
                </label>

                <input
                  type="text"
                  value={perfil.nombre}
                  onChange={(e) =>
                    setPerfil({
                      ...perfil,
                      nombre: e.target.value,
                    })
                  }
                  required
                  placeholder="Tu nombre"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                />
              </div>

              {/* APELLIDOS */}
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Apellidos
                </label>

                <input
                  type="text"
                  value={perfil.apellidos}
                  onChange={(e) =>
                    setPerfil({
                      ...perfil,
                      apellidos: e.target.value,
                    })
                  }
                  required
                  placeholder="Tus apellidos"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                />
              </div>

              {/* CORREO */}
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Correo electrónico
                </label>

                <input
                  type="email"
                  value={correo}
                  disabled
                  className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500"
                />

                <p className="mt-2 text-xs text-slate-400">
                  El correo se administra mediante tu cuenta de autenticación.
                </p>
              </div>

              {/* TELEFONO */}
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Teléfono
                </label>

                <input
                  type="tel"
                  value={perfil.telefono}
                  onChange={(e) =>
                    setPerfil({
                      ...perfil,
                      telefono: e.target.value,
                    })
                  }
                  placeholder="8888-8888"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                />
              </div>

              {/* DIRECCIÓN */}
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Dirección de entrega
                </label>

                <textarea
                  value={perfil.direccion}
                  onChange={(e) =>
                    setPerfil({
                      ...perfil,
                      direccion: e.target.value,
                    })
                  }
                  rows={4}
                  placeholder="Escribe tu dirección completa para las entregas..."
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                />

                <p className="mt-2 text-xs text-slate-400">
                  Esta dirección puede utilizarse para tus pedidos.
                </p>
              </div>
            </div>

            {/* GUARDAR */}
            <button
              type="submit"
              disabled={guardando}
              className="mt-7 w-full rounded-xl bg-blue-600 px-6 py-3.5 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300 sm:w-auto"
            >
              {guardando ? "Guardando cambios..." : "Guardar cambios"}
            </button>
          </form>

          {/* COLUMNA DERECHA */}
          <div className="space-y-6">

            {/* SEGURIDAD */}
            <form
              onSubmit={cambiarPassword}
              className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-xl">
                  🔐
                </div>

                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    Seguridad
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Cambia la contraseña de tu cuenta.
                  </p>
                </div>
              </div>

              <div className="mt-6">

                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Nueva contraseña
                </label>

                <div className="relative">
                  <input
                    type={mostrarPassword ? "text" : "password"}
                    value={nuevaPassword}
                    onChange={(e) =>
                      setNuevaPassword(e.target.value)
                    }
                    placeholder="Mínimo 6 caracteres"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-12 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setMostrarPassword(!mostrarPassword)
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-lg text-slate-500"
                  >
                    {mostrarPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Confirmar contraseña
                </label>

                <input
                  type={mostrarPassword ? "text" : "password"}
                  value={confirmarPassword}
                  onChange={(e) =>
                    setConfirmarPassword(e.target.value)
                  }
                  placeholder="Repite la nueva contraseña"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <button
                type="submit"
                disabled={
                  cambiandoPassword ||
                  !nuevaPassword ||
                  !confirmarPassword
                }
                className="mt-5 w-full rounded-xl border border-slate-200 px-4 py-3 font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {cambiandoPassword
                  ? "Actualizando..."
                  : "Cambiar contraseña"}
              </button>
            </form>

            {/* INFORMACIÓN DE CUENTA */}
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">

              <h2 className="text-lg font-black text-slate-900">
                Información de cuenta
              </h2>

              <div className="mt-5 space-y-4">

                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-slate-500">
                    Tipo de cuenta
                  </span>

                  <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-bold capitalize text-blue-700">
                    {perfil.rol === "admin"
                      ? "Administrador"
                      : "Cliente"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-slate-500">
                    Correo
                  </span>

                  <span className="max-w-[180px] truncate text-sm font-semibold text-slate-700">
                    {correo}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-slate-500">
                    Teléfono
                  </span>

                  <span className="text-sm font-semibold text-slate-700">
                    {perfil.telefono || "No registrado"}
                  </span>
                </div>

              </div>
            </div>

            {/* SESIÓN */}
            <div className="rounded-3xl border border-red-100 bg-red-50 p-6">
              <h2 className="font-black text-red-900">
                Sesión
              </h2>

              <p className="mt-1 text-sm text-red-700">
                Cierra tu sesión en este dispositivo.
              </p>

              <button
                type="button"
                onClick={cerrarSesion}
                className="mt-4 w-full rounded-xl border border-red-200 bg-white px-4 py-3 font-bold text-red-600 transition hover:bg-red-100"
              >
                🚪 Cerrar sesión
              </button>
            </div>
          </div>
        </div>

        {/* PIE */}
        <div className="mt-8 pb-8 text-center text-sm text-slate-400">
          Distribuidora JYM · Mi cuenta
        </div>
      </div>
    </main>
  )
}