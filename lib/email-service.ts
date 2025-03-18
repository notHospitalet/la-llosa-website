import nodemailer from "nodemailer"
import { format } from "date-fns"
import { es } from "date-fns/locale"

// Configuración del transporte de correo
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL || "pruebasllosa@gmail.com",
    pass: process.env.PASSWORD || "aqfq xvrk jbxg jefz",
  },
  tls: {
    rejectUnauthorized: false,
  },
})

// Verificar la conexión al iniciar
transporter
  .verify()
  .then(() => console.log("Servidor de correo listo"))
  .catch((error) => console.error("Error al configurar el servidor de correo:", error))

// Tipos para las opciones de correo
export type EmailOptions = {
  to: string
  subject: string
  text: string
  html: string
}

// Función para enviar correo
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: `"Ayuntamiento de La Llosa" <${process.env.EMAIL || "pruebasllosa@gmail.com"}>`,
      ...options,
    })
    return true
  } catch (error) {
    console.error("Error al enviar correo:", error)
    return false
  }
}

// Función para generar el contenido del correo de confirmación de reserva
export function createReservaEmailContent(reserva: {
  nombre: string
  email: string
  telefono?: string
  dni?: string
  instalacion: string
  fecha: Date
  horaInicio: string
  horaFin: string
  horas: number
  precio: number
  esLocal: boolean
  conLuz?: boolean
  estado: string
}): { text: string; html: string } {
  const fechaFormateada = format(reserva.fecha, "EEEE d 'de' MMMM 'de' yyyy", { locale: es })
  const precioFormateado = reserva.precio === 0 ? "Gratis" : `${reserva.precio.toFixed(2)}€`

  const text = `
    Confirmación de Reserva - Ayuntamiento de La Llosa
    
    Hola ${reserva.nombre},
    
    Tu reserva ha sido confirmada con los siguientes detalles:
    
    Instalación: ${reserva.instalacion}
    Fecha: ${fechaFormateada}
    Horario: ${reserva.horaInicio} a ${reserva.horaFin} (${reserva.horas} ${reserva.horas === 1 ? "hora" : "horas"})
    Usuario: ${reserva.esLocal ? "Local" : "No local"}
    ${reserva.conLuz !== undefined ? `Iluminación: ${reserva.conLuz ? "Con luz" : "Sin luz"}` : ""}
    ${reserva.dni ? `DNI: ${reserva.dni}` : ""}
    Precio total: ${precioFormateado}
    Estado: ${reserva.estado}
    
    Si necesitas modificar o cancelar tu reserva, por favor contacta con nosotros.
    
    Gracias por utilizar nuestros servicios deportivos.
    
    Ayuntamiento de La Llosa
    Plaza España, 14, 12591 La Llosa, Castellón
    Teléfono: +34 964 51 00 01
    Email: pruebasllosa@gmail.com
  `

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Confirmación de Reserva</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #22c55e;
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background-color: #f9f9f9;
          padding: 20px;
          border-radius: 0 0 8px 8px;
          border: 1px solid #eaeaea;
          border-top: none;
        }
        .reservation-details {
          background-color: white;
          padding: 15px;
          border-radius: 8px;
          margin: 20px 0;
          box-shadow: 0 2px 5px rgba(0,0,0,0.05);
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #f0f0f0;
        }
        .detail-row:last-child {
          border-bottom: none;
        }
        .price {
          font-weight: bold;
          color: #22c55e;
        }
        .footer {
          margin-top: 30px;
          font-size: 12px;
          color: #666;
          text-align: center;
        }
        .logo {
          max-width: 100px;
          margin: 0 auto 15px;
          display: block;
        }
        .button {
          display: inline-block;
          background-color: #22c55e;
          color: white;
          padding: 10px 20px;
          text-decoration: none;
          border-radius: 5px;
          margin-top: 15px;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Confirmación de Reserva</h1>
        <p>Ayuntamiento de La Llosa</p>
      </div>
      <div class="content">
        <p>Hola <strong>${reserva.nombre}</strong>,</p>
        <p>Tu reserva ha sido confirmada con los siguientes detalles:</p>
        
        <div class="reservation-details">
          <div class="detail-row">
            <strong>Instalación:</strong>
            <span>${reserva.instalacion}</span>
          </div>
          <div class="detail-row">
            <strong>Fecha:</strong>
            <span>${fechaFormateada}</span>
          </div>
          <div class="detail-row">
            <strong>Horario:</strong>
            <span>${reserva.horaInicio} a ${reserva.horaFin} (${reserva.horas} ${reserva.horas === 1 ? "hora" : "horas"})</span>
          </div>
          <div class="detail-row">
            <strong>Usuario:</strong>
            <span>${reserva.esLocal ? "Local" : "No local"}</span>
          </div>
          ${
            reserva.conLuz !== undefined
              ? `
          <div class="detail-row">
            <strong>Iluminación:</strong>
            <span>${reserva.conLuz ? "Con luz" : "Sin luz"}</span>
          </div>
          `
              : ""
          }
          ${
            reserva.dni
              ? `
          <div class="detail-row">
            <strong>DNI:</strong>
            <span>${reserva.dni}</span>
          </div>
          `
              : ""
          }
          <div class="detail-row">
            <strong>Estado:</strong>
            <span>${reserva.estado}</span>
          </div>
          <div class="detail-row">
            <strong>Precio total:</strong>
            <span class="price">${precioFormateado}</span>
          </div>
        </div>
        
        <p>Si necesitas modificar o cancelar tu reserva, por favor contacta con nosotros.</p>
        
        <p>Gracias por utilizar nuestros servicios deportivos.</p>
        
        <a href="https://lallosa.es/mis-reservas" class="button">Ver mis reservas</a>
      </div>
      
      <div class="footer">
        <p><strong>Ayuntamiento de La Llosa</strong><br>
        Plaza España, 14, 12591 La Llosa, Castellón<br>
        Teléfono: +34 964 51 00 01<br>
        Email: pruebasllosa@gmail.com</p>
      </div>
    </body>
    </html>
  `

  return { text, html }
}

// Función para enviar notificación de reserva
export async function sendReservaNotification(reserva: {
  nombre: string
  email: string
  telefono?: string
  dni?: string
  instalacion: string
  fecha: Date
  horaInicio: string
  horaFin: string
  horas: number
  precio: number
  esLocal: boolean
  conLuz?: boolean
  estado: string
}): Promise<boolean> {
  try {
    const { text, html } = createReservaEmailContent(reserva)

    // Enviar correo al usuario
    await sendEmail({
      to: reserva.email,
      subject: `Confirmación de Reserva - ${reserva.instalacion}`,
      text,
      html,
    })

    // Enviar correo al administrador
    await sendEmail({
      to: process.env.EMAIL || "pruebasllosa@gmail.com",
      subject: `Nueva Reserva: ${reserva.instalacion} - ${reserva.nombre}`,
      text,
      html,
    })

    return true
  } catch (error) {
    console.error("Error al enviar notificación de reserva:", error)
    return false
  }
}

