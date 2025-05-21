"use client"

import { useState, useEffect, ChangeEvent } from "react"
import { useRouter } from "next/navigation"
import api from "@/lib/api"
import MainLayout from "@/components/layout/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Book,
  Calendar,
  Clock,
  Download,
  FileText,
  Film,
  Link as LinkIcon,
  Search,
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
import { AxiosError } from "axios"

interface Content {
  id: string
  name: string
  description: string
  bibliography?: string
  order: number
  file_path?: string
  type: string
  format: string
  size: number
  views: number
  downloads: number
  duration?: string
  course_id: string
  course: string
  created_at: string
  updated_at: string
}

interface Assignment {
  id: string
  title: string
  description: string
  course_id: string
  course: string
  due_date: string
  points: number
  submissions: number
  total_students: number
  submissions_files: { id: string; file_name: string; url: string; size: number; student_id: string; created_at: string }[]
  created_at: string
  updated_at: string
}

interface ApiErrorResponse {
  message?: string
  data?: string
  errors?: { [key: string]: string[] }
}

export default function StudentContentsPage() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(
    typeof window !== "undefined" ? localStorage.getItem("token") : null
  )
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const [contents, setContents] = useState<Content[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userName, setUserName] = useState("Cargando...")
  const [userEmail, setUserEmail] = useState("cargando@estudiante.edu")
  const [userId, setUserId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [submissionFile, setSubmissionFile] = useState<File | null>(null)

  // Verificar autenticación
  useEffect(() => {
    if (!token) {
      setAuthError("No estás autenticado. Redirigiendo al login...")
      router.push("/login")
      return
    }

    const verifyUser = async () => {
      try {
        console.log("Verificando usuario...")
        const response = await api.get("/user")
        const { role, name, email, id } = response.data.data
        console.log("Usuario verificado:", { role, name, email, id })
        if (role !== "student") {
          setAuthError("Acceso denegado. Redirigiendo al login...")
          localStorage.removeItem("token")
          router.push("/login")
          return
        }
        setUserName(name || "Estudiante")
        setUserEmail(email || "estudiante@estudiante.edu")
        setUserId(id)
        setLoadingAuth(false)
      } catch (err: unknown) {
        const error = err as AxiosError<ApiErrorResponse>
        console.error("Error al verificar usuario:", error.response?.data || error.message)
        setAuthError(error.response?.data?.message || "Token inválido. Redirigiendo al login...")
        localStorage.removeItem("token")
        router.push("/login")
      }
    }

    verifyUser()
  }, [token, router])

  // Fetch de contenidos y tareas
  useEffect(() => {
    if (loadingAuth || authError) return

    const fetchData = async () => {
      try {
        setLoading(true)
        console.log("Iniciando fetch de datos...")
        const [contentsRes, assignmentsRes] = await Promise.all([
          api.get("/contents", { timeout: 10000 }),
          api.get("/assignments", { timeout: 10000 }),
        ])
        console.log("Respuesta de /contents:", contentsRes.data)
        console.log("Respuesta de /assignments:", assignmentsRes.data)
        setContents(contentsRes.data.data || [])
        setAssignments(assignmentsRes.data.data || [])
        setError(null)
      } catch (err: unknown) {
        const error = err as AxiosError<ApiErrorResponse>
        console.error("Error al cargar datos:", error.response?.data || error.message)
        setError(error.response?.data?.message || "Error al cargar los datos. Inténtalo de nuevo.")
      } finally {
        setLoading(false)
        console.log("Fetch de datos completado, loading:", false)
      }
    }

    fetchData()
  }, [loadingAuth, authError])

  // Funciones auxiliares
  const handleViewDetails = (assignment: Assignment) => {
    setSelectedAssignment(assignment)
    setSubmissionFile(null)
    setIsAssignmentDialogOpen(true)
    console.log("Selected assignment:", assignment)
    console.log("Has submitted:", hasSubmitted(assignment))
    console.log("Is past due:", isPastDue(assignment.due_date))
  }

  const handleSubmitAssignment = async () => {
    if (!selectedAssignment || !submissionFile) return

    try {
      const formData = new FormData()
      formData.append("file", submissionFile)

      await api.post(`/assignments/${selectedAssignment.id}/submit`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })

      setIsAssignmentDialogOpen(false)
      setSubmissionFile(null)
      alert("Entrega enviada con éxito")

      // Actualizar la lista de tareas
      const response = await api.get("/assignments")
      setAssignments(response.data.data || [])
    } catch (err: unknown) {
      const error = err as AxiosError<ApiErrorResponse>
      console.error("Error al enviar entrega:", error.response?.data || error.message)
      setError(error.response?.data?.message || "Error al enviar la entrega. Inténtalo de nuevo.")
    }
  }

  const filteredContents = contents.filter(
    (content) =>
      content.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      content.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      content.course.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredAssignments = assignments.filter(
    (assignment) =>
      assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.course.toLowerCase().includes(searchTerm.toLowerCase())
  )

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

  const isNewContent = (createdAt: string) => {
    const createdDate = new Date(createdAt)
    const now = new Date()
    const diffDays = (now.getTime() - createdDate.getTime()) / (1000 * 3600 * 24)
    return diffDays <= 7
  }

  const hasSubmitted = (assignment: Assignment) => {
    const submitted = Array.isArray(assignment.submissions_files) && assignment.submissions_files.some(
      (submission) => submission.student_id === userId
    )
    console.log("hasSubmitted:", submitted, "submissions_files:", assignment.submissions_files, "userId:", userId)
    return submitted
  }

  const isPastDue = (dueDate: string) => {
    const pastDue = new Date(dueDate) < new Date()
    console.log("isPastDue:", pastDue, "due_date:", dueDate)
    return pastDue
  }

  // Si está cargando autenticación
  if (loadingAuth) {
    return (
      <MainLayout userRole="student" userName={userName} userEmail={userEmail}>
        <div className="flex flex-col items-center justify-center h-[50vh]">
          <p className="text-xl">Verificando autenticación...</p>
        </div>
      </MainLayout>
    )
  }

  // Si hay error de autenticación
  if (authError) {
    return (
      <MainLayout userRole="student" userName={userName} userEmail={userEmail}>
        <div className="flex flex-col items-center justify-center h-[50vh]">
          <p className="text-red-500 text-xl">{authError}</p>
        </div>
      </MainLayout>
    )
  }

  // Si está cargando datos
  if (loading) {
    return (
      <MainLayout userRole="student" userName={userName} userEmail={userEmail}>
        <div className="flex flex-col items-center justify-center h-[50vh]">
          <p className="text-xl">Cargando contenidos...</p>
        </div>
      </MainLayout>
    )
  }

  // Si hay error
  if (error) {
    return (
      <MainLayout userRole="student" userName={userName} userEmail={userEmail}>
        <div className="flex flex-col items-center justify-center h-[50vh]">
          <h1 className="text-2xl font-bold">{error}</h1>
          <p className="text-muted-foreground mt-2">Ocurrió un problema al cargar los contenidos.</p>
          <Button asChild className="mt-4">
            <Link href="/student">Volver al Dashboard</Link>
          </Button>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout userRole="student" userName={userName} userEmail={userEmail}>
      <div className="flex flex-col gap-6 p-4">
        {/* Breadcrumbs */}
        <Breadcrumb className="mb-2">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/student">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink>Contenidos</BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Contenidos</h1>
            <p className="text-muted-foreground">Accede a los materiales de estudio y tareas de tus cursos</p>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título, descripción o curso..."
              value={searchTerm}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <Tabs defaultValue="materials" className="space-y-4">
          <TabsList>
            <TabsTrigger value="materials">Materiales</TabsTrigger>
            <TabsTrigger value="assignments">Tareas</TabsTrigger>
          </TabsList>
          <TabsContent value="materials" className="space-y-4">
            {filteredContents.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">No hay materiales disponibles.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {filteredContents.map((content) => (
                  <Card key={content.id} className="flex flex-row overflow-hidden">
                    <div className="flex items-center justify-center p-6 bg-muted/30 w-24">
                      {getFileIcon(content.type, content.format)}
                    </div>
                    <div className="flex-1">
                      <CardHeader className="p-4 pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{content.name}</CardTitle>
                            <CardDescription className="line-clamp-1">{content.description}</CardDescription>
                          </div>
                          {isNewContent(content.created_at) && (
                            <Badge className="bg-primary text-primary-foreground">Nuevo</Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 space-y-2">
                        <div className="flex items-center text-sm">
                          <Book className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span>{content.course}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span>{new Date(content.created_at).toLocaleDateString()}</span>
                        </div>
                        {content.type === "video" && content.duration && (
                          <div className="flex items-center text-sm">
                            <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span>Duración: {content.duration}</span>
                          </div>
                        )}
                        <div className="flex items-center text-sm">
                          <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span>Tamaño: {(content.size / 1024 / 1024).toFixed(1)} MB</span>
                        </div>
                        <div className="pt-2 flex gap-2">
                          <Button
                            variant="outline"
                            className="flex-1"
                            disabled={!content.file_path}
                            onClick={() => content.file_path && window.open(content.file_path, "_blank")}
                          >
                            <LinkIcon className="mr-2 h-4 w-4" />
                            Ver
                          </Button>
                          <Button
                            className="flex-1"
                            disabled={!content.file_path}
                            onClick={() => content.file_path && window.open(content.file_path, "_blank")}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Descargar
                          </Button>
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="assignments" className="space-y-4">
            {filteredAssignments.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">No hay tareas disponibles.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {filteredAssignments.map((assignment) => (
                  <Card key={assignment.id}>
                    <CardHeader className="p-4 pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{assignment.title}</CardTitle>
                        <Badge
                          variant="outline"
                          className={
                            hasSubmitted(assignment)
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                              : isPastDue(assignment.due_date)
                              ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                          }
                        >
                          {hasSubmitted(assignment) ? "Enviada" : isPastDue(assignment.due_date) ? "Vencida" : "Pendiente"}
                        </Badge>
                      </div>
                      <CardDescription>{assignment.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 space-y-3">
                      <div className="flex items-center text-sm">
                        <Book className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span>{assignment.course}</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          Fecha límite: {new Date(assignment.due_date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center text-sm">
                        <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span>Puntos: {assignment.points}</span>
                      </div>
                      <div className="pt-2">
                        <Dialog open={isAssignmentDialogOpen} onOpenChange={setIsAssignmentDialogOpen}>
                          <DialogTrigger asChild>
                            <Button className="w-full" onClick={() => handleViewDetails(assignment)}>
                              Ver detalles
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
                                  <Label>Curso</Label>
                                  <p className="text-sm text-muted-foreground">{selectedAssignment.course}</p>
                                </div>
                                <div className="grid gap-2">
                                  <Label>Fecha límite</Label>
                                  <p className="text-sm text-muted-foreground">
                                    {new Date(selectedAssignment.due_date).toLocaleDateString()}
                                  </p>
                                </div>
                                <div className="grid gap-2">
                                  <Label>Puntos</Label>
                                  <p className="text-sm text-muted-foreground">{selectedAssignment.points}</p>
                                </div>
                                {hasSubmitted(selectedAssignment) ? (
                                  <div className="grid gap-2">
                                    <Label>Entrega previa</Label>
                                    <p className="text-sm text-green-600">
                                      Ya has enviado una entrega: {
                                        selectedAssignment.submissions_files.find(
                                          (s) => s.student_id === userId
                                        )?.file_name || "Archivo enviado"
                                      }
                                    </p>
                                  </div>
                                ) : isPastDue(selectedAssignment.due_date) ? (
                                  <p className="text-sm text-red-600">La fecha límite ha pasado.</p>
                                ) : (
                                  <div className="grid gap-2">
                                    <Label htmlFor="submission-file">Subir entrega</Label>
                                    <Input
                                      id="submission-file"
                                      type="file"
                                      accept=".pdf,.doc,.docx"
                                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                        setSubmissionFile(e.target.files?.[0] || null)
                                      }
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setIsAssignmentDialogOpen(false)
                                  setSubmissionFile(null)
                                }}
                              >
                                Cerrar
                              </Button>
                              {selectedAssignment && !hasSubmitted(selectedAssignment) && !isPastDue(selectedAssignment.due_date) && (
                                <Button onClick={handleSubmitAssignment} disabled={!submissionFile}>
                                  Enviar entrega
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
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  )
}