"use client"

import { useState, useEffect, ChangeEvent } from "react"
import { useParams, useRouter } from "next/navigation"
import MainLayout from "@/components/layout/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Book,
  Calendar,
  ChevronLeft,
  Clock,
  Download,
  FileText,
  Film,
  Link as LinkIcon,
  Users,
  FileCode,
  FileImage,
  File as FilePdf,
  FileSpreadsheet,
  Upload,
} from "lucide-react"
import Link from "next/link"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import api from "@/lib/api"
import { AxiosError } from "axios"

// Componente personalizado para la barra de progreso
const CustomProgress = ({ value, className }: { value: number; className?: string }) => {
  return (
    <div className={`w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden ${className}`}>
      <div
        className="h-full bg-blue-500 dark:bg-blue-400 transition-all duration-300"
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </div>
  )
}

// Interfaces basadas en CourseResource.php, GradeResource.php, Content, y Assignment
interface Course {
  id: string
  code: string
  schedule: string | string[]
  weighting: string
  signature: string
  semester: string
  professor: string
  enrollments_count: number
  status: string
}

interface Grade {
  id: string
  grade_type: string
  grade_value: number | null
  grade_date: string
  enrollment_id: string
  course_name: string
}

interface Content {
  id: number
  name: string
  description: string
  bibliography: string | null
  order: number
  course_id: string
  grade_id: number
  created_at: string
  updated_at: string
  file_path?: string
}

interface Assignment {
  id: number
  title: string
  description: string
  due_date: string
  course_id: string
  created_at: string
  updated_at: string
  status?: string
  points?: number
  submissionType?: string
  grade?: number
  submissions_files?: { id: string; file_name: string; url: string; size: number; student_id: string; created_at: string }[]
}

// Interfaz para el objeto courseData
interface CourseData extends Course {
  title: string
  description: string
  professorEmail: string
  location: string
  startDate: string
  endDate: string
  progress: number
  students: number
  announcements: { id: number; title: string; content: string; date: string }[]
  modules: { id: number; title: string; materials: CourseMaterial[] }[]
  assignments: Assignment[]
  grades: CourseGrade[]
  gradient: string
}

// Interfaz para materiales
interface CourseMaterial {
  id: number
  title: string
  description: string
  type: string
  format: string
  date: string
  size: string
  isNew: boolean
  duration?: string
  file_path?: string
}

// Interfaz para calificaciones transformadas
interface CourseGrade {
  id: string
  title: string
  type: string
  grade: number
  maxGrade: number
  date: string
}

interface ApiErrorResponse {
  message?: string
  data?: string
  errors?: { [key: string]: string[] }
}

interface ApiResponse<T> {
  data: T | null
  error?: AxiosError<ApiErrorResponse>
}

interface CourseResponse {
  data: Course
}
interface GradesResponse {
  data: Grade[]
}
interface ContentsResponse {
  data: Content[]
}
interface AssignmentsResponse {
  data: Assignment[]
}

