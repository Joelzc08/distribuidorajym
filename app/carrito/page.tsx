"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import {
  leerCarritoLocal,
  normalizarItem,
  sincronizarCarrito,
} from "@/lib/carrito"
import { formatearPrecio } from "@/lib/format"
import type { ItemCarrito } from "@/lib/types"
import ImagenProducto from "../components/ImagenProducto"

export default function Carrito() {
  const [carrito, setCarrito] = useState<ItemCarrito[]>([])
  const [cargando, setCargando] = useState(true)
  const [sincronizando, setSincronizando] = useState(false)
  const [usuarioId, setUsuarioId] = useState<string | null>(null)
  const [aviso, setAviso] = useState("")

  async function persistir(nuevo: ItemCarrito[]) {
    setCarrito(nuevo)
    setSincronizando(true)
    await sincronizarCarrito(nuevo)
    setSincronizando(false)
  }

  useEffect(() => {
    let activo = true

    async function cargar() {
      const local = leerCarritoLocal()
      const { data } = await supabase.auth.getUser()
      const user = data.user

      if (!activo) return

      if (!user) {
        setCarrito(local)
        setCargando(false)
        return
      }

      setUsuarioId(user.id)

      const { data: remoto, error } = await supabase
        .from("carritos")
        .select("items")
        .eq("user_id", user.id)
        .maybeSingle()

      if (error) {
        setAviso("No se pudo cargar el carrito desde tu cuenta. Usamos la copia local.")
        setCarrito(local)
        setCargando(false)
        return
      }

      const remotoItems = Array.isArray(remoto?.items)
        ? remoto.items
            .map((item: Record<string, unknown>) => normalizarItem(item))
            .filter((item): item is ItemCarrito => item !== null)
        : []

      if (remoto) {
        setCarrito(remotoItems)
        await sincronizarCarrito(remotoItems)
      } else {
        setCarrito(local)
        if (local.length > 0) await sincronizarCarrito(local)
      }

      setCargando(false)
    }

    cargar()
    return () => {
      activo = false
    }
  }, [])

  useEffect(() => {
    if (cargando || carrito.length === 0) return

    let activo = true

    async function validarStock() {
      const ids = carrito.map((item) => item.id)
      const { data } = await supabase
        .from("productos")
        .select("id, stock, activo, precio, precio_con_iva, nombre, codigo, imagen_url, unidad_medida")
        .in("id", ids)

      if (!activo || !data) return

      const actualizados: ItemCarrito[] = []
      const mensajes: string[] = []

      for (const item of carrito) {
        const fresco = data.find((p) => p.id === item.id)
        if (!fresco || fresco.activo === false) {
          mensajes.push(`${item.nombre} ya no está disponible y se quitó del carrito.`)
          continue
        }

        const stock = Number(fresco.stock ?? 0)
        let cantidad = item.cantidad
        if (stock <= 0) {
          mensajes.push(`${item.nombre} se quedó sin stock y se quitó del carrito.`)
          continue
        }
        if (cantidad > stock) {
          cantidad = stock
          mensajes.push(`${item.nombre}: la cantidad se ajustó al stock disponible (${stock}).`)
        }

        actualizados.push({
          ...item,
          nombre: fresco.nombre,
          codigo: fresco.codigo,
          imagen_url: fresco.imagen_url,
          unidad_medida: fresco.unidad_medida,
          precio: Number(fresco.precio ?? item.precio),
          precio_con_iva: Number(fresco.precio_con_iva ?? fresco.precio ?? item.precio_con_iva),
          stock,
          cantidad,
          activo: true,
        })
      }

      if (mensajes.length > 0) {
        setAviso(mensajes.join(" "))
        await persistir(actualizados)
      }
    }

    validarStock()
    return () => {
      activo = false
    }
    // solo al cargar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargando])

  async function aumentar(id: number) {
    const nuevo = carrito.map((producto) => {
      if (producto.id !== id) return producto
      const siguiente = producto.cantidad + 1
      if (siguiente > producto.stock) return producto
      return { ...producto, cantidad: siguiente }
    })
    await persistir(nuevo)
  }

  async function disminuir(id: number) {
    const nuevo = carrito
      .map((producto) =>
        producto.id === id
          ? { ...producto, cantidad: Math.max(0, producto.cantidad - 1) }
          : producto
      )
      .filter((producto) => producto.cantidad > 0)
    await persistir(nuevo)
  }

  async function eliminar(id: number) {
    await persistir(carrito.filter((producto) => producto.id !== id))
    setAviso("Producto eliminado")
  }

  const subtotal = useMemo(
    () => carrito.reduce((total, p) => total + p.precio * p.cantidad, 0),
    [carrito]
  )
  const total = useMemo(
    () => carrito.reduce((suma, p) => suma + p.precio_con_iva * p.cantidad, 0),
    [carrito]
  )
  const iva = Math.max(total - subtotal, 0)
  const unidades = carrito.reduce((suma, p) => suma + p.cantidad, 0)

  if (cargando) {
    return (
      <main className="px-6 py-16 text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
        <p className="mt-4 text-gray-600">Cargando tu carrito...</p>
      </main>
    )
  }

  return (
    <main>
      <section className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
            Tu compra
          </p>
          <h1 className="mt-1 text-4xl font-black text-slate-900">Mi carrito</h1>
          <p className="mt-2 text-gray-600">
            {unidades} {unidades === 1 ? "unidad" : "unidades"} en tu pedido.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-8">
        {aviso && (
          <div className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            ⚠ {aviso}
          </div>
        )}

        {carrito.length === 0 ? (
          <div className="rounded-3xl bg-white p-12 text-center shadow-sm ring-1 ring-slate-200">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-4xl">
              🛒
            </div>
            <h2 className="mt-5 text-2xl font-bold text-slate-900">Tu carrito está vacío</h2>
            <p className="mx-auto mt-2 max-w-md text-gray-500">
              Agrega productos desde el catálogo y aparecerán aquí.
            </p>
            <Link
              href="/productos"
              className="mt-6 inline-flex rounded-xl bg-blue-600 px-6 py-3 font-bold text-white transition hover:bg-blue-700"
            >
              Continuar comprando
            </Link>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
            <div className="space-y-4">
              {carrito.map((producto) => {
                const parcial = producto.precio_con_iva * producto.cantidad
                return (
                  <article
                    key={producto.id}
                    className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
                  >
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                      <div className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
                        <ImagenProducto src={producto.imagen_url} alt={producto.nombre} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h2 className="text-lg font-bold text-slate-900">{producto.nombre}</h2>
                            <p className="mt-1 text-sm text-gray-500">
                              {producto.codigo ? `Código: ${producto.codigo}` : "Sin código"}
                              {producto.unidad_medida ? ` · ${producto.unidad_medida}` : ""}
                            </p>
                          </div>
                          <button
                            onClick={() => eliminar(producto.id)}
                            className="text-sm font-semibold text-red-500 hover:text-red-700"
                          >
                            Eliminar
                          </button>
                        </div>
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                          <div>
                            <p className="text-xs text-gray-500">Precio unitario</p>
                            <p className="font-bold text-slate-900">
                              {formatearPrecio(producto.precio_con_iva)}
                            </p>
                            <p className="text-xs text-gray-500">Stock: {producto.stock}</p>
                          </div>
                          <div className="flex items-center rounded-xl border border-slate-200 p-1">
                            <button
                              onClick={() => disminuir(producto.id)}
                              className="h-9 w-9 rounded-lg text-xl font-bold text-slate-700 hover:bg-slate-100"
                            >
                              −
                            </button>
                            <span className="w-10 text-center font-bold">{producto.cantidad}</span>
                            <button
                              onClick={() => aumentar(producto.id)}
                              disabled={producto.cantidad >= producto.stock}
                              className="h-9 w-9 rounded-lg bg-blue-600 text-xl font-bold text-white hover:bg-blue-700 disabled:bg-slate-300"
                            >
                              +
                            </button>
                          </div>
                          <div className="min-w-28 text-right">
                            <p className="text-xs text-gray-500">Subtotal</p>
                            <p className="text-lg font-black text-slate-900">
                              {formatearPrecio(parcial)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>

            <aside className="h-fit rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 lg:sticky lg:top-24">
              <h2 className="text-2xl font-black text-slate-900">Resumen del pedido</h2>
              <div className="mt-6 space-y-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Productos</span>
                  <span className="font-semibold">{unidades}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold">{formatearPrecio(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">IVA</span>
                  <span className="font-semibold">{formatearPrecio(iva)}</span>
                </div>
                <hr />
                <div className="flex items-end justify-between">
                  <span className="text-lg font-bold">Total general</span>
                  <span className="text-2xl font-black text-blue-600">
                    {formatearPrecio(total)}
                  </span>
                </div>
              </div>
              {usuarioId && (
                <p className="mt-5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                  ✓ Carrito sincronizado con tu cuenta
                  {sincronizando ? " · Guardando..." : ""}
                </p>
              )}
              <Link
                href="/checkout"
                className="mt-6 block w-full rounded-xl bg-green-600 py-3.5 text-center font-bold text-white transition hover:bg-green-700"
              >
                Proceder al pedido
              </Link>
              <Link
                href="/productos"
                className="mt-3 block w-full rounded-xl border border-slate-200 py-3.5 text-center font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Continuar comprando
              </Link>
            </aside>
          </div>
        )}
      </section>
    </main>
  )
}
