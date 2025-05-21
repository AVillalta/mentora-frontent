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
import { ChevronDown, Download, Edit, FileText, Plus, Search, Trash, AlertCircle, Link as LinkIcon } from "lucide-react"
import { AxiosError } from "axios"

interface Assignment {
  id: string
  title: string
  description: string
  course_id: string
  course: string
  due_date: string
  submissions: number
  total_students: number
  submissions_files: {
    id: string
    file_name: string
    url: string
    size: number
    student_id: string
    student_name: string
    created_at: string
  }[]
  created_at: string
  updated_at: string
}

interface Grade {
  id: string
  title: string
  grade_type: string
  grade_value: number | null
  grade_date: string
  enrollment_id: string
  assignment_id: string
  course_name: string
}

interface Course {
  id: string
  signature: string
}

interface ApiErrorResponse {
  message?: string
  data?: string
  errors?: { [key: string]: string[] }
}

export default function AdminContentsPage() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(
    typeof window !== "undefined" ? localStorage.getItem("token") : null
  )
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [userName, setUserName] = useState("Cargando...")
  const [userEmail, setUserEmail] = useState("cargando@mentora.edu")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCourse, setSelectedCourse] = useState("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isViewSubmissionsDialogOpen, setIsViewSubmissionsDialogOpen] = useState(false)
  const [isGradeDialogOpen, setIsGradeDialogOpen] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; name: string } | null>(null)
  const [gradeValue, setGradeValue] = useState("")
  const [currentGrade, setCurrentGrade] = useState<Grade | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const createDialogRef = useRef<HTMLDivElement>(null)
  const gradeDialogRef = useRef<HTMLDivElement>(null)
  const formKey = useRef(Date.now())

  const [assignmentFormData, setAssignmentFormData] = useState({
    title: "",
    description: "",
    course_id: "",
    due_date: "",
  })

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
        const [assignmentsRes, coursesRes] = await Promise.all([
          apiWithTimeout("/assignments"),
          apiWithTimeout("/courses"),
        ])
        setAssignments(assignmentsRes.data.data || [])
        setCourses(coursesRes.data.data || [])
        if (!assignmentsRes.data.data.length) {
          setApiError("No se encontraron tareas. Crea una tarea primero.")
        }
      } catch (err: unknown) {
        const error = err as AxiosError<ApiErrorResponse>
        setApiError(error.response?.data?.message || error.response?.data?.data || "Error al cargar los datos. Inténtalo de nuevo.")
        setAssignments([])
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
    if (formError && isGradeDialogOpen && gradeDialogRef.current) {
      gradeDialogRef.current.scrollTop = 0
    }
  }, [formError, isCreateDialogOpen, isGradeDialogOpen])

  const handleCreateAssignment = useCallback(async (event: React.FormEvent) => {
    event.preventDefault()
    event.stopPropagation()
    if (isSubmitting) {
      return
    }
    setIsSubmitting(true)
    setFormError(null)

    try {
      const payload = {
        ...assignmentFormData,
      }
      const response = await api.post("/assignments", payload)
      setIsCreateDialogOpen(false)
      setAssignmentFormData({ title: "", description: "", course_id: "", due_date: "" })
      formKey.current = Date.now()
      setFormError(null)
      const assignmentsResponse = await apiWithTimeout("/assignments")
      setAssignments(assignmentsResponse.data.data || [])
      setApiError(null)
    } catch (err: unknown) {
      const error = err as AxiosError<ApiErrorResponse>
      const errorMessages = error.response?.data?.errors
        ? Object.values(error.response.data.errors).flat().join(" ")
        : error.response?.data?.message || error.response?.data?.data || "Error al crear la tarea. Inténtalo de nuevo."
      setFormError(errorMessages)
    } finally {
      setIsSubmitting(false)
    }
  }, [assignmentFormData, isSubmitting])

  const handleGradeSubmission = useCallback(async (event: React.FormEvent) => {
    event.preventDefault()
    event.stopPropagation()
    if (isSubmitting || !selectedAssignment || !selectedStudent) {
      return
    }
    setIsSubmitting(true)
    setFormError(null)

    try {
      const payload = {
        grade_value: parseFloat(gradeValue),
        student_id: selectedStudent.id,
      }
      const response = await api.post(`/assignments/${selectedAssignment.id}/grade/${selectedStudent.id}`, payload)
      setIsGradeDialogOpen(false)
      setGradeValue("")
      setSelectedStudent(null)
      setCurrentGrade(response.data.data)
      setFormError(null)
    } catch (err: unknown) {
      const error = err as AxiosError<ApiErrorResponse>
      const errorMessages = error.response?.data?.errors
        ? Object.values(error.response.data.errors).flat().join(" ")
        : error.response?.data?.message || error.response?.data?.data || "Error al calificar la entrega. Inténtalo de nuevo."
      setFormError(errorMessages)
    } finally {
      setIsSubmitting(false)
    }
  }, [selectedAssignment, selectedStudent, gradeValue, isSubmitting])

  const handleDeleteAssignment = async (id: string) => {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      await api.delete(`/assignments/${id}`)
      const response = await apiWithTimeout("/assignments")
      setAssignments(response.data.data || [])
      setApiError(null)
    } catch (err: unknown) {
      const error = err as AxiosError<ApiErrorResponse>
      setApiError(error.response?.data?.message || error.response?.data?.data || "Error al eliminar la tarea. Inténtalo de nuevo.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleViewSubmissions = (assignment: Assignment) => {
    setSelectedAssignment(assignment)
    setIsViewSubmissionsDialogOpen(true)
  }

  const handleGradeClick = async (assignment: Assignment, student: { id: string; name: string }) => {
    setSelectedAssignment(assignment)
    setSelectedStudent(student)
    setGradeValue("")
    setCurrentGrade(null)
    try {
      const gradesResponse = await api.get(`/grades?assignment_id=${assignment.id}&student_id=${student.id}`)
      const grade = gradesResponse.data.data.find(
        (g: Grade) => g.assignment_id === assignment.id && g.enrollment_id === student.id
      )
      if (grade) {
        setCurrentGrade(grade)
        setGradeValue(grade.grade_value != null ? grade.grade_value.toString() : "")
      }
    } catch (err) {
      console.error("Error fetching grade:", err)
    }
    setIsGradeDialogOpen(true)
  }

  const filteredAssignments = assignments.filter((assignment) => {
    const matchesSearch =
      (assignment.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (assignment.description || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (assignment.course || "").toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCourse = selectedCourse === "all" || assignment.course_id === selectedCourse
    return matchesSearch && matchesCourse
  })

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
                <h1 className="text-3xl font-bold tracking-tight">Tareas</h1>
                <p className="text-muted-foreground">Gestiona las tareas de los cursos</p>
              </div>
              <div className="flex gap-2">
                <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
                  setIsCreateDialogOpen(open)
                  if (!open) {
                    setAssignmentFormData({ title: "", description: "", course_id: "", due_date: "" })
                    formKey.current = Date.now()
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button className="gap-2" disabled={isSubmitting}>
                      <Plus className="h-4 w-4" />
                      Nueva Tarea
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[80vh] overflow-y-auto" ref={createDialogRef}>
                    <DialogHeader>
                      <DialogTitle>Crear nueva tarea</DialogTitle>
                      <DialogDescription>Completa la información para crear una nueva tarea</DialogDescription>
                    </DialogHeader>
                    <form key={formKey.current} onSubmit={handleCreateAssignment}>
                      {formError && (
                        <Alert variant="destructive" className="mb-4">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Error</AlertTitle>
                          <AlertDescription>{formError}</AlertDescription>
                        </Alert>
                      )}
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="title">Título</Label>
                          <Input
                            id="title"
                            value={assignmentFormData.title}
                            onChange={(e) => setAssignmentFormData({ ...assignmentFormData, title: e.target.value })}
                            placeholder="Ej. Tarea Final"
                            disabled={isSubmitting}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="description">Descripción</Label>
                          <Input
                            id="description"
                            value={assignmentFormData.description}
                            onChange={(e) => setAssignmentFormData({ ...assignmentFormData, description: e.target.value })}
                            placeholder="Descripción de la tarea"
                            disabled={isSubmitting}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="course">Curso</Label>
                          <select
                            id="course"
                            value={assignmentFormData.course_id}
                            onChange={(e) => setAssignmentFormData({ ...assignmentFormData, course_id: e.target.value })}
                            className="w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            disabled={isSubmitting}
                          >
                            <option value="">Selecciona un curso</option>
                            {courses.map((course) => (
                              <option key={course.id} value={course.id}>
                                {course.signature}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="due_date">Fecha Límite</Label>
                          <Input
                            id="due_date"
                            type="datetime-local"
                            value={assignmentFormData.due_date}
                            onChange={(e) => setAssignmentFormData({ ...assignmentFormData, due_date: e.target.value })}
                            disabled={isSubmitting}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={isSubmitting}>
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                          {isSubmitting ? "Creando..." : "Crear tarea"}
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
                <CardTitle>Lista de Tareas</CardTitle>
                <CardDescription>Visualiza y gestiona las tareas de los cursos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por título, descripción o curso..."
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
                        <option key={course.id} value={course.id}>
                          {course.signature}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="rounded-md border">
                  <table className="w-full caption-bottom text-sm">
                    <thead className="[&_tr]:border-b">
                      <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Título</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Descripción</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Curso</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Fecha Límite</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Entregas</th>
                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                      {filteredAssignments.map((assignment) => (
                        <tr
                          key={assignment.id}
                          className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                        >
                          <td className="p-4 align-middle font-medium">{assignment.title}</td>
                          <td className="p-4 align-middle">{assignment.description}</td>
                          <td className="p-4 align-middle">{assignment.course}</td>
                          <td className="p-4 align-middle">{new Date(assignment.due_date).toLocaleDateString()}</td>
                          <td className="p-4 align-middle">{assignment.submissions}/{assignment.total_students}</td>
                          <td className="p-4 align-middle text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" disabled={isSubmitting}>
                                  <ChevronDown className="h-4 w-4" />
                                  <span className="sr-only">Abrir menú</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewSubmissions(assignment)}>
                                  <FileText className="mr-2 h-4 w-4" />
                                  <span>Ver entregas</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDeleteAssignment(assignment.id)}
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

            <Dialog open={isViewSubmissionsDialogOpen} onOpenChange={setIsViewSubmissionsDialogOpen}>
              <DialogContent className="max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Entregas de {selectedAssignment?.title}</DialogTitle>
                  <DialogDescription>Lista de entregas enviadas por los estudiantes</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  {selectedAssignment?.submissions_files.length ? (
                    selectedAssignment.submissions_files.map((submission) => (
                      <div key={submission.id} className="flex items-center justify-between border-b pb-2">
                        <div>
                          <p className="font-medium">{submission.file_name}</p>
                          <p className="text-sm text-muted-foreground">
                            Enviado por: {submission.student_name} el {new Date(submission.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(submission.url, "_blank")}
                          >
                            <LinkIcon className="mr-2 h-4 w-4" />
                            Ver
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleGradeClick(selectedAssignment!, {
                              id: submission.student_id,
                              name: submission.student_name,
                            })}
                          >
                            Calificar
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No hay entregas para esta tarea.</p>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsViewSubmissionsDialogOpen(false)}>
                    Cerrar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isGradeDialogOpen} onOpenChange={setIsGradeDialogOpen}>
              <DialogContent className="max-h-[80vh] overflow-y-auto" ref={gradeDialogRef}>
                <DialogHeader>
                  <DialogTitle>Calificar entrega de {selectedStudent?.name}</DialogTitle>
                  <DialogDescription>Ingrese la calificación para la tarea {selectedAssignment?.title}</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleGradeSubmission}>
                  {formError && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{formError}</AlertDescription>
                    </Alert>
                  )}
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="grade_value">Calificación</Label>
                      <Input
                        id="grade_value"
                        type="number"
                        step="0.1"
                        min="0"
                        max="10"
                        value={gradeValue}
                        onChange={(e) => setGradeValue(e.target.value)}
                        placeholder={currentGrade ? `Nota actual: ${currentGrade.grade_value}` : "8.5"}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsGradeDialogOpen(false)} disabled={isSubmitting}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Calificando..." : "Calificar"}
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