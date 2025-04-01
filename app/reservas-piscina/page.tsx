"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { motion } from "framer-motion"
import { preciosPiscina } from "@/lib/data"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/components/auth-provider"
import { useRouter } from "next/navigation"
import { PaymentModal } from "@/components/payment-modal"
import { addMonths } from "date-fns"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Info, CheckCircle } from "lucide-react"
import Link from "next/link"

// Interfaz extendida para User con telefono opcional
interface ExtendedUser {
  id: string
  name: string
  email: string
  dni?: string
  tipo?: string
  telefono?: string
}

export default function ReservasPiscina() {
  const [tipo, setTipo] = useState("individual")
  const [condicion, setCondicion] = useState("local-adulto")
  const [curso, setCurso] = useState("aquasalud")
  const [precio, setPrecio] = useState(0)
  const [expedicionBono, setExpedicionBono] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [dni, setDni] = useState("")
  const [reservaCompletada, setReservaCompletada] = useState(false)
  const [reservaId, setReservaId] = useState<string | null>(null)
  const { toast } = useToast()
  const { isLoggedIn, user } = useAuth()
  const router = useRouter()

  // Cargar DNI del usuario si está disponible
  useEffect(() => {
    if (user && user.dni) {
      setDni(user.dni)
    }
  }, [user])

  // Calcular precio basado en selecciones
  useEffect(() => {
    let precioBase = 0

    if (tipo === "individual") {
      precioBase = preciosPiscina.individual[condicion as keyof typeof preciosPiscina.individual] || 0
    } else if (tipo === "bono-mensual") {
      precioBase = preciosPiscina["bono-mensual"][condicion as keyof (typeof preciosPiscina)["bono-mensual"]] || 0
    } else if (tipo === "bono-temporada") {
      precioBase = preciosPiscina["bono-temporada"][condicion as keyof (typeof preciosPiscina)["bono-temporada"]] || 0
    } else if (tipo === "curso") {
      precioBase =
        preciosPiscina.curso[curso as keyof typeof preciosPiscina.curso][
          condicion as keyof typeof preciosPiscina.curso.aquasalud
        ] || 0
    }

    // Añadir coste de expedición de bono si está seleccionado
    if (expedicionBono && (tipo === "bono-mensual" || tipo === "bono-temporada")) {
      precioBase += 2
    }

    setPrecio(precioBase)
  }, [tipo, condicion, curso, expedicionBono])

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
    if ((condicion.startsWith("local") || condicion === "familiar") && !dni) {
      toast({
        title: "DNI requerido",
        description: "Para usuarios locales, el DNI es obligatorio",
        variant: "destructive",
      })
      return
    }

    setShowPaymentModal(true)
  }

  const handlePaymentSuccess = async (metodoPago: string) => {
    setIsLoading(true)

    try {
      if (!user) {
        throw new Error("Usuario no autenticado")
      }

      // Obtener token de autenticación
      const token = localStorage.getItem("auth_token")
      if (!token) {
        throw new Error("No se encontró token de autenticación")
      }

      // Calcular fecha de fin basada en el tipo de abono
      let fechaFin = new Date()
      if (tipo === "bono-mensual") {
        fechaFin = addMonths(fechaFin, 1)
      } else if (tipo === "bono-temporada") {
        // Temporada hasta el 15 de septiembre
        const currentYear = new Date().getFullYear()
        fechaFin = new Date(currentYear, 8, 15) // 8 = septiembre (0-indexed)
      } else if (tipo === "curso") {
        // Los cursos suelen durar un mes
        fechaFin = addMonths(fechaFin, 1)
      }

      // Tratar al usuario como ExtendedUser para acceder a telefono
      const extendedUser = user as ExtendedUser

      // Crear reserva en la base de datos
      const reservaResponse = await fetch("/api/reservas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          idUsuario: user.id,
          nombre: user.name,
          email: user.email,
          telefono: extendedUser.telefono || "600123456",
          dni: dni,
          instalacion: "Piscina Municipal",
          tipoReserva: "piscina",
          fecha: new Date(),
          horaInicio: "10:00", // Hora de apertura
          horaFin: "20:00", // Hora de cierre
          horas: tipo === "individual" ? 1 : 30, // Valor simbólico para bonos
          precio,
          esLocal: condicion.startsWith("local") || condicion === "familiar",
          conLuz: false, // No aplica para piscina
          estado: "confirmada",
          tipoAbono: tipo,
          tipoCurso: tipo === "curso" ? curso : undefined,
          expedicionBono: expedicionBono,
          metodoPago: metodoPago,
        }),
      })

      if (!reservaResponse.ok) {
        const errorData = await reservaResponse.json()
        throw new Error(errorData.message || "Error al crear reserva")
      }

      const reservaData = await reservaResponse.json()
      console.log("Reserva creada:", reservaData)

      // Guardar el ID de la reserva
      if (reservaData && reservaData.id) {
        setReservaId(reservaData.id)
      }

      // Si es un bono o curso, guardar en la colección de bonos
      if (tipo !== "individual") {
        const bonoResponse = await fetch("/api/bonos", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            idUsuario: user.id,
            nombre: user.name,
            email: user.email,
            instalacion: "Piscina Municipal",
            tipo: tipo,
            tipoCurso: tipo === "curso" ? curso : undefined,
            fechaInicio: new Date(),
            fechaFin: fechaFin,
            precio,
            esLocal: condicion.startsWith("local") || condicion === "familiar",
            estado: "activo",
            expedicionBono: expedicionBono,
            metodoPago: metodoPago,
          }),
        })

        if (!bonoResponse.ok) {
          console.error("Error al guardar el bono")
        } else {
          const bonoData = await bonoResponse.json()
          console.log("Bono creado:", bonoData)
        }
      }

      // Enviar notificación por email
      try {
        const notificationResponse = await fetch("/api/send-reserva-notification", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            nombre: user.name,
            email: user.email,
            telefono: extendedUser.telefono || "600123456",
            dni: dni,
            instalacion: "Piscina Municipal",
            fecha: new Date(),
            horaInicio: "10:00",
            horaFin: "20:00",
            horas: tipo === "individual" ? 1 : 30,
            precio,
            esLocal: condicion.startsWith("local") || condicion === "familiar",
            conLuz: false,
            estado: "confirmada",
            tipoAbono: tipo,
            tipoCurso: tipo === "curso" ? curso : undefined,
            expedicionBono: expedicionBono,
            metodoPago: metodoPago,
          }),
        })

        if (!notificationResponse.ok) {
          console.error("Error al enviar notificación por email")
        } else {
          console.log("Notificación enviada correctamente")
        }
      } catch (error) {
        console.error("Error al enviar notificación:", error)
        // No interrumpimos el flujo principal si falla la notificación
      }

      toast({
        title: "Reserva realizada con éxito",
        description: `Has reservado un acceso de tipo ${tipo} a la piscina`,
      })

      // Mostrar mensaje de confirmación
      setReservaCompletada(true)
    } catch (error: any) {
      console.error("Error al realizar la reserva:", error)
      toast({
        title: "Error al realizar la reserva",
        description: error.message || "Ha ocurrido un error. Inténtalo de nuevo más tarde.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setShowPaymentModal(false)
    }
  }

  const resetForm = () => {
    setTipo("individual")
    setCondicion("local-adulto")
    setCurso("aquasalud")
    setExpedicionBono(false)
    setReservaCompletada(false)
    setReservaId(null)
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
      <motion.div className="max-w-4xl mx-auto" initial="hidden" animate="visible" variants={fadeIn}>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Reservas Piscina</h1>
          <p className="text-muted-foreground">
            Disfruta de nuestra piscina municipal con diferentes opciones según tus necesidades.
          </p>
        </div>

        <Alert className="mb-6 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription>
            Los bonos de piscina te permiten acceder a las instalaciones durante todo el período contratado. Podrás ver
            tus bonos activos en la sección "Mis Bonos".
          </AlertDescription>
        </Alert>

        {!reservaCompletada ? (
          <Card>
            <CardHeader>
              <CardTitle>Formulario de Reserva</CardTitle>
              <CardDescription>
                Selecciona el tipo de entrada y tus condiciones para calcular el precio.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="individual" onValueChange={setTipo} className="w-full">
                <TabsList className="grid grid-cols-4 mb-6">
                  <TabsTrigger value="individual">Individual</TabsTrigger>
                  <TabsTrigger value="bono-mensual">Bono Mensual</TabsTrigger>
                  <TabsTrigger value="bono-temporada">Bono Temporada</TabsTrigger>
                  <TabsTrigger value="curso">Curso</TabsTrigger>
                </TabsList>

                {/* Contenido para Individual */}
                <TabsContent value="individual" className="space-y-6">
                  <div className="space-y-2">
                    <Label>Condición</Label>
                    <RadioGroup value={condicion} onValueChange={setCondicion} className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="local-menor-3" id="local-menor-3" />
                        <Label htmlFor="local-menor-3">Local (0-3 años)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="local-adulto" id="local-adulto" />
                        <Label htmlFor="local-adulto">Local (más de 3 años)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no-local-adulto" id="no-local-adulto" />
                        <Label htmlFor="no-local-adulto">No Local (más de 3 años)</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Campo DNI (obligatorio para usuarios locales) */}
                  {condicion.startsWith("local") && (
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
                </TabsContent>

                {/* Contenido para Bono Mensual */}
                <TabsContent value="bono-mensual" className="space-y-6">
                  <div className="space-y-2">
                    <Label>Condición</Label>
                    <RadioGroup value={condicion} onValueChange={setCondicion} className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="local-adulto" id="bm-local" />
                        <Label htmlFor="bm-local">Local</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no-local-adulto" id="bm-no-local" />
                        <Label htmlFor="bm-no-local">No Local</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="familiar" id="bm-familiar" />
                        <Label htmlFor="bm-familiar">Familiar</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Campo DNI (obligatorio para usuarios locales) */}
                  {(condicion === "local-adulto" || condicion === "familiar") && (
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

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="expedicion-bono-mensual"
                      checked={expedicionBono}
                      onChange={(e) => setExpedicionBono(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <Label htmlFor="expedicion-bono-mensual">Expedición de bono (+2€)</Label>
                  </div>
                </TabsContent>

                {/* Contenido para Bono Temporada */}
                <TabsContent value="bono-temporada" className="space-y-6">
                  <div className="space-y-2">
                    <Label>Condición</Label>
                    <RadioGroup value={condicion} onValueChange={setCondicion} className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="local-adulto" id="bt-local" />
                        <Label htmlFor="bt-local">Local</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no-local-adulto" id="bt-no-local" />
                        <Label htmlFor="bt-no-local">No Local</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Campo DNI (obligatorio para usuarios locales) */}
                  {condicion === "local-adulto" && (
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

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="expedicion-bono-temporada"
                      checked={expedicionBono}
                      onChange={(e) => setExpedicionBono(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <Label htmlFor="expedicion-bono-temporada">Expedición de bono (+2€)</Label>
                  </div>
                </TabsContent>

                {/* Contenido para Curso */}
                <TabsContent value="curso" className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="tipo-curso">Tipo de Curso</Label>
                    <Select value={curso} onValueChange={setCurso}>
                      <SelectTrigger id="tipo-curso">
                        <SelectValue placeholder="Selecciona un curso" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aquasalud">Aquasalud</SelectItem>
                        <SelectItem value="infantil">Infantil</SelectItem>
                        <SelectItem value="adultos">Adultos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Condición</Label>
                    <RadioGroup value={condicion} onValueChange={setCondicion} className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="local-jubilado" id="curso-jubilado" />
                        <Label htmlFor="curso-jubilado">Jubilado Local</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="local-adulto" id="curso-local" />
                        <Label htmlFor="curso-local">Local</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no-local-adulto" id="curso-no-local" />
                        <Label htmlFor="curso-no-local">No Local</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Campo DNI (obligatorio para usuarios locales) */}
                  {(condicion === "local-jubilado" || condicion === "local-adulto") && (
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
                </TabsContent>
              </Tabs>

              {/* Resumen de Precio */}
              <div className="pt-6 mt-6 border-t">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Precio Total:</span>
                  <span className="text-xl font-bold">
                    {precio === 0 &&
                    (condicion === "local-menor-3" ||
                      (condicion === "local-jubilado" && (curso === "aquasalud" || curso === "adultos")))
                      ? "Gratis"
                      : `${precio.toFixed(2)} €`}
                  </span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => router.push("/")}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isLoading || ((condicion.startsWith("local") || condicion === "familiar") && !dni)}
              >
                {isLoading ? "Procesando..." : "Solicitar Pago"}
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <Card className="border-none shadow-lg">
            <CardContent className="pt-6 pb-6">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-3">
                    <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold">¡Reserva Confirmada!</h2>
                <p className="text-muted-foreground">
                  Tu {tipo === "individual" ? "entrada" : tipo === "curso" ? "curso" : "bono"} para la piscina ha sido{" "}
                  {tipo === "individual" ? "reservada" : "adquirido"} correctamente.
                </p>

                <div className="bg-muted/30 p-6 rounded-lg max-w-md mx-auto mt-4 text-left">
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <div className="font-medium">Tipo:</div>
                      <div className="ml-2">
                        {tipo === "individual"
                          ? "Entrada individual"
                          : tipo === "curso"
                            ? `Curso de ${curso}`
                            : tipo === "bono-mensual"
                              ? "Bono mensual"
                              : "Bono temporada"}
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className="font-medium">Precio:</div>
                      <div className="ml-2">{precio === 0 ? "Gratis" : `${precio.toFixed(2)} €`}</div>
                    </div>
                    <div className="flex items-center">
                      <div className="font-medium">Condición:</div>
                      <div className="ml-2">
                        {condicion === "local-jubilado"
                          ? "Jubilado Local"
                          : condicion === "local-adulto"
                            ? "Local (adulto)"
                            : condicion === "local-menor-3"
                              ? "Local (menor de 3 años)"
                              : condicion === "familiar"
                                ? "Familiar"
                                : "No Local"}
                      </div>
                    </div>
                  </div>
                </div>

                <Alert className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 max-w-md mx-auto">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <AlertDescription>
                    Hemos enviado un correo electrónico a {user?.email} con los detalles de tu reserva.
                  </AlertDescription>
                </Alert>

                <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
                  <Button onClick={resetForm}>Realizar otra reserva</Button>
                  <Button variant="outline" asChild>
                    {tipo === "individual" ? (
                      <Link href="/mis-reservas">Ver mis reservas</Link>
                    ) : (
                      <Link href="/mis-bonos">Ver mis bonos</Link>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Información de Tarifas</h2>
          <Card>
            <CardContent className="p-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className="font-semibold mb-2">Entrada Individual</h3>
                  <ul className="space-y-1 text-sm">
                    <li className="flex justify-between">
                      <span>Local (0-3 años)</span>
                      <span className="font-medium">Gratis</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Local (más de 3 años)</span>
                      <span className="font-medium">1,50 €</span>
                    </li>
                    <li className="flex justify-between">
                      <span>No Local (más de 3 años)</span>
                      <span className="font-medium">3,00 €</span>
                    </li>
                  </ul>

                  <h3 className="font-semibold mt-4 mb-2">Bono Mensual</h3>
                  <ul className="space-y-1 text-sm">
                    <li className="flex justify-between">
                      <span>Local</span>
                      <span className="font-medium">25,00 €</span>
                    </li>
                    <li className="flex justify-between">
                      <span>No Local</span>
                      <span className="font-medium">50,00 €</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Familiar</span>
                      <span className="font-medium">75,00 €</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Bono Temporada</h3>
                  <ul className="space-y-1 text-sm">
                    <li className="flex justify-between">
                      <span>Local</span>
                      <span className="font-medium">60,00 €</span>
                    </li>
                    <li className="flex justify-between">
                      <span>No Local</span>
                      <span className="font-medium">100,00 €</span>
                    </li>
                  </ul>

                  <h3 className="font-semibold mt-4 mb-2">Cursos</h3>
                  <ul className="space-y-1 text-sm">
                    <li className="flex justify-between">
                      <span>Aquasalud (Jubilado Local)</span>
                      <span className="font-medium">Gratis</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Aquasalud (Local)</span>
                      <span className="font-medium">35,00 €</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Aquasalud (No Local)</span>
                      <span className="font-medium">40,00 €</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Infantil</span>
                      <span className="font-medium">40,00 €</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Adultos (Jubilado Local)</span>
                      <span className="font-medium">Gratis</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Adultos (Local)</span>
                      <span className="font-medium">35,00 €</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Adultos (No Local)</span>
                      <span className="font-medium">40,00 €</span>
                    </li>
                  </ul>

                  <p className="text-sm mt-4">
                    <span className="font-medium">Nota:</span> Expedición de bono: 2,00 €
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Modal de Pago */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        amount={precio}
        onSuccess={handlePaymentSuccess}
        description={`Acceso ${tipo} a la piscina (${condicion})`}
      />
    </div>
  )
}

