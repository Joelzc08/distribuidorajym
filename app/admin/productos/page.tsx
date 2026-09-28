
"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { Categoria, Producto } from "@/lib/types"

type ProductoEditable = Producto & {
  descripcion?: string | null
}

export default function AdminProductosPage() {
  const [productos, setProductos] = useState<ProductoEditable[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState("")
  const [mensaje, setMensaje] = useState("")
  const [busqueda, setBusqueda] = useState("")
  const [categoriaFiltro, setCategoriaFiltro] = useState("todas")
  const [guardandoId, setGuardandoId] = useState<number | null>(null)
  const [subiendoImagenId, setSubiendoImagenId] = useState<number | null>(null)

  async function cargarDatos() {
    setCargando(true)
    setError("")

    const [
      { data: productosData, error: productosError },
      { data: categoriasData, error: categoriasError },
    ] = await Promise.all([
      supabase
        .from("productos")
        .select(`
          id,
          nombre,
          codigo,
          codigo_interno,
          codigo_cabys,
          categoria_id,
          tipo_producto,
          unidad_medida,
          precio,
          precio_con_iva,
          porcentaje_iva,
          impuesto,
          comision,
          stock,
          stock_minimo,
          control_stock,
          imagen_url,
          activo
        `)
        .order("nombre", { ascending: true }),

      supabase
        .from("categorias")
        .select("id, nombre, activo, orden")
        .order("nombre", { ascending: true }),
    ])

    if (productosError) {
      console.error("ERROR PRODUCTOS:", productosError)
      setError(`Error cargando productos: ${productosError.message}`)
      setCargando(false)
      return
    }

    if (categoriasError) {
      console.error("ERROR CATEGORÍAS:", categoriasError)
      setError(`Error cargando categorías: ${categoriasError.message}`)
      setCargando(false)
      return
    }

    setProductos((productosData ?? []) as ProductoEditable[])
    setCategorias((categoriasData ?? []) as Categoria[])
    setCargando(false)
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  const productosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()

    return productos.filter((producto) => {
      const coincideTexto =
        !texto ||
        producto.nombre.toLowerCase().includes(texto) ||
        (producto.codigo ?? "").toLowerCase().includes(texto) ||
        (producto.codigo_interno ?? "").toLowerCase().includes(texto)

      const coincideCategoria =
        categoriaFiltro === "todas" ||
        String(producto.categoria_id ?? "") === categoriaFiltro

      return coincideTexto && coincideCategoria
    })
  }, [productos, busqueda, categoriaFiltro])

  function cambiarProducto(
    id: number,
    cambios: Partial<ProductoEditable>
  ) {
    setProductos((actuales) =>
      actuales.map((producto) =>
        producto.id === id
          ? { ...producto, ...cambios }
          : producto
      )
    )
  }

  async function cambiarImagen(
    producto: ProductoEditable,
    archivo: File
  ) {
    if (subiendoImagenId !== null) return

    setSubiendoImagenId(producto.id)
    setError("")
    setMensaje("")

    let rutaNueva: string | null = null
    let actualizacionConfirmada = false

    try {
      const tiposPermitidos = [
        "image/jpeg",
        "image/png",
        "image/webp",
      ]

      if (!tiposPermitidos.includes(archivo.type)) {
        setError("Formato no permitido. Usa JPG, PNG o WEBP.")
        return
      }

      if (archivo.size > 5 * 1024 * 1024) {
        setError("La imagen no puede superar los 5 MB.")
        return
      }

      const urlAnterior = producto.imagen_url?.trim() || null

      const extension =
        archivo.type === "image/jpeg"
          ? "jpg"
          : archivo.type === "image/png"
            ? "png"
            : "webp"

      const nombreArchivo =
        `${producto.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`

      // 1. Subir la nueva imagen.
      const { data: archivoSubido, error: uploadError } =
        await supabase.storage
          .from("productos")
          .upload(nombreArchivo, archivo, {
            cacheControl: "3600",
            contentType: archivo.type,
            upsert: false,
          })

      if (uploadError) {
        throw new Error(
          `No se pudo subir la imagen: ${uploadError.message}`
        )
      }

      rutaNueva = archivoSubido.path

      // 2. Obtener la URL pública.
      const { data: urlData } = supabase.storage
        .from("productos")
        .getPublicUrl(rutaNueva)

      const urlNueva = urlData.publicUrl

      // 3. Actualizar la URL en la base de datos.
      const { data: productoActualizado, error: updateError } =
        await supabase
          .from("productos")
          .update({ imagen_url: urlNueva })
          .eq("id", producto.id)
          .select("id, imagen_url")
          .maybeSingle()

      if (updateError) {
        throw new Error(
          `No se pudo actualizar el producto: ${updateError.message}`
        )
      }

      if (!productoActualizado) {
        throw new Error(
          "No se confirmó la actualización del producto. " +
          "Se conservará la imagen anterior."
        )
      }

      actualizacionConfirmada = true

      // 4. Actualizar la imagen en pantalla.
      cambiarProducto(producto.id, {
        imagen_url: urlNueva,
      })

      // 5. Eliminar la imagen anterior, si pertenece
      // al mismo proyecto y al bucket productos.
      if (urlAnterior && urlAnterior !== urlNueva) {
        try {
          const urlAntigua = new URL(urlAnterior)
          const urlProyecto = new URL(urlNueva)
          const prefijo = "/storage/v1/object/public/productos/"

          const perteneceAlBucket =
            urlAntigua.origin === urlProyecto.origin &&
            urlAntigua.pathname.startsWith(prefijo)

          if (perteneceAlBucket) {
            const rutaAnterior = decodeURIComponent(
              urlAntigua.pathname.slice(prefijo.length)
            )

            if (rutaAnterior && rutaAnterior !== rutaNueva) {
              const { error: deleteError } =
                await supabase.storage
                  .from("productos")
                  .remove([rutaAnterior])

              if (deleteError) {
                console.error(
                  "No se pudo borrar la imagen anterior:",
                  deleteError
                )

                setMensaje(
                  `La imagen de "${producto.nombre}" se actualizó, ` +
                  "pero no se pudo eliminar la imagen anterior."
                )
              } else {
                setMensaje(
                  `Imagen de "${producto.nombre}" actualizada correctamente.`
                )
              }
            } else {
              setMensaje(
                `Imagen de "${producto.nombre}" actualizada correctamente.`
              )
            }
          } else {
            setMensaje(
              `Imagen de "${producto.nombre}" actualizada. ` +
              "La imagen anterior se conservó porque no pertenece " +
              "al bucket productos de este proyecto."
            )
          }
        } catch (deleteError) {
          console.error(
            "Error al procesar la imagen anterior:",
            deleteError
          )

          setMensaje(
            `La imagen de "${producto.nombre}" se actualizó, ` +
            "pero no se pudo verificar o eliminar la anterior."
          )
        }
      } else {
        setMensaje(
          `Imagen de "${producto.nombre}" actualizada correctamente.`
        )
      }
    } catch (error) {
      console.error("ERROR CAMBIANDO IMAGEN:", error)

      // Si no se confirmó la actualización, limpiar
      // la imagen nueva para evitar archivos huérfanos.
      if (rutaNueva && !actualizacionConfirmada) {
        const { error: rollbackError } = await supabase.storage
          .from("productos")
          .remove([rutaNueva])

        if (rollbackError) {
          console.error(
            "No se pudo limpiar la imagen nueva:",
            rollbackError
          )
        }
      }

      setError(
        error instanceof Error
          ? error.message
          : "Ocurrió un error inesperado al cambiar la imagen."
      )
    } finally {
      setSubiendoImagenId(null)
    }
  }

  async function guardarProducto(producto: ProductoEditable) {
    setGuardandoId(producto.id)
    setError("")
    setMensaje("")

    const stock =
      producto.stock === null ||
      producto.stock === undefined ||
      Number.isNaN(Number(producto.stock))
        ? null
        : Number(producto.stock)

    const precio =
      producto.precio === null ||
      producto.precio === undefined ||
      Number.isNaN(Number(producto.precio))
        ? null
        : Number(producto.precio)

    const precioConIva =
      producto.precio_con_iva === null ||
      producto.precio_con_iva === undefined ||
      Number.isNaN(Number(producto.precio_con_iva))
        ? null
        : Number(producto.precio_con_iva)

    const stockMinimo =
      producto.stock_minimo === null ||
      producto.stock_minimo === undefined ||
      Number.isNaN(Number(producto.stock_minimo))
        ? null
        : Number(producto.stock_minimo)

    const { error: updateError } = await supabase
      .from("productos")
      .update({
        nombre: producto.nombre,
        categoria_id: producto.categoria_id,
        precio,
        precio_con_iva: precioConIva,
        stock,
        stock_minimo: stockMinimo,
        activo: producto.activo,
      })
      .eq("id", producto.id)

    if (updateError) {
      console.error("ERROR ACTUALIZANDO PRODUCTO:", updateError)

      setError(
        `No se pudo guardar "${producto.nombre}": ${updateError.message}`
      )

      setGuardandoId(null)
      return
    }

    setMensaje(
      `Producto "${producto.nombre}" actualizado correctamente.`
    )

    setGuardandoId(null)

    setTimeout(() => {
      setMensaje("")
    }, 3000)
  }

  if (cargando) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
          <p className="text-lg font-semibold text-slate-900">
            Cargando productos...
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Obteniendo catálogo y categorías.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      {/* ENCABEZADO */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-blue-600">
            Administración
          </p>

          <h1 className="mt-1 text-4xl font-black text-slate-900">
            Productos
          </h1>

          <p className="mt-2 text-slate-600">
            Administra precios, stock, categorías y disponibilidad.
          </p>
        </div>

        <div className="rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">
            Productos encontrados
          </p>
          <p className="text-2xl font-black text-blue-600">
            {productosFiltrados.length}
          </p>
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-bold">Error</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {/* MENSAJE */}
      {mensaje && (
        <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {mensaje}
        </div>
      )}

      {/* FILTROS */}
      <section className="mt-8 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="grid gap-4 md:grid-cols-[1fr_240px]">
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Buscar producto
            </label>

            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Nombre, código o código interno..."
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Categoría
            </label>

            <select
              value={categoriaFiltro}
              onChange={(e) => setCategoriaFiltro(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="todas">Todas</option>

              {categorias.map((categoria) => (
                <option
                  key={categoria.id}
                  value={String(categoria.id)}
                >
                  {categoria.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* PRODUCTOS */}
      <section className="mt-8 space-y-4">
        {productosFiltrados.length === 0 ? (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200">
            <p className="font-semibold text-slate-900">
              No se encontraron productos.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Prueba con otro nombre, código o categoría.
            </p>
          </div>
        ) : (
          productosFiltrados.map((producto) => {
            const guardando = guardandoId === producto.id

            return (
              <article
                key={producto.id}
                className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
              >
                {/* IMAGEN DEL PRODUCTO */}
                <div className="mb-5 flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center">
                  <div className="h-32 w-32 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    {producto.imagen_url ? (
                      <img
                        src={producto.imagen_url}
                        alt={producto.nombre}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center px-2 text-center text-xs font-medium text-slate-400">
                        Sin imagen
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Imagen del producto
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      JPG, PNG o WEBP. Máximo 5 MB.
                    </p>

                    <label
                      className={`mt-3 inline-flex items-center rounded-lg px-4 py-2.5 text-sm font-bold text-white transition ${
                        subiendoImagenId === producto.id
                          ? "cursor-not-allowed bg-slate-400"
                          : "cursor-pointer bg-slate-900 hover:bg-slate-700"
                      }`}
                    >
                      {subiendoImagenId === producto.id
                        ? "Subiendo imagen..."
                        : "🖼️ Cambiar imagen"}

                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        disabled={subiendoImagenId !== null}
                        onChange={(e) => {
                          const archivo = e.target.files?.[0]

                          if (archivo) {
                            void cambiarImagen(producto, archivo)
                          }

                          e.currentTarget.value = ""
                        }}
                      />
                    </label>
                  </div>
                </div>

                {/* DATOS PRINCIPALES */}
                <div className="grid gap-5 lg:grid-cols-[1fr_180px_180px_180px_auto] lg:items-end">
                  {/* PRODUCTO */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Producto
                    </p>

                    <input
                      type="text"
                      value={producto.nombre}
                      onChange={(e) =>
                        cambiarProducto(producto.id, {
                          nombre: e.target.value,
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-bold text-slate-900 focus:border-blue-500 focus:outline-none"
                    />

                    <div className="mt-2 space-y-1 text-xs text-slate-500">
                      {producto.codigo && (
                        <p>Código: {producto.codigo}</p>
                      )}

                      {producto.codigo_interno && (
                        <p>
                          Código interno: {producto.codigo_interno}
                        </p>
                      )}

                      <p>ID: {producto.id}</p>
                    </div>
                  </div>

                  {/* STOCK */}
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                      Stock
                    </label>

                    <input
                      type="number"
                      step="1"
                      value={producto.stock ?? ""}
                      onChange={(e) =>
                        cambiarProducto(producto.id, {
                          stock:
                            e.target.value === ""
                              ? null
                              : Number(e.target.value),
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 font-bold focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* PRECIO */}
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                      Precio
                    </label>

                    <input
                      type="number"
                      step="0.01"
                      value={producto.precio ?? ""}
                      onChange={(e) =>
                        cambiarProducto(producto.id, {
                          precio:
                            e.target.value === ""
                              ? null
                              : Number(e.target.value),
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 font-bold focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* PRECIO IVA */}
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                      Precio con IVA
                    </label>

                    <input
                      type="number"
                      step="0.01"
                      value={producto.precio_con_iva ?? ""}
                      onChange={(e) =>
                        cambiarProducto(producto.id, {
                          precio_con_iva:
                            e.target.value === ""
                              ? null
                              : Number(e.target.value),
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 font-bold focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* GUARDAR */}
                  <div>
                    <button
                      type="button"
                      disabled={guardando}
                      onClick={() => guardarProducto(producto)}
                      className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                    >
                      {guardando ? "Guardando..." : "Guardar"}
                    </button>

                    <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={producto.activo}
                        onChange={(e) =>
                          cambiarProducto(producto.id, {
                            activo: e.target.checked,
                          })
                        }
                        className="h-4 w-4"
                      />
                      Producto activo
                    </label>
                  </div>
                </div>

                {/* CAMPOS SECUNDARIOS */}
                <div className="mt-5 grid gap-4 border-t border-slate-100 pt-5 md:grid-cols-3">
                  {/* CATEGORÍA */}
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                      Categoría
                    </label>

                    <select
                      value={producto.categoria_id ?? ""}
                      onChange={(e) =>
                        cambiarProducto(producto.id, {
                          categoria_id:
                            e.target.value === ""
                              ? null
                              : Number(e.target.value),
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Sin categoría</option>

                      {categorias.map((categoria) => (
                        <option
                          key={categoria.id}
                          value={String(categoria.id)}
                        >
                          {categoria.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* STOCK MÍNIMO */}
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                      Stock mínimo
                    </label>

                    <input
                      type="number"
                      step="1"
                      value={producto.stock_minimo ?? ""}
                      onChange={(e) =>
                        cambiarProducto(producto.id, {
                          stock_minimo:
                            e.target.value === ""
                              ? null
                              : Number(e.target.value),
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* IVA */}
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                      IVA
                    </label>

                    <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      {producto.porcentaje_iva ?? 0}%
                    </div>
                  </div>
                </div>
              </article>
            )
          })
        )}
      </section>
    </main>
  )
}