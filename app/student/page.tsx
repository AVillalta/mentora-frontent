"use client"

import { useEffect, useState } from "react"
import api from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import MainLayout from "@/components/layout/main-layout"
import { Book, FileText, GraduationCap, TrendingUp } from "lucide-react"
import { useRouter } from "next/navigation"

// Interfaces ajustadas según los recursos de Laravel
interface Grade {
  id: number
  grade_type: string
  grade_value: number
  grade_date: string
  enrollment_id: number
  subject?: string
}

interface Course {
  id: number
  schedule: string
  weighting: string
  signature: string
  semester: string
  professor: string
  enrollments_count: number
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

interface CourseDistribution {
  name: string
  value: number
}

interface StudentSummary {
  averageGrade: number
  activeCourses: number
  pendingEvaluations: number
  newContents: number
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
          if (role !== "student") {
            console.log("Acceso denegado: rol no es student, role =", role)
            setAuthError("Acceso denegado. Redirigiendo al login...")
            localStorage.removeItem("token")
            router.push("/login")
          } else {
            console.log("Autenticación exitosa, cargando dashboard")
            setUserName(name)
            setUserEmail(email)
            setLoadingAuth(false)
          }
        })
        .catch((err) => {
          console.error("Token verification error:", err)
          setAuthError("Token inválido. Redirigiendo al login...")
          localStorage.removeItem("token")
          router.push("//login")
        })
    }
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

        console.log("Grades response:", gradesRes.data)
        console.log("Courses response:", coursesRes.data)
        console.log("Contents response:", contentsRes.data)

        setGrades(gradesRes.data.data || [])
        setCourses(coursesRes.data.data || [])
        setContents(contentsRes.data.data || [])
      } catch (err: unknown) {
        setError("Error al cargar los datos. Inténtalo de nuevo.")
        console.error("Fetch error:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [loadingAuth, authError])

  // Procesar datos para el resumen
  const computeStudentSummary = (grades: Grade[], courses: Course[], contents: Content[]): StudentSummary => {
    const averageGrade = grades.length > 0
      ? grades.reduce((sum, grade) => sum + grade.grade_value, 0) / grades.length
      : 0
    const activeCourses = courses.length
    const pendingEvaluations = grades.filter(grade => new Date(grade.grade_date) > new Date()).length
    const newContents = contents.filter(content => {
      const createdAt = new Date(content.created_at)
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
      return createdAt >= oneWeekAgo
    }).length

    return {
      averageGrade,
      activeCourses,
      pendingEvaluations,
      newContents,
    }
  }

  // Procesar datos para la evolución de notas
  const computeGradeEvolution = (grades: Grade[]): GradeEvolution[] => {
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
    const evolution: GradeEvolution[] = months.map(month => ({ name: month, value: 0 }))
    
    grades.forEach(grade => {
      const date = new Date(grade.grade_date)
      const monthIndex = date.getMonth()
      evolution[monthIndex].value = (evolution[monthIndex].value + grade.grade_value) / 2
    })

    return evolution.filter(item => item.value > 0)
  }

  // Procesar datos para la distribución de cursos
  const computeCourseDistribution = (courses: Course[]): CourseDistribution[] => {
    const active = courses.filter(course => course.enrollments_count > 0).length
    const inactive = courses.filter(course => course.enrollments_count === 0).length

    return [
      { name: "Activos", value: active },
      { name: "Inactivos", value: inactive },
    ].filter(item => item.value > 0)
  }

  const summary = computeStudentSummary(grades, courses, contents)
  const gradeEvolution = computeGradeEvolution(grades)
  const courseDistribution = computeCourseDistribution(courses)

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
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Estudiante</h1>
        <p className="text-muted-foreground">
          Bienvenido de nuevo, {userName}. Aquí tienes un resumen de tu actividad académica.
        </p>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Promedio General</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.averageGrade.toFixed(1) || "N/A"}</div>
              <p className="text-xs text-muted-foreground">+0.5 respecto al semestre anterior</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cursos Activos</CardTitle>
              <Book className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.activeCourses || 0}</div>
              <p className="text-xs text-muted-foreground">Semestre actual</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Evaluaciones Pendientes</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.pendingEvaluations || 0}</div>
              <p className="text-xs text-muted-foreground">Próximos 7 días</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Contenidos Nuevos</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.newContents || 0}</div>
              <p className="text-xs text-muted-foreground">Última semana</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Resumen</TabsTrigger>
            <TabsTrigger value="grades">Notas Recientes</TabsTrigger>
            <TabsTrigger value="courses">Cursos</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="col-span-4">
                <CardHeader>
                  <CardTitle>Evolución de Notas</CardTitle>
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
              <Card className="col-span-3">
                <CardHeader>
                  <CardTitle>Distribución de Cursos</CardTitle>
                  <CardDescription>Estado actual de tus cursos</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={courseDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {courseDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="grades">
            <Card>
              <CardHeader>
                <CardTitle>Notas Recientes</CardTitle>
                <CardDescription>Tus últimas calificaciones registradas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <table className="w-full caption-bottom text-sm">
                    <thead className="[&_tr]:border-b">
                      <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                          Asignatura
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Tipo</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Nota</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Fecha</th>
                      </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                      {grades.slice(0, 5).map((grade) => (
                        <tr
                          key={grade.id}
                          className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                        >
                          <td className="p-4 align-middle">{grade.subject || "Sin asignatura"}</td>
                          <td className="p-4 align-middle">{grade.grade_type}</td>
                          <td className="p-4 align-middle font-medium">
                            <span
                              className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                grade.grade_value >= 9
                                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                  : grade.grade_value >= 7
                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                                    : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                              }`}
                            >
                              {grade.grade_value.toFixed(1)}
                            </span>
                          </td>
                          <td className="p-4 align-middle">{new Date(grade.grade_date).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="courses">
            <Card>
              <CardHeader>
                <CardTitle>Mis Cursos</CardTitle>
                <CardDescription>Cursos en los que estás matriculado actualmente</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {courses.map((course) => (
                    <Card key={course.id}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">{course.signature}</CardTitle>
                        <CardDescription>{course.professor || "Sin asignar"}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Matrículas</span>
                            <span className="font-medium">{course.enrollments_count}</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-800">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${course.enrollments_count > 0 ? 100 : 0}%` }} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  )
}