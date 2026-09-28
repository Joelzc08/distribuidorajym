"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { formatearPrecio } from "@/lib/format"
import type { EstadoPedido, Pedido } from "@/lib/types"

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

export default function PedidosPage() {
  const router = useRouter()

  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function cargarPedidos() {
      setCargando(true)
      setError("")

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace("/login?next=/pedidos")
        return
      }

      const { data, error: pedidosError } = await supabase
        .from("pedidos")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (pedidosError) {
        setError(pedidosError.message)
        setCargando(false)
        return
      }

      setPedidos((data ?? []) as Pedido[])
      setCargando(false)
    }

    cargarPedidos()
  }, [router])

  if (cargando) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-gray-600">Cargando tus pedidos...</p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Mis pedidos
          </h1>
          <p className="mt-2 text-gray-600">
            Consulta tus pedidos y revisa su estado.
          </p>
        </div>

        <Link
          href="/productos"
          className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Seguir comprando
        </Link>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {pedidos.length === 0 && !error ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">
            Aún no tienes pedidos
          </h2>

          <p className="mt-2 text-gray-600">
            Cuando realices una compra, tus pedidos aparecerán aquí.
          </p>

          <Link
            href="/productos"
            className="mt-6 inline-block rounded-lg bg-black px-5 py-3 font-medium text-white hover:bg-gray-800"
          >
            Ver productos
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {pedidos.map((pedido) => (
            <Link
              key={pedido.id}
              href={`/pedidos/${pedido.id}`}
              className="block rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-gray-300 hover:shadow-md"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-500">
                    Pedido
                  </p>

                  <h2 className="text-lg font-bold text-gray-900">
                    {pedido.numero}
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    {formatearFecha(pedido.created_at)}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <span
                    className={`rounded-full px-3 py-1 text-sm font-medium ${claseEstado(
                      pedido.estado
                    )}`}
                  >
                    {etiquetasEstado[pedido.estado]}
                  </span>

                  <span className="text-lg font-bold text-gray-900">
                    {formatearPrecio(Number(pedido.total))}
                  </span>
                </div>
              </div>

              <div className="mt-4 border-t border-gray-100 pt-4">
                <div className="flex flex-col gap-1 text-sm text-gray-600 sm:flex-row sm:gap-6">
                  <span>
                    Entrega: {pedido.metodo_entrega}
                  </span>

                  <span>
                    Pago: {pedido.metodo_pago}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}