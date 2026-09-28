"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

import { supabase } from "@/lib/supabase"

type ProductoInicio = {
  id: string
  nombre: string
  precio: number | null
  precio_con_iva: number | null
  imagen_url: string | null
  stock: number | null
}

type CategoriaInicio = {
  id: string
  nombre: string
}

export default function Inicio() {
  const [productos, setProductos] = useState<ProductoInicio[]>([])
  const [categorias, setCategorias] = useState<CategoriaInicio[]>([])

  useEffect(() => {
    async function cargarDatos() {
      const [{ data: productosData }, { data: categoriasData }] =
        await Promise.all([
          supabase
            .from("productos")
            .select(
              "id, nombre, precio, precio_con_iva, imagen_url, stock"
            )
            .eq("activo", true)
            .order("nombre", { ascending: true })
            .limit(8),

          supabase
            .from("categorias")
            .select("id, nombre")
            .eq("activo", true)
            .order("nombre", { ascending: true })
            .limit(8),
        ])

      setProductos(productosData ?? [])
      setCategorias(categoriasData ?? [])
    }

    cargarDatos()
  }, [])

  return (
    <main>
      <section className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <p className="text-sm font-bold uppercase tracking-wide text-blue-600">
            Distribuidora JYM
          </p>

          <h1 className="mt-3 max-w-3xl text-4xl font-black text-slate-900 sm:text-5xl">
            Productos para tu negocio, listos para pedir
          </h1>

          <p className="mt-4 max-w-2xl text-lg text-slate-600">
            Consulta el catálogo, arma tu carrito y envía el pedido. Atención
            local, precios con IVA y entrega coordinada.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/productos"
              className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              Ver productos
            </Link>

            <Link
              href="/carrito"
              className="rounded-xl border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Ver carrito
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-slate-900">
              Categorías destacadas
            </h2>

            <p className="mt-2 text-slate-600">
              Encuentra rápido lo que necesitas.
            </p>
          </div>

          <Link
            href="/productos"
            className="font-semibold text-blue-600"
          >
            Ver catálogo →
          </Link>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categorias.map((categoria) => (
            <Link
              key={categoria.id}
              href={`/productos?categoria=${categoria.id}`}
              className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="text-2xl">🏷️</div>

              <h3 className="mt-3 font-bold text-slate-900">
                {categoria.nombre}
              </h3>
            </Link>
          ))}

          {categorias.length === 0 && (
            <p className="text-slate-600">
              Aún no hay categorías publicadas.
            </p>
          )}
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <h2 className="text-3xl font-black text-slate-900">
            Productos destacados
          </h2>

          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {productos.map((producto) => (
              <Link
                key={producto.id}
                href={`/productos/${producto.id}`}
                className="overflow-hidden rounded-2xl bg-slate-50 shadow-sm ring-1 ring-slate-200"
              >
                <div className="flex h-40 items-center justify-center bg-slate-100 text-5xl">
                  {producto.imagen_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={producto.imagen_url}
                      alt={producto.nombre}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    "📦"
                  )}
                </div>

                <div className="p-4">
                  <h3 className="font-bold text-slate-900">
                    {producto.nombre}
                  </h3>

                  <p className="mt-2 text-lg font-black text-blue-600">
                    {new Intl.NumberFormat("es-CR", {
                      style: "currency",
                      currency: "CRC",
                    }).format(
                      Number(
                        producto.precio_con_iva ??
                          producto.precio ??
                          0
                      )
                    )}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-12 sm:px-6 md:grid-cols-2">
        <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-2xl font-black text-slate-900">
            La distribuidora
          </h2>

          <p className="mt-3 text-slate-600">
            En Distribuidora JYM abastecemos negocios con un catálogo
            actualizado, control de inventario y un proceso de pedido simple.
            Si necesitas cantidades especiales o un producto que no aparece,
            escríbenos.
          </p>
        </div>

        <div
          id="contacto"
          className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200"
        >
          <h2 className="text-2xl font-black text-slate-900">
            Contacto
          </h2>

          <p className="mt-3 text-slate-600">
            Horario de atención de lunes a sábado. Coordinamos entrega o
            retiro según tu zona.
          </p>

          <p className="mt-4 font-semibold text-slate-900">
            contacto@distribuidorajym.com
          </p>

          <p className="mt-1 font-semibold text-slate-900">
            +506 0000-0000
          </p>
        </div>
      </section>
    </main>
  )
}