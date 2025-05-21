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

interface Course {
  id: number
  code: string
  schedule: string | string[]
  weighting: string
  signature: string
  semester: string
  professor: string
  enrollments_count: number
  status: string
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
  const [courses, setCourses] = useState<Course[]>([])
  const [contents, setContents] = useState<Content[]>([])
  const [user, setUser] = useState<{ name: string; email: string }>({ name: "Cargando...", email: "cargando@estudiante.edu" })
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(
    typeof window !== "undefined" ? localStorage.getItem("token") : null
  )

  // Verificar autenticación
  useEffect(() => {
    if (!token) {
      setError("No estás autenticado. Redirigiendo al login...")
      setTimeout(() => router.push("/login"), 1000)
      return
    }

    const verifyUser = async () => {
      try {
        console.log("Verificando usuario...")
        const response = await api.get("/user", { timeout: 10000 })
        const { role, name, email } = response.data.data || {}
        console.log("Usuario verificado:", { role, name, email })
        if (role !== "student") {
          throw new Error("Acceso denegado. No eres estudiante.")
        }
        setUser({ name: name || "Estudiante", email: email || "estudiante@mentora.edu" })
        setLoadingAuth(false)
      } catch (err: unknown) {
        const error = err as AxiosError<ApiErrorResponse>
        console.error("Error al verificar usuario:", error.message, error.response?.data)
        setError(error.response?.data?.message || "Token inválido. Redirigiendo al login...")
        localStorage.removeItem("token")
        setTimeout(() => router.push("/login"), 1000)
      }
    }

    verifyUser()
  }, [token, router])

  // Fetch de cursos y contenidos
  useEffect(() => {
    if (loadingAuth || !token) return

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
          schedule: Array.isArray(item.schedule) ? item.schedule : [item.schedule || "Sin horario"],
          weighting: item.weighting || "N/A",
          signature: item.signature || "Sin asignatura",
          semester: item.semester || "N/A",
          professor: item.professor || "Sin asignar",
          enrollments_count: item.enrollments_count || 0,
          status: item.status || "active",
          progress: item.progress || 0,
          image: item.image,
        }));
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
  }, [loadingAuth, token])

  // Procesar cursos activos y pasados
  const computeActiveCourses = (courses: Course[], contents: Content[]): ActiveCourse[] => {
    const gradientColors = [
      'from-blue-500 to-blue-700',
      'from-green-500 to-green-700',
      'from-purple-500 to-purple-700',
      'from-red-500 to-red-700',
      'from-indigo-500 to-indigo-700',
    ];

    return courses.map((course, index) => {
      const pendingTasks = contents.filter(content => content.course_id === course.id && new Date(content.created_at) > new Date()).length;
      const newMaterials = contents.filter(content => {
        const createdAt = new Date(content.created_at);
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        return content.course_id === course.id && createdAt >= oneWeekAgo;
      }).length;

      return {
        id: course.id,
        title: course.signature,
        code: course.code,
        professor: course.professor,
        progress: course.progress || 0,
        nextClass: Array.isArray(course.schedule) ? course.schedule.join(", ") : course.schedule,
        pendingTasks,
        newMaterials,
        gradient: gradientColors[index % gradientColors.length],
      };
    });
  };

  // Filtrar cursos activos y pasados
  const activeCourses = computeActiveCourses(
    courses.filter(course => course.status === "active"),
    contents
  );
  const pastCourses = computeActiveCourses(
    courses.filter(course => course.status !== "active"),
    contents
  );

  // Si está cargando autenticación
  if (loadingAuth) {
    return (
      <MainLayout userRole="student" userName={user.name} userEmail={user.email}>
        <div className="flex flex-col items-center justify-center h-[50vh]">
          <p className="text-xl">Verificando autenticación...</p>
        </div>
      </MainLayout>
    );
  }

  // Si está cargando datos
  if (loadingData) {
    return (
      <MainLayout userRole="student" userName={user.name} userEmail={user.email}>
        <div className="flex flex-col items-center justify-center h-[50vh]">
          <p className="text-xl">Cargando cursos...</p>
        </div>
      </MainLayout>
    );
  }

  // Si hay error
  if (error) {
    return (
      <MainLayout userRole="student" userName={user.name} userEmail={user.email}>
        <div className="flex flex-col items-center justify-center h-[50vh]">
          <h1 className="text-2xl font-bold">{error}</h1>
          <p className="text-muted-foreground mt-2">Ocurrió un problema al cargar los cursos.</p>
          <Button asChild className="mt-4">
            <Link href="/student">Volver al Dashboard</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout userRole="student" userName={user.name} userEmail={user.email}>
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
  );
}