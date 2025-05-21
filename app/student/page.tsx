"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import api from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import MainLayout from "@/components/layout/main-layout"
import { Bell, Book, Calendar, Clock, FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { AxiosError } from "axios"

// Interfaces ajustadas según los recursos de Laravel
interface Grade {
  id: string
  grade_type: string
  grade_value: number | string | null | undefined
  grade_date: string
  enrollment_id: string
  student_name?: string
  student_email?: string | null
  course_name?: string
  professor_name?: string
}

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

interface GradeEvolution {
  name: string
  value: number
}

interface ApiErrorResponse {
  message?: string
  data?: string
  errors?: { [key: string]: string[] }
}

export default function StudentDashboard() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(
    typeof window !== "undefined" ? localStorage.getItem("token") : null
  )
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const [grades, setGrades] = useState<Grade[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [contents, setContents] = useState<Content[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userName, setUserName] = useState("Cargando...")
  const [userEmail, setUserEmail] = useState("cargando@mentora.edu")

  // Verificar autenticación
  useEffect(() => {
    if (!token) {
      setAuthError("No estás autenticado. Redirigiendo al login...")
      router.push("/login")
      return
    }

    const verifyUser = async () => {
      try {
        const response = await api.get("/user")
        const { role, name, email } = response.data.data
        if (role !== "student") {
          setAuthError("Acceso denegado. Redirigiendo al login...")
          localStorage.removeItem("token")
          router.push("/login")
          return
        }
        setUserName(name || "Usuario Desconocido")
        setUserEmail(email || "sin@correo.com")
        setLoadingAuth(false)
      } catch (err) {
        setAuthError("Token inválido. Redirigiendo al login...")
        localStorage.removeItem("token")
        router.push("/login")
      }
    }

    verifyUser()
  }, [token, router])

  // Cargar datos
  useEffect(() => {
    const fetchData = async () => {
      if (loadingAuth || authError) return

      try {
        setLoading(true)
        const [gradesRes, coursesRes, contentsRes] = await Promise.all([
          api.get("/grades"),
          api.get("/courses"),
          api.get("/contents"),
        ])

        const validGrades = gradesRes.data.data.map((grade: Grade) => ({
          ...grade,
          grade_value: grade.grade_value != null && typeof grade.grade_value === 'string' 
            ? parseFloat(grade.grade_value) 
            : grade.grade_value,
        })).filter((grade: Grade) => {
          if (grade.grade_value != null && typeof grade.grade_value !== 'number') {
            return false
          }
          return true
        })

        setGrades(validGrades || [])
        setCourses(coursesRes.data.data || [])
        setContents(contentsRes.data.data || [])
      } catch (err: unknown) {
        const error = err as AxiosError<ApiErrorResponse>
        setError(error.response?.data?.message || error.response?.data?.data || "Error al cargar los datos. Inténtalo de nuevo.")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [loadingAuth, authError])

  // Procesar datos para el promedio general
  const computeAverageGrade = (grades: Grade[]): number => {
    const validGrades = grades.filter(grade => grade.grade_value != null && typeof grade.grade_value === 'number')
    return validGrades.length > 0
      ? validGrades.reduce((sum, grade) => sum + (grade.grade_value as number), 0) / validGrades.length
      : 0
  }

  // Procesar datos para la evolución de notas
  const computeGradeEvolution = (grades: Grade[]): GradeEvolution[] => {
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
    const evolution: GradeEvolution[] = months.map(month => ({ name: month, value: 0 }))
    
    grades.forEach(grade => {
      if (grade.grade_value == null || typeof grade.grade_value !== 'number') return
      const date = new Date(grade.grade_date)
      const monthIndex = date.getMonth()
      evolution[monthIndex].value = (evolution[monthIndex].value + grade.grade_value) / 2
    })

    return evolution.filter(item => item.value > 0)
  }

  // Procesar datos para cursos activos
  const computeActiveCourses = (courses: Course[], grades: Grade[], contents: Content[]) => {
    const gradientColors = [
      'from-blue-500 to-blue-700',
      'from-green-500 to-green-700',
      'from-purple-500 to-purple-700',
      'from-red-500 to-red-700',
      'from-indigo-500 to-indigo-700',
    ]

    return courses.map((course, index) => {
      const courseGrades = grades.filter(grade => grade.course_name === course.signature)
      const validGrades = courseGrades.filter(grade => grade.grade_value != null && typeof grade.grade_value === 'number')
      const progress = validGrades.length > 0
        ? (validGrades.reduce((sum, grade) => sum + (grade.grade_value as number), 0) / validGrades.length) * 10
        : 0
      const pendingTasks = contents.filter(content => content.course_id === course.id && new Date(content.created_at) > new Date()).length
      const newMaterials = contents.filter(content => {
        const createdAt = new Date(content.created_at)
        const oneWeekAgo = new Date()
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
        return content.course_id === course.id && createdAt >= oneWeekAgo
      }).length

      const courseObj = {
        id: course.id,
        title: course.signature,
        code: course.code || `CS${course.id}-A`,
        professor: course.professor || "Sin asignar",
        progress: Math.round(progress),
        nextClass: Array.isArray(course.schedule) ? course.schedule.join(', ') : course.schedule || "Sin horario",
        pendingTasks,
        newMaterials,
        gradient: gradientColors[index % gradientColors.length], // Gradiente basado en el índice
      }

      return courseObj
    })
  }

  // Procesar datos para próximos eventos
  const computeUpcomingEvents = (grades: Grade[], contents: Content[], courses: Course[]) => {
    const events = [
      ...grades
        .filter(grade => new Date(grade.grade_date) > new Date())
        .map(grade => ({
          id: grade.id,
          title: `${grade.grade_type.charAt(0).toUpperCase() + grade.grade_type.slice(1)}`,
          course: grade.course_name || "Sin asignatura",
          date: grade.grade_date,
          type: grade.grade_type === "exam" ? "exam" : "assignment",
        })),
      ...contents
        .filter(content => new Date(content.created_at) > new Date(new Date().setDate(new Date().getDate() - 7)))
        .map(content => {
          const course = courses.find(course => course.id === content.course_id)
          return {
            id: content.id,
            title: content.name,
            course: course?.signature || "Sin curso",
            date: content.created_at,
            type: "workshop",
          }
        }),
    ]

    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  const averageGrade = computeAverageGrade(grades)
  const activeCourses = computeActiveCourses(courses, grades, contents)
  const upcomingEvents = computeUpcomingEvents(grades, contents, courses)
  const gradeEvolution = computeGradeEvolution(grades)

  const COLORS = ["#1976d2", "#dc004e", "#ff9800"]

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
    <MainLayout userRole="student" userName={userName} userEmail={userEmail}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Mi Dashboard</h1>
            <p className="text-muted-foreground">
              Bienvenido de nuevo, {userName}. Aquí tienes un resumen de tu actividad académica.
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <Button variant="outline" className="gap-2">
              <Calendar className="h-4 w-4" />
              Ver calendario
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Promedio General</CardTitle>
              <div className="h-4 w-4 text-muted-foreground">{averageGrade.toFixed(1)}</div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{averageGrade.toFixed(1) || "N/A"}</div>
              <p className="text-xs text-muted-foreground">+0.5 respecto al semestre anterior</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cursos Activos</CardTitle>
              <Book className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeCourses.length}</div>
              <p className="text-xs text-muted-foreground">Semestre actual</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tareas Pendientes</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {activeCourses.reduce((total, course) => total + course.pendingTasks, 0)}
              </div>
              <p className="text-xs text-muted-foreground">Próximos 7 días</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Materiales Nuevos</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {activeCourses.reduce((total, course) => total + course.newMaterials, 0)}
              </div>
              <p className="text-xs text-muted-foreground">Última semana</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="courses" className="space-y-4">
          <TabsList>
            <TabsTrigger value="courses">Mis Cursos</TabsTrigger>
            <TabsTrigger value="calendar">Próximos Eventos</TabsTrigger>
            <TabsTrigger value="performance">Rendimiento</TabsTrigger>
          </TabsList>

          <TabsContent value="courses" className="space-y-4">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {activeCourses.map((course) => (
                <Link href={`/student/courses/${course.id}`} key={course.id} className="block">
                  <Card className="h-full overflow-hidden transition-all hover:shadow-md">
                    <div className={`aspect-video w-full bg-gradient-to-r ${course.gradient} flex items-center justify-center transition-all hover:scale-105`}>
                      <Book className="h-16 w-16 text-white opacity-80" /> {/* Ícono opcional */}
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
              ))}
            </div>
          </TabsContent>

          <TabsContent value="calendar" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Próximos Eventos</CardTitle>
                <CardDescription>Eventos y fechas importantes en los próximos días</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {upcomingEvents.map((event) => (
                    <div key={event.id} className="flex items-start gap-4 border-b pb-4 last:border-0 last:pb-0">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                          event.type === "assignment"
                            ? "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300"
                            : event.type === "exam"
                              ? "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300"
                              : event.type === "class"
                                ? "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300"
                                : "bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300"
                        }`}
                      >
                        {event.type === "assignment" ? (
                          <FileText className="h-5 w-5" />
                        ) : event.type === "exam" ? (
                          <FileText className="h-5 w-5" />
                        ) : event.type === "class" ? (
                          <Book className="h-5 w-5" />
                        ) : (
                          <Calendar className="h-5 w-5" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium">{event.title}</h4>
                        <p className="text-sm text-muted-foreground">{event.course}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(event.date).toLocaleDateString(undefined, {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        Ver detalles
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Evolución de Notas</CardTitle>
                <CardDescription>Tu rendimiento académico durante el semestre</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={gradeEvolution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 10]} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#1976d2" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  )
}