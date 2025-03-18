import type { Reserva } from "./database"

// Definición de temporadas
export type Temporada = "invierno" | "verano"

// Función para determinar la temporada según el mes
export function determinarTemporada(fecha: Date): Temporada {
  const mes = fecha.getMonth() + 1 // Los meses en JS van de 0 a 11

  // Invierno: enero (1), febrero (2), marzo (3), octubre (10), noviembre (11), diciembre (12)
  // Verano: abril (4), mayo (5), junio (6), julio (7), agosto (8), septiembre (9)
  if ([1, 2, 3, 10, 11, 12].includes(mes)) {
    return "invierno"
  } else {
    return "verano"
  }
}

// Función para obtener los horarios disponibles según la temporada
export function obtenerHorariosDisponibles(fecha: Date): string[] {
  const temporada = determinarTemporada(fecha)

  if (temporada === "invierno") {
    // Horario de invierno: 8:00 a 22:00
    return Array.from({ length: 15 }, (_, i) => `${i + 8}:00`)
  } else {
    // Horario de verano: 7:00 a 24:00
    return Array.from({ length: 18 }, (_, i) => `${i + 7}:00`)
  }
}

// Función para verificar si una hora está en el pasado
export function esHoraPasada(fecha: Date, hora: string): boolean {
  const fechaActual = new Date(2025, 2, 17) // Fecha actual fija: 17 de marzo de 2025

  // Si la fecha es anterior a la fecha actual, toda la fecha está en el pasado
  if (fecha.getTime() < new Date(fechaActual.getFullYear(), fechaActual.getMonth(), fechaActual.getDate()).getTime()) {
    return true
  }

  // Si es el mismo día, verificar la hora
  if (
    fecha.getDate() === fechaActual.getDate() &&
    fecha.getMonth() === fechaActual.getMonth() &&
    fecha.getFullYear() === fechaActual.getFullYear()
  ) {
    const [horaStr] = hora.split(":")
    const horaReserva = Number.parseInt(horaStr, 10)
    const horaActual = fechaActual.getHours()

    return horaReserva <= horaActual
  }

  return false
}

// Función para verificar si una hora está disponible (no ocupada por otra reserva)
export function esHoraDisponible(
  fecha: Date,
  horaInicio: string,
  horaFin: string,
  reservasExistentes: Reserva[],
  reservaIdExcluir?: string,
): boolean {
  // Filtrar reservas del mismo día y misma instalación
  const reservasDelDia = reservasExistentes.filter(
    (r) =>
      r.fecha.getDate() === fecha.getDate() &&
      r.fecha.getMonth() === fecha.getMonth() &&
      r.fecha.getFullYear() === fecha.getFullYear() &&
      (reservaIdExcluir ? r.id !== reservaIdExcluir : true) &&
      r.estado !== "cancelada",
  )

  // Convertir horas a números para comparación
  const inicio = Number.parseInt(horaInicio.split(":")[0], 10)
  const fin = Number.parseInt(horaFin.split(":")[0], 10)

  // Verificar si hay alguna reserva que se solape
  return !reservasDelDia.some((r) => {
    const rInicio = Number.parseInt(r.horaInicio.split(":")[0], 10)
    const rFin = r.horaFin ? Number.parseInt(r.horaFin.split(":")[0], 10) : rInicio + r.horas

    // Hay solapamiento si:
    // - La nueva reserva comienza durante una existente
    // - La nueva reserva termina durante una existente
    // - La nueva reserva contiene completamente a una existente
    return (inicio >= rInicio && inicio < rFin) || (fin > rInicio && fin <= rFin) || (inicio <= rInicio && fin >= rFin)
  })
}

// Función para obtener las horas disponibles para una fecha específica
export function obtenerHorasDisponibles(
  fecha: Date,
  reservasExistentes: Reserva[],
): { hora: string; disponible: boolean; pasada: boolean }[] {
  const horariosTemporada = obtenerHorariosDisponibles(fecha)

  return horariosTemporada.map((hora) => {
    const horaIndex = horariosTemporada.indexOf(hora)
    const horaFin = horariosTemporada[horaIndex + 1] || "24:00"

    const pasada = esHoraPasada(fecha, hora)
    const disponible = !pasada && esHoraDisponible(fecha, hora, horaFin, reservasExistentes)

    return {
      hora,
      disponible,
      pasada,
    }
  })
}

