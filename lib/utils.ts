import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Función para formatear fechas
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

// Función para formatear horas
export function formatTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(":")
  return `${hours.padStart(2, "0")}:${minutes ? minutes.padStart(2, "0") : "00"}`
}

