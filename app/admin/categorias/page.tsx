"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { Categoria } from "@/lib/types"

type CategoriaEditable = Categoria & {
  descripcion?: string | null
}

export default function AdminCategoriasPage() {
  const [categorias, setCategorias] = useState<CategoriaEditable[]>([])

  const [cargando, setCargando] = useState(true)
  const [guardandoId, setGuardandoId] = useState<number | null>(null)
  const [creando, setCreando] = useState(false)

  const [busqueda, setBusqueda] = useState("")
  const [mostrarInactivas, setMostrarInactivas] = useState(true)

  const [modalNueva, setModalNueva] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState("")

  const [error, setError] = useState("")
  const [mensaje, setMensaje] = useState("")

  async function cargarCategorias() {
    setCargando(true)
    setError("")

    const { data, error: categoriasError } = await supabase
      .from("categorias")
      .select("id, nombre, activo")
      .order("nombre", { ascending: true })

    if (categoriasError) {
      console.error("ERROR CATEGORÍAS:", categoriasError)

      setError(
        `No se pudieron cargar las categorías: ${categoriasError.message}`
      )

      setCargando(false)
      return
    }

    setCategorias((data ?? []) as CategoriaEditable[])
    setCargando(false)
  }

  useEffect(() => {
    cargarCategorias()
  }, [])

  const categoriasFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()

    return categorias
      .filter((categoria) => {
        const coincideTexto =
          !texto ||
          categoria.nombre.toLowerCase().includes(texto)

        const coincideEstado =
          mostrarInactivas || categoria.activo !== false

        return coincideTexto && coincideEstado
      })
      .sort((a, b) =>
        a.nombre.localeCompare(b.nombre, "es", {
          sensitivity: "base",
        })
      )
  }, [categorias, busqueda, mostrarInactivas])

  const categoriasActivas = categorias.filter(
    (categoria) => categoria.activo !== false
  ).length

  const categoriasInactivas = categorias.filter(
    (categoria) => categoria.activo === false
  ).length

  function cambiarCategoria(
    id: number,
    cambios: Partial<CategoriaEditable>
  ) {
    setCategorias((actuales) =>
      actuales.map((categoria) =>
        categoria.id === id
          ? {
              ...categoria,
              ...cambios,
            }
          : categoria
      )
    )
  }

  async function guardarCategoria(
    categoria: CategoriaEditable
  ) {
    setGuardandoId(categoria.id)
    setError("")
    setMensaje("")

    const nombre = categoria.nombre.trim()

    if (!nombre) {
      setError(
        "El nombre de la categoría no puede estar vacío."
      )

      setGuardandoId(null)
      return
    }

    const { error: updateError } = await supabase
      .from("categorias")
      .update({
        nombre,
        activo: categoria.activo !== false,
      })
      .eq("id", categoria.id)

    if (updateError) {
      console.error(
        "ERROR ACTUALIZANDO CATEGORÍA:",
        updateError
      )

      setError(
        `No se pudo guardar "${nombre}": ${updateError.message}`
      )

      setGuardandoId(null)
      return
    }

    setCategorias((actuales) =>
      actuales.map((item) =>
        item.id === categoria.id
          ? {
              ...item,
              nombre,
              activo: categoria.activo !== false,
            }
          : item
      )
    )

    setMensaje(
      `La categoría "${nombre}" fue actualizada correctamente.`
    )

    setGuardandoId(null)

    setTimeout(() => {
      setMensaje("")
    }, 3000)
  }

  async function crearCategoria() {
    setError("")
    setMensaje("")

    const nombre = nuevoNombre.trim()

    if (!nombre) {
      setError(
        "Escribe el nombre de la nueva categoría."
      )
      return
    }

    setCreando(true)

    const { data, error: insertError } = await supabase
      .from("categorias")
      .insert({
        nombre,
        activo: true,
      })
      .select("id, nombre, activo")
      .single()

    if (insertError) {
      console.error(
        "ERROR CREANDO CATEGORÍA:",
        insertError
      )

      setError(
        `No se pudo crear "${nombre}": ${insertError.message}`
      )

      setCreando(false)
      return
    }

    if (!data) {
      setError(
        "La categoría fue creada, pero no se pudo recuperar el registro."
      )

      setCreando(false)
      return
    }

    setCategorias((actuales) => [
      ...actuales,
      data as CategoriaEditable,
    ])

    setNuevoNombre("")
    setModalNueva(false)
    setCreando(false)

    setMensaje(
      `La categoría "${nombre}" fue creada correctamente.`
    )

    setTimeout(() => {
      setMensaje("")
    }, 3000)
  }

  async function eliminarCategoria(
    categoria: CategoriaEditable
  ) {
    const confirmado = window.confirm(
      `¿Seguro que deseas eliminar la categoría "${categoria.nombre}"?\n\nSi tiene productos asociados, es posible que Supabase no permita eliminarla.`
    )

    if (!confirmado) {
      return
    }

    setError("")
    setMensaje("")
    setGuardandoId(categoria.id)

    const { error: deleteError } = await supabase
      .from("categorias")
      .delete()
      .eq("id", categoria.id)

    if (deleteError) {
      console.error(
        "ERROR ELIMINANDO CATEGORÍA:",
        deleteError
      )

      setError(
        `No se pudo eliminar "${categoria.nombre}": ${deleteError.message}`
      )

      setGuardandoId(null)
      return
    }

    setCategorias((actuales) =>
      actuales.filter(
        (item) => item.id !== categoria.id
      )
    )

    setMensaje(
      `La categoría "${categoria.nombre}" fue eliminada.`
    )

    setGuardandoId(null)

    setTimeout(() => {
      setMensaje("")
    }, 3000)
  }

  if (cargando) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

            <p className="mt-5 text-lg font-bold text-slate-900">
              Cargando categorías...
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Preparando el panel de administración.
            </p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">

        {/* ENCABEZADO */}
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-blue-700">
              <span className="h-2 w-2 rounded-full bg-blue-600" />
              Administración
            </div>

            <h1 className="text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
              Categorías
            </h1>

            <p className="mt-2 max-w-2xl text-slate-500">
              Organiza y administra las categorías de tu
              catálogo.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setError("")
              setNuevoNombre("")
              setModalNueva(true)
            }}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3.5 font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 hover:shadow-xl active:scale-[0.98]"
          >
            <span className="text-xl leading-none">
              +
            </span>

            Nueva categoría
          </button>
        </div>

        {/* ESTADÍSTICAS */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  Total
                </p>

                <p className="mt-1 text-3xl font-black text-slate-950">
                  {categorias.length}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-xl">
                📁
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  Activas
                </p>

                <p className="mt-1 text-3xl font-black text-emerald-600">
                  {categoriasActivas}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-xl">
                ✓
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  Inactivas
                </p>

                <p className="mt-1 text-3xl font-black text-slate-500">
                  {categoriasInactivas}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-xl">
                ○
              </div>
            </div>
          </div>
        </div>

        {/* MENSAJE */}
        {mensaje && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-black text-white">
              ✓
            </div>

            <div>
              <p className="font-bold">
                Operación completada
              </p>

              <p className="mt-0.5 text-sm">
                {mensaje}
              </p>
            </div>
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-600 text-sm font-black text-white">
              !
            </div>

            <div>
              <p className="font-bold">
                No se pudo completar la operación
              </p>

              <p className="mt-0.5 text-sm">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* BUSCADOR */}
        <section className="mb-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="flex-1">
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Buscar categoría
              </label>

              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  🔎
                </span>

                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) =>
                    setBusqueda(e.target.value)
                  }
                  placeholder="Buscar por nombre..."
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 py-3 pl-11 pr-4 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <input
                type="checkbox"
                checked={mostrarInactivas}
                onChange={(e) =>
                  setMostrarInactivas(
                    e.target.checked
                  )
                }
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />

              <span className="text-sm font-semibold text-slate-700">
                Mostrar inactivas
              </span>
            </label>
          </div>
        </section>

        {/* LISTADO */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Categorías
              </h2>

              <p className="text-sm text-slate-500">
                {categoriasFiltradas.length} categoría
                {categoriasFiltradas.length === 1
                  ? ""
                  : "s"} mostrada
                {categoriasFiltradas.length === 1
                  ? ""
                  : "s"}
              </p>
            </div>
          </div>

          {categoriasFiltradas.length === 0 ? (
            <div className="rounded-3xl bg-white p-12 text-center shadow-sm ring-1 ring-slate-200">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
                📁
              </div>

              <h3 className="mt-5 font-bold text-slate-900">
                No encontramos categorías
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Prueba con otro término de búsqueda o
                crea una nueva categoría.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {categoriasFiltradas.map(
                (categoria) => {
                  const guardando =
                    guardandoId === categoria.id

                  const activa =
                    categoria.activo !== false

                  return (
                    <article
                      key={categoria.id}
                      className={`group rounded-3xl bg-white p-5 shadow-sm ring-1 transition ${
                        activa
                          ? "ring-slate-200 hover:shadow-md"
                          : "ring-slate-200 opacity-75"
                      }`}
                    >
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-center">

                        {/* ICONO + NOMBRE */}
                        <div className="flex min-w-0 flex-1 items-center gap-4">
                          <div
                            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-black ${
                              activa
                                ? "bg-blue-50 text-blue-700"
                                : "bg-slate-100 text-slate-400"
                            }`}
                          >
                            📁
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                              Categoría #{categoria.id}
                            </p>

                            <input
                              type="text"
                              value={categoria.nombre}
                              onChange={(e) =>
                                cambiarCategoria(
                                  categoria.id,
                                  {
                                    nombre:
                                      e.target.value,
                                  }
                                )
                              }
                              className="w-full border-0 bg-transparent p-0 text-xl font-black text-slate-950 outline-none placeholder:text-slate-300 focus:ring-0"
                              placeholder="Nombre de categoría"
                            />
                          </div>
                        </div>

                        {/* ESTADO */}
                        <div className="w-full lg:w-44">
                          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                            Estado
                          </label>

                          <button
                            type="button"
                            onClick={() =>
                              cambiarCategoria(
                                categoria.id,
                                {
                                  activo: !activa,
                                }
                              )
                            }
                            className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 transition ${
                              activa
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-slate-200 bg-slate-100 text-slate-500"
                            }`}
                          >
                            <span className="flex items-center gap-2 text-sm font-bold">
                              <span
                                className={`h-2.5 w-2.5 rounded-full ${
                                  activa
                                    ? "bg-emerald-500"
                                    : "bg-slate-400"
                                }`}
                              />

                              {activa
                                ? "Activa"
                                : "Inactiva"}
                            </span>

                            <span className="text-xs">
                              {activa
                                ? "ON"
                                : "OFF"}
                            </span>
                          </button>
                        </div>

                        {/* ACCIONES */}
                        <div className="flex w-full flex-wrap gap-2 lg:w-auto">
                          <button
                            type="button"
                            disabled={guardando}
                            onClick={() =>
                              guardarCategoria(
                                categoria
                              )
                            }
                            className="flex-1 rounded-xl bg-blue-600 px-5 py-2.5 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300 lg:flex-none"
                          >
                            {guardando
                              ? "Guardando..."
                              : "Guardar"}
                          </button>

                          <button
                            type="button"
                            disabled={guardando}
                            onClick={() =>
                              eliminarCategoria(
                                categoria
                              )
                            }
                            className="rounded-xl border border-red-200 bg-white px-4 py-2.5 font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                }
              )}
            </div>
          )}
        </section>
      </div>

      {/* MODAL NUEVA CATEGORÍA */}
      {modalNueva && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-2xl text-blue-600">
                  +
                </div>

                <h2 className="text-2xl font-black text-slate-950">
                  Nueva categoría
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Agrega una nueva categoría al catálogo.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setModalNueva(false)
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="mt-7">
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Nombre de la categoría
              </label>

              <input
                type="text"
                autoFocus
                value={nuevoNombre}
                onChange={(e) =>
                  setNuevoNombre(e.target.value)
                }
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    !creando
                  ) {
                    crearCategoria()
                  }
                }}
                placeholder="Ej. Bebidas"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={creando}
                onClick={() =>
                  setModalNueva(false)
                }
                className="rounded-xl border border-slate-200 px-5 py-3 font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={creando}
                onClick={crearCategoria}
                className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {creando
                  ? "Creando..."
                  : "Crear categoría"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}