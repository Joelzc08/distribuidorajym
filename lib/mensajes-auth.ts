export function mensajeErrorAuth(error: { message?: string; code?: string } | null) {
  const texto = (error?.message || "").toLowerCase()
  const codigo = error?.code || ""

  if (
    texto.includes("invalid login") ||
    texto.includes("invalid credentials") ||
    codigo === "invalid_credentials"
  ) {
    return "El correo o la contraseña no son correctos."
  }

  if (texto.includes("email not confirmed") || codigo === "email_not_confirmed") {
    return "Debes confirmar tu correo antes de iniciar sesión."
  }

  if (texto.includes("user already registered") || texto.includes("already been registered")) {
    return "Ese correo ya tiene una cuenta. Intenta iniciar sesión."
  }

  if (texto.includes("password")) {
    return "La contraseña no cumple los requisitos. Usa al menos 6 caracteres."
  }

  if (texto.includes("rate limit") || texto.includes("too many")) {
    return "Demasiados intentos. Espera un momento e inténtalo de nuevo."
  }

  if (texto.includes("network") || texto.includes("fetch")) {
    return "No se pudo conectar. Revisa tu conexión e inténtalo de nuevo."
  }

  return "Ocurrió un problema. Inténtalo de nuevo."
}

export function fuerzaContrasena(valor: string) {
  let puntos = 0
  if (valor.length >= 6) puntos += 1
  if (valor.length >= 10) puntos += 1
  if (/[A-Z]/.test(valor) && /[a-z]/.test(valor)) puntos += 1
  if (/\d/.test(valor)) puntos += 1
  if (/[^A-Za-z0-9]/.test(valor)) puntos += 1

  if (!valor) return { etiqueta: "", nivel: 0 }
  if (puntos <= 2) return { etiqueta: "Débil", nivel: 1 }
  if (puntos <= 3) return { etiqueta: "Aceptable", nivel: 2 }
  return { etiqueta: "Fuerte", nivel: 3 }
}