export default function CourseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.id as string
  const [activeTab, setActiveTab] = useState("overview")
  const [course, setCourse] = useState<Course | null>(null)
  const [grades, setGrades] = useState<Grade[]>([])
  const [contents, setContents] = useState<Content[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userName, setUserName] = useState("Cargando...")
  const [userEmail, setUserEmail] = useState("cargando@mentora.edu")
  const [userId, setUserId] = useState<string | null>(null)
  const [openDialogs, setOpenDialogs] = useState<{ [key: number]: boolean }>({})
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [submissionFile, setSubmissionFile] = useState<File | null>(null)

  // Verificar autenticación y cargar datos
  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      setError("No estás autenticado. Por favor, inicia sesión nuevamente.")
      setTimeout(() => router.push("/login"), 2000)
      return
    }

    const verifyUser = async () => {
      try {
        const response = await api.get("/user")
        const { role, name, email, id } = response.data.data
        if (role !== "student") {
          setError("Acceso denegado. No tienes permisos de estudiante. Contacta al administrador.")
          localStorage.removeItem("token")
          setTimeout(() => router.push("/login"), 2000)
          return
        }
        setUserName(name || "Usuario Desconocido")
        setUserEmail(email || "sin@correo.com")
        setUserId(id)
      } catch (err) {
        setError("Token inválido. Por favor, inicia sesión nuevamente.")
        localStorage.removeItem("token")
        setTimeout(() => router.push("/login"), 2000)
      }
    }

    const fetchData = async () => {
      try {
        setLoading(true)
        const [
          courseRes,
          gradesRes,
          contentsRes,
          assignmentsRes
        ]: [
          ApiResponse<CourseResponse>,
          ApiResponse<GradesResponse>,
          ApiResponse<ContentsResponse>,
          ApiResponse<AssignmentsResponse>
        ] = await Promise.all([
          api.get(`/courses/${courseId}`).catch(err => ({ data: null, error: err })),
          api.get(`/courses/${courseId}/grades`).catch(err => ({ data: null, error: err })),
          api.get(`/courses/${courseId}/contents`).catch(err => ({ data: null, error: err })),
          api.get(`/courses/${courseId}/assignments`).catch(err => ({ data: null, error: err })),
        ])

        if (!courseRes.data) {
          throw new Error(courseRes.error?.response?.data?.message || "Error al cargar el curso.")
        }

        setCourse(courseRes.data.data)

        const validGrades = gradesRes.data
          ? gradesRes.data.data
              .map((grade: Grade) => ({
                ...grade,
                grade_value: grade.grade_value != null && typeof grade.grade_value === 'string' 
                  ? parseFloat(grade.grade_value) 
                  : grade.grade_value,
              }))
              .filter((grade: Grade) => grade.grade_value != null && typeof grade.grade_value === 'number')
          : []
        setGrades(validGrades || [])

        setContents(contentsRes.data ? contentsRes.data.data || [] : [])
        setAssignments(assignmentsRes.data ? assignmentsRes.data.data || [] : [])

        if (gradesRes.error || contentsRes.error || assignmentsRes.error) {
          setError("Algunos datos del curso no están disponibles. Verifica la configuración del curso.")
        }
      } catch (err: unknown) {
        const error = err as AxiosError<ApiErrorResponse>
        const message = error.response?.status === 403
          ? "No tienes permiso para acceder a este curso. Asegúrate de estar matriculado o contacta al administrador."
          : error.response?.status === 404
            ? "El curso no existe o no está disponible. Verifica el ID del curso."
            : error.response?.data?.message || error.message || "Error al cargar los datos del curso."
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    verifyUser()
    fetchData()
  }, [courseId, router])

  // Funciones para manejar tareas
  const handleViewDetails = (assignment: Assignment) => {
    setSelectedAssignment(assignment)
    setSubmissionFile(null)
    setOpenDialogs((prev) => ({ ...prev, [assignment.id]: true }))
  }

  const handleSubmitAssignment = async () => {
    if (!selectedAssignment || !submissionFile) return

    try {
      const formData = new FormData()
      formData.append("file", submissionFile)

      await api.post(`/assignments/${selectedAssignment.id}/submit`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })

      setOpenDialogs((prev) => ({ ...prev, [selectedAssignment.id]: false }))
      setSubmissionFile(null)
      alert("Entrega enviada con éxito")

      const response = await api.get(`/courses/${courseId}/assignments`)
      setAssignments(response.data.data || [])
    } catch (err: unknown) {
      const error = err as AxiosError<ApiErrorResponse>
      setError(error.response?.data?.message || "Error al enviar la entrega. Inténtalo de nuevo.")
    }
  }

  const hasSubmitted = (assignment: Assignment) => {
    return Array.isArray(assignment.submissions_files) && assignment.submissions_files.some(
      (submission) => submission.student_id === userId
    )
  }

  const isPastDue = (dueDate: string) => {
    return new Date(dueDate) < new Date()
  }

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

  // Calcular la nota actual del curso
  const calculateCurrentGrade = (courseGrades: CourseGrade[]) => {
    if (courseGrades.length === 0) return "N/A"
    const totalPoints = courseGrades.reduce((sum, grade) => sum + (grade.grade || 0), 0)
    const maxPoints = courseGrades.reduce((sum, grade) => sum + grade.maxGrade, 0)
    return maxPoints === 0 ? "N/A" : ((totalPoints / maxPoints) * 10).toFixed(1)
  }

  // Simular datos faltantes y estructurar módulos, anuncios, tareas
  const courseData: CourseData | null = course
    ? {
        ...course,
        title: course.signature,
        description: `Curso de ${course.signature}. Aprende los fundamentos y técnicas avanzadas en este campo.`,
        professorEmail: `${course.professor?.toLowerCase().replace(/\s/g, '.')}@mentora.edu`,
        location: "Aula TBD, Edificio de Informática",
        startDate: "2025-01-15",
        endDate: "2025-06-30",
        progress: grades.length > 0
          ? (grades.reduce((sum, g) => sum + (g.grade_value || 0), 0) / (grades.length * 10)) * 100
          : 0,
        students: course.enrollments_count,
        announcements: contents
          .filter(c => new Date(c.created_at) > new Date(new Date().setDate(new Date().getDate() - 7)))
          .map(c => ({
            id: c.id,
            title: c.name,
            content: c.description || "Anuncio relacionado con el curso.",
            date: c.created_at,
          })),
        modules: [
          {
            id: 1,
            title: "Módulo 1: Introducción",
            materials: contents.map(c => ({
              id: c.id,
              title: c.name,
              description: c.description || "Material del curso",
              type: c.bibliography && typeof c.bibliography === 'string' && c.bibliography.includes('.pdf') ? "document" 
                   : c.bibliography && typeof c.bibliography === 'string' && c.bibliography.includes('.mp4') ? "video" 
                   : "document",
              format: c.bibliography && typeof c.bibliography === 'string' && c.bibliography.includes('.pdf') ? "pdf" 
                    : c.bibliography && typeof c.bibliography === 'string' && c.bibliography.includes('.mp4') ? "mp4" 
                    : "pdf",
              date: c.created_at,
              size: "N/A",
              isNew: new Date(c.created_at) > new Date(new Date().setDate(new Date().getDate() - 7)),
              duration: c.bibliography && typeof c.bibliography === 'string' && c.bibliography.includes('.mp4') ? "N/A" : undefined,
              file_path: c.file_path,
            })),
          },
        ],
        assignments: assignments.map(a => ({
          id: a.id,
          title: a.title,
          description: a.description || "Tarea del curso",
          due_date: new Date(a.due_date).toISOString(),
          course_id: a.course_id,
          created_at: a.created_at,
          updated_at: a.updated_at,
          status: !hasSubmitted(a) && new Date(a.due_date) > new Date() ? "pending" : "completed",
          points: a.points || 100,
          submissionType: "archivo",
          grade: new Date(a.due_date) > new Date() ? undefined : Math.round(Math.random() * 100),
          submissions_files: a.submissions_files || [],
        })),
        grades: grades.map(g => ({
          id: g.id,
          title: g.grade_type,
          type: g.grade_type,
          grade: g.grade_value || 0,
          maxGrade: 10,
          date: g.grade_date,
        })),
        gradient: ['from-blue-500 to-blue-700', 'from-green-500 to-green-700', 'from-purple-500 to-purple-700', 'from-red-500 to-red-700', 'from-indigo-500 to-indigo-700'][parseInt(course.id.replace(/-/g, '').slice(0, 8), 16) % 5],
      }
    : null

  // Depuración temporal
  console.log('Pending Assignments:', courseData?.assignments.filter((a) => !hasSubmitted(a) && new Date(a.due_date) >= new Date()));

  if (loading) {
    return (
      <MainLayout userRole="student" userName={userName} userEmail={userEmail}>
        <div className="flex flex-col items-center justify-center h-[50vh]">
          <h1 className="text-2xl font-bold">Cargando...</h1>
        </div>
      </MainLayout>
    )
  }

  if (error || !courseData) {
    return (
      <MainLayout userRole="student" userName={userName} userEmail={userEmail}>
        <div className="flex flex-col items-center justify-center h-[50vh]">
          <h1 className="text-2xl font-bold">Error al cargar el curso</h1>
          <p className="text-muted-foreground mt-2 text-center">{error}</p>
          <Button asChild className="mt-4">
            <Link href="/student">Volver al Dashboard</Link>
          </Button>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout userRole="student" userName={userName} userEmail={userEmail}>
      <div className="flex flex-col gap-8 container mx-auto px-4 py-6">
        {/* Encabezado del curso */}
        <Card className="mb-6 shadow-sm">
          <CardHeader>
            <CardTitle className="text-3xl font-bold">{courseData.title}</CardTitle>
            <CardDescription className="text-lg">{courseData.description}</CardDescription>
            <p className="text-sm text-muted-foreground">Profesor: {courseData.professor}</p>
          </CardHeader>
        </Card>

        {/* Breadcrumbs */}
        <Breadcrumb className="mb-4">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/student" className="text-sm text-muted-foreground hover:text-primary">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/student" className="text-sm text-muted-foreground hover:text-primary">Mis Cursos</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink className="text-sm font-medium">{courseData.title}</BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Botones de acción */}
        <div className="flex flex-col md:flex-row gap-6">
          <Button variant="outline" size="icon" asChild className="w-10 h-10 md:hidden mb-4">
            <Link href="/student">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>

          <div className="flex-1">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold tracking-tight">{courseData.title}</h1>
                  <Badge variant="outline" className="text-sm">{courseData.code}</Badge>
                </div>
                <p className="text-lg text-muted-foreground mt-2">{courseData.description}</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="gap-2 text-sm px-3 py-1">
                  <Calendar className="h-4 w-4" />
                  Calendario
                </Button>
                <Button className="gap-2 text-sm px-3 py-1">
                  <FileText className="h-4 w-4" />
                  Mis Notas
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Información del curso y pestañas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar con información del curso */}
          <Card className="lg:col-span-1 h-fit bg-muted/50 rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">Información del Curso</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-sm font-medium">Profesor</h3>
                <div className="flex items-center gap-3 mt-2">
                  <Avatar>
                    <AvatarFallback>
                      {courseData.professor
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{courseData.professor}</p>
                    <p className="text-xs text-muted-foreground">{courseData.professorEmail}</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-medium">Horario</h3>
                <div className="flex items-center gap-2 mt-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{Array.isArray(courseData.schedule) ? courseData.schedule.join(', ') : courseData.schedule}</span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-sm">
                  <Book className="h-4 w-4 text-muted-foreground" />
                  <span>{courseData.location}</span>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-medium">Progreso del Curso</h3>
                <div className="space-y-2 mt-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Completado</span>
                    <span className="font-medium">{Math.round(courseData.progress)}%</span>
                  </div>
                  <CustomProgress value={courseData.progress} className="h-2" />
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-medium">Fechas Importantes</h3>
                <div className="space-y-2 mt-2 text-sm">
                  <div className="flex justify-between">
                    <span>Inicio:</span>
                    <span>{new Date(courseData.startDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Finalización:</span>
                    <span>{new Date(courseData.endDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-medium">Estadísticas</h3>
                <div className="space-y-2 mt-2 text-sm">
                  <div className="flex justify-between">
                    <span>Estudiantes:</span>
                    <span>{courseData.students}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Calificación actual:</span>
                    <span className="font-medium">{calculateCurrentGrade(courseData.grades)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tareas pendientes:</span>
                    <span>{courseData.assignments.filter((a) => !hasSubmitted(a) && new Date(a.due_date) >= new Date()).length}</span>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full gap-2 text-sm">
                <Users className="h-4 w-4" />
                Ver compañeros de clase
              </Button>
            </CardFooter>
          </Card>

          {/* Contenido principal */}
          <div className="lg:col-span-2 space-y-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 transition-all duration-300">
              <TabsList className="grid grid-cols-4 w-full bg-muted rounded-lg p-1">
                <TabsTrigger value="overview" className="rounded-md text-sm">Resumen</TabsTrigger>
                <TabsTrigger value="materials" className="rounded-md text-sm">Materiales</TabsTrigger>
                <TabsTrigger value="assignments" className="rounded-md text-sm">Tareas</TabsTrigger>
                <TabsTrigger value="grades" className="rounded-md text-sm">Notas</TabsTrigger>
              </TabsList>

              {/* Pestaña de Resumen */}
              <TabsContent value="overview" className="space-y-6">
                {/* Calendario de Eventos */}
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">Calendario de Eventos</CardTitle>
                    <CardDescription>Próximas fechas límite y eventos del curso</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {courseData.assignments.length > 0 || courseData.announcements.length > 0 ? (
                      <div className="space-y-4">
                        {courseData.assignments
                          .filter((a) => new Date(a.due_date) >= new Date())
                          .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
                          .map((assignment) => (
                            <div key={assignment.id} className="flex items-center gap-4">
                              <Calendar className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">{assignment.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  Fecha límite: {new Date(assignment.due_date).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          ))}
                        {courseData.announcements
                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                          .slice(0, 3)
                          .map((announcement) => (
                            <div key={announcement.id} className="flex items-center gap-4">
                              <Book className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">{announcement.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  Publicado: {new Date(announcement.date).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No hay eventos próximos.</p>
                    )}
                  </CardContent>
                </Card>

                {/* Anuncios */}
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">Anuncios</CardTitle>
                    <CardDescription>Anuncios importantes del curso</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {courseData.announcements.length > 0 ? (
                      <div className="space-y-4">
                        {courseData.announcements.map((announcement) => (
                          <div key={announcement.id} className="border-b pb-4 last:border-0 last:pb-0">
                            <div className="flex justify-between items-start">
                              <h3 className="font-medium">{announcement.title}</h3>
                              <span className="text-xs text-muted-foreground">
                                {new Date(announcement.date).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-sm mt-1">{announcement.content}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No hay anuncios disponibles.</p>
                    )}
                  </CardContent>
                </Card>

                {/* Próximas tareas */}
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">Próximas Tareas</CardTitle>
                    <CardDescription>Tareas pendientes para este curso</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {courseData.assignments.filter((a) => !hasSubmitted(a) && new Date(a.due_date) >= new Date()).length > 0 ? (
                      <div className="space-y-4">
                        {courseData.assignments
                          .filter((a) => !hasSubmitted(a) && new Date(a.due_date) >= new Date())
                          .map((assignment) => (
                            <Dialog
                              key={assignment.id}
                              open={openDialogs[assignment.id] || false}
                              onOpenChange={(open) => setOpenDialogs((prev) => ({ ...prev, [assignment.id]: open }))}
                            >
                              <DialogTrigger asChild>
                                <div className="flex justify-between items-center border-b pb-4 last:border-0 last:pb-0">
                                  <div>
                                    <h3 className="font-medium">{assignment.title}</h3>
                                    <p className="text-sm text-muted-foreground">
                                      Fecha límite: {new Date(assignment.due_date).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <Button size="sm" onClick={() => handleViewDetails(assignment)}>Ver tarea</Button>
                                </div>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>{assignment.title}</DialogTitle>
                                  <DialogDescription>Detalles y entrega de la tarea</DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                  <div className="grid gap-2">
                                    <Label>Descripción</Label>
                                    <p className="text-sm text-muted-foreground">{assignment.description}</p>
                                  </div>
                                  <div className="grid gap-2">
                                    <Label>Fecha límite</Label>
                                    <p className="text-sm text-muted-foreground">
                                      {new Date(assignment.due_date).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <div className="grid gap-2">
                                    <Label>Puntos</Label>
                                    <p className="text-sm text-muted-foreground">{assignment.points || 100}</p>
                                  </div>
                                  {hasSubmitted(assignment) && (
                                    <div className="grid gap-2">
                                      <Label>Entrega previa</Label>
                                      <p className="text-sm text-green-600">
                                        Última entrega: {
                                          assignment.submissions_files?.find(
                                            (s) => s.student_id === userId
                                          )?.file_name || "Archivo enviado"
                                        }
                                      </p>
                                    </div>
                                  )}
                                  {!isPastDue(assignment.due_date) && (
                                    <div className="grid gap-2">
                                      <Label htmlFor={`submission-file-${assignment.id}`}>
                                        {hasSubmitted(assignment) ? "Reenviar entrega" : "Subir entrega"}
                                      </Label>
                                      <Input
                                        id={`submission-file-${assignment.id}`}
                                        type="file"
                                        accept=".pdf,.doc,.docx"
                                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                          setSubmissionFile(e.target.files?.[0] || null)
                                        }
                                      />
                                    </div>
                                  )}
                                  {isPastDue(assignment.due_date) && (
                                    <p className="text-sm text-red-600">La fecha límite ha pasado.</p>
                                  )}
                                </div>
                                <DialogFooter>
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setOpenDialogs((prev) => ({ ...prev, [assignment.id]: false }))
                                      setSubmissionFile(null)
                                    }}
                                  >
                                    Cerrar
                                  </Button>
                                  {!isPastDue(assignment.due_date) && (
                                    <Button onClick={handleSubmitAssignment} disabled={!submissionFile}>
                                      {hasSubmitted(assignment) ? "Reenviar" : "Enviar"} entrega
                                    </Button>
                                  )}
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No hay tareas pendientes.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Pestaña de Materiales */}
              <TabsContent value="materials" className="space-y-6">
                {courseData.modules.map((module) => (
                  <Card key={module.id} className="shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg">{module.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {module.materials.map((material) => (
                          <div key={material.id} className="flex overflow-hidden border rounded-lg">
                            <div className="flex items-center justify-center p-6 bg-muted/30">
                              {getFileIcon(material.type, material.format)}
                            </div>
                            <div className="flex-1">
                              <div className="p-4 pb-2">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h3 className="font-medium">{material.title}</h3>
                                    <p className="text-sm text-muted-foreground line-clamp-1">{material.description}</p>
                                  </div>
                                  {material.isNew && (
                                    <Badge className="bg-primary text-primary-foreground">Nuevo</Badge>
                                  )}
                                </div>
                              </div>
                              <div className="p-4 pt-0 space-y-2">
                                <div className="flex items-center text-sm">
                                  <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                                  <span>{new Date(material.date).toLocaleDateString()}</span>
                                </div>
                                {material.type === "video" && material.duration && (
                                  <div className="flex items-center text-sm">
                                    <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                                    <span>Duración: {material.duration}</span>
                                  </div>
                                )}
                                <div className="flex items-center text-sm">
                                  <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                                  <span>Tamaño: {material.size}</span>
                                </div>
                                <div className="pt-2 flex gap-2">
                                  <Button
                                    variant="outline"
                                    className="flex-1 text-sm"
                                    disabled={!material.file_path}
                                    onClick={() => material.file_path && window.open(material.file_path, "_blank")}
                                  >
                                    <LinkIcon className="mr-2 h-4 w-4" />
                                    Ver
                                  </Button>
                                  <Button
                                    className="flex-1 text-sm"
                                    disabled={!material.file_path}
                                    onClick={() => material.file_path && window.open(material.file_path, "_blank")}
                                  >
                                    <Download className="mr-2 h-4 w-4" />
                                    Descargar
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              {/* Pestaña de Tareas */}
              <TabsContent value="assignments" className="space-y-6">
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">Tareas del Curso</CardTitle>
                    <CardDescription>Todas las tareas asignadas para este curso</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {courseData.assignments.map((assignment) => (
                        <Card key={assignment.id} className="overflow-hidden">
                          <CardHeader className="p-4 pb-2">
                            <div className="flex justify-between items-start">
                              <CardTitle className="text-lg">{assignment.title}</CardTitle>
                              <Badge
                                variant="outline"
                                className={`${
                                  hasSubmitted(assignment)
                                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                    : isPastDue(assignment.due_date)
                                      ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                                      : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                                }`}
                              >
                                {hasSubmitted(assignment) ? "Enviada" : isPastDue(assignment.due_date) ? "Vencida" : "Pendiente"}
                              </Badge>
                            </div>
                            <CardDescription>{assignment.description}</CardDescription>
                          </CardHeader>
                          <CardContent className="p-4 pt-0 space-y-3">
                            <div className="flex items-center text-sm">
                              <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                Fecha límite: {new Date(assignment.due_date).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex items-center text-sm">
                              <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                              <span>Puntos: {assignment.points || 100}</span>
                            </div>
                            {assignment.status === "completed" && assignment.grade !== undefined && (
                              <div className="flex items-center text-sm">
                                <Book className="mr-2 h-4 w-4 text-muted-foreground" />
                                <span>
                                  Calificación:{" "}
                                  <span
                                    className={`font-medium ${
                                      (assignment.grade / (assignment.points || 100)) * 10 >= 9
                                        ? "text-green-600 dark:text-green-400"
                                        : (assignment.grade / (assignment.points || 100)) * 10 >= 7
                                          ? "text-blue-600 dark:text-blue-400"
                                          : "text-red-600 dark:text-red-400"
                                    }`}
                                  >
                                    {assignment.grade} / {assignment.points || 100}
                                  </span>
                                </span>
                              </div>
                            )}
                            <div className="pt-2">
                              <Dialog
                                open={openDialogs[assignment.id] || false}
                                onOpenChange={(open) => setOpenDialogs((prev) => ({ ...prev, [assignment.id]: open }))}
                              >
                                <DialogTrigger asChild>
                                  <Button className="w-full text-sm" onClick={() => handleViewDetails(assignment)}>
                                    {assignment.status === "pending" ? "Entregar tarea" : "Ver detalles"}
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>{selectedAssignment?.title || "Tarea"}</DialogTitle>
                                    <DialogDescription>Detalles y entrega de la tarea</DialogDescription>
                                  </DialogHeader>
                                  {selectedAssignment && (
                                    <div className="grid gap-4 py-4">
                                      <div className="grid gap-2">
                                        <Label>Descripción</Label>
                                        <p className="text-sm text-muted-foreground">{selectedAssignment.description}</p>
                                      </div>
                                      <div className="grid gap-2">
                                        <Label>Fecha límite</Label>
                                        <p className="text-sm text-muted-foreground">
                                          {new Date(selectedAssignment.due_date).toLocaleDateString()}
                                        </p>
                                      </div>
                                      <div className="grid gap-2">
                                        <Label>Puntos</Label>
                                        <p className="text-sm text-muted-foreground">{selectedAssignment.points || 100}</p>
                                      </div>
                                      {hasSubmitted(selectedAssignment) && (
                                        <div className="grid gap-2">
                                          <Label>Entrega previa</Label>
                                          <p className="text-sm text-green-600">
                                            Última entrega: {
                                              selectedAssignment.submissions_files?.find(
                                                (s) => s.student_id === userId
                                              )?.file_name || "Archivo enviado"
                                            }
                                          </p>
                                        </div>
                                      )}
                                      {!isPastDue(selectedAssignment.due_date) && (
                                        <div className="grid gap-2">
                                          <Label htmlFor={`submission-file-${selectedAssignment.id}`}>
                                            {hasSubmitted(selectedAssignment) ? "Reenviar entrega" : "Subir entrega"}
                                          </Label>
                                          <Input
                                            id={`submission-file-${selectedAssignment.id}`}
                                            type="file"
                                            accept=".pdf,.doc,.docx"
                                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                              setSubmissionFile(e.target.files?.[0] || null)
                                            }
                                          />
                                        </div>
                                      )}
                                      {isPastDue(selectedAssignment.due_date) && (
                                        <p className="text-sm text-red-600">La fecha límite ha pasado.</p>
                                      )}
                                    </div>
                                  )}
                                  <DialogFooter>
                                    <Button
                                      variant="outline"
                                      onClick={() => {
                                        setOpenDialogs((prev) => ({ ...prev, [selectedAssignment?.id || 0]: false }))
                                        setSubmissionFile(null)
                                      }}
                                    >
                                      Cerrar
                                    </Button>
                                    {selectedAssignment && !isPastDue(selectedAssignment.due_date) && (
                                      <Button onClick={handleSubmitAssignment} disabled={!submissionFile}>
                                        {hasSubmitted(selectedAssignment) ? "Reenviar" : "Enviar"} entrega
                                      </Button>
                                    )}
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Pestaña de Notas */}
              <TabsContent value="grades" className="space-y-6">
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">Mis Calificaciones</CardTitle>
                    <CardDescription>Calificaciones obtenidas en este curso</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {courseData.grades.length > 0 ? (
                      <div className="rounded-md border">
                        <table className="w-full caption-bottom text-sm">
                          <thead className="[&_tr]:border-b">
                            <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                                Actividad
                              </th>
                              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                                Tipo
                              </th>
                              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                                Calificación
                              </th>
                              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                                Fecha
                              </th>
                            </tr>
                          </thead>
                          <tbody className="[&_tr:last-child]:border-0">
                            {courseData.grades.map((grade) => (
                              <tr
                                key={grade.id}
                                className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                              >
                                <td className="p-4 align-middle font-medium">{grade.title}</td>
                                <td className="p-4 align-middle">{grade.type}</td>
                                <td className="p-4 align-middle">
                                  <span
                                    className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                      (grade.grade / grade.maxGrade) * 10 >= 9
                                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                        : (grade.grade / grade.maxGrade) * 10 >= 7
                                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                                          : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                                    }`}
                                  >
                                    {grade.grade} / {grade.maxGrade}
                                  </span>
                                </td>
                                <td className="p-4 align-middle">{new Date(grade.date).toLocaleDateString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No hay calificaciones disponibles.</p>
                    )}
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <div>
                      <p className="text-sm font-medium">Calificación actual:</p>
                      <p className="text-2xl font-bold">{calculateCurrentGrade(courseData.grades)}</p>
                    </div>
                    <Button variant="outline" className="text-sm">Descargar reporte</Button>
                  </CardFooter>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}