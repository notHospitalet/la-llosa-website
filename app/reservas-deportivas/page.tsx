"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { motion } from "framer-motion"
import { preciosDeportivos } from "@/lib/data"
import { useToast } from "@/components/ui/use-toast"
import { PaymentModal } from "@/components/payment-modal"
import { useAuth } from "@/components/auth-provider"
import { useRouter } from "next/navigation"
import { ReservasCalendar } from "@/components/reservas-calendar"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { createReserva, getReservasByDate } from "@/lib/mongodb"
import { sendReservaNotification } from "@/lib/email-service"
import { obtenerHorariosDisponibles, esHoraPasada, esHoraDisponible, determinarTemporada } from "@/lib/horarios-service"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Info } from "lucide-react"

export default function ReservasDeportivas() {
  const [instalacion, setInstalacion] = useState("")
  const [esLocal, setEsLocal] = useState(true)
  const [conLuz, setConLuz] = useState(false)
  const [horas, setHoras] = useState(1)
  const [horaInicio, setHoraInicio] = useState("")
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [precio, setPrecio] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [dni, setDni] = useState("")
  const [horasDisponibles, setHorasDisponibles] = useState<string[]>([])
  const [reservasDelDia, setReservasDelDia] = useState<any[]>([])
  const [temporada, setTemporada] = useState<"invierno" | "verano">("invierno")

  const { toast } = useToast()
  const { isLoggedIn, user } = useAuth()
  const router = useRouter()

  // Cargar DNI del usuario si está disponible
  useEffect(() => {
    if (user && user.dni) {
      setDni(user.dni)
    }
  }, [user])

  // Actualizar temporada cuando cambia la fecha seleccionada
  useEffect(() => {
    if (selectedDate) {
      const nuevaTemporada = determinarTemporada(selectedDate)
      setTemporada(nuevaTemporada)

      // Resetear hora de inicio al cambiar de fecha
      setHoraInicio("")
    }
  }, [selectedDate])

  // Cargar horas disponibles según la temporada y fecha
  useEffect(() => {
    if (selectedDate) {
      const horariosTemporada = obtenerHorariosDisponibles(selectedDate)
      setHorasDisponibles(horariosTemporada)

      // Cargar reservas del día seleccionado
      const cargarReservasDelDia = async () => {
        try {
          const reservas = await getReservasByDate(selectedDate)
          setReservasDelDia(reservas)
        } catch (error) {
          console.error("Error al cargar reservas:", error)
        }
      }

      cargarReservasDelDia()
    }
  }, [selectedDate, temporada])

  // Calcular precio basado en selecciones
  useEffect(() => {
    if (!instalacion || horas <= 0) {
      setPrecio(0)
      return
    }

    let precioHora = 0
    const tipoInstalacion = instalacion as keyof (typeof preciosDeportivos)["local-sin-luz"]
    const condicion =
      `${esLocal ? "local" : "no-local"}-${conLuz ? "con-luz" : "sin-luz"}` as keyof typeof preciosDeportivos

    precioHora = preciosDeportivos[condicion][tipoInstalacion]
    setPrecio(precioHora * horas)
  }, [instalacion, esLocal, conLuz, horas])

  const handleSubmit = async () => {
    if (!isLoggedIn) {
      toast({
        title: "Inicio de sesión requerido",
        description: "Debes iniciar sesión para realizar una reserva",
      })
      router.push("/login")
      return
    }

    if (!instalacion || !selectedDate || !horaInicio || horas <= 0) {
      toast({
        title: "Datos incompletos",
        description: "Por favor, completa todos los campos del formulario",
        variant: "destructive",
      })
      return
    }

    // Validar DNI para usuarios locales
    if (esLocal && !dni) {
      toast({
        title: "DNI requerido",
        description: "Para usuarios locales, el DNI es obligatorio",
        variant: "destructive",
      })
      return
    }

    // Calcular hora de fin
    const horaInicioIndex = horasDisponibles.indexOf(horaInicio)
    if (horaInicioIndex === -1 || horaInicioIndex + horas > horasDisponibles.length) {
      toast({
        title: "Error en la selección de horas",
        description: "La hora seleccionada no es válida o excede el horario disponible",
        variant: "destructive",
      })
      return
    }

    const horaFin = horasDisponibles[horaInicioIndex + horas]

    // Verificar si la hora está en el pasado
    if (esHoraPasada(selectedDate, horaInicio)) {
      toast({
        title: "Hora no disponible",
        description: "No puedes reservar horas que ya han pasado",
        variant: "destructive",
      })
      return
    }

    // Verificar disponibilidad
    const disponible = esHoraDisponible(selectedDate, horaInicio, horaFin, reservasDelDia)
    if (!disponible) {
      toast({
        title: "Horario no disponible",
        description: "El horario seleccionado ya está reservado. Por favor, elige otro horario.",
        variant: "destructive",
      })
      return
    }

    setShowPaymentModal(true)
  }

  const handlePaymentSuccess = async () => {
    setIsLoading(true)

    try {
      // Calcular hora de fin
      const horaInicioIndex = horasDisponibles.indexOf(horaInicio)
      const horaFin = horasDisponibles[horaInicioIndex + horas]

      if (!user) {
        throw new Error("Usuario no autenticado")
      }

      // Crear reserva en la base de datos
      const nuevaReserva = await createReserva({
        idUsuario: user.id,
        nombre: user.name,
        email: user.email,
        telefono: "600123456", // En un caso real, esto vendría del perfil del usuario
        dni: dni,
        instalacion,
        tipoReserva: "deportiva",
        fecha: selectedDate!,
        horaInicio,
        horaFin,
        horas,
        precio,
        esLocal,
        conLuz,
        estado: "confirmada",
      })

      // Enviar correos de notificación
      await sendReservaNotification({
        nombre: user.name,
        email: user.email,
        telefono: "600123456",
        dni: dni,
        instalacion,
        fecha: selectedDate!,
        horaInicio,
        horaFin,
        horas,
        precio,
        esLocal,
        conLuz,
        estado: "confirmada",
      })

      toast({
        title: "Reserva confirmada",
        description: `Has reservado ${instalacion} para el ${format(selectedDate!, "PPP", { locale: es })} de ${horaInicio} a ${horaFin}`,
      })

      // Resetear formulario
      setInstalacion("")
      setSelectedDate(undefined)
      setHoraInicio("")
      setHoras(1)
    } catch (error) {
      console.error("Error al procesar la reserva:", error)
      toast({
        title: "Error al procesar la reserva",
        description: "Ha ocurrido un error. Por favor, inténtalo de nuevo más tarde.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 },
    },
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <motion.div className="max-w-6xl mx-auto" initial="hidden" animate="visible" variants={fadeIn}>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Reservas Deportivas</h1>
          <p className="text-muted-foreground">
            Reserva nuestras instalaciones deportivas con precios especiales para residentes locales.
          </p>
        </div>

        <Alert className="mb-6 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertTitle>Información de temporada</AlertTitle>
          <AlertDescription>
            Actualmente estamos en temporada de {temporada === "invierno" ? "invierno" : "verano"}. Horario disponible:{" "}
            {temporada === "invierno" ? "8:00 a 22:00" : "7:00 a 24:00"}.
          </AlertDescription>
        </Alert>

        {/* Calendario de Reservas */}
        <div className="mb-12">
          <ReservasCalendar
            onDateSelect={setSelectedDate}
            selectedDate={selectedDate}
            instalacionFilter={instalacion || undefined}
          />
        </div>

        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle>Formulario de Reserva</CardTitle>
            <CardDescription>Selecciona la instalación, fecha y horario para tu reserva.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Selección de Instalación */}
            <div className="space-y-2">
              <Label htmlFor="instalacion">Instalación</Label>
              <Select value={instalacion} onValueChange={setInstalacion}>
                <SelectTrigger id="instalacion" className="h-10">
                  <SelectValue placeholder="Selecciona una instalación" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="padel">Pádel</SelectItem>
                  <SelectItem value="futbol">Fútbol</SelectItem>
                  <SelectItem value="futbol-sala">Fútbol Sala</SelectItem>
                  <SelectItem value="fronton">Frontón</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Selección de Condición (Local/No Local) */}
            <div className="flex items-center space-x-2">
              <Checkbox id="es-local" checked={esLocal} onCheckedChange={(checked) => setEsLocal(checked as boolean)} />
              <Label htmlFor="es-local" className="cursor-pointer">
                Usuario Local
              </Label>
            </div>

            {/* Campo DNI (obligatorio para usuarios locales) */}
            {esLocal && (
              <div className="space-y-2">
                <Label htmlFor="dni">DNI (obligatorio para usuarios locales)</Label>
                <Input
                  id="dni"
                  placeholder="12345678A"
                  value={dni}
                  onChange={(e) => setDni(e.target.value)}
                  required
                  className="h-10"
                />
              </div>
            )}

            {/* Selección de Luz */}
            <div className="flex items-center space-x-2">
              <Checkbox id="con-luz" checked={conLuz} onCheckedChange={(checked) => setConLuz(checked as boolean)} />
              <Label htmlFor="con-luz" className="cursor-pointer">
                Con Luz
              </Label>
            </div>

            {/* Selección de Fecha y Hora */}
            <div className="space-y-2">
              <Label htmlFor="hora-inicio">Hora de Inicio</Label>
              <Select value={horaInicio} onValueChange={setHoraInicio} disabled={!selectedDate}>
                <SelectTrigger id="hora-inicio" className="h-10">
                  <SelectValue placeholder="Selecciona hora de inicio" />
                </SelectTrigger>
                <SelectContent>
                  {horasDisponibles.slice(0, -1).map((hora) => {
                    const isPasada = esHoraPasada(selectedDate!, hora)
                    const horaFin = horasDisponibles[horasDisponibles.indexOf(hora) + 1]
                    const isOcupada = !esHoraDisponible(selectedDate!, hora, horaFin, reservasDelDia)

                    return (
                      <SelectItem
                        key={hora}
                        value={hora}
                        disabled={isPasada || isOcupada}
                        className={`${isPasada ? "text-muted-foreground line-through" : ""} ${isOcupada ? "text-red-500" : ""}`}
                      >
                        {hora} {isPasada ? "(Pasada)" : isOcupada ? "(Ocupada)" : ""}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Selección de Horas */}
            <div className="space-y-2">
              <Label htmlFor="horas">Número de horas</Label>
              <Input
                id="horas"
                type="number"
                min={1}
                max={5}
                value={horas}
                onChange={(e) => setHoras(Number.parseInt(e.target.value) || 1)}
                disabled={!horaInicio}
                className="h-10"
              />
            </div>

            {/* Resumen de Precio */}
            <div className="pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="font-medium">Precio Total:</span>
                <span className="text-xl font-bold">
                  {precio === 0 && esLocal && !conLuz ? "Gratis" : `${precio.toFixed(2)} €`}
                </span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {esLocal && !conLuz ? (
                  <span className="text-green-600 dark:text-green-400">Gratuito para usuarios locales sin luz</span>
                ) : (
                  <span>
                    {precio > 0 && `${(precio / horas).toFixed(2)} € × ${horas} ${horas === 1 ? "hora" : "horas"}`}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end space-x-2">
            <Button variant="outline" className="h-10">
              Cancelar
            </Button>
            <Button
              disabled={!instalacion || !selectedDate || !horaInicio || isLoading || (esLocal && !dni)}
              onClick={handleSubmit}
              className="h-10"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Procesando...
                </span>
              ) : (
                "Solicitar Reserva"
              )}
            </Button>
          </CardFooter>
        </Card>
      </motion.div>

      {/* Modal de Pago */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        amount={precio}
        onSuccess={handlePaymentSuccess}
        description={`Reserva de ${instalacion} para el ${selectedDate ? format(selectedDate, "PPP", { locale: es }) : ""} a las ${horaInicio} (${horas} ${horas === 1 ? "hora" : "horas"})`}
      />
    </div>
  )
}

