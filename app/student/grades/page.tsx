"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import MainLayout from "@/components/layout/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ChevronDown, Download, FileText, Search } from "lucide-react"
import Link from "next/link"
import api from "@/lib/api"
import { AxiosError } from "axios"

interface Grade {
  id: string
  grade_type: string
  grade_value: number | string | null | undefined
  grade_date: string
  enrollment_id: string
  course_name?: string
  professor_name?: string
  course_id?: number
}

interface ApiErrorResponse {
  message?: string
  data?: string
  errors?: { [key: string]: string[] }
}

export default function StudentGradesPage() {
  const router = useRouter()
  const [grades, setGrades] = useState<Grade[]>([])
  const [user, setUser] = useState<{ name: string; email: string }>({ name: "Cargando...", email: "cargando@estudiante.edu" })
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSubject, setSelectedSubject] = useState("all")
  const [selectedType, setSelectedType] = useState("all")
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

  // Fetch de calificaciones
  useEffect(() => {
    if (loadingAuth || !token) return

    const fetchGrades = async () => {
      try {
        setLoadingData(true)
        console.log("Iniciando fetch de calificaciones...")
        const response = await api.get("/grades", { timeout: 10000 })
        console.log("Respuesta de /grades:", response.data)
        const data = response.data.data || []
        // Normalizar datos
        const validGrades = data
          .map((grade: Grade) => ({
            ...grade,
            grade_value: grade.grade_value != null && typeof grade.grade_value === 'string' 
              ? parseFloat(grade.grade_value) 
              : grade.grade_value,
            course_id: grade.course_id || 0,
          }))
          .filter((grade: Grade) => {
            if (grade.grade_value == null || typeof grade.grade_value !== 'number') {
              return false
            }
            return true
          })
        console.log("Calificaciones normalizadas:", validGrades)
        setGrades(validGrades)
        setError(null)
      } catch (err: unknown) {
        const error = err as AxiosError<ApiErrorResponse>
        console.error("Error al cargar calificaciones:", error.message, error.response?.data)
        setError(error.response?.data?.message || "Error al cargar las calificaciones.")
      } finally {
        setLoadingData(false)
        console.log("Fetch de calificaciones completado, loadingData:", false)
      }
    }

    fetchGrades()
  }, [loadingAuth, token])

  // Filtros
  const subjects = [...new Set(grades.map((grade) => grade.course_name).filter(Boolean))] as string[]
  const gradeTypes = [...new Set(grades.map((grade) => grade.grade_type).filter(Boolean))] as string[]

  const filteredGrades = grades.filter((grade) => {
    const matchesSearch =
      (grade.course_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (grade.grade_type?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
    const matchesSubject = selectedSubject === "all" || grade.course_name === selectedSubject
    const matchesType = selectedType === "all" || grade.grade_type === selectedType

    return matchesSearch && matchesSubject && matchesType
  })

  // Calcular el promedio general
  const calculateOverallAverage = () => {
    if (filteredGrades.length === 0) return "0.0"
    const validGrades = filteredGrades.filter(grade => grade.grade_value != null && typeof grade.grade_value === 'number')
    const sum = validGrades.reduce((total, grade) => total + (grade.grade_value as number), 0)
    return (sum / validGrades.length).toFixed(1)
  }

  // Calcular promedios por asignatura
  const calculateSubjectAverages = () => {
    const averages: { [key: string]: string } = {}
    subjects.forEach((subject) => {
      const subjectGrades = filteredGrades.filter((grade) => grade.course_name === subject)
      const validGrades = subjectGrades.filter(grade => grade.grade_value != null && typeof grade.grade_value === 'number')
      const sum = validGrades.reduce((total, grade) => total + (grade.grade_value as number), 0)
      averages[subject] = validGrades.length > 0 ? (sum / validGrades.length).toFixed(1) : "0.0"
    })
    return averages
  }

  const subjectAverages = calculateSubjectAverages()

  // Si está cargando autenticación
  if (loadingAuth) {
    return (
      <MainLayout userRole="student" userName={user.name} userEmail={user.email}>
        <div className="flex flex-col items-center justify-center h-[50vh]">
          <p className="text-xl">Verificando autenticación...</p>
        </div>
      </MainLayout>
    )
  }

  // Si está cargando datos
  if (loadingData) {
    return (
      <MainLayout userRole="student" userName={user.name} userEmail={user.email}>
        <div className="flex flex-col items-center justify-center h-[50vh]">
          <p className="text-xl">Cargando calificaciones...</p>
        </div>
      </MainLayout>
    )
  }

  // Si hay error
  if (error) {
    return (
      <MainLayout userRole="student" userName={user.name} userEmail={user.email}>
        <div className="flex flex-col items-center justify-center h-[50vh]">
          <h1 className="text-2xl font-bold">{error}</h1>
          <p className="text-muted-foreground mt-2">Ocurrió un problema al cargar las calificaciones.</p>
          <Button asChild className="mt-4">
            <Link href="/student">Volver al Dashboard</Link>
          </Button>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout userRole="student" userName={user.name} userEmail={user.email}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Mis Notas</h1>
            <p className="text-muted-foreground">Consulta todas tus calificaciones</p>
          </div>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exportar notas
          </Button>
        </div>

        {/* Resumen de calificaciones */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Promedio General</CardTitle>
              <div className="h-4 w-4 text-muted-foreground">{calculateOverallAverage()}</div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{calculateOverallAverage()}</div>
              <p className="text-xs text-muted-foreground">Todas las asignaturas</p>
            </CardContent>
          </Card>

          {subjects.slice(0, 3).map((subject) => (
            <Card key={subject}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium truncate">{subject}</CardTitle>
                <div className="h-4 w-4 text-muted-foreground">{subjectAverages[subject]}</div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{subjectAverages[subject]}</div>
                <p className="text-xs text-muted-foreground">
                  <Button variant="link" className="h-auto p-0" asChild>
                    <Link href={`/student/courses/${grades.find((g) => g.course_name === subject)?.course_id || 0}`}>
                      Ver curso
                    </Link>
                  </Button>
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Historial de Calificaciones</CardTitle>
            <CardDescription>Visualiza y filtra tus calificaciones por asignatura o tipo de evaluación</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por asignatura o tipo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full sm:w-[180px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="all">Todas las asignaturas</option>
                  {subjects.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full sm:w-[180px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="all">Todos los tipos</option>
                  {gradeTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-md border">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Asignatura</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Tipo</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Nota</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Fecha</th>
                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {filteredGrades.map((grade) => (
                    <tr
                      key={grade.id}
                      className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                    >
                      <td className="p-4 align-middle">
                        <Link href={`/student/courses/${grade.course_id || 0}`} className="hover:underline">
                          {grade.course_name || "Sin asignatura"}
                        </Link>
                      </td>
                      <td className="p-4 align-middle">{grade.grade_type || "N/A"}</td>
                      <td className="p-4 align-middle font-medium">
                        <span
                          className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            (grade.grade_value as number) >= 9
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                              : (grade.grade_value as number) >= 7
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                                : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                          }`}
                        >
                          {(grade.grade_value as number).toFixed(1)}
                        </span>
                      </td>
                      <td className="p-4 align-middle">{new Date(grade.grade_date).toLocaleDateString()}</td>
                      <td className="p-4 align-middle text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <ChevronDown className="h-4 w-4" />
                              <span className="sr-only">Abrir menú</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <FileText className="mr-2 h-4 w-4" />
                              <span>Ver detalles</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Download className="mr-2 h-4 w-4" />
                              <span>Descargar certificado</span>
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
      </div>
    </MainLayout>
  )
}