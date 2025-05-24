"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import api from "@/lib/api"
import MainLayout from "@/components/layout/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Book,
  Calendar,
  ChevronRight,
  Clock,
  FileText,
  Film,
  Search,
  Users,
  FileCode,
  FileImage,
  FileIcon as FilePdf,
  FileSpreadsheet,
  Home,
  BarChart,
} from "lucide-react"
import { AxiosError } from "axios"

// Interfaz para la respuesta de la API de curso
interface ApiCourse {
  id: string
  signature: string
  description: string
  semester: string
  enrollments_count: number
  status: string
  schedule: string
  location: string
  avg_grade: number
  completion_rate: number
  progress: number
}

// Interfaz para curso en el estado
interface Course {
  id: string
  title: string
  description: string
  semester: string
  students: number
  status: string
  progress: number
  schedule: string
  location: string
  avgGrade: number
  completionRate: number
}

// Interfaz para la respuesta de la API de matrículas
interface ApiEnrollment {
  id: string
  student_name: string
  student_email: string
  final_grade?: number
  course_id: string
  semester?: { is_active: boolean }
}

// Interfaz para estudiante
interface Student {
  id: string
  name: string
  email: string
  currentGrade: number
  isActive: boolean
}

// Interfaz para la respuesta de la API de contenidos
interface ApiContent {
  id: string
  name: string
  description: string
  type: string
  format: string
  created_at: string
  size: string
  views: number
  downloads: number
  duration?: string
  file_path?: string
  course_id: string
}

// Interfaz para material
interface Material {
  id: string
  name: string
  description: string
  type: string
  format: string
  date: string
  size: string
  views: number
  downloads: number
  duration?: string
  filePath?: string
}

// Interfaz para la respuesta de la API de tareas
interface ApiAssignment {
  id: string
  title: string
  description: string
  due_date: string
  submissions: number
  total_students: number
  course_id: string
}

// Interfaz para tarea
interface Assignment {
  id: string
  title: string
  description: string
  dueDate: string
  submissions: number
  totalStudents: number
}

interface ApiErrorResponse {
  message?: string
  data?: string
  errors?: { [key: string]: string[] }
}

