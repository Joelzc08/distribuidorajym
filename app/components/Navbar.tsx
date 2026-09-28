"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { createBrowserSupabase } from "@/lib/supabase"

type Usuario = {
  id: string
  email?: string
}

export default function Navbar() {
  const supabase = createBrowserSupabase()

  const [cantidadCarrito, setCantidadCarrito] = useState(0)
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [esAdmin, setEsAdmin] = useState(false)
  const [menuAbierto, setMenuAbierto] = useState(false)

  // ...


  useEffect(() => {
    let activo = true

    async function cargarUsuario() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!activo) return

      if (!user) {
        setUsuario(null)
        setEsAdmin(false)
        return
      }

      setUsuario({
        id: user.id,
        email: user.email,
      })

      const { data: perfil } = await supabase
        .from("profiles")
        .select("rol")
        .eq("id", user.id)
        .maybeSingle()

      if (activo) {
        setEsAdmin(perfil?.rol === "admin")
      }
    }

    async function actualizarCarrito() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      let carrito: { cantidad: number }[] = []

      if (user) {
        const { data: remoto } = await supabase
          .from("carritos")
          .select("items")
          .eq("user_id", user.id)
          .maybeSingle()

        if (Array.isArray(remoto?.items)) {
          carrito = remoto.items
        } else {
          const local = localStorage.getItem("carrito")
          if (local) {
            try {
              carrito = JSON.parse(local)
            } catch {
              carrito = []
            }
          }
        }
      } else {
        const local = localStorage.getItem("carrito")
        if (local) {
          try {
            carrito = JSON.parse(local)
          } catch {
            carrito = []
          }
        }
      }

      if (!activo) return

      setCantidadCarrito(
        carrito.reduce(
          (total, producto) => total + Number(producto.cantidad || 0),
          0
        )
      )
    }

    cargarUsuario()
    actualizarCarrito()

    window.addEventListener("carritoActualizado", actualizarCarrito)
    window.addEventListener("storage", actualizarCarrito)

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      cargarUsuario()
      actualizarCarrito()
    })

    return () => {
      activo = false
      window.removeEventListener("carritoActualizado", actualizarCarrito)
      window.removeEventListener("storage", actualizarCarrito)
      subscription.unsubscribe()
    }
  }, [])

  const enlaces = (
    <>
      <Link href="/" className="transition hover:text-blue-600" onClick={() => setMenuAbierto(false)}>
        Inicio
      </Link>
      <Link href="/productos" className="transition hover:text-blue-600" onClick={() => setMenuAbierto(false)}>
        Productos
      </Link>
      <Link href="/carrito" className="relative transition hover:text-blue-600" onClick={() => setMenuAbierto(false)}>
        🛒 Carrito
        {cantidadCarrito > 0 && (
          <span className="ml-2 rounded-full bg-blue-600 px-2 py-1 text-xs font-bold text-white">
            {cantidadCarrito}
          </span>
        )}
      </Link>
      {usuario ? (
        <>
          <Link href="/perfil" className="transition hover:text-blue-600" onClick={() => setMenuAbierto(false)}>
            👤 Perfil
          </Link>
          <Link href="/pedidos" className="transition hover:text-blue-600" onClick={() => setMenuAbierto(false)}>
            Pedidos
          </Link>
          {esAdmin && (
            <Link
              href="/admin"
              className="font-semibold text-slate-900 transition hover:text-blue-600"
              onClick={() => setMenuAbierto(false)}
            >
              ⚙️ Admin
            </Link>
          )}
        </>
      ) : (
        <Link
          href="/login"
          className="rounded-xl bg-blue-600 px-4 py-2 font-bold text-white transition hover:bg-blue-700"
          onClick={() => setMenuAbierto(false)}
        >
          Iniciar sesión
        </Link>
      )}
    </>
  )

  return (
    <nav className="sticky top-0 z-40 border-b bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="text-xl font-bold text-blue-600 sm:text-2xl">
          Distribuidora JYM
        </Link>

        <div className="hidden items-center gap-6 text-gray-700 md:flex">
          {enlaces}
        </div>

        <button
          type="button"
          className="rounded-lg border border-gray-200 px-3 py-2 font-semibold text-slate-800 md:hidden"
          onClick={() => setMenuAbierto((abierto) => !abierto)}
          aria-label="Abrir menú"
        >
          {menuAbierto ? "Cerrar" : "Menú"}
        </button>
      </div>

      {menuAbierto && (
        <div className="flex flex-col gap-4 border-t px-4 py-4 text-gray-700 md:hidden">
          {enlaces}
        </div>
      )}
    </nav>
  )
}
