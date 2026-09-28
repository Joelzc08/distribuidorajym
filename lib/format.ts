export function formatearPrecio(precio: number | null | undefined) {
  if (precio === null || precio === undefined || Number.isNaN(Number(precio))) {
    return "Precio no disponible"
  }

  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
  }).format(Number(precio))
}

export function claseCampo() {
  return "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-black placeholder:text-black/70 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
}