export default function CourseDetailPage() {
  const router = useRouter()
  const { id } = useParams()
  const [token, setToken] = useState<string | null>(
    typeof window !== "undefined" ? localStorage.getItem("token") : null
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<{ name: string; email: string; profilePhotoUrl: string | null }>({
    name: "Cargando...",
    email: "cargando@mentora.edu",
    profilePhotoUrl: null,
  })
  const [course, setCourse] = useState<Course | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [searchTerm, setSearchTerm] = useState("")

  // Verificar autenticación y fetch de datos
  useEffect(() => {
    if (!token) {
      setError("No estás autenticado. Redirigiendo al login...")
      setTimeout(() => router.push("/login"), 1000)
      return
    }

    const fetchData = async () => {
      try {
        setLoading(true)
        console.log("Verificando usuario...")
        const userResponse = await api.get("/user", { timeout: 10000 })
        const { role, name, email, profile_photo_url } = userResponse.data.data || {}
        console.log("Usuario verificado:", { role, name, email, profile_photo_url })
        if (role !== "professor") {
          throw new Error("Acceso denegado. No eres profesor.")
        }
        setUser({ name: name || "Profesor", email: email || "profesor@mentora.edu", profilePhotoUrl: profile_photo_url })

        console.log("Iniciando fetch de datos para curso:", id)
        const [courseRes, enrollmentsRes, contentsRes, assignmentsRes] = await Promise.all([
          api.get(`/courses/${id}`, { timeout: 10000 }),
          api.get(`/enrollments?course_id=${id}`, { timeout: 10000 }),
          api.get(`/contents?course_id=${id}`, { timeout: 10000 }),
          api.get(`/assignments?course_id=${id}`, { timeout: 10000 }),
        ])
        console.log("Respuesta de /courses:", courseRes.data)
        console.log("Respuesta de /enrollments:", enrollmentsRes.data)
        console.log("Respuesta de /contents:", contentsRes.data)
        console.log("Respuesta de /assignments:", assignmentsRes.data)

        const courseData = courseRes.data.data || {}
        setCourse({
          id: courseData.id || id,
          title: courseData.signature || "Curso desconocido",
          description: courseData.description || "Sin descripción",
          semester: courseData.semester || "Desconocido",
          students: courseData.enrollments_count || 0,
          status: courseData.status || "unknown",
          progress: courseData.progress || 0,
          schedule: courseData.schedule || "Sin horario",
          location: courseData.location || "Sin ubicación",
          avgGrade: courseData.avg_grade || 0,
          completionRate: courseData.completion_rate || 0,
        })

        setStudents(
          enrollmentsRes.data.data.map((e: ApiEnrollment) => ({
            id: e.id,
            name: e.student_name || "Estudiante desconocido",
            email: e.student_email || "email@desconocido.edu",
            currentGrade: e.final_grade || 0,
            isActive: e.semester?.is_active || false,
          })) || []
        )

        setMaterials(
          contentsRes.data.data.map((m: ApiContent) => ({
            id: m.id,
            name: m.name || "Material desconocido",
            description: m.description || "Sin descripción",
            type: m.type || "document",
            format: m.format || "pdf",
            date: m.created_at || new Date().toISOString(),
            size: m.size || "0 MB",
            views: m.views || 0,
            downloads: m.downloads || 0,
            duration: m.duration,
            filePath: m.file_path,
          })) || []
        )

        setAssignments(
          assignmentsRes.data.data.map((a: ApiAssignment) => ({
            id: a.id,
            title: a.title || "Tarea desconocida",
            description: a.description || "Sin descripción",
            dueDate: a.due_date || new Date().toISOString(),
            submissions: a.submissions || 0,
            totalStudents: a.total_students || 0,
          })) || []
        )

        setError(null)
      } catch (err: unknown) {
        const error = err as AxiosError<ApiErrorResponse>
        console.error("Error:", error.message, error.response?.data)
        setError(error.response?.data?.message || "Error al cargar los datos.")
      } finally {
        setLoading(false)
        console.log("Fetch completado, loading:", false)
      }
    }

    fetchData()
  }, [token, router, id])

  // Filtrar estudiantes según el término de búsqueda
  const filteredStudents = students.filter(
    (student) =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Calcular distribución de notas para estadísticas detalladas
  const gradeDistribution = {
    excellent: students.filter((s) => s.currentGrade >= 9).length,
    good: students.filter((s) => s.currentGrade >= 7 && s.currentGrade < 9).length,
    below: students.filter((s) => s.currentGrade < 7).length,
  }

  // Calcular total de entregas
  const totalSubmissions = assignments.reduce((sum, a) => sum + a.submissions, 0)
  const totalPossibleSubmissions = assignments.reduce((sum, a) => sum + a.totalStudents, 0)

  // Función para obtener el icono según el tipo de material
  const getFileIcon = (type: string, format: string) => {
    switch (type) {
      case "document":
        return format === "pdf" ? (
          <FilePdf className="h-10 w-10 text-red-500" />
        ) : (
          <FileText className="h-10 w-10 text-blue-500" />
        )
      case "presentation":
        return <FileImage className="h-10 w-10 text-orange-500" />
      case "video":
        return <Film className="h-10 w-10 text-purple-500" />
      case "code":
        return <FileCode className="h-10 w-10 text-green-500" />
      case "spreadsheet":
        return <FileSpreadsheet className="h-10 w-10 text-green-500" />
      default:
        return <FileText className="h-10 w-10 text-gray-500" />
    }
  }

  if (loading) {
    return (
      <MainLayout userRole="professor" userName={user.name} userEmail={user.email} profilePhotoUrl={user.profilePhotoUrl}>
        <div className="flex flex-col items-center justify-center h-[50vh]">
          <p className="text-xl">Cargando...</p>
        </div>
      </MainLayout>
    )
  }

  if (error) {
    return (
      <MainLayout userRole="professor" userName={user.name} userEmail={user.email} profilePhotoUrl={user.profilePhotoUrl}>
        <div className="flex flex-col items-center justify-center h-[50vh]">
          <h1 className="text-2xl font-bold">{error}</h1>
          <p className="text-muted-foreground mt-2">Ocurrió un problema al cargar los datos.</p>
          <Button asChild className="mt-4">
            <Link href="/professor">Volver al Dashboard</Link>
          </Button>
        </div>
      </MainLayout>
    )
  }

  if (!course) {
    return (
      <MainLayout userRole="professor" userName={user.name} userEmail={user.email} profilePhotoUrl={user.profilePhotoUrl}>
        <div className="flex flex-col items-center justify-center h-[50vh]">
          <h1 className="text-2xl font-bold">Curso no encontrado</h1>
          <p className="text-muted-foreground mt-2">No se pudo cargar el curso.</p>
          <Button asChild className="mt-4">
            <Link href="/professor">Volver al Dashboard</Link>
          </Button>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout userRole="professor" userName={user.name} userEmail={user.email} profilePhotoUrl={user.profilePhotoUrl}>
      <div className="flex flex-col gap-6 p-3 xs:p-4 w-full min-w-full max-w-full">
        {/* Breadcrumbs */}
        <nav className="flex items-center text-sm text-muted-foreground">
          <Link href="/professor" className="hover:text-foreground transition-colors">
            <Home className="h-4 w-4" />
            <span className="sr-only">Inicio</span>
          </Link>
          <ChevronRight className="h-4 w-4 mx-1" />
          <Link href="/professor" className="hover:text-foreground transition-colors">
            Dashboard
          </Link>
          <ChevronRight className="h-4 w-4 mx-1" />
          <span className="font-medium text-foreground">{course.title}</span>
        </nav>

        {/* Encabezado del curso */}
        <div className="flex flex-col xs:flex-row gap-6">
          <div className="xs:w-2/3">
            <h1 className="text-2xl xs:text-3xl font-bold tracking-tight">{course.title}</h1>
            <p className="text-muted-foreground mt-1 text-sm xs:text-base">{course.description}</p>
            <div className="flex flex-wrap gap-4 mt-4">
              <div className="flex items-center gap-1 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Semestre: {course.semester}</span>
              </div>
              <div className="flex items-center gap-1 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{course.students} estudiantes</span>
              </div>
              <div className="flex items-center gap-1 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{course.schedule}</span>
              </div>
              <div className="flex items-center gap-1 text-sm">
                <Book className="h-4 w-4 text-muted-foreground" />
                <span>{course.location}</span>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Progreso del curso</span>
                <span className="font-medium">{course.progress}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-800">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${course.progress}%` }}
                />
              </div>
            </div>
          </div>
          <div className="xs:w-1/3 flex flex-col gap-4">
            <Card className="w-full max-w-full">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm xs:text-base font-medium">Estadísticas del Curso</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Nota media</span>
                  <span className="font-medium">{course.avgGrade.toFixed(1)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Tasa de finalización</span>
                  <span className="font-medium">{course.completionRate}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Materiales</span>
                  <span className="font-medium">{materials.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Tareas</span>
                  <span className="font-medium">{assignments.length}</span>
                </div>
              </CardContent>
              <CardFooter className="p-4 pt-0">
                <Button variant="outline" className="w-full gap-2 text-sm xs:text-base">
                  <BarChart className="h-4 w-4" />
                  Ver estadísticas completas
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>

        {/* Pestañas del curso */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="flex flex-wrap gap-2">
            <TabsTrigger value="overview" className="flex-1 xs:flex-none">Resumen</TabsTrigger>
            <TabsTrigger value="materials" className="flex-1 xs:flex-none">Materiales</TabsTrigger>
            <TabsTrigger value="assignments" className="flex-1 xs:flex-none">Tareas</TabsTrigger>
            <TabsTrigger value="students" className="flex-1 xs:flex-none">Estudiantes</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-6 xs:grid-cols-2">
              <Card className="w-full max-w-full">
                <CardHeader>
                  <CardTitle className="text-lg xs:text-xl">Estadísticas Detalladas</CardTitle>
                  <CardDescription className="text-sm xs:text-base">Resumen del rendimiento del curso</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-sm xs:text-base">Distribución de notas</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Excelente (≥9)</span>
                        <span>{gradeDistribution.excellent} estudiantes</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Bueno (≥7, &lt;9)</span>
                        <span>{gradeDistribution.good} estudiantes</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Por debajo (&lt;7)</span>
                        <span>{gradeDistribution.below} estudiantes</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-sm xs:text-base">Entregas de tareas</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Completadas</span>
                      <span>{totalSubmissions}/{totalPossibleSubmissions}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-800">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{
                          width: `${
                            totalPossibleSubmissions > 0 ? (totalSubmissions / totalPossibleSubmissions) * 100 : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="w-full max-w-full">
                <CardHeader>
                  <CardTitle className="text-lg xs:text-xl">Próximas Tareas</CardTitle>
                  <CardDescription className="text-sm xs:text-base">Tareas pendientes por fecha límite</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {assignments
                    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                    .slice(0, 3)
                    .map((assignment) => (
                      <div key={assignment.id} className="flex items-start space-x-4">
                        <div className="min-w-[60px] rounded-md bg-primary/10 p-3 text-center">
                          <div className="text-sm font-medium text-primary">
                            {new Date(assignment.dueDate).toLocaleDateString("es-ES", { day: "2-digit" })}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(assignment.dueDate).toLocaleDateString("es-ES", { month: "short" })}
                          </div>
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium leading-none">{assignment.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">{assignment.description}</p>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              Entregas: {assignment.submissions}/{assignment.totalStudents}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                </CardContent>
                <CardFooter>
                  <Button variant="ghost" className="w-full text-sm xs:text-base" asChild>
                    <Link href="#assignments">Ver todas las tareas</Link>
                  </Button>
                </CardFooter>
              </Card>

              <Card className="w-full max-w-full">
                <CardHeader>
                  <CardTitle className="text-lg xs:text-xl">Estudiantes Destacados</CardTitle>
                  <CardDescription className="text-sm xs:text-base">Mejores calificaciones del curso</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {students
                    .sort((a, b) => b.currentGrade - a.currentGrade)
                    .slice(0, 3)
                    .map((student) => (
                      <div key={student.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>
                              {student.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{student.name}</p>
                            <p className="text-xs text-muted-foreground">{student.email}</p>
                          </div>
                        </div>
                        <Badge
                          className={`text-xs xs:text-sm ${
                            student.currentGrade >= 9
                              ? "bg-green-100 text-green-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {student.currentGrade.toFixed(1)}
                        </Badge>
                      </div>
                    ))}
                </CardContent>
                <CardFooter>
                  <Button variant="ghost" className="w-full text-sm xs:text-base" asChild>
                    <Link href="#students">Ver todos los estudiantes</Link>
                  </Button>
                </CardFooter>
              </Card>

              <Card className="w-full max-w-full">
                <CardHeader>
                  <CardTitle className="text-lg xs:text-xl">Materiales Recientes</CardTitle>
                  <CardDescription className="text-sm xs:text-base">Últimos materiales publicados</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {materials
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 3)
                    .map((material) => (
                      <div key={material.id} className="flex items-center gap-3">
                        <div className="flex items-center justify-center h-10 w-10">
                          {getFileIcon(material.type, material.format)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{material.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(material.date).toLocaleDateString()} • {material.size}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs xs:text-sm">{material.views} vistas</Badge>
                      </div>
                    ))}
                </CardContent>
                <CardFooter>
                  <Button variant="ghost" className="w-full text-sm xs:text-base" asChild>
                    <Link href="#materials">Ver todos los materiales</Link>
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="materials" className="space-y-4" id="materials">
            <h2 className="text-lg xs:text-xl font-semibold">Materiales del Curso</h2>
            <div className="grid gap-6 xs:grid-cols-2">
              {materials.map((material) => (
                <Card key={material.id} className="flex overflow-hidden w-full max-w-full">
                  <div className="flex items-center justify-center p-6 bg-muted/30">
                    {getFileIcon(material.type, material.format)}
                  </div>
                  <div className="flex-1">
                    <CardHeader className="p-3 xs:p-4 pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-base xs:text-lg">{material.name}</CardTitle>
                          <CardDescription className="line-clamp-1 text-sm">{material.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 xs:p-4 pt-0 space-y-2">
                      <div className="flex items-center text-sm">
                        <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span>{new Date(material.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span>Tamaño: {material.size}</span>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Vistas: {material.views}</span>
                        <span>Descargas: {material.downloads}</span>
                      </div>
                      <div className="pt-2">
                        <Button
                          className="w-full text-sm xs:text-base"
                          disabled={!material.filePath}
                          onClick={() => material.filePath && window.open(material.filePath, "_blank")}
                        >
                          Ver material
                        </Button>
                      </div>
                    </CardContent>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="assignments" className="space-y-4" id="assignments">
            <h2 className="text-lg xs:text-xl font-semibold">Tareas del Curso</h2>
            <div className="grid gap-6 xs:grid-cols-2">
              {assignments.map((assignment) => (
                <Card key={assignment.id} className="w-full max-w-full">
                  <CardHeader className="p-3 xs:p-4 pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-base xs:text-lg">{assignment.title}</CardTitle>
                    </div>
                    <CardDescription className="text-sm">{assignment.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 xs:p-4 pt-0 space-y-3">
                    <div className="flex items-center text-sm">
                      <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        Fecha límite: {new Date(assignment.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Entregas</span>
                        <span className="font-medium">
                          {assignment.submissions} de {assignment.totalStudents}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-800">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${(assignment.submissions / assignment.totalStudents) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="pt-2">
                      <Button className="w-full text-sm xs:text-base">Ver entregas</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="students" className="space-y-4" id="students">
            <div className="flex flex-col gap-4 xs:flex-row xs:items-center xs:justify-between">
              <h2 className="text-lg xs:text-xl font-semibold">Estudiantes Matriculados</h2>
              <div className="flex flex-col gap-2 w-full xs:w-64">
                <label htmlFor="student-search" className="block text-sm font-medium text-muted-foreground">
                  Buscar estudiante
                </label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-3.5 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="student-search"
                    placeholder="Buscar estudiante..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full min-h-14 text-base bg-white dark:bg-gray-800 border border-input rounded-md"
                  />
                </div>
              </div>
            </div>
            <Card className="w-full max-w-full">
              <CardContent className="p-0">
                <div className="overflow-x-auto w-full">
                  <table className="w-full min-w-full caption-bottom text-sm">
                    <thead className="[&_tr]:border-b">
                      <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                        <th className="h-12 px-3 xs:px-4 text-left align-middle font-medium text-muted-foreground">
                          Estudiante
                        </th>
                        <th className="h-12 px-3 xs:px-4 text-left align-middle font-medium text-muted-foreground">
                          Nota Actual
                        </th>
                        <th className="h-12 px-3 xs:px-4 text-left align-middle font-medium text-muted-foreground">
                          Estado
                        </th>
                        <th className="h-12 px-3 xs:px-4 text-right align-middle font-medium text-muted-foreground">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                      {filteredStudents.map((student) => (
                        <tr
                          key={student.id}
                          className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                        >
                          <td className="p-3 xs:p-4 align-middle">
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarFallback>
                                  {student.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium text-sm xs:text-base">{student.name}</div>
                                <div className="text-xs text-muted-foreground">{student.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 xs:p-4 align-middle">
                            <span
                              className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs xs:text-sm font-semibold ${
                                student.currentGrade >= 9
                                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                  : student.currentGrade >= 7
                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                                    : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                              }`}
                            >
                              {student.currentGrade.toFixed(1)}
                            </span>
                          </td>
                          <td className="p-3 xs:p-4 align-middle">
                            <Badge
                              variant="outline"
                              className={`text-xs xs:text-sm ${
                                student.isActive
                                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                  : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                              }`}
                            >
                              {student.isActive ? "Activo" : "Inactivo"}
                            </Badge>
                          </td>
                          <td className="p-3 xs:p-4 align-middle text-right">
                            <Button variant="outline" size="sm" className="text-xs xs:text-sm">
                              Ver perfil
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  )
}