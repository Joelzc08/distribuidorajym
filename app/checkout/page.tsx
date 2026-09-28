"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { leerCarritoLocal, sincronizarCarrito } from "@/lib/carrito"
import { claseCampo, formatearPrecio } from "@/lib/format"
import type { ItemCarrito, Perfil } from "@/lib/types"

export default function CheckoutPage() {
  const router = useRouter()
  const [carrito, setCarrito] = useState<ItemCarrito[]>([])
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [telefono, setTelefono] = useState("")
  const [direccion, setDireccion] = useState("")
  const [metodoPago, setMetodoPago] = useState("Pago contra entrega")
  const [metodoEntrega, setMetodoEntrega] = useState("Entrega a domicilio")
  const [notas, setNotas] = useState("")
  const [cargando, setCargando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    async function cargar() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace("/login?next=/checkout")
        return
      }

      const { data } = await supabase
        .from("profiles")
        .select("id, nombre, apellidos, telefono, direccion, rol")
        .eq("id", user.id)
        .maybeSingle()

      if (data) {
        setPerfil(data as Perfil)
        setTelefono(data.telefono ?? "")
        setDireccion(data.direccion ?? "")
      }

      const local = leerCarritoLocal()
      setCarrito(local)
      setCargando(false)
    }

    cargar()
  }, [router])

  const total = useMemo(
    () => carrito.reduce((suma, item) => suma + item.precio_con_iva * item.cantidad, 0),
    [carrito]
  )

  async function confirmar(e: FormEvent) {
    e.preventDefault()
    setError("")

    if (carrito.length === 0) {
      setError("Tu carrito está vacío.")
      return
    }
    if (!telefono.trim() || !direccion.trim()) {
      setError("Necesitamos teléfono y dirección para el pedido.")
      return
    }

    setEnviando(true)

    const { data, error: rpcError } = await supabase.rpc("crear_pedido", {
      p_telefono: telefono.trim(),
      p_direccion: direccion.trim(),
      p_metodo_pago: metodoPago,
      p_metodo_entrega: metodoEntrega,
      p_notas: notas.trim() || null,
    })

    if (rpcError) {
      setError(
        rpcError.message.includes("function")
          ? "Falta configurar la función de pedidos en Supabase. Ejecuta supabase/schema.sql."
          : rpcError.message
      )
      setEnviando(false)
      return
    }

    await sincronizarCarrito([])
    const pedido = Array.isArray(data) ? data[0] : data
    router.push(`/pedidos/${pedido?.id ?? ""}`)
  }

  if (cargando) {
    return <main className="px-6 py-16 text-center text-slate-600">Cargando checkout...</main>
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-4xl font-black text-slate-900">Finalizar pedido</h1>
      <p className="mt-2 text-slate-600">
        Revisa tus datos. El pago inicial es contra entrega.
      </p>

      {carrito.length === 0 ? (
        <div className="mt-8 rounded-2xl bg-white p-8 text-center shadow-sm">
          <p>No hay productos para facturar.</p>
          <Link href="/productos" className="mt-4 inline-block font-semibold text-blue-600">
            Ir al catálogo
          </Link>
        </div>
      ) : (
        <form onSubmit={confirmar} className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
          <div className="space-y-5 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-black">Datos del cliente</h2>
            <p className="text-sm text-slate-600">
              {perfil ? `${perfil.nombre} ${perfil.apellidos}` : "Cliente"}
            </p>
            <div>
              <label className="mb-2 block text-sm font-semibold">Teléfono</label>
              <input className={claseCampo()} value={telefono} onChange={(e) => setTelefono(e.target.value)} required />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold">Dirección</label>
              <textarea className={claseCampo()} rows={3} value={direccion} onChange={(e) => setDireccion(e.target.value)} required />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold">Método de pago</label>
              <select className={claseCampo()} value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
                <option>Pago contra entrega</option>
                <option>Transferencia bancaria</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold">Método de entrega</label>
              <select className={claseCampo()} value={metodoEntrega} onChange={(e) => setMetodoEntrega(e.target.value)}>
                <option>Entrega a domicilio</option>
                <option>Retiro en bodega</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold">Notas</label>
              <textarea className={claseCampo()} rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} />
            </div>
          </div>

          <aside className="h-fit rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-black">Resumen</h2>
            <ul className="mt-4 space-y-2 text-sm">
              {carrito.map((item) => (
                <li key={item.id} className="flex justify-between gap-3">
                  <span>
                    {item.nombre} × {item.cantidad}
                  </span>
                  <span className="font-semibold">
                    {formatearPrecio(item.precio_con_iva * item.cantidad)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex justify-between text-lg font-black">
              <span>Total</span>
              <span>{formatearPrecio(total)}</span>
            </div>
            {error && (
              <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={enviando}
              className="mt-6 w-full rounded-xl bg-green-600 py-3.5 font-bold text-white hover:bg-green-700 disabled:bg-green-300"
            >
              {enviando ? "Creando pedido..." : "Confirmar pedido"}
            </button>
          </aside>
        </form>
      )}
    </main>
  )
}
