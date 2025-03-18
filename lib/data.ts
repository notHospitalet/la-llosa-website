// Datos simulados para la aplicación

// Tipos
export type Usuario = {
  id: string
  nombre: string
  email: string
  telefono?: string
  tipo: "local" | "no-local" | "jubilado-local"
  ficha_municipal?: string
}

export type Instalacion = {
  id: string
  nombre: string
  tipo: "padel" | "futbol" | "futbol-sala" | "fronton" | "gimnasio" | "piscina"
}

export type Reserva = {
  id: string
  usuarioId: string
  instalacionId: string
  fecha: string
  hora_inicio: string
  hora_fin: string
  precio: number
  estado: "pendiente" | "pagado" | "cancelado"
}

// Datos de ejemplo
export const instalaciones: Instalacion[] = [
  { id: "1", nombre: "Pista de Pádel", tipo: "padel" },
  { id: "2", nombre: "Campo de Fútbol", tipo: "futbol" },
  { id: "3", nombre: "Pista de Fútbol Sala", tipo: "futbol-sala" },
  { id: "4", nombre: "Frontón", tipo: "fronton" },
  { id: "5", nombre: "Gimnasio Municipal", tipo: "gimnasio" },
  { id: "6", nombre: "Piscina Municipal", tipo: "piscina" },
]

// Precios para instalaciones deportivas
export const preciosDeportivos = {
  // Local + Sin luz: Gratis
  "local-sin-luz": {
    padel: 0,
    futbol: 0,
    "futbol-sala": 0,
    fronton: 0,
  },
  // Local + Con luz
  "local-con-luz": {
    padel: 4,
    futbol: 10,
    "futbol-sala": 4,
    fronton: 4,
  },
  // No local + Sin luz
  "no-local-sin-luz": {
    padel: 4,
    futbol: 15,
    "futbol-sala": 4,
    fronton: 4,
  },
  // No local + Con luz
  "no-local-con-luz": {
    padel: 8,
    futbol: 30,
    "futbol-sala": 8,
    fronton: 8,
  },
}

// Precios para gimnasio
export const preciosGimnasio = {
  "jubilado-local": {
    diaria: 1.0,
    mensual: 6.0,
    trimestral: 15.0,
  },
  local: {
    diaria: 2.0,
    mensual: 9.0,
    trimestral: 30.0,
  },
  "no-local": {
    diaria: 2.5,
    mensual: 12.0,
    trimestral: 55.0,
  },
}

// Precios para piscina
export const preciosPiscina = {
  individual: {
    "local-menor-3": 0, // Gratis
    "local-adulto": 1.5,
    "no-local-adulto": 3,
  },
  "bono-mensual": {
    "local-adulto": 25,
    "no-local-adulto": 50,
    familiar: 75,
  },
  "bono-temporada": {
    "local-adulto": 60,
    "no-local-adulto": 100,
  },
  curso: {
    aquasalud: {
      "local-jubilado": 0, // Gratis
      "local-adulto": 35,
      "no-local-adulto": 40,
    },
    infantil: {
      "local-jubilado": 40,
      "local-adulto": 40,
      "no-local-adulto": 40,
    },
    adultos: {
      "local-jubilado": 0, // Gratis
      "local-adulto": 35,
      "no-local-adulto": 40,
    },
  },
}

// Función para simular la creación de una reserva
export async function crearReserva(datos: Omit<Reserva, "id">): Promise<Reserva> {
  // En una aplicación real, esto guardaría en la base de datos
  const nuevaReserva: Reserva = {
    ...datos,
    id: Math.random().toString(36).substring(2, 9),
  }

  // Simular latencia de red
  await new Promise((resolve) => setTimeout(resolve, 500))

  return nuevaReserva
}

// Función para simular la obtención de reservas de un usuario
export async function obtenerReservasUsuario(usuarioId: string): Promise<Reserva[]> {
  // En una aplicación real, esto consultaría la base de datos
  // Aquí devolvemos un array vacío para simular que no hay reservas previas

  // Simular latencia de red
  await new Promise((resolve) => setTimeout(resolve, 500))

  return []
}

