"use client";

import { useState, useEffect, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import MainLayout from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Book,
  Calendar,
  ChevronDown,
  Edit,
  FileText,
  Film,
  Plus,
  Search,
  Trash,
  Upload,
  FileCode,
  FileImage,
  File as FilePdf,
  FileSpreadsheet,
  AlertCircle,
} from "lucide-react";
import { AxiosError } from "axios";
import useAuth from "@/hooks/useAuth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Content {
  id: string;
  name: string;
  description: string;
  bibliography?: string;
  order: number;
  file_path?: string;
  type: "document" | "presentation" | "video" | "code" | "spreadsheet";
  format: "pdf" | "doc" | "docx" | "pptx" | "mp4";
  size: number;
  views: number;
  downloads: number;
  duration?: string;
  course_id: string;
  course: string;
  created_at: string;
  updated_at: string;
}

interface Assignment {
  id: string;
  title: string;
  description: string;
  course_id: string;
  course: string;
  due_date: string;
  submissions: number;
  total_students: number;
  submissions_files: { id: string; file_name: string; url: string; size: number; student_id: string; student_name: string; created_at: string }[];
  created_at: string;
  updated_at: string;
}

interface Grade {
  id: string;
  title: string;
  grade_type: string;
  grade_value: number | null;
  grade_date: string;
  enrollment_id: string;
  assignment_id: string;
  course_name: string;
}

interface Course {
  id: string;
  signature: { name: string } | string;
}

interface ApiErrorResponse {
  message?: string;
  data?: string;
  errors?: { [key: string]: string[] };
}

