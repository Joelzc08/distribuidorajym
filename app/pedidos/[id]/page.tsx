"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { formatearPrecio } from "@/lib/format"
import type {
  EstadoPedido,
  Pedido,
  PedidoDetalle,
} from "@/lib/types"

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

function formatearFecha(fecha: string) {
  return new Date(fecha).toLocaleDateString("es-CR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function PedidoDetallePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [detalles, setDetalles] = useState<PedidoDetalle[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function cargarPedido() {
      setCargando(true)
      setError("")

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace(`/login?next=/pedidos/${id}`)
        return
      }

      console.log("ID URL:", id)
console.log("USER ACTUAL:", user.id)

const { data: pedidoData, error: pedidoError } = await supabase
  .from("pedidos")
  .select("*")
  .eq("id", id)
  .maybeSingle()

console.log("PEDIDO:", pedidoData)
console.log("ERROR PEDIDO:", pedidoError)

      if (pedidoError) {
        setError(pedidoError.message)
        setCargando(false)
        return
      }

      if (!pedidoData) {
        setError("No encontramos este pedido.")
        setCargando(false)
        return
      }

      const { data: detallesData, error: detallesError } = await supabase
        .from("pedido_detalles")
        .select("*")
        .eq("pedido_id", id)
        .order("id", { ascending: true })

      if (detallesError) {
        setError(detallesError.message)
        setCargando(false)
        return
      }

      setPedido(pedidoData as Pedido)
      setDetalles((detallesData ?? []) as PedidoDetalle[])
      setCargando(false)
    }

    cargarPedido()
  }, [id, router])

  if (cargando) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
        <p className="text-gray-600">Cargando pedido...</p>
      </main>
    )
  }

  if (error || !pedido) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <h1 className="text-xl font-bold text-red-800">
            Pedido no encontrado
          </h1>

          <p className="mt-2 text-red-700">
            {error || "No fue posible cargar este pedido."}
          </p>

          <Link
            href="/pedidos"
            className="mt-5 inline-block rounded-lg bg-black px-5 py-2.5 font-medium text-white hover:bg-gray-800"
          >
            Volver a mis pedidos
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6">
        <Link
          href="/pedidos"
          className="text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          ← Volver a mis pedidos
        </Link>
      </div>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-500">
            Pedido
          </p>

          <h1 className="text-3xl font-bold text-gray-900">
            {pedido.numero}
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Realizado el {formatearFecha(pedido.created_at)}
          </p>
        </div>

        <span
          className={`w-fit rounded-full px-4 py-2 text-sm font-semibold ${claseEstado(
            pedido.estado
          )}`}
        >
          {etiquetasEstado[pedido.estado]}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 p-5">
              <h2 className="text-xl font-bold text-gray-900">
                Productos
              </h2>
            </div>

            <div className="divide-y divide-gray-100">
              {detalles.map((detalle) => (
                <div
                  key={detalle.id}
                  className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {detalle.nombre}
                    </h3>

                    {detalle.codigo && (
                      <p className="mt-1 text-sm text-gray-500">
                        Código: {detalle.codigo}
                      </p>
                    )}

                    <p className="mt-1 text-sm text-gray-600">
                      Cantidad: {detalle.cantidad}
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-sm text-gray-500">
                      {formatearPrecio(Number(detalle.precio_unitario))} c/u
                    </p>

                    <p className="mt-1 font-bold text-gray-900">
                      {formatearPrecio(Number(detalle.subtotal))}
                    </p>
                  </div>
                </div>
              ))}

              {detalles.length === 0 && (
                <div className="p-5 text-gray-600">
                  No hay productos registrados en este pedido.
                </div>
              )}
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">
              Resumen
            </h2>

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-gray-600">
                  Subtotal
                </span>

                <span className="font-medium text-gray-900">
                  {formatearPrecio(Number(pedido.subtotal))}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-gray-600">
                  IVA
                </span>

                <span className="font-medium text-gray-900">
                  {formatearPrecio(Number(pedido.iva))}
                </span>
              </div>

              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between gap-4">
                  <span className="font-bold text-gray-900">
                    Total
                  </span>

                  <span className="text-xl font-bold text-gray-900">
                    {formatearPrecio(Number(pedido.total))}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">
              Datos de entrega
            </h2>

            <div className="mt-5 space-y-4 text-sm">
              <div>
                <p className="font-medium text-gray-500">
                  Dirección
                </p>

                <p className="mt-1 text-gray-900">
                  {pedido.direccion || "No indicada"}
                </p>
              </div>

              <div>
                <p className="font-medium text-gray-500">
                  Teléfono
                </p>

                <p className="mt-1 text-gray-900">
                  {pedido.telefono || "No indicado"}
                </p>
              </div>

              <div>
                <p className="font-medium text-gray-500">
                  Método de entrega
                </p>

                <p className="mt-1 text-gray-900">
                  {pedido.metodo_entrega}
                </p>
              </div>

              <div>
                <p className="font-medium text-gray-500">
                  Método de pago
                </p>

                <p className="mt-1 text-gray-900">
                  {pedido.metodo_pago}
                </p>
              </div>

              {pedido.notas && (
                <div>
                  <p className="font-medium text-gray-500">
                    Notas
                  </p>

                  <p className="mt-1 text-gray-900">
                    {pedido.notas}
                  </p>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}