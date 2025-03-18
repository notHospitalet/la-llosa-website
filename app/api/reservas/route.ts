import { NextResponse } from "next/server"
import { crearReserva } from "@/lib/data"

export async function POST(request: Request) {
  try {
    const data = await request.json()
    const { instalacionId, fecha, hora_inicio, hora_fin, precio } = data

    // En una aplicación real, verificaríamos la autenticación y disponibilidad

    // Crear reserva simulada
    const reserva = await crearReserva({
      usuarioId: "usuario-ejemplo", // En una app real, esto vendría del usuario autenticado
      instalacionId,
      fecha,
      hora_inicio,
      hora_fin,
      precio,
      estado: "pendiente",
    })

    return NextResponse.json(reserva)
  } catch (error) {
    console.error("Error al crear reserva:", error)
    return NextResponse.json({ error: "Error al procesar la solicitud" }, { status: 500 })
  }
}

export async function GET() {
  // En una aplicación real, verificaríamos la autenticación
  // y devolveríamos las reservas del usuario

  return NextResponse.json([])
}

