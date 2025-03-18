"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Input } from "@/components/ui/input"
import { motion } from "framer-motion"
import { preciosGimnasio } from "@/lib/data"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/components/auth-provider"
import { useRouter } from "next/navigation"
import { PaymentModal } from "@/components/payment-modal"
import { createReserva } from "@/lib/database"
import { sendEmail, createReservaEmailContent } from "@/lib/email"

export default function ReservasGimnasio() {
  const [condicion, setCondicion] = useState("local")
  const [tipo, setTipo] = useState("diaria")
  const [precio, setPrecio] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [dni, setDni] = useState("")
  const { toast } = useToast()
  const { isLoggedIn, user } = useAuth()
  const router = useRouter()

  // Cargar DNI del usuario si está disponible
  useEffect(() => {
    if (user && user.dni) {
      setDni(user.dni)
    }
  }, [user])

  // Actualizar precio cuando cambian las selecciones
  useEffect(() => {
    setPrecio(
      preciosGimnasio[condicion as keyof typeof preciosGimnasio][tipo as keyof (typeof preciosGimnasio)["local"]],
    )
  }, [condicion, tipo])

  const handleSubmit = async () => {
    if (!isLoggedIn) {
      toast({
        title: "Inicio de sesión requerido",
        description: "Debes iniciar sesión para realizar una reserva",
      })
      router.push("/login")
      return
    }

    // Validar DNI para usuarios locales
    if ((condicion === "local" || condicion === "jubilado-local") && !dni) {
      toast({
        title: "DNI requerido",
        description: "Para usuarios locales, el DNI es obligatorio",
        variant: "destructive",
      })
      return
    }

    setShowPaymentModal(true)
  }

  const handlePaymentSuccess = async () => {
    setIsLoading(true)

    try {
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
        instalacion: "Gimnasio Municipal",
        tipoReserva: "gimnasio",
        fecha: new Date(), // Fecha actual
        horaInicio: "09:00", // Hora de apertura
        horas: tipo === "diaria" ? 1 : 30, // Para bonos, se pone un valor simbólico
        precio,
        esLocal: condicion === "local" || condicion === "jubilado-local",
        estado: "confirmada",
      })

      // Enviar correo de confirmación
      const emailContent = createReservaEmailContent({
        nombre: user.name,
        email: user.email,
        telefono: "600123456",
        instalacion: "Gimnasio Municipal",
        fecha: new Date(),
        horaInicio: "09:00",
        horaFin: "21:00",
        horas: tipo === "diaria" ? 1 : 30,
        precio,
        esLocal: condicion === "local" || condicion === "jubilado-local",
        conLuz: false,
      })

      await sendEmail({
        to: user.email,
        subject: "Confirmación de Reserva - Gimnasio Municipal",
        text: emailContent.text,
        html: emailContent.html,
      })

      toast({
        title: "Reserva realizada con éxito",
        description: `Has reservado un acceso ${tipo} al gimnasio`,
      })

      // Resetear formulario
      setCondicion("local")
      setTipo("diaria")
    } catch (error) {
      toast({
        title: "Error al realizar la reserva",
        description: "Ha ocurrido un error. Inténtalo de nuevo más tarde.",
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

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <motion.div className="max-w-4xl mx-auto" initial="hidden" animate="visible" variants={fadeIn}>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Reservas Gimnasio</h1>
          <p className="text-muted-foreground">
            Accede a nuestro gimnasio municipal con diferentes opciones según tus necesidades.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Formulario de Reserva</CardTitle>
              <CardDescription>Selecciona tu condición y el tipo de entrada que deseas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Selección de Condición */}
              <div className="space-y-2">
                <Label>Condición</Label>
                <RadioGroup value={condicion} onValueChange={setCondicion} className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="jubilado-local" id="jubilado-local" />
                    <Label htmlFor="jubilado-local">Jubilado Local</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="local" id="local" />
                    <Label htmlFor="local">Local</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no-local" id="no-local" />
                    <Label htmlFor="no-local">No Local</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Campo DNI (obligatorio para usuarios locales) */}
              {(condicion === "local" || condicion === "jubilado-local") && (
                <div className="space-y-2">
                  <Label htmlFor="dni">DNI (obligatorio para usuarios locales)</Label>
                  <Input
                    id="dni"
                    placeholder="12345678A"
                    value={dni}
                    onChange={(e) => setDni(e.target.value)}
                    required
                  />
                </div>
              )}

              {/* Selección de Tipo */}
              <div className="space-y-2">
                <Label>Tipo de Entrada</Label>
                <RadioGroup value={tipo} onValueChange={setTipo} className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="diaria" id="diaria" />
                    <Label htmlFor="diaria">Entrada Diaria</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="mensual" id="mensual" />
                    <Label htmlFor="mensual">Bono Mensual</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="trimestral" id="trimestral" />
                    <Label htmlFor="trimestral">Bono Trimestral</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Resumen de Precio */}
              <div className="pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Precio:</span>
                  <span className="text-xl font-bold">{precio.toFixed(2)} €</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end space-x-2">
              <Button variant="outline">Cancelar</Button>
              <Button
                onClick={handleSubmit}
                disabled={isLoading || ((condicion === "local" || condicion === "jubilado-local") && !dni)}
              >
                {isLoading ? "Procesando..." : "Solicitar Pago"}
              </Button>
            </CardFooter>
          </Card>

          <div>
            <h2 className="text-xl font-semibold mb-4">Tarifas del Gimnasio</h2>
            <motion.div className="grid gap-4" variants={staggerContainer} initial="hidden" animate="visible">
              {/* Tarjeta Entrada Diaria */}
              <motion.div variants={fadeIn}>
                <Card className="card-hover">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Entrada Diaria</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      <li className="flex justify-between">
                        <span>Jubilados Locales</span>
                        <span className="font-semibold">1,00 €</span>
                      </li>
                      <li className="flex justify-between">
                        <span>Locales</span>
                        <span className="font-semibold">2,00 €</span>
                      </li>
                      <li className="flex justify-between">
                        <span>No Locales</span>
                        <span className="font-semibold">2,50 €</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Tarjeta Bono Mensual */}
              <motion.div variants={fadeIn}>
                <Card className="card-hover">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Bono Mensual</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      <li className="flex justify-between">
                        <span>Jubilados Locales</span>
                        <span className="font-semibold">6,00 €</span>
                      </li>
                      <li className="flex justify-between">
                        <span>Locales</span>
                        <span className="font-semibold">9,00 €</span>
                      </li>
                      <li className="flex justify-between">
                        <span>No Locales</span>
                        <span className="font-semibold">12,00 €</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Tarjeta Bono Trimestral */}
              <motion.div variants={fadeIn}>
                <Card className="card-hover">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Bono Trimestral</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      <li className="flex justify-between">
                        <span>Jubilados Locales</span>
                        <span className="font-semibold">15,00 €</span>
                      </li>
                      <li className="flex justify-between">
                        <span>Locales</span>
                        <span className="font-semibold">30,00 €</span>
                      </li>
                      <li className="flex justify-between">
                        <span>No Locales</span>
                        <span className="font-semibold">55,00 €</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Modal de Pago */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        amount={precio}
        onSuccess={handlePaymentSuccess}
        description={`Acceso ${tipo} al gimnasio (${condicion})`}
      />
    </div>
  )
}

