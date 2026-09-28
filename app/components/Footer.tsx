import Link from "next/link"

export default function Footer() {
  return (
    <footer className="mt-auto border-t bg-slate-900 text-slate-200">
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 md:grid-cols-3">
        <div>
          <h2 className="text-xl font-black text-white">Distribuidora JYM</h2>
          <p className="mt-3 text-sm text-slate-300">
            Suministros y productos para tu negocio. Pedidos contra entrega
            y atención personalizada.
          </p>
        </div>

        <div>
          <h3 className="font-bold text-white">Enlaces</h3>
          <div className="mt-3 flex flex-col gap-2 text-sm">
            <Link href="/" className="hover:text-white">
              Inicio
            </Link>
            <Link href="/productos" className="hover:text-white">
              Productos
            </Link>
            <Link href="/carrito" className="hover:text-white">
              Carrito
            </Link>
            <Link href="/terminos" className="hover:text-white">
              Términos y condiciones
            </Link>
            <Link href="/privacidad" className="hover:text-white">
              Política de privacidad
            </Link>
          </div>
        </div>

        <div>
          <h3 className="font-bold text-white">Contacto</h3>
          <p className="mt-3 text-sm">Costa Rica</p>
          <p className="mt-1 text-sm">Correo: contacto@distribuidorajym.com</p>
          <p className="mt-1 text-sm">WhatsApp: +506 0000-0000</p>
        </div>
      </div>
      <div className="border-t border-slate-800 px-6 py-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} Distribuidora JYM. Todos los derechos reservados.
      </div>
    </footer>
  )
}
