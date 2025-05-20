"use client"

import { useState, useEffect, ChangeEvent, FormEvent, useRef } from "react"
import api from "@/lib/api"
import MainLayout from "@/components/layout/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ChevronDown, Edit, Plus, Search, Trash, AlertCircle, Info } from "lucide-react"
import { useRouter } from "next/navigation"
import { AxiosError } from "axios"

interface User {
  id: string
  name: string
  email: string
  phone_number: string
  document: string
  city: string
  postal_code: string
  address: string
  date_of_birth: string
  country_id: string
  country: string
  role: string
  created_at: string
  updated_at: string
}

interface UserFormData {
  name: string
  email: string
  password: string
  confirmPassword: string
  phone_number: string
  document: string
  city: string
  postal_code: string
  address: string
  date_of_birth: string
  country_id: string
  role: string
}

interface UserCreatePayload {
  name: string
  email: string
  password: string
  password_confirmation: string
  phone_number: string
  document: string
  city: string
  postal_code: string
  address: string
  date_of_birth: string
  country_id: string
  role: string
}

interface UserUpdatePayload {
  name: string
  email: string
  password?: string
  password_confirmation?: string
  phone_number?: string
  document?: string
  city?: string
  postal_code?: string
  address?: string
  date_of_birth?: string
  country_id?: string
  role?: string
}

interface Country {
  id: string
  name: string
  code: string
}

interface ApiErrorResponse {
  message: string
  errors?: { [key: string]: string[] }
}

// Función para formatear la fecha ISO a yyyy-MM-dd
const formatDateForInput = (isoDate: string): string => {
  if (!isoDate) return "";
  return isoDate.split("T")[0]; // Convierte "1975-05-15T00:00:00.000000Z" a "1975-05-15"
}

