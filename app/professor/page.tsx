"use client"

import { useEffect, useState } from "react"
import api from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts"
import MainLayout from "@/components/layout/main-layout"
import { Book, FileText, GraduationCap, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useRouter } from "next/navigation"

// Interfaces basadas en la API
interface Course {
  id: number
  signature: string
  description: string
  semester: string
  professor: string
  enrollments_count: number
}

interface Enrollment {
  id: number
  course_id: number
  student_id: number
  student_name: string
  course_name: string
  created_at: string
}

interface Grade {
  id: number
  grade_type: string
  grade_value: number
  grade_date: string
  enrollment_id: number
  course_id: number
  course_name: string
}

interface Content {
  id: number
  name: string
  description: string
  bibliography: string
  order: number
  course_id: number
  grade_id: number | null
  created_at: string
  updated_at: string
}

interface CourseStats {
  name: string
  students: number
  avgGrade: number
}

interface GradeDistribution {
  name: string
  value: number
}

interface GradeEvolution {
  name: string
  [key: string]: number | string
}

export default function ProfessorDashboard() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(
    typeof window !== "undefined" ? localStorage.getItem("token") : null
  )
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [grades, setGrades] = useState<Grade[]>([])
  const [contents, setContents] = useState<Content[]>([]) // Estado para contenidos
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
          if (role !== "professor") {
            console.log("Acceso denegado: rol no es professor, role =", role)
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
          router.push("/login")
        })
    }
  }, [token, router])

  // Cargar datos
  useEffect(() => {
    const fetchData = async () => {
      if (loadingAuth || authError) return

      try {
        setLoading(true)
        const [coursesRes, enrollmentsRes, gradesRes, contentsRes] = await Promise.all([
          api.get("/courses"),
          api.get("/enrollments"),
          api.get("/grades"),
          api.get("/contents"), // Añadido endpoint para contenidos
        ])

        console.log("Courses response:", coursesRes.data)
        console.log("Enrollments response:", enrollmentsRes.data)
        console.log("Grades response:", gradesRes.data)
        console.log("Contents response:", contentsRes.data)

        setCourses(coursesRes.data.data || [])
        setEnrollments(enrollmentsRes.data.data || [])
        setGrades(gradesRes.data.data || [])
        setContents(contentsRes.data.data || []) // Establecer contenidos
      } catch (err: unknown) {
        setError("Error al cargar los datos. Inténtalo de nuevo.")
        console.error("Fetch error:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [loadingAuth, authError])

  // Procesar estadísticas de cursos
  const computeCourseStats = (courses: Course[], grades: Grade[]): CourseStats[] => {
    return courses.map((course) => {
      const courseGrades = grades.filter((grade) => grade.course_id === course.id)
      const avgGrade = courseGrades.length
        ? courseGrades.reduce((sum, grade) => sum + grade.grade_value, 0) / courseGrades.length
        : 0
      return {
        name: course.signature,
        students: course.enrollments_count,
        avgGrade: parseFloat(avgGrade.toFixed(1)),
      }
    })
  }

  // Procesar distribución de notas
  const computeGradeDistribution = (grades: Grade[]): GradeDistribution[] => {
    const ranges = [
      { name: "0-4.9", min: 0, max: 4.9 },
      { name: "5-5.9", min: 5, max: 5.9 },
      { name: "6-6.9", min: 6, max: 6.9 },
      { name: "7-7.9", min: 7, max: 7.9 },
      { name: "8-8.9", min: 8, max: 8.9 },
      { name: "9-10", min: 9, max: 10 },
    ]

    return ranges.map((range) => ({
      name: range.name,
      value: grades.filter((grade) => grade.grade_value >= range.min && grade.grade_value <= range.max).length,
    }))
  }

  // Procesar evolución de notas por curso
  const computeGradeEvolution = (courses: Course[], grades: Grade[]): GradeEvolution[] => {
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
    const evolution: GradeEvolution[] = months.map((month, index) => {
      const entry: GradeEvolution = { name: month }
      courses.forEach((course) => {
        const courseGrades = grades.filter(
          (grade) =>
            grade.course_id === course.id &&
            new Date(grade.grade_date).getMonth() === index
        )
        entry[course.signature] = courseGrades.length
          ? parseFloat(
              (courseGrades.reduce((sum, grade) => sum + grade.grade_value, 0) / courseGrades.length).toFixed(1)
            )
          : 0
      })
      return entry
    })
    return evolution.filter((entry) =>
      Object.values(entry).some((value) => typeof value === "number" && value > 0)
    )
  }

  // Obtener matrículas recientes
  const recentEnrollments = enrollments
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  const courseStats = computeCourseStats(courses, grades)
  const gradeDistribution = computeGradeDistribution(grades)
  const gradeEvolution = computeGradeEvolution(courses, grades)

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
    <MainLayout userRole="professor" userName={userName} userEmail={userEmail}>
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Profesor</h1>
        <p className="text-muted-foreground">
          Bienvenido de nuevo, {userName}. Aquí tienes un resumen de tus cursos y estudiantes.
        </p>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cursos</CardTitle>
              <Book className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{courses.length}</div>
              <p className="text-xs text-muted-foreground">Semestre actual</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Estudiantes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {courses.reduce((sum, course) => sum + course.enrollments_count, 0)}
              </div>
              <p className="text-xs text-muted-foreground">+12 desde el último semestre</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Evaluaciones Pendientes</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {grades.filter((grade) => new Date(grade.grade_date) > new Date()).length}
              </div>
              <p className="text-xs text-muted-foreground">Por calificar</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Contenidos Publicados</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{contents.length}</div>
              <p className="text-xs text-muted-foreground">Este semestre</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Resumen</TabsTrigger>
            <TabsTrigger value="courses">Cursos</TabsTrigger>
            <TabsTrigger value="enrollments">Matrículas Recientes</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="col-span-4">
                <CardHeader>
                  <CardTitle>Evolución de Notas por Curso</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={gradeEvolution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 10]} />
                      <Tooltip />
                      <Legend />
                      {courses.map((course, index) => (
                        <Line
                          key={course.id}
                          type="monotone"
                          dataKey={course.signature}
                          stroke={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card className="col-span-3">
                <CardHeader>
                  <CardTitle>Distribución de Calificaciones</CardTitle>
                  <CardDescription>Todos los cursos</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={gradeDistribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#1976d2" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="courses">
            <Card>
              <CardHeader>
                <CardTitle>Mis Cursos</CardTitle>
                <CardDescription>Cursos que impartes actualmente</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <table className="w-full caption-bottom text-sm">
                    <thead className="[&_tr]:border-b">
                      <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Curso</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                          Estudiantes
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                          Nota Media
                        </th>
                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                      {courseStats.map((course, index) => (
                        <tr
                          key={index}
                          className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                        >
                          <td className="p-4 align-middle font-medium">{course.name}</td>
                          <td className="p-4 align-middle">{course.students}</td>
                          <td className="p-4 align-middle">
                            <span
                              className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                course.avgGrade >= 9
                                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                  : course.avgGrade >= 7
                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                                    : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                              }`}
                            >
                              {course.avgGrade.toFixed(1)}
                            </span>
                          </td>
                          <td className="p-4 align-middle text-right">
                            <Button variant="outline" size="sm">
                              Ver detalles
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
          <TabsContent value="enrollments">
            <Card>
              <CardHeader>
                <CardTitle>Matrículas Recientes</CardTitle>
                <CardDescription>Últimos estudiantes matriculados en tus cursos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentEnrollments.map((enrollment) => (
                    <div
                      key={enrollment.id}
                      className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar>
                          <AvatarFallback>
                            {enrollment.student_name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{enrollment.student_name}</p>
                          <p className="text-sm text-muted-foreground">{enrollment.course_name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-sm text-muted-foreground">
                          {new Date(enrollment.created_at).toLocaleDateString()}
                        </div>
                        <Button variant="outline" size="sm">
                          Ver perfil
                        </Button>
                      </div>
                    </div>
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