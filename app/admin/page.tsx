"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { Pedido, Producto } from "@/lib/types"

type PedidoDashboard = Pick<
  Pedido,
  "id" | "numero" | "estado" | "total" | "created_at"
>

export default function AdminDashboardPage() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [pedidos, setPedidos] = useState<PedidoDashboard[]>([])
  const [totalCategorias, setTotalCategorias] = useState(0)

  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    cargarDashboard()
  }, [])

  async function cargarDashboard() {
    setCargando(true)
    setError("")

    const [
      productosResult,
      categoriasResult,
      pedidosResult,
    ] = await Promise.all([
      supabase
        .from("productos")
        .select("*")
        .order("nombre", { ascending: true }),

      supabase
        .from("categorias")
        .select("id", { count: "exact" })
        .eq("activo", true),

      supabase
        .from("pedidos")
        .select(
          "id, numero, estado, total, created_at"
        )
        .order("created_at", {
          ascending: false,
        })
        .limit(8),
    ])

    if (productosResult.error) {
      console.error(
        "ERROR PRODUCTOS DASHBOARD:",
        productosResult.error
      )

      setError(
        `No se pudieron cargar los productos: ${productosResult.error.message}`
      )

      setCargando(false)
      return
    }

    if (categoriasResult.error) {
      console.error(
        "ERROR CATEGORÍAS DASHBOARD:",
        categoriasResult.error
      )

      setError(
        `No se pudieron cargar las categorías: ${categoriasResult.error.message}`
      )

      setCargando(false)
      return
    }

    if (pedidosResult.error) {
      console.error(
        "ERROR PEDIDOS DASHBOARD:",
        pedidosResult.error
      )

      setError(
        `No se pudieron cargar los pedidos: ${pedidosResult.error.message}`
      )

      setCargando(false)
      return
    }

    setProductos(
      (productosResult.data ?? []) as Producto[]
    )

    setTotalCategorias(
      categoriasResult.count ?? 0
    )

    setPedidos(
      (pedidosResult.data ?? []) as PedidoDashboard[]
    )

    setCargando(false)
  }

  const productosActivos = productos.filter(
    (producto) => producto.activo
  ).length

  const productosInactivos = productos.filter(
    (producto) => !producto.activo
  ).length

  const productosSinStock = productos.filter(
    (producto) =>
      producto.activo &&
      producto.control_stock !== "no" &&
      (producto.stock ?? 0) <= 0
  ).length

  const productosStockBajo = productos.filter(
    (producto) =>
      producto.activo &&
      producto.control_stock !== "no" &&
      (producto.stock ?? 0) > 0 &&
      (producto.stock ?? 0) <=
        (producto.stock_minimo ?? 0)
  ).length

  const pedidosPendientes = pedidos.filter(
    (pedido) =>
      pedido.estado === "pendiente"
  ).length

  const pedidosEnProceso = pedidos.filter(
    (pedido) =>
      pedido.estado === "confirmado" ||
      pedido.estado === "preparando" ||
      pedido.estado === "enviado"
  ).length

  const pedidosEntregados = pedidos.filter(
    (pedido) =>
      pedido.estado === "entregado"
  ).length

  const ventasMostradas = useMemo(() => {
    return pedidos.reduce(
      (total, pedido) =>
        total + Number(pedido.total ?? 0),
      0
    )
  }, [pedidos])

  function formatearMoneda(valor: number) {
    return new Intl.NumberFormat("es-CR", {
      style: "currency",
      currency: "CRC",
      maximumFractionDigits: 0,
    }).format(valor)
  }

  function formatearFecha(fecha: string) {
    return new Intl.DateTimeFormat("es-CR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(fecha))
  }

  function obtenerEstadoTexto(
    estado: PedidoDashboard["estado"]
  ) {
    const estados: Record<
      PedidoDashboard["estado"],
      string
    > = {
      pendiente: "Pendiente",
      confirmado: "Confirmado",
      preparando: "Preparando",
      enviado: "Enviado",
      entregado: "Entregado",
      cancelado: "Cancelado",
    }

    return estados[estado] ?? estado
  }

  function obtenerEstadoClase(
    estado: PedidoDashboard["estado"]
  ) {
    switch (estado) {
      case "pendiente":
        return "bg-amber-50 text-amber-700 ring-amber-200"

      case "confirmado":
        return "bg-blue-50 text-blue-700 ring-blue-200"

      case "preparando":
        return "bg-purple-50 text-purple-700 ring-purple-200"

      case "enviado":
        return "bg-cyan-50 text-cyan-700 ring-cyan-200"

      case "entregado":
        return "bg-emerald-50 text-emerald-700 ring-emerald-200"

      case "cancelado":
        return "bg-red-50 text-red-700 ring-red-200"

      default:
        return "bg-slate-50 text-slate-600 ring-slate-200"
    }
  }

  if (cargando) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-3xl bg-white p-12 text-center shadow-sm ring-1 ring-slate-200">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

            <h1 className="mt-6 text-2xl font-black text-slate-950">
              Cargando panel administrativo...
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Estamos preparando la información de
              Distribuidora JYM.
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
              Panel administrativo
            </div>

            <h1 className="text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
              Dashboard
            </h1>

            <p className="mt-2 max-w-2xl text-slate-500">
              Vista general de tu catálogo y pedidos
              recientes.
            </p>
          </div>

          <button
            type="button"
            onClick={cargarDashboard}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:shadow-md"
          >
            ↻ Actualizar
          </button>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-600 text-sm font-black text-white">
              !
            </div>

            <div>
              <p className="font-bold">
                No se pudo cargar el dashboard
              </p>

              <p className="mt-0.5 text-sm">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* ESTADÍSTICAS PRINCIPALES */}
        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          {/* PRODUCTOS */}
          <Link
            href="/admin/productos"
            className="group rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-bold text-slate-500">
                  Productos
                </p>

                <p className="mt-2 text-4xl font-black text-slate-950">
                  {productos.length}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
                📦
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
              <span className="text-sm text-slate-500">
                {productosActivos} activos
              </span>

              <span className="text-sm font-bold text-blue-600 transition group-hover:translate-x-1">
                Administrar →
              </span>
            </div>
          </Link>

          {/* CATEGORÍAS */}
          <Link
            href="/admin/categorias"
            className="group rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-bold text-slate-500">
                  Categorías
                </p>

                <p className="mt-2 text-4xl font-black text-slate-950">
                  {totalCategorias}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-2xl">
                📁
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
              <span className="text-sm text-slate-500">
                Activas
              </span>

              <span className="text-sm font-bold text-purple-600 transition group-hover:translate-x-1">
                Administrar →
              </span>
            </div>
          </Link>

          {/* PEDIDOS */}
          <Link
            href="/admin/pedidos"
            className="group rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-bold text-slate-500">
                  Pedidos recientes
                </p>

                <p className="mt-2 text-4xl font-black text-slate-950">
                  {pedidos.length}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-2xl">
                🛒
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
              <span className="text-sm text-slate-500">
                {pedidosPendientes} pendientes
              </span>

              <span className="text-sm font-bold text-amber-600 transition group-hover:translate-x-1">
                Ver pedidos →
              </span>
            </div>
          </Link>

          {/* VENTAS */}
          <div className="rounded-3xl bg-slate-950 p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-bold text-slate-400">
                  Ventas mostradas
                </p>

                <p className="mt-2 text-3xl font-black text-white">
                  {formatearMoneda(
                    ventasMostradas
                  )}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-2xl">
                ₡
              </div>
            </div>

            <div className="mt-5 border-t border-white/10 pt-4">
              <p className="text-xs text-slate-400">
                Basado en los pedidos recientes cargados
              </p>
            </div>
          </div>
        </section>

        {/* ALERTAS DE INVENTARIO */}
        <section className="mb-6 grid gap-4 md:grid-cols-3">

          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-xl">
                ⚠️
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-500">
                  Sin stock
                </p>

                <p className="text-2xl font-black text-red-600">
                  {productosSinStock}
                </p>
              </div>
            </div>

            <p className="mt-4 text-xs text-slate-400">
              Productos activos sin existencias.
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-xl">
                📉
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-500">
                  Stock bajo
                </p>

                <p className="text-2xl font-black text-amber-600">
                  {productosStockBajo}
                </p>
              </div>
            </div>

            <p className="mt-4 text-xs text-slate-400">
              Productos por debajo del stock mínimo.
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-xl">
                ○
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-500">
                  Productos inactivos
                </p>

                <p className="text-2xl font-black text-slate-600">
                  {productosInactivos}
                </p>
              </div>
            </div>

            <p className="mt-4 text-xs text-slate-400">
              Productos que no aparecen en el catálogo.
            </p>
          </div>
        </section>

        {/* PEDIDOS + RESUMEN */}
        <div className="grid gap-6 xl:grid-cols-[1fr_340px]">

          {/* PEDIDOS RECIENTES */}
          <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 p-6">
              <div>
                <h2 className="text-xl font-black text-slate-950">
                  Pedidos recientes
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Últimos pedidos registrados.
                </p>
              </div>

              <Link
                href="/admin/pedidos"
                className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
              >
                Ver todos
              </Link>
            </div>

            {pedidos.length === 0 ? (
              <div className="p-10 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
                  🛒
                </div>

                <h3 className="mt-4 font-bold text-slate-900">
                  Todavía no hay pedidos
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Los nuevos pedidos aparecerán aquí.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {pedidos.map((pedido) => (
                  <Link
                    key={pedido.id}
                    href={`/admin/pedidos/${pedido.id}`}
                    className="flex flex-col gap-4 p-5 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg">
                        🛒
                      </div>

                      <div className="min-w-0">
                        <p className="font-black text-slate-900">
                          Pedido #{pedido.numero}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {formatearFecha(
                            pedido.created_at
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-bold ring-1 ${obtenerEstadoClase(
                          pedido.estado
                        )}`}
                      >
                        {obtenerEstadoTexto(
                          pedido.estado
                        )}
                      </span>

                      <span className="font-black text-slate-950">
                        {formatearMoneda(
                          Number(
                            pedido.total ?? 0
                          )
                        )}
                      </span>

                      <span className="hidden text-slate-300 sm:block">
                        →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* RESUMEN */}
          <aside className="space-y-6">

            {/* ESTADO DE PEDIDOS */}
            <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-xl font-black text-slate-950">
                Estado de pedidos
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Resumen de los pedidos recientes.
              </p>

              <div className="mt-6 space-y-4">

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-600">
                      Pendientes
                    </span>

                    <span className="font-black text-amber-600">
                      {pedidosPendientes}
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-amber-500"
                      style={{
                        width:
                          pedidos.length > 0
                            ? `${Math.min(
                                100,
                                (pedidosPendientes /
                                  pedidos.length) *
                                  100
                              )}%`
                            : "0%",
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-600">
                      En proceso
                    </span>

                    <span className="font-black text-blue-600">
                      {pedidosEnProceso}
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{
                        width:
                          pedidos.length > 0
                            ? `${Math.min(
                                100,
                                (pedidosEnProceso /
                                  pedidos.length) *
                                  100
                              )}%`
                            : "0%",
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-600">
                      Entregados
                    </span>

                    <span className="font-black text-emerald-600">
                      {pedidosEntregados}
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{
                        width:
                          pedidos.length > 0
                            ? `${Math.min(
                                100,
                                (pedidosEntregados /
                                  pedidos.length) *
                                  100
                              )}%`
                            : "0%",
                      }}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* ACCIONES RÁPIDAS */}
            <section className="rounded-3xl bg-slate-950 p-6 shadow-sm">
              <h2 className="text-xl font-black text-white">
                Acciones rápidas
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Accede rápidamente a las áreas principales.
              </p>

              <div className="mt-5 space-y-2">
                <Link
                  href="/admin/productos"
                  className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/15"
                >
                  <span>📦 Productos</span>
                  <span>→</span>
                </Link>

                <Link
                  href="/admin/categorias"
                  className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/15"
                >
                  <span>📁 Categorías</span>
                  <span>→</span>
                </Link>

                <Link
                  href="/admin/pedidos"
                  className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/15"
                >
                  <span>🛒 Pedidos</span>
                  <span>→</span>
                </Link>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  )
}