"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { motion } from "framer-motion"
import { useAuth } from "@/components/auth-provider"
import { useRouter } from "next/navigation"
import { Calendar, Clock, MapPin, Filter } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { getReservasByUsuarioId, cancelarReserva, type Reserva } from "@/lib/database"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function MisReservasPage() {
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [filteredReservas, setFilteredReservas] = useState<Reserva[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [tipoFiltro, setTipoFiltro] = useState<string>("todas")
  const { isLoggedIn, user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    if (!isLoggedIn) {
      router.push("/login")
      return
    }

    const cargarReservas = async () => {
      if (!user) return

      setIsLoading(true)
      try {
        const reservasUsuario = await getReservasByUsuarioId(user.id)
        setReservas(reservasUsuario)
        setFilteredReservas(reservasUsuario)
      } catch (error) {
        console.error("Error al cargar reservas:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar tus reservas",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    cargarReservas()
  }, [isLoggedIn, router, toast, user])

  // Filtrar reservas cuando cambia el tipo de filtro
  useEffect(() => {
    if (tipoFiltro === "todas") {
      setFilteredReservas(reservas)
    } else {
      setFilteredReservas(reservas.filter((r) => r.tipoReserva === tipoFiltro))
    }
  }, [tipoFiltro, reservas])

  const handleCancelarReserva = async (id: string) => {
    try {
      await cancelarReserva(id)

      // Actualizar la lista de reservas
      setReservas((prev) => prev.map((reserva) => (reserva.id === id ? { ...reserva, estado: "cancelada" } : reserva)))

      toast({
        title: "Reserva cancelada",
        description: "Tu reserva ha sido cancelada correctamente",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cancelar la reserva",
        variant: "destructive",
      })
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

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-8">Mis Reservas</h1>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
          <p className="mt-4 text-muted-foreground">Cargando tus reservas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <motion.div className="max-w-4xl mx-auto" initial="hidden" animate="visible" variants={fadeIn}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Mis Reservas</h1>
            <p className="text-muted-foreground">
              Gestiona tus reservas de instalaciones deportivas, gimnasio y piscina
            </p>
          </div>

          <div className="mt-4 md:mt-0 flex items-center space-x-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las reservas</SelectItem>
                <SelectItem value="deportiva">Deportivas</SelectItem>
                <SelectItem value="gimnasio">Gimnasio</SelectItem>
                <SelectItem value="piscina">Piscina</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {filteredReservas.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">
                {tipoFiltro === "todas" ? "No tienes reservas activas" : `No tienes reservas de tipo ${tipoFiltro}`}
              </p>
              <Button asChild>
                <a href="/reservas-deportivas">Hacer una reserva</a>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <motion.div className="grid gap-6" variants={staggerContainer} initial="hidden" animate="visible">
            {filteredReservas.map((reserva) => (
              <motion.div key={reserva.id} variants={fadeIn}>
                <Card className={`overflow-hidden ${reserva.estado === "cancelada" ? "opacity-60" : ""}`}>
                  <div
                    className={`h-2 ${
                      reserva.estado === "confirmada"
                        ? "bg-green-500"
                        : reserva.estado === "pendiente"
                          ? "bg-amber-500"
                          : "bg-red-500"
                    }`}
                  ></div>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{reserva.instalacion}</CardTitle>
                        <CardDescription>
                          {reserva.tipoReserva === "deportiva"
                            ? "Reserva deportiva"
                            : reserva.tipoReserva === "gimnasio"
                              ? "Acceso al gimnasio"
                              : "Acceso a la piscina"}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-xs ${
                            reserva.estado === "confirmada"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : reserva.estado === "pendiente"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                                : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                          }`}
                        >
                          {reserva.estado === "confirmada"
                            ? "Confirmada"
                            : reserva.estado === "pendiente"
                              ? "Pendiente"
                              : "Cancelada"}
                        </span>
                        <p className="text-sm font-bold mt-2">
                          {reserva.precio === 0 ? "Gratis" : `${reserva.precio.toFixed(2)} €`}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm">
                        <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{format(new Date(reserva.fecha), "PPP", { locale: es })}</span>
                      </div>

                      <div className="flex items-center text-sm">
                        <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>
                          {reserva.horaInicio}{" "}
                          {reserva.horaFin
                            ? `- ${reserva.horaFin}`
                            : `(${reserva.horas} ${reserva.horas === 1 ? "hora" : "horas"})`}
                        </span>
                      </div>

                      <div className="flex items-center text-sm">
                        <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>Polideportivo Municipal de La Llosa</span>
                      </div>
                    </div>

                    {reserva.estado !== "cancelada" && (
                      <div className="mt-4 flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleCancelarReserva(reserva.id)}
                        >
                          Cancelar reserva
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}

