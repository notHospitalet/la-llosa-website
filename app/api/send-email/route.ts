import { NextResponse } from "next/server"
import { sendEmail } from "@/lib/email-service"

export async function POST(request: Request) {
  try {
    const { to, subject, html, text } = await request.json()

    const success = await sendEmail({
      to,
      subject,
      html,
      text,
    })

    if (!success) {
      return NextResponse.json({ error: "Error al enviar el correo" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error en la ruta de envío de correo:", error)
    return NextResponse.json({ error: "Error al procesar la solicitud" }, { status: 500 })
  }
}

