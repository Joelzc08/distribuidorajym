import { supabase } from "@/lib/supabase"
import type { ItemCarrito, Producto } from "@/lib/types"

export function productoAItemCarrito(
  producto: Producto,
  cantidad: number
): ItemCarrito {
  const precio = Number(producto.precio ?? 0)
  const precioConIva = Number(
    producto.precio_con_iva ?? producto.precio ?? 0
  )

  return {
    id: producto.id,
    nombre: producto.nombre,
    codigo: producto.codigo ?? null,
    unidad_medida: producto.unidad_medida ?? null,
    imagen_url: producto.imagen_url ?? null,
    precio,
    precio_con_iva: precioConIva,
    porcentaje_iva: producto.porcentaje_iva ?? null,
    cantidad,
    stock: Number(producto.stock ?? 0),
    activo: producto.activo !== false,
  }
}

export function normalizarItem(raw: Record<string, unknown>): ItemCarrito | null {
  const id = Number(raw.id)
  if (!id) return null

  const precio = Number(raw.precio ?? 0)
  const precioConIva = Number(
    raw.precio_con_iva ?? raw.precio ?? 0
  )

  return {
    id,
    nombre: String(raw.nombre ?? "Producto"),
    codigo: (raw.codigo as string | null) ?? null,
    unidad_medida:
      (raw.unidad_medida as string | null) ??
      (raw.presentacion as string | null) ??
      null,
    imagen_url:
      (raw.imagen_url as string | null) ??
      (typeof raw.imagen === "string" && raw.imagen.startsWith("http")
        ? raw.imagen
        : null),
    precio,
    precio_con_iva: precioConIva,
    porcentaje_iva: (raw.porcentaje_iva as number | null) ?? null,
    cantidad: Math.max(1, Number(raw.cantidad || 1)),
    stock: Number(raw.stock ?? 0),
    activo: raw.activo !== false,
  }
}

export function leerCarritoLocal(): ItemCarrito[] {
  if (typeof window === "undefined") return []

  const local = localStorage.getItem("carrito")
  if (!local) return []

  try {
    const parsed = JSON.parse(local)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((item) => normalizarItem(item))
      .filter((item): item is ItemCarrito => item !== null)
  } catch {
    return []
  }
}

export function guardarCarritoLocal(items: ItemCarrito[]) {
  localStorage.setItem("carrito", JSON.stringify(items))
  window.dispatchEvent(new Event("carritoActualizado"))
}

export async function sincronizarCarrito(items: ItemCarrito[]) {
  guardarCarritoLocal(items)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: null }

  const { error } = await supabase.from("carritos").upsert(
    {
      user_id: user.id,
      items,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  )

  return { error }
}
