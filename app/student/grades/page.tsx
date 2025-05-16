"use client"

import { useState, useEffect } from "react"
import api from "@/lib/api"
import MainLayout from "@/components/layout/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ChevronDown, Download, FileText } from "lucide-react"
import { useRouter } from "next/navigation"

// Interfaz para las notas
interface Grade {
  id: number
  grade_type: string
  grade_value: number
  grade_date: string
  enrollment_id: number
  subject?: string
}

export default function StudentGradesPage() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(
    typeof window !== "undefined" ? localStorage.getItem("token") : null
  )
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const [grades, setGrades] = useState<Grade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSubject, setSelectedSubject] = useState("all")
  const [selectedType, setSelectedType] = useState("all")
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
            console.log("Autenticación exitosa, cargando página de notas")
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

  // Cargar notas
  useEffect(() => {
    const fetchGrades = async () => {
      if (loadingAuth || authError) return

      try {
        setLoading(true)
        const response = await api.get("/grades")
        console.log("Grades response:", response.data)
        setGrades(response.data.data || [])
      } catch (err: unknown) {
        setError("Error al cargar las notas. Inténtalo de nuevo.")
        console.error("Fetch error:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchGrades()
  }, [loadingAuth, authError])

  // Obtener asignaturas y tipos de notas dinámicamente
  const subjects = [...new Set(grades.map((grade) => grade.subject || "Sin asignatura"))]
  const gradeTypes = [...new Set(grades.map((grade) => grade.grade_type))]

  // Filtrar notas
  const filteredGrades = grades.filter((grade) => {
    const matchesSearch =
      (grade.subject || "Sin asignatura").toLowerCase().includes(searchTerm.toLowerCase()) ||
      grade.grade_type.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesSubject = selectedSubject === "all" || (grade.subject || "Sin asignatura") === selectedSubject
    const matchesType = selectedType === "all" || grade.grade_type === selectedType

    return matchesSearch && matchesSubject && matchesType
  })

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

        <Card>
          <CardHeader>
            <CardTitle>Historial de Calificaciones</CardTitle>
            <CardDescription>Visualiza y filtra tus calificaciones por asignatura o tipo de evaluación</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1">
                <Input
                  placeholder="Buscar por asignatura o tipo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full sm:w-[180px] h-10 px-3 py-2 text-sm border rounded-md bg-transparent focus:outline-none focus:ring-2 focus:ring-ring"
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
                  className="w-full sm:w-[180px] h-10 px-3 py-2 text-sm border rounded-md bg-transparent focus:outline-none focus:ring-2 focus:ring-ring"
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
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">ID Matrícula</th>
                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {filteredGrades.map((grade) => (
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
                      <td className="p-4 align-middle">{grade.enrollment_id}</td>
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