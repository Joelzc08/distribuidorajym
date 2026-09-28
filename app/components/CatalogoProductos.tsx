"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  guardarCarritoLocal,
  leerCarritoLocal,
  productoAItemCarrito,
  sincronizarCarrito,
} from "@/lib/carrito"
import { claseCampo, formatearPrecio } from "@/lib/format"
import type { Categoria, Producto } from "@/lib/types"
import ImagenProducto from "./ImagenProducto"

type Props = {
  productos: Producto[]
  categorias: Categoria[]
  categoriaInicial?: string
}

const PRODUCTOS_POR_PAGINA = 20

export default function CatalogoProductos({
  productos,
  categorias,
  categoriaInicial = "todas",
}: Props) {
  const [busqueda, setBusqueda] = useState("")
  const [categoriaSeleccionada, setCategoriaSeleccionada] =
    useState(categoriaInicial)
  const [paginaActual, setPaginaActual] = useState(1)
  const [cantidades, setCantidades] = useState<Record<number, number>>({})
  const [mensajeCarrito, setMensajeCarrito] = useState("")
  const [tipoMensaje, setTipoMensaje] = useState<"ok" | "aviso">("ok")

  const productosFiltrados = useMemo(() => {
    const texto = busqueda.toLowerCase().trim()

    return productos.filter((producto) => {
      const coincideBusqueda =
        texto === "" ||
        producto.nombre.toLowerCase().includes(texto) ||
        producto.codigo?.toLowerCase().includes(texto) ||
        producto.codigo_interno?.toLowerCase().includes(texto) ||
        producto.codigo_cabys?.toLowerCase().includes(texto)

      const coincideCategoria =
        categoriaSeleccionada === "todas" ||
        String(producto.categoria_id) === categoriaSeleccionada

      return coincideBusqueda && coincideCategoria && producto.activo
    })
  }, [productos, busqueda, categoriaSeleccionada])

  const totalPaginas = Math.max(
    1,
    Math.ceil(productosFiltrados.length / PRODUCTOS_POR_PAGINA)
  )

  const productosPagina = useMemo(() => {
    const inicio = (paginaActual - 1) * PRODUCTOS_POR_PAGINA
    return productosFiltrados.slice(inicio, inicio + PRODUCTOS_POR_PAGINA)
  }, [productosFiltrados, paginaActual])

  useEffect(() => {
    setPaginaActual(1)
  }, [busqueda, categoriaSeleccionada])

  useEffect(() => {
    if (paginaActual > totalPaginas) {
      setPaginaActual(totalPaginas)
    }
  }, [paginaActual, totalPaginas])

  function mostrarMensaje(texto: string, tipo: "ok" | "aviso" = "ok") {
    setTipoMensaje(tipo)
    setMensajeCarrito(texto)
    setTimeout(() => setMensajeCarrito(""), 3500)
  }

  async function agregarAlCarrito(producto: Producto) {
    if (!producto.activo) {
      mostrarMensaje("Este producto ya no está disponible.", "aviso")
      return
    }

    const precio = producto.precio_con_iva ?? producto.precio
    if (precio === null) {
      mostrarMensaje("Este producto no tiene precio disponible.", "aviso")
      return
    }

    const stock = producto.stock
    if (stock !== null && stock <= 0) {
      mostrarMensaje("Sin stock", "aviso")
      return
    }

    const cantidadSeleccionada = cantidades[producto.id] || 1
    const carrito = leerCarritoLocal()
    const existente = carrito.find((item) => item.id === producto.id)
    const cantidadActual = existente?.cantidad || 0
    const nuevaCantidad = cantidadActual + cantidadSeleccionada

    if (stock !== null && nuevaCantidad > stock) {
      mostrarMensaje(
        `Stock insuficiente. Solo hay ${stock} unidades de ${producto.nombre}.`,
        "aviso"
      )
      return
    }

    const item = productoAItemCarrito(producto, nuevaCantidad)

    const actualizado = existente
      ? carrito.map((entrada) =>
          entrada.id === producto.id ? { ...item, cantidad: nuevaCantidad } : entrada
        )
      : [...carrito, item]

    guardarCarritoLocal(actualizado)
    const { error } = await sincronizarCarrito(actualizado)
    if (error) {
      console.error("No se pudo sincronizar el carrito:", error)
    }

    mostrarMensaje(
      `${cantidadSeleccionada} ${
        cantidadSeleccionada === 1 ? "producto agregado" : "productos agregados"
      } al carrito.`
    )
  }

  function irAPagina(pagina: number) {
    if (pagina < 1 || pagina > totalPaginas) return
    setPaginaActual(pagina)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function generarNumerosPaginas() {
    const paginas: (number | string)[] = []
    if (totalPaginas <= 7) {
      for (let i = 1; i <= totalPaginas; i++) paginas.push(i)
      return paginas
    }

    paginas.push(1)
    if (paginaActual > 4) paginas.push("...")
    const inicio = Math.max(2, paginaActual - 2)
    const final = Math.min(totalPaginas - 1, paginaActual + 2)
    for (let i = inicio; i <= final; i++) paginas.push(i)
    if (paginaActual < totalPaginas - 3) paginas.push("...")
    paginas.push(totalPaginas)
    return paginas
  }

  return (
    <div className="relative mt-8">
      {mensajeCarrito && (
        <div
          className={`fixed right-6 top-24 z-50 max-w-sm rounded-xl px-5 py-3 font-semibold text-white shadow-lg ${
            tipoMensaje === "ok" ? "bg-green-600" : "bg-amber-600"
          }`}
          role="status"
        >
          {tipoMensaje === "ok" ? "✓" : "⚠"} {mensajeCarrito}
        </div>
      )}

      <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="busqueda" className="mb-2 block text-sm font-semibold text-gray-900">
              Buscar producto
            </label>
            <input
              id="busqueda"
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Nombre, código o CABYS..."
              className={claseCampo()}
            />
          </div>
          <div>
            <label htmlFor="categoria" className="mb-2 block text-sm font-semibold text-gray-900">
              Categoría
            </label>
            <select
              id="categoria"
              value={categoriaSeleccionada}
              onChange={(e) => setCategoriaSeleccionada(e.target.value)}
              className={claseCampo()}
            >
              <option value="todas">Todas las categorías</option>
              {categorias.map((categoria) => (
                <option key={categoria.id} value={String(categoria.id)}>
                  {categoria.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-col justify-between gap-2 text-sm text-gray-900 md:flex-row">
          <span>
            Mostrando <strong>{productosFiltrados.length}</strong> productos
          </span>
          <button
            type="button"
            onClick={() => {
              setBusqueda("")
              setCategoriaSeleccionada("todas")
            }}
            className="font-semibold text-blue-600 hover:text-blue-800"
          >
            Reiniciar filtros
          </button>
        </div>
      </div>

      {productosPagina.length === 0 ? (
        <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
          <div className="text-5xl">🔍</div>
          <h3 className="mt-4 text-xl font-bold text-gray-900">
            No encontramos productos que coincidan con tu búsqueda.
          </h3>
          <p className="mt-2 text-gray-700">
            Intenta cambiar la búsqueda o seleccionar otra categoría.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {productosPagina.map((producto) => {
            const precio = producto.precio_con_iva ?? producto.precio
            const sinStock = producto.stock !== null && producto.stock <= 0
            const maxCantidad = Math.min(producto.stock ?? 20, 20)

            return (
              <div
                key={producto.id}
                className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="h-52 overflow-hidden bg-gray-100">
                  <ImagenProducto src={producto.imagen_url} alt={producto.nombre} />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <Link
                    href={`/productos/${producto.id}`}
                    className="text-lg font-bold text-gray-900 hover:text-blue-700"
                  >
                    {producto.nombre}
                  </Link>
                  {producto.codigo && (
                    <p className="mt-1 text-sm text-gray-700">Código: {producto.codigo}</p>
                  )}
                  {producto.codigo_cabys && (
                    <p className="mt-1 text-xs text-gray-700">CABYS: {producto.codigo_cabys}</p>
                  )}
                  {producto.unidad_medida && (
                    <p className="mt-2 text-sm text-gray-700">Unidad: {producto.unidad_medida}</p>
                  )}
                  <p className="mt-4 text-2xl font-bold text-blue-600">
                    {formatearPrecio(precio)}
                  </p>
                  {producto.stock === null ? (
                    <p className="mt-2 text-sm font-medium text-slate-600">Stock no indicado</p>
                  ) : (
                    <p className={`mt-2 text-sm font-medium ${sinStock ? "text-red-600" : "text-green-600"}`}>
                      {sinStock ? "Sin stock" : `Stock: ${producto.stock}`}
                    </p>
                  )}

                  {!sinStock && maxCantidad > 0 && (
                    <div className="mb-3">
                      <label
                        htmlFor={`cantidad-${producto.id}`}
                        className="mb-2 block text-sm font-semibold text-gray-900"
                      >
                        Cantidad
                      </label>
                      <select
                        id={`cantidad-${producto.id}`}
                        value={cantidades[producto.id] || 1}
                        onChange={(e) =>
                          setCantidades((actuales) => ({
                            ...actuales,
                            [producto.id]: Number(e.target.value),
                          }))
                        }
                        className={claseCampo()}
                      >
                        {Array.from({ length: maxCantidad }, (_, index) => index + 1).map(
                          (cantidad) => (
                            <option key={cantidad} value={cantidad}>
                              {cantidad} {cantidad === 1 ? "unidad" : "unidades"}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => agregarAlCarrito(producto)}
                    disabled={sinStock || precio === null}
                    className="mt-auto rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                  >
                    {sinStock
                      ? "Sin stock"
                      : precio === null
                        ? "Sin precio"
                        : "🛒 Agregar al carrito"}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {totalPaginas > 1 && (
        <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => irAPagina(paginaActual - 1)}
            disabled={paginaActual === 1}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-900 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← Anterior
          </button>
          {generarNumerosPaginas().map((pagina, index) =>
            pagina === "..." ? (
              <span key={`ellipsis-${index}`} className="px-2 text-gray-900">
                ...
              </span>
            ) : (
              <button
                key={pagina}
                type="button"
                onClick={() => irAPagina(pagina as number)}
                className={`min-w-10 rounded-lg px-3 py-2 font-semibold transition ${
                  paginaActual === pagina
                    ? "bg-blue-600 text-white"
                    : "border border-gray-300 bg-white text-gray-900 hover:bg-gray-100"
                }`}
              >
                {pagina}
              </button>
            )
          )}
          <button
            type="button"
            onClick={() => irAPagina(paginaActual + 1)}
            disabled={paginaActual === totalPaginas}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-900 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  )
}
