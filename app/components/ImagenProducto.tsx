"use client"

import { useState } from "react"

export default function ImagenProducto({
  src,
  alt,
  className = "h-full w-full object-cover",
}: {
  src?: string | null
  alt: string
  className?: string
}) {
  const [rota, setRota] = useState(false)

  if (!src || rota) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-100 text-5xl">
        📦
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setRota(true)}
    />
  )
}
