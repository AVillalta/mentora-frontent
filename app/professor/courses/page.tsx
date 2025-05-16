"use client"

import { useState, useEffect } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ChevronDown, Edit, Plus, Trash, Users } from "lucide-react"
import { useRouter } from "next/navigation"

// Interfaz para cursos
interface Course {
  id: number
  signature: string
  description: string
  semester: string
  enrollments_count: number
  status: string
}

export default function TeacherCoursesPage() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(
    typeof window !== "undefined" ? localStorage.getItem("token") : null
  )
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userName, setUserName] = useState("Cargando...")
  const [userEmail, setUserEmail] = useState("cargando@mentora.edu")
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)

  // Formulario para crear/editar curso
  const [formData, setFormData] = useState({
    signature: "",
    description: "",
    semester: "2025-1",
  })

  // Verificar autenticación
  useEffect(() => {
    if (!token) {
      console.log("No token found, redirecting to login")
      setAuthError("No estás autenticado. Redirigiendo al login...")
      router.push("/login")
    } else {
      console.log("Token encontrado, verificando usuario...")
      api.get("/user")
        .then((response) => {
          console.log("User response:", response.data)
          const role = response.data.data.role
          const name = response.data.data.name || "Usuario Desconocido"
          const email = response.data.data.email || "sin@correo.com"
          console.log("Rol obtenido:", role, "Nombre:", name, "Email:", email)
          if (role !== "professor") {
            console.log("Acceso denegado: rol no es professor, role =", role)
            setAuthError("Acceso denegado. Redirigiendo al login...")
            localStorage.removeItem("token")
            router.push("/login")
          } else {
            console.log("Autenticación exitosa, cargando página de cursos")
            setUserName(name)
            setUserEmail(email)
            setLoadingAuth(false)
          }
        })
        .catch((err) => {
          console.error("Token verification error:", err)
          setAuthError("Token inválido. Redirigiendo al login...")
          localStorage.removeItem("token")
          router.push("/login")
        })
    }
  }, [token, router])

  // Cargar cursos
  useEffect(() => {
    const fetchCourses = async () => {
      if (loadingAuth || authError) return

      try {
        setLoading(true)
        const response = await api.get("/courses")
        console.log("Courses response:", response.data)
        setCourses(response.data.data || [])
      } catch (err: unknown) {
        setError("Error al cargar los cursos. Inténtalo de nuevo.")
        console.error("Fetch error:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchCourses()
  }, [loadingAuth, authError])

  // Crear curso
  const handleCreateCourse = async () => {
    try {
      await api.post("/courses", formData)
      setIsCreateDialogOpen(false)
      setFormData({
        signature: "",
        description: "",
        semester: "2025-1",
      })
      // Recargar cursos
      const response = await api.get("/courses")
      setCourses(response.data.data || [])
    } catch (err: unknown) {
      console.error("Error creating course:", err)
      setError("Error al crear el curso. Inténtalo de nuevo.")
    }
  }

  // Editar curso
  const handleEditCourse = async () => {
    if (!selectedCourse) return
    try {
      await api.put(`/courses/${selectedCourse.id}`, formData)
      setIsEditDialogOpen(false)
      // Recargar cursos
      const response = await api.get("/courses")
      setCourses(response.data.data || [])
    } catch (err: unknown) {
      console.error("Error editing course:", err)
      setError("Error al editar el curso. Inténtalo de nuevo.")
    }
  }

  const handleEditClick = (course: Course) => {
    setSelectedCourse(course)
    setFormData({
      signature: course.signature,
      description: course.description,
      semester: course.semester,
    })
    setIsEditDialogOpen(true)
  }

  // Filtrar cursos
  const filteredCourses = courses.filter(
    (course) =>
      course.signature.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loadingAuth) {
    return <div>Verificando autenticación...</div>
  }

  if (authError) {
    return <div className="text-red-500">{authError}</div>
  }

  if (loading) {
    return <div>Cargando...</div>
  }

  if (error) {
    return <div className="text-red-500">{error}</div>
  }

  return (
    <MainLayout userRole="professor" userName={userName} userEmail={userEmail}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Mis Cursos</h1>
            <p className="text-muted-foreground">Gestiona los cursos que impartes</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Crear Curso
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear nuevo curso</DialogTitle>
                <DialogDescription>Completa la información para crear un nuevo curso</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Título</Label>
                  <Input
                    id="title"
                    value={formData.signature}
                    onChange={(e) => setFormData({ ...formData, signature: e.target.value })}
                    placeholder="Ej: Programación Web"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Breve descripción del curso"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="semester">Semestre</Label>
                  <select
                    id="semester"
                    value={formData.semester}
                    onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                    className="w-full h-10 px-3 py-2 text-sm border rounded-md bg-transparent focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="2025-1">2025-1</option>
                    <option value="2025-2">2025-2</option>
                    <option value="2026-1">2026-1</option>
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateCourse}>Crear curso</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Cursos</CardTitle>
            <CardDescription>Visualiza y gestiona tus cursos actuales</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1">
                <Input
                  placeholder="Buscar por título o descripción..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>

            <div className="rounded-md border">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Título</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Descripción</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Semestre</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Estudiantes</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Estado</th>
                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {filteredCourses.map((course) => (
                    <tr
                      key={course.id}
                      className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                    >
                      <td className="p-4 align-middle font-medium">{course.signature}</td>
                      <td className="p-4 align-middle">{course.description}</td>
                      <td className="p-4 align-middle">{course.semester}</td>
                      <td className="p-4 align-middle">{course.enrollments_count}</td>
                      <td className="p-4 align-middle">
                        <span className="inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                          Activo
                        </span>
                      </td>
                      <td className="p-4 align-middle text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="icon" onClick={() => handleEditClick(course)}>
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Editar</span>
                          </Button>
                          <Button variant="outline" size="icon">
                            <Users className="h-4 w-4" />
                            <span className="sr-only">Estudiantes</span>
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <ChevronDown className="h-4 w-4" />
                                <span className="sr-only">Más opciones</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditClick(course)}>
                                <Edit className="mr-2 h-4 w-4" />
                                <span>Editar</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Users className="mr-2 h-4 w-4" />
                                <span>Ver estudiantes</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
                                <Trash className="mr-2 h-4 w-4" />
                                <span>Eliminar</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar curso</DialogTitle>
              <DialogDescription>Modifica la información del curso</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-title">Título</Label>
                <Input
                  id="edit-title"
                  value={formData.signature}
                  onChange={(e) => setFormData({ ...formData, signature: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-description">Descripción</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-semester">Semestre</Label>
                <select
                  id="edit-semester"
                  value={formData.semester}
                  onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                  className="w-full h-10 px-3 py-2 text-sm border rounded-md bg-transparent focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="2025-1">2025-1</option>
                  <option value="2025-2">2025-2</option>
                  <option value="2026-1">2026-1</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleEditCourse}>Guardar cambios</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  )
}