"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"

import { supabase } from "@/lib/supabase"
import { formatearPrecio } from "@/lib/format"

import type {
  EstadoPedido,
  Pedido,
  PedidoDetalle,
  Perfil,
} from "@/lib/types"

const etiquetasEstado: Record<EstadoPedido, string> = {
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  preparando: "Preparando",
  enviado: "Enviado",
  entregado: "Entregado",
  cancelado: "Cancelado",
}

const estados: EstadoPedido[] = [
  "pendiente",
  "confirmado",
  "preparando",
  "enviado",
  "entregado",
  "cancelado",
]

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
  return new Date(fecha).toLocaleString("es-CR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatearFechaFactura(fecha: string) {
  return new Date(fecha).toLocaleDateString("es-CR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function escaparHtml(valor: unknown) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

export default function AdminPedidoDetallePage() {
  const router = useRouter()
  const params = useParams()

  const id = params.id as string

  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [detalles, setDetalles] = useState<PedidoDetalle[]>([])
  const [cliente, setCliente] = useState<Perfil | null>(null)

  const [estado, setEstado] =
    useState<EstadoPedido>("pendiente")

  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [generandoFactura, setGenerandoFactura] =
    useState(false)

  const [error, setError] = useState("")
  const [mensaje, setMensaje] = useState("")

  useEffect(() => {
    async function cargarPedido() {
      setCargando(true)
      setError("")
      setMensaje("")

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace(
          `/login?next=/admin/pedidos/${id}`
        )
        return
      }

      /*
       * Verificamos que el usuario actual sea administrador.
       */
      const { data: perfil, error: perfilError } =
        await supabase
          .from("profiles")
          .select(
            "id, nombre, apellidos, telefono, direccion, rol"
          )
          .eq("id", user.id)
          .maybeSingle()

      if (perfilError) {
        setError(perfilError.message)
        setCargando(false)
        return
      }

      if (!perfil || perfil.rol !== "admin") {
        setError(
          "No tienes permisos para acceder al panel de administración."
        )
        setCargando(false)
        return
      }

      /*
       * Cargar pedido.
       */
      const { data: pedidoData, error: pedidoError } =
        await supabase
          .from("pedidos")
          .select("*")
          .eq("id", id)
          .maybeSingle()

      if (pedidoError) {
        setError(pedidoError.message)
        setCargando(false)
        return
      }

      if (!pedidoData) {
        setError("No encontramos este pedido.")
        setCargando(false)
        return
      }

      /*
       * Cargar detalles.
       */
      const {
        data: detallesData,
        error: detallesError,
      } = await supabase
        .from("pedido_detalles")
        .select("*")
        .eq("pedido_id", id)
        .order("id", { ascending: true })

      if (detallesError) {
        setError(detallesError.message)
        setCargando(false)
        return
      }

      /*
       * Cargar información del cliente.
       */
      const { data: clienteData } = await supabase
        .from("profiles")
        .select(
          "id, nombre, apellidos, telefono, direccion, rol"
        )
        .eq("id", pedidoData.user_id)
        .maybeSingle()

      setPedido(pedidoData as Pedido)

      setEstado(
        pedidoData.estado as EstadoPedido
      )

      setDetalles(
        (detallesData ?? []) as PedidoDetalle[]
      )

      setCliente(
        (clienteData ?? null) as Perfil | null
      )

      setCargando(false)
    }

    cargarPedido()
  }, [id, router])

  async function guardarEstado() {
    if (!pedido) return

    setGuardando(true)
    setError("")
    setMensaje("")

    const { data, error: updateError } =
      await supabase
        .from("pedidos")
        .update({
          estado,
        })
        .eq("id", pedido.id)
        .select("*")
        .maybeSingle()

    if (updateError) {
      setError(updateError.message)
      setGuardando(false)
      return
    }

    if (!data) {
      setError(
        "No se pudo actualizar el pedido."
      )
      setGuardando(false)
      return
    }

    setPedido(data as Pedido)

    setMensaje(
      "Estado del pedido actualizado correctamente."
    )

    setGuardando(false)
  }

  /*
   * GENERAR FACTURA
   *
   * Se crea una factura HTML lista para imprimir.
   * Desde el diálogo de impresión del navegador se
   * puede seleccionar "Guardar como PDF".
   */

  function generarFactura() {
    if (!pedido) return
  
    setGenerandoFactura(true)
    setError("")
  
    try {
      const nombreCliente = cliente
        ? `${cliente.nombre} ${cliente.apellidos}`.trim()
        : "Cliente"
  
      const telefono =
        pedido.telefono || cliente?.telefono || "No indicado"
  
      const direccion =
        pedido.direccion || cliente?.direccion || "No indicada"
  
      const filasProductos = detalles
        .map((detalle) => {
          const cantidad = Number(detalle.cantidad ?? 0)
          const precio = Number(detalle.precio_unitario ?? 0)
          const subtotalProducto = Number(detalle.subtotal ?? 0)
  
          return `
            <tr>
              <td class="cantidad">${cantidad}</td>
              <td class="descripcion">
                <strong>${escaparHtml(detalle.nombre)}</strong>
                ${
                  detalle.codigo
                    ? `<div class="codigo">Cód. Prod/Serv: ${escaparHtml(detalle.codigo)}</div>`
                    : ""
                }
                <div class="detalle">${escaparHtml(detalle.nombre)}</div>
              </td>
              <td class="numero">${formatearPrecio(precio)}</td>
              <td class="numero">₡0,00</td>
              <td class="numero">${formatearPrecio(subtotalProducto)}</td>
            </tr>
          `
        })
        .join("")
  
      const subtotal = Number(pedido.subtotal ?? 0)
      const iva = Number(pedido.iva ?? 0)
      const total = Number(pedido.total ?? 0)
  
      const fecha = new Date(pedido.created_at)
      const fechaTexto = fecha.toLocaleDateString("es-CR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
      const horaTexto = fecha.toLocaleTimeString("es-CR", {
        hour: "2-digit",
        minute: "2-digit",
      })
  
      const numero = escaparHtml(pedido.numero)
  
      const ventana = window.open(
        "",
        "_blank",
        "width=1000,height=900"
      )
  
      if (!ventana) {
        setError(
          "El navegador bloqueó la ventana de la factura. Permite las ventanas emergentes e inténtalo de nuevo."
        )
        setGenerandoFactura(false)
        return
      }
  
      ventana.document.write(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Factura ${numero} - Distribuidora JYM</title>
  
          <style>
            * {
              box-sizing: border-box;
            }
  
            html, body {
              margin: 0;
              padding: 0;
              background: #fff;
              color: #333;
              font-family: Arial, Helvetica, sans-serif;
              font-size: 13px;
            }
  
            body {
              padding: 30px;
            }
  
            .factura {
              width: 100%;
              max-width: 1100px;
              margin: auto;
            }
  
            .encabezado {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 24px;
              padding: 5px 0 32px;
              border-bottom: 1px solid #d1d5db;
            }
  
            .logo {
              width: 155px;
              min-width: 115px;
              height: 110px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #9f6675;
              font-size: 31px;
              font-weight: 900;
              letter-spacing: -2px;
              border: 5px solid #34516c;
              border-radius: 50%;
            }
  
            .empresa {
              flex: 1;
              text-align: right;
            }
  
            .empresa h1 {
              margin: 0 0 5px;
              font-size: 25px;
              font-weight: 900;
              letter-spacing: .3px;
            }
  
            .empresa p {
              margin: 4px 0;
              color: #555;
              font-size: 13px;
              line-height: 1.4;
            }
  
            .bloque-datos {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 35px;
              margin-top: 32px;
              padding: 20px 8px 26px;
              border-bottom: 1px solid #d1d5db;
            }
  
            .cliente h2,
            .titulo-detalles {
              margin: 0 0 16px;
              font-size: 19px;
              font-weight: 700;
              color: #4b5563;
            }
  
            .cliente p {
              margin: 5px 0;
              line-height: 1.45;
              overflow-wrap: anywhere;
            }
  
            .nombre-cliente {
              font-size: 16px;
              font-weight: 700;
            }
  
            .detalles-factura h2 {
              margin: 0 0 20px;
              text-align: right;
              font-size: 19px;
              color: #4b5563;
            }
  
            .dato {
              display: grid;
              grid-template-columns: 130px 1fr;
              gap: 12px;
              margin: 0 0 12px;
              align-items: start;
            }
  
            .dato strong {
              color: #4b5563;
            }
  
            .dato span {
              text-align: right;
              overflow-wrap: anywhere;
            }
  
            .productos {
              width: 100%;
              margin-top: 30px;
              border-collapse: collapse;
              table-layout: fixed;
            }
  
            .productos th {
              padding: 12px 8px;
              background: #f3f4f6;
              color: #4b5563;
              font-size: 12px;
              font-weight: 700;
              text-align: left;
              border-bottom: 1px solid #d1d5db;
            }
  
            .productos td {
              padding: 12px 8px;
              border-bottom: 1px solid #e5e7eb;
              vertical-align: top;
              overflow-wrap: anywhere;
            }
  
            .productos th:nth-child(1),
            .productos td:nth-child(1) {
              width: 8%;
              text-align: center;
            }
  
            .productos th:nth-child(2),
            .productos td:nth-child(2) {
              width: 43%;
            }
  
            .productos th:nth-child(3),
            .productos td:nth-child(3) {
              width: 16%;
            }
  
            .productos th:nth-child(4),
            .productos td:nth-child(4) {
              width: 13%;
            }
  
            .productos th:nth-child(5),
            .productos td:nth-child(5) {
              width: 20%;
            }
  
            .numero {
              text-align: right !important;
              white-space: nowrap;
            }
  
            .descripcion strong {
              display: block;
              font-size: 13px;
            }
  
            .codigo {
              margin-top: 5px;
              color: #888;
              font-size: 10px;
            }
  
            .detalle {
              margin-top: 5px;
              font-size: 12px;
            }
  
            .inferior {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 30px;
              margin-top: 30px;
              align-items: start;
            }
  
            .nota {
              min-height: 45px;
              padding: 12px;
              border: 1px dashed #d1d5db;
              color: #555;
              overflow-wrap: anywhere;
            }
  
            .totales {
              width: 100%;
            }
  
            .total-linea {
              display: flex;
              justify-content: space-between;
              gap: 16px;
              padding: 8px 5px;
              font-size: 14px;
            }
  
            .total-linea strong {
              text-align: right;
              white-space: nowrap;
            }
  
            .total-final {
              margin-top: 4px;
              padding: 12px 8px;
              background: #f3f4f6;
              font-size: 19px;
              font-weight: 900;
            }
  
            .pie {
              margin-top: 35px;
              padding-top: 12px;
              border-top: 1px solid #d1d5db;
              text-align: center;
              color: #777;
              font-size: 11px;
            }
  
            .botones {
              position: fixed;
              top: 15px;
              right: 15px;
              display: flex;
              gap: 8px;
              z-index: 10;
            }
  
            .boton {
              border: 0;
              border-radius: 7px;
              padding: 11px 16px;
              font-weight: bold;
              cursor: pointer;
            }
  
            .imprimir {
              background: #1d4ed8;
              color: white;
            }
  
            .cerrar {
              background: #e5e7eb;
              color: #374151;
            }
  
            @media (max-width: 650px) {
              body {
                padding: 15px;
              }
  
              .encabezado {
                flex-direction: column;
              }
  
              .empresa {
                text-align: left;
              }
  
              .bloque-datos,
              .inferior {
                grid-template-columns: 1fr;
                gap: 22px;
              }
  
              .detalles-factura h2 {
                text-align: left;
              }
  
              .dato {
                grid-template-columns: 125px 1fr;
              }
  
              .productos {
                font-size: 10px;
              }
  
              .productos th,
              .productos td {
                padding: 8px 4px;
                font-size: 10px;
              }
  
              .totales {
                max-width: none;
              }
            }
  
            @media print {
              @page {
                size: A4;
                margin: 12mm;
              }
  
              body {
                padding: 0;
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
              }
  
              .factura {
                max-width: none;
              }
  
              .botones {
                display: none !important;
              }
  
              .productos tr,
              .bloque-datos,
              .inferior {
                break-inside: avoid;
              }
            }
          </style>
        </head>
  
        <body>
          <div class="botones">
            <button class="boton imprimir" onclick="window.print()">
              Imprimir / Guardar PDF
            </button>
            <button class="boton cerrar" onclick="window.close()">
              Cerrar
            </button>
          </div>
  
          <main class="factura">
            <header class="encabezado">
              <div class="logo">JYM</div>
  
              <div class="empresa">
                <h1>DISTRIBUIDORA JYM</h1>
                <p><strong>Distribuidora Grupo Memoris Limitada</strong></p>
                <p>Frente al centro recreativo Las Tranqueras. Bodega 4</p>
                <p>Tel: 60700075 | Correo: facturas@distribuidorajym.com</p>
              </div>
            </header>
  
            <section class="bloque-datos">
              <div class="cliente">
                <h2>Facturar a</h2>
                <p class="nombre-cliente">${escaparHtml(nombreCliente)}</p>
                <p>Tel: ${escaparHtml(telefono)}</p>
                <p>Dirección: ${escaparHtml(direccion)}</p>
              </div>
  
              <div class="detalles-factura">
                <h2>Detalles de la factura</h2>
                <div class="dato">
                  <strong>Tipo:</strong>
                  <span>Factura de pedido</span>
                </div>
                <div class="dato">
                  <strong>Número:</strong>
                  <span>${numero}</span>
                </div>
                <div class="dato">
                  <strong>Fecha emisión:</strong>
                  <span>${fechaTexto} ${horaTexto}</span>
                </div>
                <div class="dato">
                  <strong>Estado:</strong>
                  <span>${escaparHtml(etiquetasEstado[pedido.estado])}</span>
                </div>
                <div class="dato">
                  <strong>Medio de pago:</strong>
                  <span>${escaparHtml(pedido.metodo_pago)}</span>
                </div>
                <div class="dato">
                  <strong>Entrega:</strong>
                  <span>${escaparHtml(pedido.metodo_entrega)}</span>
                </div>
              </div>
            </section>
  
            <table class="productos">
              <thead>
                <tr>
                  <th>Cant.</th>
                  <th>Descripción</th>
                  <th style="text-align:right">P. Unit.</th>
                  <th style="text-align:right">Desc.</th>
                  <th style="text-align:right">Total</th>
                </tr>
              </thead>
              <tbody>
                ${filasProductos}
              </tbody>
            </table>
  
            <section class="inferior">
              <div>
                ${
                  pedido.notas
                    ? `<div class="nota"><strong>Nota:</strong> ${escaparHtml(pedido.notas)}</div>`
                    : `<div class="nota">Gracias por su compra.</div>`
                }
              </div>
  
              <div class="totales">
                <div class="total-linea">
                  <span>Subtotal</span>
                  <strong>${formatearPrecio(subtotal)}</strong>
                </div>
                <div class="total-linea">
                  <span>Descuento</span>
                  <strong>${formatearPrecio(0)}</strong>
                </div>
                <div class="total-linea">
                  <span>Impuesto (IVA)</span>
                  <strong>${formatearPrecio(iva)}</strong>
                </div>
                <div class="total-linea total-final">
                  <span>TOTAL</span>
                  <strong>${formatearPrecio(total)}</strong>
                </div>
              </div>
            </section>
  
            <footer class="pie">
              <p>Distribuidora JYM | Siempre a su servicio</p>
              <p>Documento de pedido generado por el sistema de Distribuidora JYM.</p>
            </footer>
          </main>
  
          <script>
            window.onload = function () {
              setTimeout(function () {
                window.print()
              }, 500)
            }
          </script>
        </body>
        </html>
      `)
  
      ventana.document.close()
      ventana.focus()
  
      setMensaje(
        "La factura fue generada. Puedes imprimirla o guardarla como PDF."
      )
    } catch (facturaError) {
      console.error("ERROR GENERANDO FACTURA:", facturaError)
      setError("No se pudo generar la factura.")
    } finally {
      setGenerandoFactura(false)
    }
  }

  if (cargando) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <p className="text-gray-600">
          Cargando pedido...
        </p>
      </main>
    )
  }

  if (error && !pedido) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <h1 className="text-xl font-bold text-red-800">
            No se pudo cargar el pedido
          </h1>

          <p className="mt-2 text-red-700">
            {error}
          </p>

          <Link
            href="/admin/pedidos"
            className="mt-5 inline-block rounded-xl bg-gray-900 px-5 py-2.5 font-semibold text-white hover:bg-gray-800"
          >
            ← Volver a pedidos
          </Link>
        </div>
      </main>
    )
  }

  if (!pedido) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <h1 className="text-xl font-bold text-red-800">
            Pedido no encontrado
          </h1>

          <p className="mt-2 text-red-700">
            No encontramos el pedido solicitado.
          </p>

          <Link
            href="/admin/pedidos"
            className="mt-5 inline-block rounded-xl bg-gray-900 px-5 py-2.5 font-semibold text-white hover:bg-gray-800"
          >
            ← Volver a pedidos
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">

      {/* ENCABEZADO */}
      <div className="mb-6">
        <Link
          href="/admin/pedidos"
          className="text-sm font-semibold text-blue-600 hover:text-blue-800"
        >
          ← Volver a pedidos
        </Link>
      </div>

      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Pedido
          </p>

          <h1 className="mt-1 text-4xl font-black text-gray-900">
            {pedido.numero}
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Realizado el{" "}
            {formatearFecha(
              pedido.created_at
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">

          {/* BOTÓN GENERAR FACTURA */}
          <button
            type="button"
            onClick={generarFactura}
            disabled={
              generandoFactura ||
              detalles.length === 0
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <span className="text-lg">
              🧾
            </span>

            {generandoFactura
              ? "Generando..."
              : "Generar factura"}
          </button>

          <span
            className={`w-fit rounded-full px-4 py-2 text-sm font-bold ${claseEstado(
              pedido.estado
            )}`}
          >
            {etiquetasEstado[
              pedido.estado
            ]}
          </span>

        </div>
      </div>

      {/* MENSAJES */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {mensaje && (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          {mensaje}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">

        {/* COLUMNA PRINCIPAL */}
        <div className="space-y-6">

          {/* PRODUCTOS */}
          <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">

            <div className="border-b border-gray-200 px-6 py-5">
              <h2 className="text-xl font-black text-gray-900">
                Productos del pedido
              </h2>
            </div>

            <div className="divide-y divide-gray-100">

              {detalles.map((detalle) => (
                <div
                  key={detalle.id}
                  className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <h3 className="font-bold text-gray-900">
                      {detalle.nombre}
                    </h3>

                    {detalle.codigo && (
                      <p className="mt-1 text-sm text-gray-500">
                        Código: {detalle.codigo}
                      </p>
                    )}

                    <p className="mt-2 text-sm text-gray-600">
                      Cantidad:{" "}
                      <span className="font-semibold">
                        {detalle.cantidad}
                      </span>
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-sm text-gray-500">
                      {formatearPrecio(
                        Number(
                          detalle.precio_unitario
                        )
                      )}{" "}
                      c/u
                    </p>

                    <p className="mt-1 text-lg font-black text-gray-900">
                      {formatearPrecio(
                        Number(
                          detalle.subtotal
                        )
                      )}
                    </p>
                  </div>
                </div>
              ))}

              {detalles.length === 0 && (
                <div className="px-6 py-8 text-gray-500">
                  Este pedido no tiene productos registrados.
                </div>
              )}

            </div>
          </section>

          {/* DATOS DEL CLIENTE */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

            <h2 className="text-xl font-black text-gray-900">
              Datos del cliente
            </h2>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">

              <div>
                <p className="text-sm font-semibold text-gray-500">
                  Nombre
                </p>

                <p className="mt-1 font-medium text-gray-900">
                  {cliente
                    ? `${cliente.nombre} ${cliente.apellidos}`.trim()
                    : "No disponible"}
                </p>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-500">
                  Teléfono
                </p>

                <p className="mt-1 font-medium text-gray-900">
                  {pedido.telefono ||
                    cliente?.telefono ||
                    "No indicado"}
                </p>
              </div>

              <div className="sm:col-span-2">
                <p className="text-sm font-semibold text-gray-500">
                  Dirección
                </p>

                <p className="mt-1 font-medium text-gray-900">
                  {pedido.direccion ||
                    cliente?.direccion ||
                    "No indicada"}
                </p>
              </div>

            </div>
          </section>

          {/* ENTREGA Y PAGO */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

            <h2 className="text-xl font-black text-gray-900">
              Entrega y pago
            </h2>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">

              <div>
                <p className="text-sm font-semibold text-gray-500">
                  Método de entrega
                </p>

                <p className="mt-1 font-medium text-gray-900">
                  {pedido.metodo_entrega}
                </p>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-500">
                  Método de pago
                </p>

                <p className="mt-1 font-medium text-gray-900">
                  {pedido.metodo_pago}
                </p>
              </div>

              {pedido.notas && (
                <div className="sm:col-span-2">

                  <p className="text-sm font-semibold text-gray-500">
                    Notas del cliente
                  </p>

                  <div className="mt-2 rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
                    {pedido.notas}
                  </div>

                </div>
              )}

            </div>
          </section>

        </div>

        {/* COLUMNA DERECHA */}
        <aside className="space-y-6">

          {/* CAMBIAR ESTADO */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

            <h2 className="text-xl font-black text-gray-900">
              Estado del pedido
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Actualiza el estado para que el pedido avance en el proceso.
            </p>

            <div className="mt-5">

              <label
                htmlFor="estado"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Estado
              </label>

              <select
                id="estado"
                value={estado}
                onChange={(e) =>
                  setEstado(
                    e.target.value as EstadoPedido
                  )
                }
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {estados.map((opcion) => (
                  <option
                    key={opcion}
                    value={opcion}
                  >
                    {etiquetasEstado[
                      opcion
                    ]}
                  </option>
                ))}
              </select>

            </div>

            <button
              type="button"
              onClick={guardarEstado}
              disabled={
                guardando ||
                estado === pedido.estado
              }
              className="mt-4 w-full rounded-xl bg-blue-600 px-5 py-3 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {guardando
                ? "Guardando..."
                : "Guardar estado"}
            </button>

          </section>

          {/* FACTURA */}
          <section className="rounded-2xl border border-blue-200 bg-blue-50 p-6">

            <div className="flex items-start gap-4">

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
                🧾
              </div>

              <div>
                <h2 className="font-black text-blue-950">
                  Factura del pedido
                </h2>

                <p className="mt-1 text-sm leading-5 text-blue-800">
                  Genera un documento listo para imprimir o guardar como PDF.
                </p>
              </div>

            </div>

            <button
              type="button"
              onClick={generarFactura}
              disabled={
                generandoFactura ||
                detalles.length === 0
              }
              className="mt-5 w-full rounded-xl bg-blue-600 px-5 py-3 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {generandoFactura
                ? "Generando factura..."
                : "🧾 Generar factura"}
            </button>

          </section>

          {/* RESUMEN */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

            <h2 className="text-xl font-black text-gray-900">
              Resumen del pedido
            </h2>

            <div className="mt-5 space-y-4">

              <div className="flex justify-between gap-4">
                <span className="text-gray-600">
                  Subtotal
                </span>

                <span className="font-semibold text-gray-900">
                  {formatearPrecio(
                    Number(
                      pedido.subtotal
                    )
                  )}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-gray-600">
                  IVA
                </span>

                <span className="font-semibold text-gray-900">
                  {formatearPrecio(
                    Number(pedido.iva)
                  )}
                </span>
              </div>

              <div className="border-t border-gray-200 pt-4">

                <div className="flex justify-between gap-4">

                  <span className="text-lg font-black text-gray-900">
                    Total
                  </span>

                  <span className="text-2xl font-black text-blue-600">
                    {formatearPrecio(
                      Number(
                        pedido.total
                      )
                    )}
                  </span>

                </div>

              </div>

            </div>
          </section>

          {/* INFORMACIÓN */}
          <section className="rounded-2xl border border-gray-200 bg-gray-50 p-6">

            <h2 className="font-bold text-gray-900">
              Información
            </h2>

            <div className="mt-4 space-y-2 text-sm text-gray-600">

              <p>
                <span className="font-semibold">
                  ID:
                </span>{" "}
                {pedido.id}
              </p>

              <p>
                <span className="font-semibold">
                  Cliente ID:
                </span>{" "}
                {pedido.user_id}
              </p>

              <p>
                <span className="font-semibold">
                  Estado:
                </span>{" "}
                {etiquetasEstado[
                  pedido.estado
                ]}
              </p>

            </div>
          </section>

        </aside>
      </div>
    </main>
  )
}