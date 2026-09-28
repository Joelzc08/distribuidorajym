"use client"

import { useState } from "react"

type Producto = {
  id: number
  nombre: string
  categoria: string
  precio: number
  stock: number
  presentacion: string
  imagen: string
}

type ProductoCarrito = Producto & {
  cantidad: number
}

export default function AgregarAlCarrito({
  producto,
}: {
  producto: Producto
}) {
  const [cantidad, setCantidad] = useState(1)
  const [mostrarConfirmacion, setMostrarConfirmacion] =
    useState(false)
  const [mensajeError, setMensajeError] = useState("")

  function disminuir() {
    if (cantidad > 1) {
      setCantidad(cantidad - 1)
    }
  }

  function aumentar() {
    if (cantidad < producto.stock) {
      setCantidad(cantidad + 1)
    }
  }

  function agregarAlCarrito() {
    setMensajeError("")

    const carritoGuardado = localStorage.getItem("carrito")

    const carrito: ProductoCarrito[] = carritoGuardado
      ? JSON.parse(carritoGuardado)
      : []

    const productoExistente = carrito.find(
      (item) => item.id === producto.id
    )

    if (productoExistente) {
      const nuevaCantidad =
        productoExistente.cantidad + cantidad

      if (nuevaCantidad > producto.stock) {
        setMensajeError(
          `No puedes agregar esa cantidad. Ya tienes ${productoExistente.cantidad} en el carrito y el stock disponible es ${producto.stock}.`
        )

        return
      }

      productoExistente.cantidad = nuevaCantidad
    } else {
      carrito.push({
        ...producto,
        cantidad: cantidad,
      })
    }

    localStorage.setItem(
      "carrito",
      JSON.stringify(carrito)
    )

    setMostrarConfirmacion(true)
  }

  function seguirComprando() {
    setMostrarConfirmacion(false)
    setMensajeError("")
    setCantidad(1)
  }

  function irAlCarrito() {
    window.location.href = "/carrito"
  }

  return (
    <>
      <div className="mt-5">
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={disminuir}
            disabled={cantidad <= 1}
            className="h-10 w-10 rounded-lg bg-gray-200 text-xl font-bold hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            −
          </button>

          <span className="w-8 text-center text-lg font-bold">
            {cantidad}
          </span>

          <button
            onClick={aumentar}
            disabled={cantidad >= producto.stock}
            className="h-10 w-10 rounded-lg bg-blue-600 text-xl font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            +
          </button>
        </div>

        {cantidad >= producto.stock && (
          <p className="mt-2 text-center text-xs text-gray-500">
            Cantidad máxima disponible: {producto.stock}
          </p>
        )}

        {mensajeError && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-center text-sm font-semibold text-red-600">
            {mensajeError}
          </p>
        )}

        <button
          onClick={agregarAlCarrito}
          className="mt-4 w-full rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700"
        >
          Agregar al pedido
        </button>
      </div>

      {mostrarConfirmacion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-2xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">
              ✓
            </div>

            <h2 className="mt-5 text-2xl font-bold text-gray-900">
              ¡Producto agregado!
            </h2>

            <p className="mt-3 text-gray-600">
              Agregaste{" "}
              <span className="font-semibold text-gray-900">
                {cantidad} {producto.nombre}
              </span>{" "}
              al pedido.
            </p>

            <p className="mt-2 text-sm text-gray-500">
              ¿Qué deseas hacer ahora?
            </p>

            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={irAlCarrito}
                className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700"
              >
                🛒 Ir al carrito
              </button>

              <button
                onClick={seguirComprando}
                className="w-full rounded-lg border border-gray-300 bg-white py-3 font-semibold text-gray-700 hover:bg-gray-100"
              >
                Seguir comprando
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}