export default function AdminUsersPage() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(
    typeof window !== "undefined" ? localStorage.getItem("token") : null
  )
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [countries, setCountries] = useState<Country[]>([])
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [userName, setUserName] = useState("Cargando...")
  const [userEmail, setUserEmail] = useState("cargando@mentora.edu")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedRole, setSelectedRole] = useState("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const createDialogRef = useRef<HTMLDivElement>(null)
  const editDialogRef = useRef<HTMLDivElement>(null)

  const [userFormData, setUserFormData] = useState<UserFormData>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone_number: "",
    document: "",
    city: "",
    postal_code: "",
    address: "",
    date_of_birth: "",
    country_id: "",
    role: "student",
  })

  // Configurar timeout para solicitudes API
  const apiWithTimeout = async (url: string, timeoutMs: number = 10000) => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await api.get(url, { signal: controller.signal })
      clearTimeout(timeoutId)
      return response
    } catch (err) {
      clearTimeout(timeoutId)
      throw err
    }
  }

  // Verificar autenticación
  useEffect(() => {
    console.log("Iniciando verificación de autenticación...")
    if (!token) {
      console.log("No hay token, redirigiendo al login")
      setAuthError("No estás autenticado. Redirigiendo al login...")
      router.push("/login")
      return
    }

    const verifyUser = async () => {
      try {
        console.log("Haciendo solicitud a /user")
        const response = await apiWithTimeout("/user")
        console.log("Respuesta de /user:", response.data)
        const { role, name, email } = response.data.data
        if (role !== "admin") {
          console.log("Rol no es admin, redirigiendo al login")
          setAuthError("Acceso denegado. Redirigiendo al login...")
          localStorage.removeItem("token")
          router.push("/login")
          return
        }
        setUserName(name || "Admin Sistema")
        setUserEmail(email || "admin@mentora.edu")
        setLoadingAuth(false)
        console.log("Autenticación completada, loadingAuth: false")
      } catch (err) {
        console.error("Error en autenticación:", err)
        setAuthError("Token inválido. Redirigiendo al login...")
        localStorage.removeItem("token")
        router.push("/login")
      }
    }

    verifyUser()
  }, [token, router])

  // Cargar usuarios y países
  useEffect(() => {
    console.log("Iniciando carga de datos, loadingAuth:", loadingAuth, "authError:", authError)
    if (loadingAuth || authError) {
      console.log("No se carga datos, esperando autenticación")
      return
    }

    const fetchData = async () => {
      try {
        setLoading(true)
        console.log("Haciendo solicitudes a /users y /countries")
        const [usersRes, countriesRes] = await Promise.all([
          apiWithTimeout("/users").catch((err) => {
            console.error("Error en /users:", err)
            throw err
          }),
          apiWithTimeout("/countries").catch((err) => {
            console.error("Error en /countries:", err)
            return { data: { data: [] } }
          }),
        ])
        console.log("Users response:", usersRes.data)
        console.log("Countries response:", countriesRes.data)
        setUsers(usersRes.data.data || [])
        setCountries(countriesRes.data.data || [])
        if (!countriesRes.data.data.length) {
          setApiError("No se pudieron cargar los países. Inténtalo de nuevo.")
        }
      } catch (err: unknown) {
        const error = err as AxiosError<ApiErrorResponse>
        console.error("API error:", error.response?.data || error.message)
        setApiError(error.response?.data?.message || "Error al cargar los datos. Inténtalo de nuevo.")
      } finally {
        setLoading(false)
        console.log("Carga completada, loading: false")
      }
    }

    fetchData()
  }, [loadingAuth, authError])

  // Desplazar diálogo hacia arriba cuando haya un error
  useEffect(() => {
    if (formError && isCreateDialogOpen && createDialogRef.current) {
      createDialogRef.current.scrollTop = 0
    }
    if (formError && isEditDialogOpen && editDialogRef.current) {
      editDialogRef.current.scrollTop = 0
    }
  }, [formError, isCreateDialogOpen, isEditDialogOpen])

  // Manejar creación de usuario
  const handleCreateUser = async (event: FormEvent) => {
    event.preventDefault()
    setFormError(null)

    if (userFormData.password !== userFormData.confirmPassword) {
      setFormError("Las contraseñas no coinciden.")
      return
    }

    try {
      console.log("Creando usuario con datos:", userFormData)
      const payload: UserCreatePayload = {
        name: userFormData.name,
        email: userFormData.email,
        password: userFormData.password,
        password_confirmation: userFormData.confirmPassword,
        phone_number: userFormData.phone_number,
        document: userFormData.document,
        city: userFormData.city,
        postal_code: userFormData.postal_code,
        address: userFormData.address,
        date_of_birth: userFormData.date_of_birth,
        country_id: userFormData.country_id,
        role: userFormData.role,
      }
      await api.post("/users", payload)
      setIsCreateDialogOpen(false)
      setUserFormData({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        phone_number: "",
        document: "",
        city: "",
        postal_code: "",
        address: "",
        date_of_birth: "",
        country_id: "",
        role: "student",
      })
      setFormError(null)
      const response = await apiWithTimeout("/users")
      setUsers(response.data.data || [])
      setApiError(null)
      console.log("Usuario creado, datos actualizados")
    } catch (err: unknown) {
      const error = err as AxiosError<ApiErrorResponse>
      console.error("Error al crear usuario:", error.response?.data || error.message)
      const errorMessages = error.response?.data?.errors
        ? Object.values(error.response.data.errors).flat().join(" ")
        : error.response?.data?.message || "Error al crear el usuario. Inténtalo de nuevo."
      setFormError(errorMessages)
    }
  }

  // Manejar edición de usuario
  const handleEditUser = async (event: FormEvent) => {
    event.preventDefault()
    setFormError(null)

    if (!selectedUser) return
    if (userFormData.password && userFormData.password !== userFormData.confirmPassword) {
      setFormError("Las contraseñas no coinciden.")
      return
    }

    try {
      console.log("Editando usuario con ID:", selectedUser.id, "datos:", userFormData)
      const updates: UserUpdatePayload = {
        name: userFormData.name,
        email: userFormData.email,
        phone_number: userFormData.phone_number,
        document: userFormData.document,
        city: userFormData.city,
        postal_code: userFormData.postal_code,
        address: userFormData.address,
        date_of_birth: userFormData.date_of_birth,
        country_id: userFormData.country_id,
        role: userFormData.role,
      }
      if (userFormData.password) {
        updates.password = userFormData.password
        updates.password_confirmation = userFormData.confirmPassword
      }

      await api.put(`/users/${selectedUser.id}`, updates)
      setIsEditDialogOpen(false)
      setUserFormData({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        phone_number: "",
        document: "",
        city: "",
        postal_code: "",
        address: "",
        date_of_birth: "",
        country_id: "",
        role: "student",
      })
      setSelectedUser(null)
      setFormError(null)
      const response = await apiWithTimeout("/users")
      setUsers(response.data.data || [])
      setApiError(null)
      console.log("Usuario editado, datos actualizados")
    } catch (err: unknown) {
      const error = err as AxiosError<ApiErrorResponse>
      console.error("Error al editar usuario:", error.response?.data || error.message)
      const errorMessages = error.response?.data?.errors
        ? Object.values(error.response.data.errors).flat().join(" ")
        : error.response?.data?.message || "Error al editar el usuario. Inténtalo de nuevo."
      setFormError(errorMessages)
    }
  }

  // Manejar eliminación de usuario
  const handleDeleteUser = async (id: string) => {
    try {
      console.log("Eliminando usuario con ID:", id)
      await api.delete(`/users/${id}`)
      const response = await apiWithTimeout("/users")
      setUsers(response.data.data || [])
      setApiError(null)
      console.log("Usuario eliminado, datos actualizados")
    } catch (err: unknown) {
      const error = err as AxiosError<ApiErrorResponse>
      console.error("Error al eliminar usuario:", error.response?.data || error.message)
      setApiError(error.response?.data?.message || "Error al eliminar el usuario. Inténtalo de nuevo.")
    }
  }

  // Manejar clic en editar
  const handleEditClick = (user: User) => {
    console.log("Abriendo edición para usuario:", user)
    setSelectedUser(user)
    setUserFormData({
      name: user.name || "",
      email: user.email || "",
      password: "",
      confirmPassword: "",
      phone_number: user.phone_number || "",
      document: user.document || "",
      city: user.city || "",
      postal_code: user.postal_code || "",
      address: user.address || "",
      date_of_birth: formatDateForInput(user.date_of_birth || ""), // Formatear la fecha
      country_id: user.country_id || "",
      role: user.role || "student",
    })
    setFormError(null)
    setIsEditDialogOpen(true)
  }

  // Filtrar usuarios
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      (user.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email || "").toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = selectedRole === "all" || user.role === selectedRole
    return matchesSearch && matchesRole
  })

  return (
    <MainLayout userRole="admin" userName={userName} userEmail={userEmail}>
      <div className="flex flex-col gap-6 p-4">
        {loadingAuth ? (
          <div className="text-center">Verificando autenticación...</div>
        ) : authError ? (
          <div className="text-red-500 text-center">{authError}</div>
        ) : loading ? (
          <div className="text-center">Cargando datos...</div>
        ) : (
          <>
            {apiError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{apiError}</AlertDescription>
              </Alert>
            )}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Usuarios</h1>
                <p className="text-muted-foreground">Gestiona los usuarios de la plataforma Mentora</p>
              </div>
              <Dialog
                open={isCreateDialogOpen}
                onOpenChange={(open) => {
                  setIsCreateDialogOpen(open)
                  if (!open) setFormError(null)
                }}
              >
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Añadir Usuario
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[80vh] overflow-y-auto" ref={createDialogRef}>
                  <DialogHeader>
                    <DialogTitle>Crear nuevo usuario</DialogTitle>
                    <DialogDescription>Completa la información para crear un nuevo usuario</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateUser}>
                    {formError && (
                      <Alert variant="destructive" className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{formError}</AlertDescription>
                      </Alert>
                    )}
                    <Alert variant="default" className="mb-4 border-blue-500">
                      <Info className="h-4 w-4 text-blue-500" />
                      <AlertTitle>Requisitos de la contraseña</AlertTitle>
                      <AlertDescription>La contraseña debe tener al menos 8 caracteres.</AlertDescription>
                    </Alert>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="name">Nombre completo</Label>
                        <Input
                          id="name"
                          placeholder="Ej: Juan Pérez"
                          value={userFormData.name}
                          onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="email">Correo electrónico</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="usuario@ejemplo.com"
                          value={userFormData.email}
                          onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="password">Contraseña</Label>
                        <Input
                          id="password"
                          type="password"
                          value={userFormData.password}
                          onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={userFormData.confirmPassword}
                          onChange={(e) => setUserFormData({ ...userFormData, confirmPassword: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="phone_number">Número de teléfono</Label>
                        <Input
                          id="phone_number"
                          placeholder="Ej: +1234567890"
                          value={userFormData.phone_number}
                          onChange={(e) => setUserFormData({ ...userFormData, phone_number: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="document">Documento</Label>
                        <Input
                          id="document"
                          placeholder="Ej: 1234567890"
                          value={userFormData.document}
                          onChange={(e) => setUserFormData({ ...userFormData, document: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="city">Ciudad</Label>
                        <Input
                          id="city"
                          placeholder="Ej: Madrid"
                          value={userFormData.city}
                          onChange={(e) => setUserFormData({ ...userFormData, city: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="postal_code">Código postal</Label>
                        <Input
                          id="postal_code"
                          placeholder="Ej: 28001"
                          value={userFormData.postal_code}
                          onChange={(e) => setUserFormData({ ...userFormData, postal_code: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="address">Dirección</Label>
                        <Input
                          id="address"
                          placeholder="Ej: Calle Mayor 123"
                          value={userFormData.address}
                          onChange={(e) => setUserFormData({ ...userFormData, address: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="date_of_birth">Fecha de nacimiento</Label>
                        <Input
                          id="date_of_birth"
                          type="date"
                          value={userFormData.date_of_birth}
                          onChange={(e) => setUserFormData({ ...userFormData, date_of_birth: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="country_id">País</Label>
                        <select
                          id="country_id"
                          value={userFormData.country_id}
                          onChange={(e) => setUserFormData({ ...userFormData, country_id: e.target.value })}
                          className="w-full border rounded-md p-2"
                        >
                          <option value="">Selecciona un país</option>
                          {countries.map((country) => (
                            <option key={country.id} value={country.id}>
                              {country.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="role">Rol</Label>
                        <select
                          id="role"
                          value={userFormData.role}
                          onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                          className="w-full border rounded-md p-2"
                        >
                          <option value="student">Estudiante</option>
                          <option value="professor">Profesor</option>
                          <option value="admin">Administrador</option>
                        </select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit">Crear usuario</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Lista de Usuarios</CardTitle>
                <CardDescription>Visualiza y gestiona todos los usuarios de la plataforma</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por nombre o email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 w-full"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      className="w-full sm:w-[180px] border rounded-md p-2"
                    >
                      <option value="all">Todos los roles</option>
                      <option value="student">Estudiantes</option>
                      <option value="professor">Profesores</option>
                      <option value="admin">Administradores</option>
                    </select>
                  </div>
                </div>

                <div className="rounded-md border">
                  <table className="w-full caption-bottom text-sm">
                    <thead className="[&_tr]:border-b">
                      <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Usuario</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Rol</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">País</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                          Fecha Registro
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                          Última Actualización
                        </th>
                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                      {filteredUsers.map((user) => (
                        <tr
                          key={user.id}
                          className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                        >
                          <td className="p-4 align-middle">
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarFallback>
                                  {user.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{user.name}</div>
                                <div className="text-xs text-muted-foreground">{user.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 align-middle">
                            <Badge
                              variant="outline"
                              className={`${
                                user.role === "student"
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                                  : user.role === "professor"
                                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                    : "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
                              }`}
                            >
                              {user.role === "student"
                                ? "Estudiante"
                                : user.role === "professor"
                                  ? "Profesor"
                                  : "Admin"}
                            </Badge>
                          </td>
                          <td className="p-4 align-middle">{user.country || "Sin país"}</td>
                          <td className="p-4 align-middle">{new Date(user.created_at).toLocaleDateString()}</td>
                          <td className="p-4 align-middle">{new Date(user.updated_at).toLocaleDateString()}</td>
                          <td className="p-4 align-middle text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <ChevronDown className="h-4 w-4" />
                                  <span className="sr-only">Abrir menú</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditClick(user)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  <span>Editar</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDeleteUser(user.id)}
                                >
                                  <Trash className="mr-2 h-4 w-4" />
                                  <span>Eliminar</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Dialog
              open={isEditDialogOpen}
              onOpenChange={(open) => {
                setIsEditDialogOpen(open)
                if (!open) setFormError(null)
              }}
            >
              <DialogContent className="max-h-[80vh] overflow-y-auto" ref={editDialogRef}>
                <DialogHeader>
                  <DialogTitle>Editar usuario</DialogTitle>
                  <DialogDescription>Modifica la información del usuario</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleEditUser}>
                  {formError && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{formError}</AlertDescription>
                    </Alert>
                  )}
                  <Alert variant="default" className="mb-4 border-blue-500">
                    <Info className="h-4 w-4 text-blue-500" />
                    <AlertTitle>Requisitos de la contraseña</AlertTitle>
                    <AlertDescription>La contraseña debe tener al menos 8 caracteres (opcional para edición).</AlertDescription>
                  </Alert>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-name">Nombre completo</Label>
                      <Input
                        id="edit-name"
                        placeholder="Ej: Juan Pérez"
                        value={userFormData.name}
                        onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-email">Correo electrónico</Label>
                      <Input
                        id="edit-email"
                        type="email"
                        placeholder="usuario@ejemplo.com"
                        value={userFormData.email}
                        onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-password">Contraseña (opcional)</Label>
                      <Input
                        id="edit-password"
                        type="password"
                        value={userFormData.password}
                        onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-confirmPassword">Confirmar contraseña</Label>
                      <Input
                        id="edit-confirmPassword"
                        type="password"
                        value={userFormData.confirmPassword}
                        onChange={(e) => setUserFormData({ ...userFormData, confirmPassword: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-phone_number">Número de teléfono</Label>
                      <Input
                        id="edit-phone_number"
                        placeholder="Ej: +1234567890"
                        value={userFormData.phone_number}
                        onChange={(e) => setUserFormData({ ...userFormData, phone_number: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-document">Documento</Label>
                      <Input
                        id="edit-document"
                        placeholder="Ej: 1234567890"
                        value={userFormData.document}
                        onChange={(e) => setUserFormData({ ...userFormData, document: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-city">Ciudad</Label>
                      <Input
                        id="edit-city"
                        placeholder="Ej: Madrid"
                        value={userFormData.city}
                        onChange={(e) => setUserFormData({ ...userFormData, city: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-postal_code">Código postal</Label>
                      <Input
                        id="edit-postal_code"
                        placeholder="Ej: 28001"
                        value={userFormData.postal_code}
                        onChange={(e) => setUserFormData({ ...userFormData, postal_code: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-address">Dirección</Label>
                      <Input
                        id="edit-address"
                        placeholder="Ej: Calle Mayor 123"
                        value={userFormData.address}
                        onChange={(e) => setUserFormData({ ...userFormData, address: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-date_of_birth">Fecha de nacimiento</Label>
                      <Input
                        id="edit-date_of_birth"
                        type="date"
                        value={userFormData.date_of_birth}
                        onChange={(e) => setUserFormData({ ...userFormData, date_of_birth: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-country_id">País</Label>
                      <select
                        id="edit-country_id"
                        value={userFormData.country_id}
                        onChange={(e) => setUserFormData({ ...userFormData, country_id: e.target.value })}
                        className="w-full border rounded-md p-2"
                      >
                        <option value="">Selecciona un país</option>
                        {countries.map((country) => (
                          <option key={country.id} value={country.id}>
                            {country.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-role">Rol</Label>
                      <select
                        id="edit-role"
                        value={userFormData.role}
                        onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                        className="w-full border rounded-md p-2"
                      >
                        <option value="student">Estudiante</option>
                        <option value="professor">Profesor</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit">Guardar cambios</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </MainLayout>
  )
}