export default function AdminContentsPage() {
  const router = useRouter();
  const { user, loading: loadingAuth, error: authError } = useAuth("admin");
  const [contents, setContents] = useState<Content[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("all");
  const [isCreateContentDialogOpen, setIsCreateContentDialogOpen] = useState(false);
  const [isCreateAssignmentDialogOpen, setIsCreateAssignmentDialogOpen] = useState(false);
  const [isEditContentDialogOpen, setIsEditContentDialogOpen] = useState(false);
  const [isEditAssignmentDialogOpen, setIsEditAssignmentDialogOpen] = useState(false);
  const [isViewSubmissionsDialogOpen, setIsViewSubmissionsDialogOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [submissionGrade, setSubmissionGrade] = useState<{ [key: string]: string }>({});
  const [submissionGrades, setSubmissionGrades] = useState<{ [key: string]: Grade | null }>({});

  const [contentFormData, setContentFormData] = useState({
    name: "",
    description: "",
    bibliography: "",
    order: "1",
    type: "document" as Content["type"],
    format: "pdf" as Content["format"],
    file: null as File | null,
    course_id: "",
  });

  const [assignmentFormData, setAssignmentFormData] = useState({
    title: "",
    description: "",
    course_id: "",
    due_date: "",
  });

  const getAssignmentCourseName = (assignment: Assignment): string => {
    return assignment.course || "Curso sin nombre";
  };

  const getCourseName = (course: Course): string => {
    return typeof course.signature === "string" ? course.signature : course.signature?.name || "Curso sin nombre";
  };

  useEffect(() => {
    if (loadingAuth || authError) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const [contentsRes, assignmentsRes, coursesRes] = await Promise.all([
          api.get("/contents"),
          api.get("/assignments"),
          api.get("/courses"),
        ]);
        setContents(contentsRes.data.data || []);
        setAssignments(assignmentsRes.data.data || []);
        setCourses(coursesRes.data.data || []);
        if (!coursesRes.data.data.length) {
          setApiError("No se pudieron cargar los cursos. Inténtalo de nuevo.");
        }
      } catch (err: unknown) {
        const error = err as AxiosError<ApiErrorResponse>;
        setApiError(error.response?.data?.message || error.response?.data?.data || "Error al cargar los datos. Inténtalo de nuevo.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [loadingAuth, authError]);

  const handleCreateContent = async () => {
    try {
      const formDataToSend = new FormData();
      formDataToSend.append("name", contentFormData.name);
      formDataToSend.append("description", contentFormData.description);
      formDataToSend.append("bibliography", contentFormData.bibliography);
      formDataToSend.append("order", contentFormData.order);
      formDataToSend.append("type", contentFormData.type);
      formDataToSend.append("format", contentFormData.format);
      if (contentFormData.file) {
        formDataToSend.append("file", contentFormData.file);
      }
      formDataToSend.append("course_id", contentFormData.course_id);

      await api.post("/contents", formDataToSend, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setIsCreateContentDialogOpen(false);
      setContentFormData({
        name: "",
        description: "",
        bibliography: "",
        order: "1",
        type: "document",
        format: "pdf",
        file: null,
        course_id: "",
      });
      const response = await api.get("/contents");
      setContents(response.data.data || []);
      setApiError(null);
    } catch (err: unknown) {
      const error = err as AxiosError<ApiErrorResponse>;
      setApiError(error.response?.data?.message || error.response?.data?.data || "Error al crear el contenido. Inténtalo de nuevo.");
    }
  };

  const handleEditContent = async () => {
    if (!selectedContent) return;
    try {
      const formDataToSend = new FormData();
      formDataToSend.append("name", contentFormData.name);
      formDataToSend.append("description", contentFormData.description);
      formDataToSend.append("bibliography", contentFormData.bibliography);
      formDataToSend.append("order", contentFormData.order);
      formDataToSend.append("type", contentFormData.type);
      formDataToSend.append("format", contentFormData.format);
      if (contentFormData.file) {
        formDataToSend.append("file", contentFormData.file);
      }
      formDataToSend.append("course_id", contentFormData.course_id);

      await api.put(`/contents/${selectedContent.id}`, formDataToSend, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setIsEditContentDialogOpen(false);
      setContentFormData({
        name: "",
        description: "",
        bibliography: "",
        order: "1",
        type: "document",
        format: "pdf",
        file: null,
        course_id: "",
      });
      setSelectedContent(null);
      const response = await api.get("/contents");
      setContents(response.data.data || []);
      setApiError(null);
    } catch (err: unknown) {
      const error = err as AxiosError<ApiErrorResponse>;
      setApiError(error.response?.data?.message || error.response?.data?.data || "Error al editar el contenido. Inténtalo de nuevo.");
    }
  };

  const handleDeleteContent = async (id: string) => {
    try {
      await api.delete(`/contents/${id}`);
      const response = await api.get("/contents");
      setContents(response.data.data || []);
      setApiError(null);
    } catch (err: unknown) {
      const error = err as AxiosError<ApiErrorResponse>;
      setApiError(error.response?.data?.message || error.response?.data?.data || "Error al eliminar el contenido. Inténtalo de nuevo.");
    }
  };

  const handleCreateAssignment = async () => {
    try {
      await api.post("/assignments", assignmentFormData);
      setIsCreateAssignmentDialogOpen(false);
      setAssignmentFormData({
        title: "",
        description: "",
        course_id: "",
        due_date: "",
      });
      const response = await api.get("/assignments");
      setAssignments(response.data.data || []);
      setApiError(null);
    } catch (err: unknown) {
      const error = err as AxiosError<ApiErrorResponse>;
      setApiError(error.response?.data?.message || error.response?.data?.data || "Error al crear la tarea. Inténtalo de nuevo.");
    }
  };

  const handleEditAssignment = async () => {
    if (!selectedAssignment) return;
    try {
      await api.put(`/assignments/${selectedAssignment.id}`, assignmentFormData);
      setIsEditAssignmentDialogOpen(false);
      setAssignmentFormData({
        title: "",
        description: "",
        course_id: "",
        due_date: "",
      });
      setSelectedAssignment(null);
      const response = await api.get("/assignments");
      setAssignments(response.data.data || []);
      setApiError(null);
    } catch (err: unknown) {
      const error = err as AxiosError<ApiErrorResponse>;
      setApiError(error.response?.data?.message || error.response?.data?.data || "Error al editar la tarea. Inténtalo de nuevo.");
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    try {
      await api.delete(`/assignments/${id}`);
      const response = await api.get("/assignments");
      setAssignments(response.data.data || []);
      setApiError(null);
    } catch (err: unknown) {
      const error = err as AxiosError<ApiErrorResponse>;
      setApiError(error.response?.data?.message || error.response?.data?.data || "Error al eliminar la tarea. Inténtalo de nuevo.");
    }
  };

  const handleViewSubmissions = async (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setSubmissionGrades({});
    setSubmissionGrade({});
    try {
      const gradesResponse = await api.get(`/grades?assignment_id=${assignment.id}`);
      const grades = gradesResponse.data.data || [];
      const gradeMap: { [key: string]: Grade | null } = {};

      const latestSubmissions = assignment.submissions_files.reduce((acc, submission) => {
        const existing = acc[submission.student_id];
        if (!existing || new Date(submission.created_at) > new Date(existing.created_at)) {
          acc[submission.student_id] = submission;
        }
        return acc;
      }, {} as { [key: string]: Assignment['submissions_files'][0] });

      Object.values(latestSubmissions).forEach((submission) => {
        const grade = grades.find(
          (g: Grade) => g.assignment_id === assignment.id && g.enrollment_id.includes(submission.student_id)
        );
        gradeMap[submission.id] = grade || null;
      });
      setSubmissionGrades(gradeMap);
    } catch (err) {
      console.error("Error fetching grades:", err);
    }
    setIsViewSubmissionsDialogOpen(true);
  };

  const handleEditContentClick = (content: Content) => {
    setSelectedContent(content);
    setContentFormData({
      name: content.name,
      description: content.description,
      bibliography: content.bibliography || "",
      order: content.order.toString(),
      type: content.type,
      format: content.format,
      file: null,
      course_id: content.course_id,
    });
    setIsEditContentDialogOpen(true);
  };

  const handleEditAssignmentClick = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setAssignmentFormData({
      title: assignment.title,
      description: assignment.description,
      course_id: assignment.course_id,
      due_date: new Date(assignment.due_date).toISOString().split("T")[0],
    });
    setIsEditAssignmentDialogOpen(true);
  };

  const filteredContents = contents.filter((content) => {
    const matchesSearch =
      content.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      content.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      content.course.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCourse = selectedCourse === "all" || content.course_id === selectedCourse;
    return matchesSearch && matchesCourse;
  });

  const filteredAssignments = assignments.filter((assignment) => {
    const courseName = getAssignmentCourseName(assignment);
    const matchesSearch =
      assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      courseName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCourse = selectedCourse === "all" || assignment.course_id === selectedCourse;
    return matchesSearch && matchesCourse;
  });

  const getFileIcon = (type: Content["type"], format: Content["format"]) => {
    switch (type) {
      case "document":
        return format === "pdf" ? (
          <FilePdf className="h-10 w-10 text-red-500" />
        ) : (
          <FileText className="h-10 w-10 text-blue-500" />
        );
      case "presentation":
        return <FileImage className="h-10 w-10 text-orange-500" />;
      case "video":
        return <Film className="h-10 w-10 text-purple-500" />;
      case "code":
        return <FileCode className="h-10 w-10 text-green-500" />;
      case "spreadsheet":
        return <FileSpreadsheet className="h-10 w-10 text-green-500" />;
      default:
        return <FileText className="h-10 w-10 text-gray-500" />;
    }
  };

  const profilePhotoUrl = user?.profilePhotoUrl
    ? user.profilePhotoUrl.startsWith("http")
      ? user.profilePhotoUrl
      : `http://localhost:8000${user.profilePhotoUrl}`
    : null;

  return (
    <MainLayout
      userRole={user?.role || "admin"}
      userName={user?.name || "Cargando..."}
      userEmail={user?.email || "cargando@mentora.edu"}
      profilePhotoUrl={profilePhotoUrl}
    >
      <div className="flex flex-col gap-6 p-4">
        {loadingAuth ? (
          <div className="text-center">Verificando autenticación...</div>
        ) : authError ? (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{authError}</AlertDescription>
          </Alert>
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
                <h1 className="text-3xl font-bold tracking-tight">Contenidos</h1>
                <p className="text-muted-foreground">Gestiona los materiales de estudio y tareas de la plataforma</p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por título, descripción o curso..."
                  value={searchTerm}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <div className="w-full md:w-[250px]">
                <Label htmlFor="course-filter">Filtrar por curso</Label>
                <select
                  id="course-filter"
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Todos los cursos</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {getCourseName(course)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Tabs defaultValue="materials" className="space-y-4">
              <div className="flex justify-between items-center">
                <TabsList>
                  <TabsTrigger value="materials">Materiales</TabsTrigger>
                  <TabsTrigger value="assignments">Tareas</TabsTrigger>
                </TabsList>
                <div className="flex gap-2">
                  <Dialog open={isCreateContentDialogOpen} onOpenChange={setIsCreateContentDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="gap-2">
                        <Plus className="h-4 w-4" />
                        Nuevo Material
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Subir nuevo material</DialogTitle>
                        <DialogDescription>
                          Completa la información para subir un nuevo material de estudio
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="title">Título</Label>
                          <Input
                            id="title"
                            value={contentFormData.name}
                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                              setContentFormData({ ...contentFormData, name: e.target.value })
                            }
                            placeholder="Ej: Introducción a HTML y CSS"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="description">Descripción</Label>
                          <Textarea
                            id="description"
                            value={contentFormData.description}
                            onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                              setContentFormData({ ...contentFormData, description: e.target.value })
                            }
                            placeholder="Breve descripción del material"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="bibliography">Bibliografía</Label>
                          <Textarea
                            id="bibliography"
                            value={contentFormData.bibliography}
                            onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                              setContentFormData({ ...contentFormData, bibliography: e.target.value })
                            }
                            placeholder="Referencias bibliográficas (opcional)"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="order">Orden</Label>
                          <Input
                            id="order"
                            type="number"
                            value={contentFormData.order}
                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                              setContentFormData({ ...contentFormData, order: e.target.value })
                            }
                            placeholder="1"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="course">Curso</Label>
                          <select
                            id="course"
                            value={contentFormData.course_id}
                            onChange={(e) => setContentFormData({ ...contentFormData, course_id: e.target.value })}
                            className="w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">Selecciona un curso</option>
                            {courses.map((course) => (
                              <option key={course.id} value={course.id}>
                                {getCourseName(course)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="type">Tipo de material</Label>
                          <select
                            id="type"
                            value={contentFormData.type}
                            onChange={(e) => setContentFormData({ ...contentFormData, type: e.target.value as Content["type"] })}
                            className="w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="document">Documento</option>
                            <option value="presentation">Presentación</option>
                            <option value="video">Video</option>
                            <option value="code">Código</option>
                            <option value="spreadsheet">Hoja de cálculo</option>
                          </select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="format">Formato</Label>
                          <select
                            id="format"
                            value={contentFormData.format}
                            onChange={(e) => setContentFormData({ ...contentFormData, format: e.target.value as Content["format"] })}
                            className="w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="pdf">PDF</option>
                            <option value="doc">DOC</option>
                            <option value="docx">DOCX</option>
                            <option value="pptx">PPTX</option>
                            <option value="mp4">MP4</option>
                          </select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="file-upload">Archivo</Label>
                          <div className="flex items-center justify-center w-full">
                            <label
                              htmlFor="file-upload"
                              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50"
                            >
                              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                                <p className="mb-2 text-sm text-muted-foreground">
                                  <span className="font-semibold">Haz clic para subir</span> o arrastra y suelta
                                </p>
                                <p className="text-xs text-muted-foreground">PDF, DOCX, PPTX, MP4 (MAX. 100MB)</p>
                              </div>
                              <input
                                id="file-upload"
                                type="file"
                                className="hidden"
                                accept=".pdf,.doc,.docx,.pptx,.mp4"
                                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                  setContentFormData({ ...contentFormData, file: e.target.files?.[0] || null })
                                }
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateContentDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button onClick={handleCreateContent}>Subir material</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={isCreateAssignmentDialogOpen} onOpenChange={setIsCreateAssignmentDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        <Plus className="h-4 w-4" />
                        Nueva Tarea
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Crear nueva tarea</DialogTitle>
                        <DialogDescription>Completa la información para crear una nueva tarea</DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="assignment-title">Título</Label>
                          <Input
                            id="assignment-title"
                            value={assignmentFormData.title}
                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                              setAssignmentFormData({ ...assignmentFormData, title: e.target.value })
                            }
                            placeholder="Ej: Proyecto Web Frontend"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="assignment-description">Descripción</Label>
                          <Textarea
                            id="assignment-description"
                            value={assignmentFormData.description}
                            onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                              setAssignmentFormData({ ...assignmentFormData, description: e.target.value })
                            }
                            placeholder="Instrucciones detalladas de la tarea"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="assignment-course">Curso</Label>
                          <select
                            id="assignment-course"
                            value={assignmentFormData.course_id}
                            onChange={(e) => setAssignmentFormData({ ...assignmentFormData, course_id: e.target.value })}
                            className="w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">Selecciona un curso</option>
                            {courses.map((course) => (
                              <option key={course.id} value={course.id}>
                                {getCourseName(course)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="due-date">Fecha límite</Label>
                          <Input
                            id="due-date"
                            type="date"
                            value={assignmentFormData.due_date}
                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                              setAssignmentFormData({ ...assignmentFormData, due_date: e.target.value })
                            }
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateAssignmentDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button onClick={handleCreateAssignment}>Crear tarea</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              <TabsContent value="materials" className="space-y-4">
                <div className="grid gap-6 md:grid-cols-2">
                  {filteredContents.map((content) => (
                    <Card key={content.id} className="flex overflow-hidden">
                      <div className="flex items-center justify-center p-6 bg-muted/30">
                        {getFileIcon(content.type, content.format)}
                      </div>
                      <div className="flex-1">
                        <CardHeader className="p-4 pb-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-lg">{content.name}</CardTitle>
                              <CardDescription className="line-clamp-1">{content.description}</CardDescription>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <ChevronDown className="h-4 w-4" />
                                  <span className="sr-only">Abrir menú</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditContentClick(content)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  <span>Editar</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDeleteContent(content.id)}
                                >
                                  <Trash className="mr-2 h-4 w-4" />
                                  <span>Eliminar</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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
                          <div className="flex items-center text-sm">
                            <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span>Tamaño: {(content.size / 1024 / 1024).toFixed(1)} MB</span>
                          </div>
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Vistas: {content.views}</span>
                            <span>Descargas: {content.downloads}</span>
                          </div>
                          <div className="pt-2">
                            <Button
                              className="w-full"
                              disabled={!content.file_path}
                              onClick={() => content.file_path && window.open(content.file_path, "_blank")}
                            >
                              Ver material
                            </Button>
                          </div>
                        </CardContent>
                      </div>
                    </Card>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="assignments" className="space-y-4">
                <div className="grid gap-6 md:grid-cols-2">
                  {filteredAssignments.map((assignment) => (
                    <Card key={assignment.id}>
                      <CardHeader className="p-4 pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{assignment.title}</CardTitle>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <ChevronDown className="h-4 w-4" />
                                <span className="sr-only">Abrir menú</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditAssignmentClick(assignment)}>
                                <Edit className="mr-2 h-4 w-4" />
                                <span>Editar</span>
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
                        </div>
                        <CardDescription>{assignment.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 space-y-3">
                        <div className="flex items-center text-sm">
                          <Book className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span>{getAssignmentCourseName(assignment)}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            Fecha límite: {new Date(assignment.due_date).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Entregas</span>
                            <span className="font-medium">{assignment.submissions} de {assignment.total_students}</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary transition-all duration-300"
                              style={{ width: `${Math.min((assignment.submissions / (assignment.total_students || 1)) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                        <div className="pt-2">
                          <Button className="w-full" onClick={() => handleViewSubmissions(assignment)}>
                            Ver entregas
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}

        <Dialog open={isEditContentDialogOpen} onOpenChange={setIsEditContentDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar material</DialogTitle>
              <DialogDescription>Modifica la información del material de estudio</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-title">Título</Label>
                <Input
                  id="edit-title"
                  value={contentFormData.name}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setContentFormData({ ...contentFormData, name: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-description">Descripción</Label>
                <Textarea
                  id="edit-description"
                  value={contentFormData.description}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                    setContentFormData({ ...contentFormData, description: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-bibliography">Bibliografía</Label>
                <Textarea
                  id="edit-bibliography"
                  value={contentFormData.bibliography}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                    setContentFormData({ ...contentFormData, bibliography: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-order">Orden</Label>
                <Input
                  id="edit-order"
                  type="number"
                  value={contentFormData.order}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setContentFormData({ ...contentFormData, order: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-course">Curso</Label>
                <select
                  id="edit-course"
                  value={contentFormData.course_id}
                  onChange={(e) => setContentFormData({ ...contentFormData, course_id: e.target.value })}
                  className="w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Selecciona un curso</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {getCourseName(course)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-type">Tipo de material</Label>
                <select
                  id="edit-type"
                  value={contentFormData.type}
                  onChange={(e) => setContentFormData({ ...contentFormData, type: e.target.value as Content["type"] })}
                  className="w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="document">Documento</option>
                  <option value="presentation">Presentación</option>
                  <option value="video">Video</option>
                  <option value="code">Código</option>
                  <option value="spreadsheet">Hoja de cálculo</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-format">Formato</Label>
                <select
                  id="edit-format"
                  value={contentFormData.format}
                  onChange={(e) => setContentFormData({ ...contentFormData, format: e.target.value as Content["format"] })}
                  className="w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="pdf">PDF</option>
                  <option value="doc">DOC</option>
                  <option value="docx">DOCX</option>
                  <option value="pptx">PPTX</option>
                  <option value="mp4">MP4</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-file-upload">Archivo (opcional)</Label>
                <div className="flex items-center justify-center w-full">
                  <label
                    htmlFor="edit-file-upload"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                      <p className="mb-2 text-sm text-muted-foreground">
                        <span className="font-semibold">Haz clic para subir</span> o arrastra y suelta
                      </p>
                      <p className="text-xs text-muted-foreground">PDF, DOCX, PPTX, MP4 (MAX. 100MB)</p>
                    </div>
                    <input
                      id="edit-file-upload"
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.pptx,.mp4"
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setContentFormData({ ...contentFormData, file: e.target.files?.[0] || null })
                      }
                    />
                  </label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditContentDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleEditContent}>Guardar cambios</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditAssignmentDialogOpen} onOpenChange={setIsEditAssignmentDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar tarea</DialogTitle>
              <DialogDescription>Modifica la información de la tarea</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-assignment-title">Título</Label>
                <Input
                  id="edit-assignment-title"
                  value={assignmentFormData.title}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setAssignmentFormData({ ...assignmentFormData, title: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-assignment-description">Descripción</Label>
                <Textarea
                  id="edit-assignment-description"
                  value={assignmentFormData.description}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                    setAssignmentFormData({ ...assignmentFormData, description: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-assignment-course">Curso</Label>
                <select
                  id="edit-assignment-course"
                  value={assignmentFormData.course_id}
                  onChange={(e) => setAssignmentFormData({ ...assignmentFormData, course_id: e.target.value })}
                  className="w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Selecciona un curso</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {getCourseName(course)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-due-date">Fecha límite</Label>
                <Input
                  id="edit-due-date"
                  type="date"
                  value={assignmentFormData.due_date}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setAssignmentFormData({ ...assignmentFormData, due_date: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditAssignmentDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleEditAssignment}>Guardar cambios</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isViewSubmissionsDialogOpen} onOpenChange={setIsViewSubmissionsDialogOpen}>
          <DialogContent className="sm:max-w-[750px]">
            <DialogHeader>
              <DialogTitle>Entregas de la tarea</DialogTitle>
              <DialogDescription>Lista de archivos enviados por los estudiantes</DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-6">
              {selectedAssignment && selectedAssignment.submissions_files.length > 0 ? (
                <div className="space-y-6">
                  {Object.values(
                    selectedAssignment.submissions_files.reduce((acc, submission) => {
                      const existing = acc[submission.student_id];
                      if (!existing || new Date(submission.created_at) > new Date(existing.created_at)) {
                        acc[submission.student_id] = submission;
                      }
                      return acc;
                    }, {} as { [key: string]: Assignment['submissions_files'][0] })
                  ).map((submission) => {
                    const grade = submissionGrades[submission.id];
                    return (
                      <div key={submission.id} className="grid grid-cols-1 md:grid-cols-5 gap-6 items-start border-b py-4">
                        <div className="col-span-1 md:col-span-4">
                          <p className="font-medium">{submission.student_name}</p>
                          <p className="text-sm text-muted-foreground">
                            Archivo: {submission.file_name} | Tamaño: {(submission.size / 1024 / 1024).toFixed(1)} MB
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Enviado: {new Date(submission.created_at).toLocaleDateString()}
                          </p>
                          {grade && grade.grade_value != null && (
                            <p className="text-sm font-medium text-primary">
                              Nota actual: {grade.grade_value.toFixed(1)}
                            </p>
                          )}
                        </div>
                        <div className="col-span-1 flex flex-col gap-3 items-end">
                          <div className="flex flex-row gap-2 items-center">
                            <Input
                              type="number"
                              placeholder="Nota (0-10)"
                              value={submissionGrade[submission.id] || ""}
                              onChange={(e) => setSubmissionGrade({ ...submissionGrade, [submission.id]: e.target.value })}
                              className="w-36"
                              min="0"
                              max="10"
                              step="0.1"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              className="min-w-[100px]"
                              onClick={async () => {
                                if (submissionGrade[submission.id]) {
                                  try {
                                    await api.post(`/assignments/${selectedAssignment?.id}/submissions/${submission.id}/grade`, {
                                      grade_value: parseFloat(submissionGrade[submission.id]),
                                      student_id: submission.student_id,
                                    });
                                    const gradesResponse = await api.get(`/grades?assignment_id=${selectedAssignment?.id}`);
                                    const grades = gradesResponse.data.data || [];
                                    const updatedGrade = grades.find(
                                      (g: Grade) => g.assignment_id === selectedAssignment?.id && g.enrollment_id.includes(submission.student_id)
                                    );
                                    setSubmissionGrades((prev) => ({ ...prev, [submission.id]: updatedGrade || null }));
                                    setSubmissionGrade((prev) => ({ ...prev, [submission.id]: "" }));
                                    alert("Nota guardada");
                                  } catch (err) {
                                    console.error("Error al guardar la nota:", err);
                                    alert("Error al guardar la nota");
                                  }
                                }
                              }}
                            >
                              Guardar nota
                            </Button>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="min-w-[100px]"
                            onClick={() => window.open(submission.url, "_blank")}
                          >
                            Descargar
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-muted-foreground">No hay entregas para esta tarea.</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewSubmissionsDialogOpen(false)}>
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}