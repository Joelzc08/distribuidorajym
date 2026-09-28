"use client"

import { useState } from "react"

import { supabase } from "@/lib/supabase"

type EstadoPedido =
  | "pendiente"
  | "confirmado"
  | "preparando"
  | "enviado"
  | "entregado"
  | "cancelado"

type Props = {
  pedidoId: number
  estadoActual: EstadoPedido
}

const estados: EstadoPedido[] = [
  "pendiente",
  "confirmado",
  "preparando",
  "enviado",
  "entregado",
  "cancelado",
]

const etiquetas: Record<EstadoPedido, string> = {
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  preparando: "Preparando",
  enviado: "Enviado",
  entregado: "Entregado",
  cancelado: "Cancelado",
}

export default function CambiarEstadoPedido({
  pedidoId,
  estadoActual,
}: Props) {
  const [estado, setEstado] = useState<EstadoPedido>(estadoActual)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState("")

  async function cambiarEstado(nuevoEstado: EstadoPedido) {
    if (nuevoEstado === estado) {
      return
    }

    setGuardando(true)
    setMensaje("")

    const { error } = await supabase
      .from("pedidos")
      .update({
        estado: nuevoEstado,
      })
      .eq("id", pedidoId)

    if (error) {
      console.error("Error actualizando pedido:", error)

      setMensaje(`Error: ${error.message}`)
      setGuardando(false)

      return
    }

    setEstado(nuevoEstado)
    setMensaje("Estado actualizado")
    setGuardando(false)

    window.location.reload()
  }

  return (
    <div className="min-w-[180px]">
      <select
        value={estado}
        disabled={guardando}
        onChange={(e) =>
          cambiarEstado(e.target.value as EstadoPedido)
        }
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-100"
      >
        {estados.map((opcion) => (
          <option key={opcion} value={opcion}>
            {etiquetas[opcion]}
          </option>
        ))}
      </select>

      {guardando && (
        <p className="mt-1 text-xs text-slate-500">
          Guardando...
        </p>
      )}

      {mensaje && !mensaje.startsWith("Error") && (
        <p className="mt-1 text-xs font-medium text-green-600">
          {mensaje}
        </p>
      )}

      {mensaje.startsWith("Error") && (
        <p className="mt-1 text-xs font-medium text-red-600">
          {mensaje}
        </p>
      )}
    </div>
  )
}