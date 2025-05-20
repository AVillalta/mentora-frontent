"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ChevronDown, Download, Edit, FileText, Plus, Search, Trash, AlertCircle } from "lucide-react"
import { AxiosError } from "axios"

interface Grade {
  id: string
  grade_type: string
  grade_value: number | string | null | undefined
  grade_date: string
  enrollment_id: string
  student_name: string
  student_email: string | null
  course_name: string
  professor_name: string
}

interface Enrollment {
  id: string
  student_name: string
  student_email: string | null
  course_name: string
}

interface ApiErrorResponse {
  message?: string
  data?: string
  errors?: { [key: string]: string[] }
}

const gradeTypes = ['ordinary', 'extraordinary', 'work', 'partial', 'final']

export default function AdminGradesPage() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(
    typeof window !== "undefined" ? localStorage.getItem("token") : null
  )
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const [grades, setGrades] = useState<Grade[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [userName, setUserName] = useState("Cargando...")
  const [userEmail, setUserEmail] = useState("cargando@mentora.edu")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCourse, setSelectedCourse] = useState("all")
  const [selectedType, setSelectedType] = useState("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const createDialogRef = useRef<HTMLDivElement>(null)
  const editDialogRef = useRef<HTMLDivElement>(null)
  const formKey = useRef(Date.now())

  const [gradeFormData, setGradeFormData] = useState({
    enrollment_id: "",
    grade_type: "",
    grade_value: "",
    grade_date: "",
  })

  const courses = [...new Set(enrollments.map((enrollment) => enrollment.course_name))]

  const apiWithTimeout = async (url: string, timeoutMs: number = 10000) => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await api.get(url, {
        signal: controller.signal,
        headers: { Authorization: `Bearer ${token}` },
      })
      clearTimeout(timeoutId)
      return response
    } catch (err) {
      clearTimeout(timeoutId)
      throw err
    }
  }

  useEffect(() => {
    if (!token) {
      setAuthError("No estás autenticado. Redirigiendo al login...")
      router.push("/login")
      return
    }

    const verifyUser = async () => {
      try {
        const response = await apiWithTimeout("/user")
        const { role, name, email } = response.data.data
        if (role !== "admin") {
          setAuthError("Acceso denegado. Redirigiendo al login...")
          localStorage.removeItem("token")
          router.push("/login")
          return
        }
        setUserName(name || "Admin Sistema")
        setUserEmail(email || "admin@mentora.edu")
        setLoadingAuth(false)
      } catch (err) {
        setAuthError("Token inválido. Redirigiendo al login...")
        localStorage.removeItem("token")
        router.push("/login")
      }
    }

    verifyUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, router])

  useEffect(() => {
    if (loadingAuth || authError || !token) {
      return
    }

    const fetchData = async () => {
      try {
        setLoading(true)
        const [gradesRes, enrollmentsRes] = await Promise.all([
          apiWithTimeout("/grades"),
          apiWithTimeout("/enrollments"),
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
        setEnrollments(enrollmentsRes.data.data || [])
        if (!enrollmentsRes.data.data.length) {
          setApiError("No se encontraron matrículas. Crea una matrícula primero.")
        }
      } catch (err: unknown) {
        const error = err as AxiosError<ApiErrorResponse>
        setApiError(error.response?.data?.message || error.response?.data?.data || "Error al cargar los datos. Inténtalo de nuevo.")
        setGrades([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingAuth, authError, token])

  useEffect(() => {
    if (formError && isCreateDialogOpen && createDialogRef.current) {
      createDialogRef.current.scrollTop = 0
    }
    if (formError && isEditDialogOpen && editDialogRef.current) {
      editDialogRef.current.scrollTop = 0
    }
  }, [formError, isCreateDialogOpen, isEditDialogOpen])

  const handleCreateGrade = useCallback(async (event: React.FormEvent) => {
    event.preventDefault()
    event.stopPropagation()
    if (isSubmitting) {
      return
    }
    setIsSubmitting(true)
    setFormError(null)

    try {
      const payload = {
        ...gradeFormData,
        grade_value: gradeFormData.grade_value ? parseFloat(gradeFormData.grade_value) : null,
      }
      const response = await api.post("/grades", payload)
      setIsCreateDialogOpen(false)
      setGradeFormData({ enrollment_id: "", grade_type: "", grade_value: "", grade_date: "" })
      formKey.current = Date.now()
      setFormError(null)
      const gradesResponse = await apiWithTimeout("/grades")
      setGrades(gradesResponse.data.data || [])
      setApiError(null)
    } catch (err: unknown) {
      const error = err as AxiosError<ApiErrorResponse>
      const errorMessages = error.response?.data?.errors
        ? Object.values(error.response.data.errors).flat().join(" ")
        : error.response?.data?.message || error.response?.data?.data || "Error al crear la calificación. Inténtalo de nuevo."
      setFormError(errorMessages)
    } finally {
      setIsSubmitting(false)
    }
  }, [gradeFormData, isSubmitting]) // eslint-disable-next-line react-hooks/exhaustive-deps

  const handleEditGrade = useCallback(async (event: React.FormEvent) => {
    event.preventDefault()
    event.stopPropagation()
    if (isSubmitting) return
    setIsSubmitting(true)
    setFormError(null)

    if (!selectedGrade) return

    try {
      const payload = {
        ...gradeFormData,
        grade_value: gradeFormData.grade_value ? parseFloat(gradeFormData.grade_value) : null,
      }
      await api.put(`/grades/${selectedGrade.id}`, payload)
      setIsEditDialogOpen(false)
      setGradeFormData({ enrollment_id: "", grade_type: "", grade_value: "", grade_date: "" })
      setSelectedGrade(null)
      setFormError(null)
      const response = await apiWithTimeout("/grades")
      setGrades(response.data.data || [])
      setApiError(null)
    } catch (err: unknown) {
      const error = err as AxiosError<ApiErrorResponse>
      const errorMessages = error.response?.data?.errors
        ? Object.values(error.response.data.errors).flat().join(" ")
        : error.response?.data?.message || error.response?.data?.data || "Error al editar la calificación. Inténtalo de nuevo."
      setFormError(errorMessages)
    } finally {
      setIsSubmitting(false)
    }
  }, [selectedGrade, gradeFormData, isSubmitting]) // eslint-disable-next-line react-hooks/exhaustive-deps

  const handleDeleteGrade = async (id: string) => {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      await api.delete(`/grades/${id}`)
      const response = await apiWithTimeout("/grades")
      setGrades(response.data.data || [])
      setApiError(null)
    } catch (err: unknown) {
      const error = err as AxiosError<ApiErrorResponse>
      setApiError(error.response?.data?.message || error.response?.data?.data || "Error al eliminar la calificación. Inténtalo de nuevo.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditClick = (grade: Grade) => {
    setSelectedGrade(grade)
    setGradeFormData({
      enrollment_id: grade.enrollment_id,
      grade_type: grade.grade_type,
      grade_value: grade.grade_value != null ? grade.grade_value.toString() : "",
      grade_date: grade.grade_date,
    })
    setFormError(null)
    setIsEditDialogOpen(true)
  }

  const filteredGrades = grades.filter((grade) => {
    const matchesSearch =
      (grade.student_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (grade.student_email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (grade.course_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (grade.professor_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (grade.grade_type || "").toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCourse = selectedCourse === "all" || grade.course_name === selectedCourse
    const matchesType = selectedType === "all" || grade.grade_type === selectedType

    return matchesSearch && matchesCourse && matchesType
  })

  const formatGradeValue = (value: Grade['grade_value']): string => {
    if (value == null || value === undefined) return "Pendiente"
    const num = typeof value === "string" ? parseFloat(value) : value
    return typeof num === "number" && !isNaN(num) ? num.toFixed(1) : "Pendiente"
  }

  return (
    <MainLayout userRole="admin" userName={userName} userEmail={userEmail}>
      <div className="flex flex-col gap-6 p-4">
        {loadingAuth ? (
          <div className="text-center">Verificando autenticación...</div>
        ) : authError ? (
          <div className="text-red-500 text-center">{authError}</div>
        ) : loading ? (
          <div className="text-center">Cargando datos...</div>
        ) : (
          <>
            {apiError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{apiError}</AlertDescription>
              </Alert>
            )}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Calificaciones</h1>
                <p className="text-muted-foreground">Gestiona las calificaciones de los estudiantes</p>
              </div>
              <div className="flex gap-2">
                <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
                  setIsCreateDialogOpen(open)
                  if (!open) {
                    setGradeFormData({ enrollment_id: "", grade_type: "", grade_value: "", grade_date: "" })
                    formKey.current = Date.now()
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button className="gap-2" disabled={isSubmitting}>
                      <Plus className="h-4 w-4" />
                      Nueva Calificación
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[80vh] overflow-y-auto" ref={createDialogRef}>
                    <DialogHeader>
                      <DialogTitle>Registrar nueva calificación</DialogTitle>
                      <DialogDescription>Completa la información para registrar una nueva calificación</DialogDescription>
                    </DialogHeader>
                    <form key={formKey.current} onSubmit={handleCreateGrade}>
                      {formError && (
                        <Alert variant="destructive" className="mb-4">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Error</AlertTitle>
                          <AlertDescription>{formError}</AlertDescription>
                        </Alert>
                      )}
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="enrollment">Matrícula</Label>
                          <select
                            id="enrollment"
                            value={gradeFormData.enrollment_id}
                            onChange={(e) => setGradeFormData({ ...gradeFormData, enrollment_id: e.target.value })}
                            className="w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            disabled={isSubmitting}
                          >
                            <option value="">Selecciona una matrícula</option>
                            {enrollments.map((enrollment) => (
                              <option key={enrollment.id} value={enrollment.id}>
                                {enrollment.student_name} - {enrollment.course_name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="grade_type">Tipo de evaluación</Label>
                          <select
                            id="grade_type"
                            value={gradeFormData.grade_type}
                            onChange={(e) => setGradeFormData({ ...gradeFormData, grade_type: e.target.value })}
                            className="w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            disabled={isSubmitting}
                          >
                            <option value="">Selecciona un tipo</option>
                            {gradeTypes.map((type) => (
                              <option key={type} value={type}>
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="grade_value">Calificación</Label>
                          <Input
                            id="grade_value"
                            type="number"
                            step="0.1"
                            min="0"
                            max="10"
                            value={gradeFormData.grade_value}
                            onChange={(e) => setGradeFormData({ ...gradeFormData, grade_value: e.target.value })}
                            placeholder="8.5"
                            disabled={isSubmitting}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="grade_date">Fecha</Label>
                          <Input
                            id="grade_date"
                            type="date"
                            value={gradeFormData.grade_date}
                            onChange={(e) => setGradeFormData({ ...gradeFormData, grade_date: e.target.value })}
                            disabled={isSubmitting}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={isSubmitting}>
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                          {isSubmitting ? "Registrando..." : "Registrar calificación"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
                <Button variant="outline" className="gap-2" disabled>
                  <Download className="h-4 w-4" />
                  Exportar
                </Button>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Lista de Calificaciones</CardTitle>
                <CardDescription>Visualiza y gestiona las calificaciones de los estudiantes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por estudiante, curso o tipo..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 w-full"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <select
                      value={selectedCourse}
                      onChange={(e) => setSelectedCourse(e.target.value)}
                      className="w-full sm:w-[250px] border rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="all">Todos los cursos</option>
                      {courses.map((course) => (
                        <option key={course} value={course}>
                          {course}
                        </option>
                      ))}
                    </select>
                    <select
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value)}
                      className="w-full sm:w-[180px] border rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="all">Todos los tipos</option>
                      {gradeTypes.map((type) => (
                        <option key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="rounded-md border">
                  <table className="w-full caption-bottom text-sm">
                    <thead className="[&_tr]:border-b">
                      <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Estudiante</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Curso</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Profesor</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Tipo</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Calificación</th>
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
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarFallback>
                                  {grade.student_name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{grade.student_name}</div>
                                <div className="text-xs text-muted-foreground">{grade.student_email || "Sin email"}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 align-middle">{grade.course_name}</td>
                          <td className="p-4 align-middle">{grade.professor_name}</td>
                          <td className="p-4 align-middle">{grade.grade_type.charAt(0).toUpperCase() + grade.grade_type.slice(1)}</td>
                          <td className="p-4 align-middle font-medium">
                            <span
                              className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                grade.grade_value && typeof grade.grade_value === 'number' && grade.grade_value >= 9
                                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                  : grade.grade_value && typeof grade.grade_value === 'number' && grade.grade_value >= 7
                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                                    : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                              }`}
                            >
                              {formatGradeValue(grade.grade_value)}
                            </span>
                          </td>
                          <td className="p-4 align-middle">{new Date(grade.grade_date).toLocaleDateString()}</td>
                          <td className="p-4 align-middle text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" disabled={isSubmitting}>
                                  <ChevronDown className="h-4 w-4" />
                                  <span className="sr-only">Abrir menú</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <FileText className="mr-2 h-4 w-4" />
                                  <span>Ver detalles</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditClick(grade)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  <span>Editar</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDeleteGrade(grade.id)}
                                >
                                  <Trash className="mr-2 h-4 w-4" />
                                  <span>Eliminar</span>
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

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent className="max-h-[80vh] overflow-y-auto" ref={editDialogRef}>
                <DialogHeader>
                  <DialogTitle>Editar calificación</DialogTitle>
                  <DialogDescription>Modifica la información de la calificación</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleEditGrade}>
                  {formError && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{formError}</AlertDescription>
                    </Alert>
                  )}
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-enrollment">Matrícula</Label>
                      <select
                        id="edit-enrollment"
                        value={gradeFormData.enrollment_id}
                        onChange={(e) => setGradeFormData({ ...gradeFormData, enrollment_id: e.target.value })}
                        className="w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        disabled={isSubmitting}
                      >
                        <option value="">Selecciona una matrícula</option>
                        {enrollments.map((enrollment) => (
                          <option key={enrollment.id} value={enrollment.id}>
                            {enrollment.student_name} - {enrollment.course_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-grade_type">Tipo de evaluación</Label>
                      <select
                        id="edit-grade_type"
                        value={gradeFormData.grade_type}
                        onChange={(e) => setGradeFormData({ ...gradeFormData, grade_type: e.target.value })}
                        className="w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        disabled={isSubmitting}
                      >
                        <option value="">Selecciona un tipo</option>
                        {gradeTypes.map((type) => (
                          <option key={type} value={type}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-grade_value">Calificación</Label>
                      <Input
                        id="edit-grade_value"
                        type="number"
                        step="0.1"
                        min="0"
                        max="10"
                        value={gradeFormData.grade_value}
                        onChange={(e) => setGradeFormData({ ...gradeFormData, grade_value: e.target.value })}
                        placeholder="8.5"
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-grade_date">Fecha</Label>
                      <Input
                        id="edit-grade_date"
                        type="date"
                        value={gradeFormData.grade_date}
                        onChange={(e) => setGradeFormData({ ...gradeFormData, grade_date: e.target.value })}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSubmitting}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Guardando..." : "Guardar cambios"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </MainLayout>
  )
}