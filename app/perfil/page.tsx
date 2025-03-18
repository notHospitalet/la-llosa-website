"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { motion } from "framer-motion"
import { useAuth } from "@/components/auth-provider"
import { useRouter } from "next/navigation"
import { getUsuarioById, updateUsuario } from "@/lib/database"
import { User, Upload, Eye, EyeOff } from "lucide-react"

export default function PerfilPage() {
  const { user, isLoggedIn } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [nombre, setNombre] = useState("")
  const [telefono, setTelefono] = useState("")
  const [dni, setDni] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [newProfileImage, setNewProfileImage] = useState<File | null>(null)
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isLoggedIn) {
      router.push("/login")
      return
    }

    // Cargar datos del usuario
    const loadUserData = async () => {
      if (!user) return

      try {
        const userData = await getUsuarioById(user.id)
        if (userData) {
          setNombre(userData.nombre)
          setTelefono(userData.telefono || "")
          setDni(userData.dni || "")
          setProfileImage(userData.imagenPerfil || null)
          setProfileImagePreview(userData.imagenPerfil || null)
        }
      } catch (error) {
        console.error("Error al cargar datos del usuario:", error)
      }
    }

    loadUserData()
  }, [isLoggedIn, router, user])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setNewProfileImage(file)
      setProfileImagePreview(URL.createObjectURL(file))
    }
  }

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password && password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Las contraseñas no coinciden",
        variant: "destructive",
      })
      return
    }

    if (password && password.length < 6) {
      toast({
        title: "Error",
        description: "La contraseña debe tener al menos 6 caracteres",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      if (!user) throw new Error("Usuario no autenticado")

      // Simular carga de imagen
      let imagenPerfil = profileImage
      if (newProfileImage) {
        // En un entorno real, aquí se subiría la imagen a un servicio de almacenamiento
        // y se guardaría la URL en la base de datos
        imagenPerfil = URL.createObjectURL(newProfileImage)
      }

      // Actualizar datos del usuario
      const updateData: any = {
        nombre,
        telefono: telefono || undefined,
        dni: dni || undefined,
        imagenPerfil,
      }

      if (password) {
        updateData.password = password
      }

      await updateUsuario(user.id, updateData)

      // Actualizar datos en localStorage
      const updatedUser = {
        ...user,
        name: nombre,
        dni,
        imagenPerfil,
      }

      localStorage.setItem("user", JSON.stringify(updatedUser))

      toast({
        title: "Perfil actualizado",
        description: "Tus datos han sido actualizados correctamente",
      })

      setIsEditing(false)
      setPassword("")
      setConfirmPassword("")
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Ha ocurrido un error al actualizar el perfil",
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

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4">Cargando perfil...</h1>
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <motion.div className="max-w-2xl mx-auto" initial="hidden" animate="visible" variants={fadeIn}>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Mi Perfil</h1>
          <p className="text-muted-foreground">Gestiona tu información personal y preferencias</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Información Personal</CardTitle>
                <CardDescription>{isEditing ? "Edita tus datos personales" : "Tus datos personales"}</CardDescription>
              </div>
              {!isEditing && <Button onClick={() => setIsEditing(true)}>Editar Perfil</Button>}
            </div>
          </CardHeader>

          <CardContent>
            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <div
                      className="h-32 w-32 rounded-full overflow-hidden border-4 border-background cursor-pointer"
                      onClick={triggerFileInput}
                    >
                      {profileImagePreview ? (
                        <img
                          src={profileImagePreview || "/placeholder.svg"}
                          alt="Imagen de perfil"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full bg-muted flex items-center justify-center">
                          <User className="h-16 w-16 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                    <Button
                      type="button"
                      size="icon"
                      className="absolute bottom-0 right-0 rounded-full"
                      onClick={triggerFileInput}
                    >
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre completo</Label>
                  <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Correo electrónico</Label>
                  <Input id="email" value={user.email} disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground">El correo electrónico no se puede modificar</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input id="telefono" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dni">DNI</Label>
                  <Input id="dni" value={dni} onChange={(e) => setDni(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Nueva contraseña</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Dejar en blanco para mantener la actual"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 py-2 text-muted-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      <span className="sr-only">{showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}</span>
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar nueva contraseña</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Confirma tu nueva contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-center mb-6">
                  <div className="h-32 w-32 rounded-full overflow-hidden border-4 border-background">
                    {profileImage ? (
                      <img
                        src={profileImage || "/placeholder.svg"}
                        alt="Imagen de perfil"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-muted flex items-center justify-center">
                        <User className="h-16 w-16 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Nombre completo</h3>
                    <p className="text-lg">{nombre}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Correo electrónico</h3>
                    <p className="text-lg">{user.email}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Teléfono</h3>
                    <p className="text-lg">{telefono || "No especificado"}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">DNI</h3>
                    <p className="text-lg">{dni || "No especificado"}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Tipo de usuario</h3>
                    <p className="text-lg capitalize">{user.tipo}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>

          {isEditing && (
            <CardFooter className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false)
                  setPassword("")
                  setConfirmPassword("")
                  setProfileImagePreview(profileImage)
                  setNewProfileImage(null)
                }}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={isLoading}>
                {isLoading ? "Guardando..." : "Guardar cambios"}
              </Button>
            </CardFooter>
          )}
        </Card>
      </motion.div>
    </div>
  )
}

