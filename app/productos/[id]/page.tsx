import Link from "next/link"
import { notFound } from "next/navigation"

import CatalogoProductos from "../../components/CatalogoProductos"
import ImagenProducto from "../../components/ImagenProducto"

import { supabase } from "@/lib/supabase"
import { formatearPrecio } from "@/lib/format"

import type { Producto } from "@/lib/types"

export default async function ProductoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const { data: producto } = await supabase
    .from("productos")
    .select("*")
    .eq("id", id)
    .eq("activo", true)
    .maybeSingle()

  if (!producto) {
    notFound()
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link
        href="/productos"
        className="font-semibold text-blue-600"
      >
        ← Volver al catálogo
      </Link>

      <div className="mt-6 grid gap-8 md:grid-cols-2">
        <div className="h-80 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
          <ImagenProducto
            src={producto.imagen_url}
            alt={producto.nombre}
          />
        </div>

        <div>
          <h1 className="text-4xl font-black text-slate-900">
            {producto.nombre}
          </h1>

          {producto.codigo && (
            <p className="mt-2 text-slate-600">
              Código: {producto.codigo}
            </p>
          )}

          {producto.codigo_cabys && (
            <p className="text-sm text-slate-600">
              CABYS: {producto.codigo_cabys}
            </p>
          )}

          <p className="mt-6 text-3xl font-black text-blue-600">
            {formatearPrecio(
              producto.precio_con_iva ?? producto.precio
            )}
          </p>

          <p className="mt-2 text-sm text-slate-600">
            {producto.stock === null
              ? "Stock no indicado"
              : producto.stock > 0
                ? `Stock: ${producto.stock}`
                : "Sin stock"}
          </p>
        </div>
      </div>

      <CatalogoProductos
        productos={[producto as Producto]}
        categorias={[]}
      />
    </main>
  )
}