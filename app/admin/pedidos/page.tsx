"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import { supabase } from "@/lib/supabase"

import type { EstadoPedido, Pedido } from "@/lib/types"

const estados: EstadoPedido[] = [
  "pendiente",
  "confirmado",
  "preparando",
  "enviado",
  "entregado",
  "cancelado",
]

const etiquetasEstado: Record<EstadoPedido, string> = {
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  preparando: "Preparando",
  enviado: "Enviado",
  entregado: "Entregado",
  cancelado: "Cancelado",
}

function claseEstado(estado: EstadoPedido) {
  switch (estado) {
    case "pendiente":
      return "bg-yellow-100 text-yellow-800"

    case "confirmado":
      return "bg-blue-100 text-blue-800"

    case "preparando":
      return "bg-purple-100 text-purple-800"

    case "enviado":
      return "bg-indigo-100 text-indigo-800"

    case "entregado":
      return "bg-green-100 text-green-800"

    case "cancelado":
      return "bg-red-100 text-red-800"

    default:
      return "bg-gray-100 text-gray-800"
  }
}

function formatearPrecio(valor: number) {
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    maximumFractionDigits: 2,
  }).format(valor)
}

function formatearFecha(fecha: string) {
  return new Date(fecha).toLocaleDateString("es-CR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function AdminPedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState("")
  const [filtroEstado, setFiltroEstado] = useState<
    EstadoPedido | "todos"
  >("todos")
  const [busqueda, setBusqueda] = useState("")
  const [actualizando, setActualizando] = useState<number | null>(null)

  async function cargarPedidos() {
    setCargando(true)
    setError("")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError("Debes iniciar sesión.")
      setCargando(false)
      return
    }

    const { data: perfil, error: perfilError } = await supabase
      .from("profiles")
      .select("id, rol")
      .eq("id", user.id)
      .maybeSingle()

    if (perfilError) {
      setError(perfilError.message)
      setCargando(false)
      return
    }

    if (!perfil || perfil.rol !== "admin") {
      setError("No tienes permisos para acceder a esta sección.")
      setCargando(false)
      return
    }

    const { data, error: pedidosError } = await supabase
      .from("pedidos")
      .select("*")
      .order("created_at", { ascending: false })

    if (pedidosError) {
      setError(pedidosError.message)
      setCargando(false)
      return
    }

    setPedidos((data ?? []) as Pedido[])
    setCargando(false)
  }

  useEffect(() => {
    cargarPedidos()
  }, [])

  async function cambiarEstado(
    pedidoId: number,
    nuevoEstado: EstadoPedido
  ) {
    setActualizando(pedidoId)
    setError("")

    const { error: updateError } = await supabase
      .from("pedidos")
      .update({
        estado: nuevoEstado,
      })
      .eq("id", pedidoId)

    if (updateError) {
      setError(updateError.message)
      setActualizando(null)
      return
    }

    setPedidos((actuales) =>
      actuales.map((pedido) =>
        pedido.id === pedidoId
          ? {
              ...pedido,
              estado: nuevoEstado,
            }
          : pedido
      )
    )

    setActualizando(null)
  }

  const pedidosFiltrados = pedidos.filter((pedido) => {
    const coincideEstado =
      filtroEstado === "todos" || pedido.estado === filtroEstado

    const texto = busqueda.trim().toLowerCase()

    const coincideBusqueda =
      texto === "" ||
      pedido.numero.toLowerCase().includes(texto) ||
      String(pedido.id).includes(texto) ||
      (pedido.telefono ?? "").toLowerCase().includes(texto) ||
      (pedido.direccion ?? "").toLowerCase().includes(texto)

    return coincideEstado && coincideBusqueda
  })

  const cantidadPorEstado = (estado: EstadoPedido) =>
    pedidos.filter((pedido) => pedido.estado === estado).length

  if (cargando) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
          <p className="text-slate-600">Cargando pedidos...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Encabezado */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              href="/admin"
              className="text-sm font-semibold text-blue-600 hover:underline"
            >
              ← Volver al panel
            </Link>

            <h1 className="mt-3 text-4xl font-black text-slate-900">
              Gestión de pedidos
            </h1>

            <p className="mt-2 text-slate-600">
              Revisa y actualiza el estado de los pedidos de los clientes.
            </p>
          </div>

          <button
            type="button"
            onClick={cargarPedidos}
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            ↻ Actualizar
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {/* Resumen */}
        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <button
            type="button"
            onClick={() => setFiltroEstado("todos")}
            className={`rounded-2xl bg-white p-5 text-left shadow-sm ring-1 ring-slate-200 transition hover:shadow-md ${
              filtroEstado === "todos"
                ? "ring-2 ring-blue-500"
                : ""
            }`}
          >
            <p className="text-sm font-semibold text-slate-500">
              Todos
            </p>

            <p className="mt-1 text-3xl font-black text-slate-900">
              {pedidos.length}
            </p>
          </button>

          <button
            type="button"
            onClick={() => setFiltroEstado("pendiente")}
            className={`rounded-2xl bg-yellow-50 p-5 text-left ring-1 ring-yellow-100 transition hover:shadow-md ${
              filtroEstado === "pendiente"
                ? "ring-2 ring-yellow-500"
                : ""
            }`}
          >
            <p className="text-sm font-semibold text-yellow-700">
              Pendientes
            </p>

            <p className="mt-1 text-3xl font-black text-yellow-900">
              {cantidadPorEstado("pendiente")}
            </p>
          </button>

          <button
            type="button"
            onClick={() => setFiltroEstado("preparando")}
            className={`rounded-2xl bg-purple-50 p-5 text-left ring-1 ring-purple-100 transition hover:shadow-md ${
              filtroEstado === "preparando"
                ? "ring-2 ring-purple-500"
                : ""
            }`}
          >
            <p className="text-sm font-semibold text-purple-700">
              Preparando
            </p>

            <p className="mt-1 text-3xl font-black text-purple-900">
              {cantidadPorEstado("preparando")}
            </p>
          </button>

          <button
            type="button"
            onClick={() => setFiltroEstado("enviado")}
            className={`rounded-2xl bg-indigo-50 p-5 text-left ring-1 ring-indigo-100 transition hover:shadow-md ${
              filtroEstado === "enviado"
                ? "ring-2 ring-indigo-500"
                : ""
            }`}
          >
            <p className="text-sm font-semibold text-indigo-700">
              Enviados
            </p>

            <p className="mt-1 text-3xl font-black text-indigo-900">
              {cantidadPorEstado("enviado")}
            </p>
          </button>
        </section>

        {/* Filtros */}
        <section className="mt-8 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="grid gap-4 md:grid-cols-[1fr_240px]">
            <div>
              <label
                htmlFor="buscar"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Buscar pedido
              </label>

              <input
                id="buscar"
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Número, ID, teléfono o dirección..."
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="estado"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Filtrar por estado
              </label>

              <select
                id="estado"
                value={filtroEstado}
                onChange={(e) =>
                  setFiltroEstado(
                    e.target.value as EstadoPedido | "todos"
                  )
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="todos">Todos los estados</option>

                {estados.map((estado) => (
                  <option key={estado} value={estado}>
                    {etiquetasEstado[estado]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Tabla */}
        <section className="mt-6 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="border-b border-slate-200 p-6">
            <h2 className="text-xl font-black text-slate-900">
              Pedidos ({pedidosFiltrados.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px]">
              <thead className="bg-slate-50">
                <tr className="text-left text-sm text-slate-500">
                  <th className="px-6 py-4 font-semibold">
                    Pedido
                  </th>

                  <th className="px-6 py-4 font-semibold">
                    Cliente
                  </th>

                  <th className="px-6 py-4 font-semibold">
                    Total
                  </th>

                  <th className="px-6 py-4 font-semibold">
                    Fecha
                  </th>

                  <th className="px-6 py-4 font-semibold">
                    Estado
                  </th>

                  <th className="px-6 py-4 font-semibold">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {pedidosFiltrados.map((pedido) => (
                  <tr
                    key={pedido.id}
                    className="transition hover:bg-slate-50"
                  >
                    <td className="px-6 py-5">
                      <p className="font-bold text-slate-900">
                        {pedido.numero}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        ID #{pedido.id}
                      </p>
                    </td>

                    <td className="px-6 py-5">
                      <p className="font-medium text-slate-900">
                        {pedido.telefono || "Sin teléfono"}
                      </p>

                      <p className="mt-1 max-w-[220px] truncate text-sm text-slate-500">
                        {pedido.direccion || "Sin dirección"}
                      </p>
                    </td>

                    <td className="px-6 py-5 font-bold text-slate-900">
                      {formatearPrecio(Number(pedido.total ?? 0))}
                    </td>

                    <td className="px-6 py-5 text-sm text-slate-600">
                      {formatearFecha(pedido.created_at)}
                    </td>

                    <td className="px-6 py-5">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${claseEstado(
                          pedido.estado
                        )}`}
                      >
                        {etiquetasEstado[pedido.estado]}
                      </span>
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-2">
                        <Link
                          href={`/admin/pedidos/${pedido.id}`}
                          className="font-semibold text-blue-600 hover:underline"
                        >
                          Ver detalles
                        </Link>

                        <select
                          value={pedido.estado}
                          disabled={actualizando === pedido.id}
                          onChange={(e) =>
                            cambiarEstado(
                              pedido.id,
                              e.target.value as EstadoPedido
                            )
                          }
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-blue-500 disabled:bg-slate-100"
                        >
                          {estados.map((estado) => (
                            <option
                              key={estado}
                              value={estado}
                            >
                              {etiquetasEstado[estado]}
                            </option>
                          ))}
                        </select>

                        {actualizando === pedido.id && (
                          <span className="text-xs text-slate-500">
                            Guardando...
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {pedidosFiltrados.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-slate-500"
                    >
                      No se encontraron pedidos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}