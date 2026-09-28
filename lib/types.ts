export type Rol = "cliente" | "admin"

export type Producto = {
  id: number
  nombre: string
  codigo: string | null
  codigo_interno: string | null
  codigo_cabys: string | null
  categoria_id: number | null
  tipo_producto: string | null
  unidad_medida: string | null
  precio: number | null
  precio_con_iva: number | null
  porcentaje_iva: number | null
  impuesto: string | null
  comision: number | null
  stock: number | null
  stock_minimo: number | null
  control_stock: string | null
  imagen_url: string | null
  activo: boolean
}

export type Categoria = {
  id: number
  nombre: string
  activo?: boolean
  orden?: number | null
}

export type ItemCarrito = {
  id: number
  nombre: string
  codigo: string | null
  unidad_medida: string | null
  imagen_url: string | null
  precio: number
  precio_con_iva: number
  porcentaje_iva: number | null
  cantidad: number
  stock: number
  activo: boolean
}

export type Perfil = {
  id: string
  nombre: string
  apellidos: string
  telefono: string
  direccion: string
  rol: Rol
}

export type EstadoPedido =
  | "pendiente"
  | "confirmado"
  | "preparando"
  | "enviado"
  | "entregado"
  | "cancelado"

export type Pedido = {
  id: number
  numero: string
  user_id: string
  estado: EstadoPedido
  subtotal: number
  iva: number
  total: number
  telefono: string | null
  direccion: string | null
  metodo_pago: string
  metodo_entrega: string
  notas: string | null
  created_at: string
}

export type PedidoDetalle = {
  id: number
  pedido_id: number
  producto_id: number | null
  nombre: string
  codigo: string | null
  cantidad: number
  precio_unitario: number
  subtotal: number
}

export const ESTADOS_PEDIDO: EstadoPedido[] = [
  "pendiente",
  "confirmado",
  "preparando",
  "enviado",
  "entregado",
  "cancelado",
]
