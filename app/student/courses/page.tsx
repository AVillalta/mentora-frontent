"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import MainLayout from "@/components/layout/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Book, Clock, Users } from "lucide-react"
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
import useAuth from "@/hooks/useAuth"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

interface Course {
  id: number
  code: string
  schedule: { day: string; start_time: string; end_time: string }[]
  weighting: string
  signature: string
  semester: {
    id: string
    name: string
    is_active: boolean
  }
  professor: string
  enrollments_count: number
  status: "active" | "inactive"
  progress?: number
  image?: string
}

interface Content {
  id: number
  name: string
  description: string
  bibliography: string
  order: number
  course_id: number
  grade_id: number
  created_at: string
  updated_at: string
}

interface ActiveCourse {
  id: number
  title: string
  code: string
  professor: string
  progress: number
  nextClass: string
  pendingTasks: number
  newMaterials: number
  gradient: string
}

interface ApiErrorResponse {
  message?: string
  data?: string
  errors?: { [key: string]: string[] }
}

export default function StudentCoursesPage() {
  const router = useRouter()
  const { user, loading: loadingAuth, error: authError } = useAuth("student")
  const [courses, setCourses] = useState<Course[]>([])
  const [contents, setContents] = useState<Content[]>([])
  const [loadingData, setLoadingData] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch de cursos y contenidos
  useEffect(() => {
    if (loadingAuth || authError) return

    const fetchData = async () => {
      try {
        setLoadingData(true)
        console.log("Iniciando fetch de datos...")
        const [coursesRes, contentsRes] = await Promise.all([
          api.get("/courses", { timeout: 10000 }),
          api.get("/contents", { timeout: 10000 }),
        ])
        console.log("Respuesta de /courses:", coursesRes.data)
        console.log("Respuesta de /contents:", contentsRes.data)
        const coursesData = coursesRes.data.data || []
        const contentsData = contentsRes.data.data || []
        // Normalizar datos
        const normalizedCourses = coursesData.map((item: Course) => ({
          id: item.id,
          code: item.code || `CS${item.id}-A`,
          schedule: Array.isArray(item.schedule) ? item.schedule : [],
          weighting: item.weighting || "N/A",
          signature: item.signature || "Sin asignatura",
          semester: item.semester || { id: "", name: "N/A", is_active: false },
          professor: item.professor || "Sin asignar",
          enrollments_count: item.enrollments_count || 0,
          status: item.status || "active",
          progress: item.progress || 0,
          image: item.image,
        }))
        console.log("Cursos normalizados:", normalizedCourses)
        setCourses(normalizedCourses)
        setContents(contentsData)
        setError(null)
      } catch (err: unknown) {
        const error = err as AxiosError<ApiErrorResponse>
        console.error("Error al cargar datos:", error.message, error.response?.data)
        setError(error.response?.data?.message || "Error al cargar los cursos.")
      } finally {
        setLoadingData(false)
        console.log("Fetch de datos completado, loadingData:", false)
      }
    }

    fetchData()
  }, [loadingAuth, authError])

  // Procesar cursos activos y pasados
  const computeActiveCourses = (courses: Course[], contents: Content[]): ActiveCourse[] => {
    const gradientColors = [
      'from-blue-500 to-blue-700',
      'from-green-500 to-green-700',
      'from-purple-500 to-purple-700',
      'from-red-500 to-red-700',
      'from-indigo-500 to-indigo-700',
    ]

    return courses.map((course, index) => {
      console.log("Course schedule:", course.schedule) // Debug log
      const pendingTasks = contents.filter(content => content.course_id === course.id && new Date(content.created_at) > new Date()).length
      const newMaterials = contents.filter(content => {
        const createdAt = new Date(content.created_at)
        const oneWeekAgo = new Date()
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
        return content.course_id === course.id && createdAt >= oneWeekAgo
      }).length

      const nextClass = course.schedule && Array.isArray(course.schedule) && course.schedule.length > 0
        ? course.schedule
            .filter(slot => slot.day && slot.start_time && slot.end_time)
            .map(slot => `${slot.day} ${slot.start_time}-${slot.end_time}`)
            .join(', ') || "Sin horario"
        : "Sin horario"

      return {
        id: course.id,
        title: course.signature,
        code: course.code,
        professor: course.professor,
        progress: course.progress || 0,
        nextClass,
        pendingTasks,
        newMaterials,
        gradient: gradientColors[index % gradientColors.length],
      }
    })
  }

  // Filtrar cursos activos y pasados
  const activeCourses = computeActiveCourses(
    courses.filter(course => course.status === "active"),
    contents
  )
  const pastCourses = computeActiveCourses(
    courses.filter(course => course.status !== "active"),
    contents
  )

  // Si está cargando autenticación
  if (loadingAuth) {
    return (
      <MainLayout
        userRole="student"
        userName={user?.name || "Cargando..."}
        userEmail={user?.email || "cargando@estudiante.edu"}
        profilePhotoUrl={user?.profilePhotoUrl || null}
      >
        <div className="flex flex-col items-center justify-center h-[50vh]">
          <p className="text-xl">Verificando autenticación...</p>
        </div>
      </MainLayout>
    )
  }

  // Si hay error de autenticación
  if (authError) {
    return (
      <MainLayout
        userRole="student"
        userName={user?.name || "Cargando..."}
        userEmail={user?.email || "cargando@estudiante.edu"}
        profilePhotoUrl={user?.profilePhotoUrl || null}
      >
        <div className="flex flex-col items-center justify-center h-[50vh]">
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{authError}</AlertDescription>
          </Alert>
          <Button asChild className="mt-4">
            <Link href="/login">Volver al Login</Link>
          </Button>
        </div>
      </MainLayout>
    )
  }

  // Si está cargando datos
  if (loadingData) {
    return (
      <MainLayout
        userRole="student"
        userName={user?.name || "Cargando..."}
        userEmail={user?.email || "cargando@estudiante.edu"}
        profilePhotoUrl={user?.profilePhotoUrl || null}
      >
        <div className="flex flex-col items-center justify-center h-[50vh]">
          <p className="text-xl">Cargando cursos...</p>
        </div>
      </MainLayout>
    )
  }

  // Si hay error de datos
  if (error) {
    return (
      <MainLayout
        userRole="student"
        userName={user?.name || "Cargando..."}
        userEmail={user?.email || "cargando@estudiante.edu"}
        profilePhotoUrl={user?.profilePhotoUrl || null}
      >
        <div className="flex flex-col items-center justify-center h-[50vh]">
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button asChild className="mt-4">
            <Link href="/student">Volver al Dashboard</Link>
          </Button>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout
      userRole="student"
      userName={user?.name || "Cargando..."}
      userEmail={user?.email || "cargando@estudiante.edu"}
      profilePhotoUrl={user?.profilePhotoUrl || null}
    >
      <div className="flex flex-col gap-6 p-4">
        {/* Breadcrumbs */}
        <Breadcrumb className="mb-2">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/student">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink>Mis Cursos</BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Encabezado */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mis Cursos</h1>
          <p className="text-muted-foreground mt-1">Tus cursos inscritos para el semestre actual</p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="active" className="space-y-4">
          <TabsList>
            <TabsTrigger value="active">Cursos Activos</TabsTrigger>
            <TabsTrigger value="past">Cursos Pasados</TabsTrigger>
          </TabsList>

          {/* Cursos Activos */}
          <TabsContent value="active" className="space-y-4">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {activeCourses.length > 0 ? (
                activeCourses.map((course) => (
                  <Link href={`/student/courses/${course.id}`} key={course.id} className="block">
                    <Card className="h-full overflow-hidden transition-all hover:shadow-md">
                      <div className={`aspect-video w-full bg-gradient-to-r ${course.gradient} flex items-center justify-center transition-all hover:scale-105`}>
                        <Book className="h-16 w-16 text-white opacity-80" />
                      </div>
                      <CardHeader className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{course.title}</CardTitle>
                            <CardDescription>{course.code}</CardDescription>
                          </div>
                          {(course.pendingTasks > 0 || course.newMaterials > 0) && (
                            <div className="flex flex-col gap-1">
                              {course.pendingTasks > 0 && (
                                <Badge variant="destructive" className="text-xs">
                                  {course.pendingTasks} {course.pendingTasks === 1 ? "tarea" : "tareas"}
                                </Badge>
                              )}
                              {course.newMaterials > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {course.newMaterials} {course.newMaterials === 1 ? "nuevo" : "nuevos"}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 space-y-3">
                        <div className="text-sm text-muted-foreground">{course.professor}</div>
                        <div className="flex items-center text-sm">
                          <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span>{course.nextClass}</span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Progreso</span>
                            <span className="font-medium">{course.progress}%</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-800">
                            <div
                              className={`h-full rounded-full ${
                                course.progress >= 75
                                  ? "bg-green-500"
                                  : course.progress >= 50
                                    ? "bg-blue-500"
                                    : course.progress >= 25
                                      ? "bg-yellow-500"
                                      : "bg-red-500"
                              }`}
                              style={{ width: `${course.progress}%` }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-muted-foreground">No tienes cursos activos.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Cursos Pasados */}
          <TabsContent value="past" className="space-y-4">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {pastCourses.length > 0 ? (
                pastCourses.map((course) => (
                  <Link href={`/student/courses/${course.id}`} key={course.id} className="block">
                    <Card className="h-full overflow-hidden transition-all hover:shadow-md">
                      <div className={`aspect-video w-full bg-gradient-to-r ${course.gradient} flex items-center justify-center transition-all hover:scale-105`}>
                        <Book className="h-16 w-16 text-white opacity-80" />
                      </div>
                      <CardHeader className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{course.title}</CardTitle>
                            <CardDescription>{course.code}</CardDescription>
                          </div>
                          {(course.pendingTasks > 0 || course.newMaterials > 0) && (
                            <div className="flex flex-col gap-1">
                              {course.pendingTasks > 0 && (
                                <Badge variant="destructive" className="text-xs">
                                  {course.pendingTasks} {course.pendingTasks === 1 ? "tarea" : "tareas"}
                                </Badge>
                              )}
                              {course.newMaterials > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {course.newMaterials} {course.newMaterials === 1 ? "nuevo" : "nuevos"}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 space-y-3">
                        <div className="text-sm text-muted-foreground">{course.professor}</div>
                        <div className="flex items-center text-sm">
                          <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span>{course.nextClass}</span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Progreso</span>
                            <span className="font-medium">{course.progress}%</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-800">
                            <div
                              className={`h-full rounded-full ${
                                course.progress >= 75
                                  ? "bg-green-500"
                                  : course.progress >= 50
                                    ? "bg-blue-500"
                                    : course.progress >= 25
                                      ? "bg-yellow-500"
                                      : "bg-red-500"
                              }`}
                              style={{ width: `${course.progress}%` }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-muted-foreground">No tienes cursos pasados.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  )
}