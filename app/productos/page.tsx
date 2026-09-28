"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"

import CatalogoProductos from "../components/CatalogoProductos"

import { supabase } from "@/lib/supabase"

import type { Categoria, Producto } from "@/lib/types"

export default function Productos() {
  const searchParams = useSearchParams()

  const categoriaInicial =
    searchParams.get("categoria") ?? "todas"

  const [productos, setProductos] = useState<Producto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function cargarCatalogo() {
      setCargando(true)
      setError(false)

      const [
        { data: productosData, error: productosError },
        { data: categoriasData, error: categoriasError },
      ] = await Promise.all([
        supabase
          .from("productos")
          .select("*")
          .eq("activo", true)
          .order("nombre", { ascending: true }),

        supabase
          .from("categorias")
          .select("id, nombre")
          .eq("activo", true)
          .order("nombre", { ascending: true }),
      ])

      if (productosError || categoriasError) {
        console.error("Error cargando catálogo:", {
          productosError,
          categoriasError,
        })

        setError(true)
        setProductos([])
        setCategorias([])
        setCargando(false)
        return
      }

      setProductos((productosData ?? []) as Producto[])
      setCategorias((categoriasData ?? []) as Categoria[])
      setCargando(false)
    }

    cargarCatalogo()
  }, [])

  if (cargando) {
    return (
      <main className="px-4 py-10 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
            <p className="text-lg font-semibold text-slate-700">
              Cargando catálogo...
            </p>
          </div>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="px-4 py-10 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl bg-red-50 p-6 text-red-700">
            <h2 className="text-xl font-bold">
              Error al cargar el catálogo
            </h2>

            <p className="mt-2">
              No se pudo conectar con los productos. Inténtalo de nuevo en un
              momento.
            </p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="text-4xl font-bold text-gray-900">
              Catálogo de productos
            </h2>

            <p className="mt-2 text-gray-700">
              Busca productos y filtra el catálogo según tus necesidades.
            </p>
          </div>

          <div className="rounded-xl bg-white px-5 py-3 shadow">
            <p className="text-sm font-medium text-gray-900">
              Productos disponibles
            </p>

            <p className="text-2xl font-bold text-blue-600">
              {productos.length}
            </p>
          </div>
        </div>

        <CatalogoProductos
          productos={productos}
          categorias={categorias}
          categoriaInicial={categoriaInicial}
        />
      </div>
    </main>
  )
}