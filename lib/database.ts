// Base de datos simulada para v0
// En un entorno real, esto se conectaría a MySQL, PostgreSQL o MongoDB

import bcrypt from "bcryptjs"

export type Usuario = {
  id: string
  nombre: string
  email: string
  password: string // Almacenada con hash
  dni?: string
  telefono?: string
  imagenPerfil?: string
  tipo: "local" | "no-local"
  createdAt: Date
  updatedAt: Date
}

export type Reserva = {
  id: string
  idUsuario: string
  nombre: string
  email: string
  telefono?: string
  dni?: string
  instalacion: string
  tipoReserva: "deportiva" | "gimnasio" | "piscina"
  fecha: Date
  horaInicio: string
  horaFin?: string
  horas: number
  precio: number
  esLocal: boolean
  conLuz?: boolean
  estado: "pendiente" | "confirmada" | "cancelada"
  createdAt: Date
  updatedAt: Date
}

// Simulación de tablas de base de datos
const usuarios: Usuario[] = [
  {
    id: "1",
    nombre: "Usuario Demo",
    email: "demo@example.com",
    password: "$2a$10$XFE.tQYWR/v8mJMTLGdX8u.ib4jle/QxLgUYMUFBmIgMdnnWKnFJe", // "password123" hasheado
    dni: "12345678A",
    telefono: "600123456",
    tipo: "local",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

const reservas: Reserva[] = [
  {
    id: "1",
    idUsuario: "1",
    nombre: "Usuario Demo",
    email: "demo@example.com",
    telefono: "600123456",
    dni: "12345678A",
    instalacion: "Pádel",
    tipoReserva: "deportiva",
    fecha: new Date(2025, 2, 18), // 18 de marzo de 2025
    horaInicio: "10:00",
    horaFin: "12:00",
    horas: 2,
    precio: 8,
    esLocal: true,
    conLuz: true,
    estado: "confirmada",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "2",
    idUsuario: "1",
    nombre: "Usuario Demo",
    email: "demo@example.com",
    telefono: "600123456",
    dni: "12345678A",
    instalacion: "Gimnasio Municipal",
    tipoReserva: "gimnasio",
    fecha: new Date(2025, 2, 19), // 19 de marzo de 2025
    horaInicio: "16:00",
    horaFin: "18:00",
    horas: 2,
    precio: 4,
    esLocal: true,
    estado: "confirmada",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

// Funciones para interactuar con la "base de datos"
export async function getUsuarios(): Promise<Usuario[]> {
  return usuarios
}

export async function getUsuarioById(id: string): Promise<Usuario | undefined> {
  return usuarios.find((u) => u.id === id)
}

export async function getUsuarioByEmail(email: string): Promise<Usuario | undefined> {
  return usuarios.find((u) => u.email === email)
}

export async function getUsuarioByDni(dni: string): Promise<Usuario | undefined> {
  return usuarios.find((u) => u.dni === dni)
}

export async function createUsuario(
  usuario: Omit<Usuario, "id" | "createdAt" | "updatedAt" | "password"> & { password: string },
): Promise<Usuario> {
  // Verificar si el email ya existe
  const existingEmail = await getUsuarioByEmail(usuario.email)
  if (existingEmail) {
    throw new Error("El email ya está registrado")
  }

  // Verificar si el DNI ya existe (si se proporciona)
  if (usuario.dni) {
    const existingDni = await getUsuarioByDni(usuario.dni)
    if (existingDni) {
      throw new Error("El DNI ya está registrado")
    }
  }

  // Hash de la contraseña
  const hashedPassword = await bcrypt.hash(usuario.password, 10)

  const newUsuario: Usuario = {
    ...usuario,
    id: Math.random().toString(36).substring(2, 9),
    password: hashedPassword,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  usuarios.push(newUsuario)
  return newUsuario
}

export async function updateUsuario(
  id: string,
  data: Partial<Omit<Usuario, "id" | "email" | "createdAt" | "updatedAt">>,
): Promise<Usuario | undefined> {
  const index = usuarios.findIndex((u) => u.id === id)
  if (index === -1) return undefined

  // Si se proporciona una nueva contraseña, hashearla
  if (data.password) {
    data.password = await bcrypt.hash(data.password, 10)
  }

  // Si se proporciona un nuevo DNI, verificar que no exista
  if (data.dni) {
    const existingDni = await getUsuarioByDni(data.dni)
    if (existingDni && existingDni.id !== id) {
      throw new Error("El DNI ya está registrado por otro usuario")
    }
  }

  usuarios[index] = {
    ...usuarios[index],
    ...data,
    updatedAt: new Date(),
  }

  return usuarios[index]
}

export async function verifyPassword(email: string, password: string): Promise<Usuario | null> {
  const usuario = await getUsuarioByEmail(email)
  if (!usuario) return null

  const isValid = await bcrypt.compare(password, usuario.password)
  return isValid ? usuario : null
}

export async function getReservas(): Promise<Reserva[]> {
  return reservas
}

export async function getReservasByUsuarioId(usuarioId: string): Promise<Reserva[]> {
  return reservas.filter((r) => r.idUsuario === usuarioId)
}

export async function getReservasByEmail(email: string): Promise<Reserva[]> {
  return reservas.filter((r) => r.email === email)
}

export async function getReservasByDate(fecha: Date): Promise<Reserva[]> {
  return reservas.filter(
    (r) =>
      r.fecha.getFullYear() === fecha.getFullYear() &&
      r.fecha.getMonth() === fecha.getMonth() &&
      r.fecha.getDate() === fecha.getDate() &&
      r.estado !== "cancelada",
  )
}

export async function getReservaById(id: string): Promise<Reserva | undefined> {
  return reservas.find((r) => r.id === id)
}

export async function createReserva(reserva: Omit<Reserva, "id" | "createdAt" | "updatedAt">): Promise<Reserva> {
  const newReserva: Reserva = {
    ...reserva,
    id: Math.random().toString(36).substring(2, 9),
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  reservas.push(newReserva)
  return newReserva
}

export async function updateReserva(
  id: string,
  data: Partial<Omit<Reserva, "id" | "createdAt" | "updatedAt">>,
): Promise<Reserva | undefined> {
  const index = reservas.findIndex((r) => r.id === id)
  if (index === -1) return undefined

  reservas[index] = {
    ...reservas[index],
    ...data,
    updatedAt: new Date(),
  }

  return reservas[index]
}

export async function cancelarReserva(id: string): Promise<Reserva | undefined> {
  return updateReserva(id, { estado: "cancelada" })
}

// Función para verificar si una hora está disponible
export async function isHoraDisponible(
  fecha: Date,
  horaInicio: string,
  horaFin: string,
  instalacion: string,
  reservaIdExcluir?: string,
): Promise<boolean> {
  const reservasDelDia = await getReservasByDate(fecha)
  const reservasMismaInstalacion = reservasDelDia.filter(
    (r) => r.instalacion === instalacion && (reservaIdExcluir ? r.id !== reservaIdExcluir : true),
  )

  // Convertir horas a números para comparación
  const inicio = Number.parseInt(horaInicio.split(":")[0])
  const fin = Number.parseInt(horaFin.split(":")[0])

  // Verificar si hay alguna reserva que se solape
  return !reservasMismaInstalacion.some((r) => {
    const rInicio = Number.parseInt(r.horaInicio.split(":")[0])
    const rFin = r.horaFin ? Number.parseInt(r.horaFin.split(":")[0]) : rInicio + r.horas

    // Hay solapamiento si:
    // - La nueva reserva comienza durante una existente
    // - La nueva reserva termina durante una existente
    // - La nueva reserva contiene completamente a una existente
    return (inicio >= rInicio && inicio < rFin) || (fin > rInicio && fin <= rFin) || (inicio <= rInicio && fin >= rFin)
  })
}

