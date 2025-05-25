"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import MainLayout from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  Edit,
  FileText,
  Film,
  Plus,
  Search,
  Trash,
  Upload,
  Users,
  FileCode,
  FileImage,
  File as FilePdf,
  FileSpreadsheet,
  Home,
  BarChart,
} from "lucide-react";
import { AxiosError } from "axios";
import useAuth from "@/hooks/useAuth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

// Componente personalizado para la barra de progreso
const CustomProgress = ({ value, className }: { value: number; className?: string }) => {
  return (
    <div className={`w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden ${className}`}>
      <div
        className="h-full bg-blue-500 dark:bg-blue-400 transition-all duration-300"
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </div>
  );
};

// Interfaz para la respuesta de la API
interface ApiResponse<T> {
  data: T;
}

// Interfaz para la respuesta de la API de curso
interface ApiCourse {
  id: string;
  code: string;
  schedule: Array<{ day: string; start_time: string; end_time: string }>;
  weighting: string;
  signature: string;
  semester: {
    id: string;
    name: string;
    is_active: boolean;
  } | null;
  professor: string;
  students: number;
  status: "active" | "inactive";
  avg_grade: number | null;
}

// Interfaz para curso en el estado
interface Course {
  id: string;
  title: string;
  description: string;
  semester: {
    id: string;
    name: string;
    is_active: boolean;
  } | null;
  students: number;
  status: "active" | "inactive";
  progress: number;
  schedule: Array<{ day: string; start_time: string; end_time: string }>;
  avgGrade: number;
}

// Interfaz para la respuesta de la API de matrículas
interface ApiEnrollment {
  id: string;
  student_name: string;
  student_email: string;
  student_profile_photo_url: string | null;
  final_grade?: number | null;
  course_id: string;
  semester?: { is_active: boolean } | null;
  enrollment_date?: string | null;
}

// Interfaz para la respuesta de la API de calificaciones
interface ApiGrade {
  id: string;
  grade_type: string;
  grade_value: number | null;
  grade_date: string;
  enrollment_id: string;
  course_name: string;
}

// Interfaz para estudiante
interface Student {
  id: string;
  name: string;
  email: string;
  currentGrade: number | null;
  lastActivity: string;
  status: "active" | "inactive";
  profilePhotoUrl: string | null;
}

// Interfaz para la respuesta de la API de contenidos
interface ApiContent {
  id: string;
  name: string;
  description: string;
  type: string;
  format: string;
  created_at: string;
  size: number;
  views: number;
  downloads: number;
  duration?: string;
  file_path?: string;
  course_id: string;
}

// Interfaz para material
interface Material {
  id: string;
  title: string;
  description: string;
  type: string;
  format: string;
  date: string;
  size: string;
  views: number;
  downloads: number;
  duration?: string;
  filePath?: string;
}

// Interfaz para la respuesta de la API de tareas
interface ApiAssignment {
  id: string;
  title: string;
  description: string;
  due_date: string;
  submissions: number;
  total_students: number;
  course_id: string;
  submissions_files: Array<{
    id: string;
    file_name: string;
    url: string;
    size: number;
    student_id: string;
    student_name: string;
    created_at: string;
  }>;
}

// Interfaz para tarea
interface Assignment {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  submissions: number;
  totalStudents: number;
}

// Interfaz para módulo (simulado, no en API)
interface Module {
  id: number;
  title: string;
  status: "completed" | "in-progress" | "upcoming";
  progress: number;
}

interface ApiErrorResponse {
  message?: string;
  data?: string;
  errors?: { [key: string]: string[] };
}

export default function CourseDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const { user, loading: loadingAuth, error: authError } = useAuth("professor");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [grades, setGrades] = useState<ApiGrade[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateContentDialogOpen, setIsCreateContentDialogOpen] = useState(false);
  const [isCreateAssignmentDialogOpen, setIsCreateAssignmentDialogOpen] = useState(false);

  // Calcular la nota media de un estudiante
  const calculateCurrentGrade = (studentGrades: ApiGrade[]) => {
    if (studentGrades.length === 0) return null;
    const validGrades = studentGrades.filter(g => g.grade_value != null && !isNaN(Number(g.grade_value)));
    if (validGrades.length === 0) return null;
    const totalPoints = validGrades.reduce((sum, g) => sum + (g.grade_value || 0), 0);
    const maxPoints = validGrades.length * 10; // Asumimos maxGrade = 10 por nota
    return (totalPoints / maxPoints) * 10;
  };

  // Verificar autenticación y fetch de datos
  useEffect(() => {
    if (loadingAuth || authError) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        console.log("Iniciando fetch de datos para curso:", id);
        const [courseRes, enrollmentsRes, contentsRes, assignmentsRes, gradesRes] = await Promise.all([
          api.get(`/courses/${id}`, { timeout: 10000 }),
          api.get(`/enrollments?course_id=${id}`, { timeout: 10000 }),
          api.get(`/contents?course_id=${id}`, { timeout: 10000 }),
          api.get(`/assignments?course_id=${id}`, { timeout: 10000 }),
          api.get(`/courses/${id}/grades`, { timeout: 10000 }),
        ]);
        console.log("Respuesta de /courses:", courseRes.data);
        console.log("Respuesta de /enrollments:", enrollmentsRes.data);
        console.log("Respuesta de /contents:", contentsRes.data);
        console.log("Respuesta de /assignments:", assignmentsRes.data);
        console.log("Respuesta de /courses/{id}/grades:", gradesRes.data);

        const courseData = courseRes.data.data || {};
        // Procesar matrículas
        const enrollments: ApiEnrollment[] = Array.isArray(enrollmentsRes.data.data) ? enrollmentsRes.data.data : [];
        // Eliminar duplicados por id
        const uniqueEnrollments = Array.from(
          new Map(enrollments.map((e) => [e.id, e])).values()
        ).filter((e) => e.semester?.is_active === true && e.course_id === id);
        console.log("Unique active enrollments:", uniqueEnrollments);

        // Procesar calificaciones
        const allGrades: ApiGrade[] = Array.isArray(gradesRes.data.data) ? gradesRes.data.data : [];
        console.log("All grades:", allGrades);

        // Calcular nota media del curso
        const validGrades = uniqueEnrollments
          .flatMap(e => allGrades.filter(g => g.enrollment_id === e.id))
          .filter(g => g.grade_value != null && !isNaN(Number(g.grade_value)))
          .map(g => Number(g.grade_value));
        console.log("Valid grades for course:", validGrades);
        const avgGrade = validGrades.length > 0 ? validGrades.reduce((sum: number, grade: number) => sum + grade, 0) / validGrades.length : 0;

        setCourse({
          id: courseData.id || id,
          title: courseData.signature || "Curso desconocido",
          description: "Fundamentos del curso", // Simulado
          semester: courseData.semester || null,
          students: uniqueEnrollments.length,
          status: courseData.status || "inactive",
          progress: 65, // Simulado
          schedule: courseData.schedule || [],
          avgGrade: courseData.avg_grade != null ? courseData.avg_grade : avgGrade,
        });

        setStudents(
          uniqueEnrollments.map((e) => {
            console.log("Student profile photo URL:", e.student_profile_photo_url);
            const studentGrades = allGrades.filter(g => g.enrollment_id === e.id);
            console.log(`Grades for student ${e.id}:`, studentGrades);
            const currentGrade = calculateCurrentGrade(studentGrades);
            console.log(`Current grade for student ${e.id}:`, currentGrade);
            return {
              id: e.id,
              name: e.student_name || "Estudiante desconocido",
              email: e.student_email || "email@desconocido.edu",
              currentGrade,
              lastActivity: e.enrollment_date || new Date().toISOString().split("T")[0],
              status: e.semester?.is_active ? "active" : "inactive",
              profilePhotoUrl: e.student_profile_photo_url,
            };
          })
        );

        setMaterials(
          contentsRes.data.data?.map((m: ApiContent) => ({
            id: m.id,
            title: m.name || "Material desconocido",
            description: m.description || "Sin descripción",
            type: m.type || "document",
            format: m.format || "pdf",
            date: m.created_at || new Date().toISOString(),
            size: m.size ? `${(m.size / 1024 / 1024).toFixed(1)} MB` : "0 MB",
            views: m.views || 0,
            downloads: m.downloads || 0,
            duration: m.duration,
            filePath: m.file_path,
          })) || []
        );

        setAssignments(
          assignmentsRes.data.data?.map((a: ApiAssignment) => ({
            id: a.id,
            title: a.title || "Tarea desconocida",
            description: a.description || "Sin descripción",
            dueDate: a.due_date || new Date().toISOString(),
            submissions: a.submissions || 0,
            totalStudents: a.total_students || 0,
          })) || []
        );

        setGrades(allGrades);

        setError(null);
      } catch (err: unknown) {
        const error = err as AxiosError<ApiErrorResponse>;
        console.error("Error:", error.message, error.response?.data);
        setError(error.response?.data?.message || "Error al cargar los datos.");
      } finally {
        setLoading(false);
        console.log("Fetch completado, loading:", false);
      }
    };

    fetchData();
  }, [id, router, loadingAuth, authError]);

  // Filtrar estudiantes según el término de búsqueda
  const filteredStudents = students.filter(
    (student) =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calcular distribución de notas para estadísticas detalladas
  const gradeDistribution = {
    excellent: students.filter((s) => s.currentGrade != null && s.currentGrade >= 9).length,
    good: students.filter((s) => s.currentGrade != null && s.currentGrade >= 7 && s.currentGrade < 9).length,
    below: students.filter((s) => s.currentGrade != null && s.currentGrade < 7).length,
    ungraded: students.filter((s) => s.currentGrade == null).length,
  };

  // Módulos simulados (no en API)
  const modules: Module[] = [
    { id: 1, title: "Introducción", status: "completed", progress: 100 },
    { id: 2, title: "Fundamentos", status: "completed", progress: 100 },
    { id: 3, title: "Avanzado", status: "in-progress", progress: 75 },
    { id: 4, title: "Proyectos", status: "upcoming", progress: 0 },
  ];

  // Función para obtener el icono según el tipo de material
  const getFileIcon = (type: string, format: string) => {
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

  // Función para crear nuevo material
  const handleCreateContent = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    try {
      await api.post(`/contents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setIsCreateContentDialogOpen(false);
      // Refetch contents
      const contentsRes = await api.get(`/contents?course_id=${id}`);
      setMaterials(
        contentsRes.data.data?.map((m: ApiContent) => ({
          id: m.id,
          title: m.name || "Material desconocido",
          description: m.description || "Sin descripción",
          type: m.type || "document",
          format: m.format || "pdf",
          date: m.created_at || new Date().toISOString(),
          size: m.size ? `${(m.size / 1024 / 1024).toFixed(1)} MB` : "0 MB",
          views: m.views || 0,
          downloads: m.downloads || 0,
          duration: m.duration,
          filePath: m.file_path,
        })) || []
      );
    } catch (err: unknown) {
      const error = err as AxiosError<ApiErrorResponse>;
      setError(error.response?.data?.message || "Error al crear el material.");
    }
  };

  // Función para crear nueva tarea
  const handleCreateAssignment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const data = {
      title: formData.get("title"),
      description: formData.get("description"),
      due_date: formData.get("due_date"),
      course_id: id,
    };
    try {
      await api.post(`/assignments`, data);
      setIsCreateAssignmentDialogOpen(false);
      // Refetch assignments
      const assignmentsRes = await api.get(`/assignments?course_id=${id}`);
      setAssignments(
        assignmentsRes.data.data?.map((a: ApiAssignment) => ({
          id: a.id,
          title: a.title || "Tarea desconocida",
          description: a.description || "Sin descripción",
          dueDate: a.due_date || new Date().toISOString(),
          submissions: a.submissions || 0,
          totalStudents: a.total_students || 0,
        })) || []
      );
    } catch (err: unknown) {
      const error = err as AxiosError<ApiErrorResponse>;
      setError(error.response?.data?.message || "Error al crear la tarea.");
    }
  };

  // Función para eliminar material
  const handleDeleteContent = async (contentId: string) => {
    try {
      await api.delete(`/contents/${contentId}`);
      setMaterials(materials.filter((m) => m.id !== contentId));
    } catch (err: unknown) {
      const error = err as AxiosError<ApiErrorResponse>;
      setError(error.response?.data?.message || "Error al eliminar el material.");
    }
  };

  // Función para eliminar tarea
  const handleDeleteAssignment = async (assignmentId: string) => {
    try {
      await api.delete(`/assignments/${assignmentId}`);
      setAssignments(assignments.filter((a) => a.id !== assignmentId));
    } catch (err: unknown) {
      const error = err as AxiosError<ApiErrorResponse>;
      setError(error.response?.data?.message || "Error al eliminar la tarea.");
    }
  };

  if (loadingAuth) {
    return (
      <MainLayout
        userRole="professor"
        userName={user?.name || "Cargando..."}
        userEmail={user?.email || "cargando@mentora.edu"}
        profilePhotoUrl={user?.profilePhotoUrl || null}
      >
        <div className="flex flex-col items-center justify-center h-[50vh]">
          <p className="text-xl">Verificando autenticación...</p>
        </div>
      </MainLayout>
    );
  }

  if (authError) {
    return (
      <MainLayout
        userRole="professor"
        userName={user?.name || "Cargando..."}
        userEmail={user?.email || "cargando@mentora.edu"}
        profilePhotoUrl={user?.profilePhotoUrl || null}
      >
        <div className="flex flex-col items-center justify-center h-[50vh]">
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{authError}</AlertDescription>
          </Alert>
          <Button asChild className="mt-4">
            <Link href="/login">Volver al Login</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  if (loading) {
    return (
      <MainLayout
        userRole="professor"
        userName={user?.name || "Cargando..."}
        userEmail={user?.email || "cargando@mentora.edu"}
        profilePhotoUrl={user?.profilePhotoUrl || null}
      >
        <div className="flex flex-col items-center justify-center h-[50vh]">
          <p className="text-xl">Cargando...</p>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout
        userRole="professor"
        userName={user?.name || "Cargando..."}
        userEmail={user?.email || "cargando@mentora.edu"}
        profilePhotoUrl={user?.profilePhotoUrl || null}
      >
        <div className="flex flex-col items-center justify-center h-[50vh]">
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button asChild className="mt-4">
            <Link href="/professor">Volver al Dashboard</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  if (!course) {
    return (
      <MainLayout
        userRole="professor"
        userName={user?.name || "Cargando..."}
        userEmail={user?.email || "cargando@mentora.edu"}
        profilePhotoUrl={user?.profilePhotoUrl || null}
      >
        <div className="flex flex-col items-center justify-center h-[50vh]">
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>Curso no encontrado</AlertDescription>
          </Alert>
          <Button asChild className="mt-4">
            <Link href="/professor">Volver al Dashboard</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      userRole="professor"
      userName={user?.name || "Cargando..."}
      userEmail={user?.email || "cargando@mentora.edu"}
      profilePhotoUrl={user?.profilePhotoUrl || null}
    >
      <div className="flex flex-col gap-6">
        {/* Breadcrumbs */}
        <nav className="flex items-center text-sm text-muted-foreground">
          <Link href="/professor" className="hover:text-foreground transition-colors">
            <Home className="h-4 w-4" />
            <span className="sr-only">Inicio</span>
          </Link>
          <ChevronRight className="h-4 w-4 mx-1" />
          <Link href="/professor" className="hover:text-foreground transition-colors">
            Dashboard
          </Link>
          <ChevronRight className="h-4 w-4 mx-1" />
          <span className="font-medium text-foreground">{course.title}</span>
        </nav>

        {/* Encabezado del curso */}
        <div className="flex flex-col md:flex-row gap-6">
          <div className="md:w-2/3">
            <h1 className="text-3xl font-bold tracking-tight">{course.title}</h1>
            <p className="text-muted-foreground mt-1">{course.description}</p>
            <div className="flex flex-wrap gap-4 mt-4">
              <div className="flex items-center gap-1 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Semestre: {course.semester?.name || "Desconocido"}</span>
              </div>
              <div className="flex items-center gap-1 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{course.students} estudiantes</span>
              </div>
              <div className="flex items-center gap-1 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {course.schedule && Array.isArray(course.schedule) && course.schedule.length > 0
                    ? course.schedule
                        .filter(slot => slot.day && slot.start_time && slot.end_time)
                        .map(slot => `${slot.day} ${slot.start_time}-${slot.end_time}`)
                        .join(', ') || "Sin horario"
                    : "Sin horario"}
                </span>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Progreso del curso</span>
                <span className="font-medium">{course.progress}%</span>
              </div>
              <CustomProgress value={course.progress} className="h-2" />
            </div>
          </div>
          <div className="md:w-1/3 flex flex-col gap-4">
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-medium">Estadísticas del Curso</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Nota media</span>
                  <span className="font-medium">{course.avgGrade.toFixed(1)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Materiales</span>
                  <span className="font-medium">{materials.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Tareas</span>
                  <span className="font-medium">{assignments.length}</span>
                </div>
              </CardContent>
              <CardFooter className="p-4 pt-0">
                <Button variant="outline" className="w-full gap-2">
                  <BarChart className="h-4 w-4" />
                  Ver estadísticas completas
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>

        {/* Pestañas del curso */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Resumen</TabsTrigger>
            <TabsTrigger value="materials">Materiales</TabsTrigger>
            <TabsTrigger value="assignments">Tareas</TabsTrigger>
            <TabsTrigger value="students">Estudiantes</TabsTrigger>
          </TabsList>

          {/* Pestaña de Resumen */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Módulos del curso */}
              <Card>
                <CardHeader>
                  <CardTitle>Módulos del Curso</CardTitle>
                  <CardDescription>Progreso por módulos</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {modules.map((module) => (
                    <div key={module.id} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{module.title}</span>
                          {module.status === "completed" && (
                            <Badge variant="outline" className="bg-green-100 text-green-800">
                              Completado
                            </Badge>
                          )}
                          {module.status === "in-progress" && (
                            <Badge variant="outline" className="bg-blue-100 text-blue-800">
                              En progreso
                            </Badge>
                          )}
                          {module.status === "upcoming" && <Badge variant="outline">Próximamente</Badge>}
                        </div>
                        <span className="text-sm">{module.progress}%</span>
                      </div>
                      <CustomProgress value={module.progress} className="h-2" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Próximas tareas */}
              <Card>
                <CardHeader>
                  <CardTitle>Próximas Tareas</CardTitle>
                  <CardDescription>Tareas pendientes por fecha límite</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {assignments.slice(0, 3).map((assignment) => (
                    <div key={assignment.id} className="flex items-start space-x-4">
                      <div className="min-w-[60px] rounded-md bg-primary/10 p-3 text-center">
                        <div className="text-sm font-medium text-primary">
                          {new Date(assignment.dueDate).toLocaleDateString("es-ES", { day: "2-digit" })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(assignment.dueDate).toLocaleDateString("es-ES", { month: "short" })}
                        </div>
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">{assignment.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{assignment.description}</p>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            Entregas: {assignment.submissions}/{assignment.totalStudents}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
                <CardFooter>
                  <Button variant="ghost" className="w-full" asChild>
                    <Link href="#assignments">Ver todas las tareas</Link>
                  </Button>
                </CardFooter>
              </Card>

              {/* Estudiantes destacados */}
              <Card>
                <CardHeader>
                  <CardTitle>Estudiantes Destacados</CardTitle>
                  <CardDescription>Estudiantes del curso</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {students
                    .sort((a, b) => (b.currentGrade || 0) - (a.currentGrade || 0) || a.name.localeCompare(b.name))
                    .slice(0, 3)
                    .map((student) => (
                      <div key={student.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={student.profilePhotoUrl || undefined} alt={student.name} />
                            <AvatarFallback>
                              {student.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{student.name}</p>
                            <p className="text-xs text-muted-foreground">{student.email}</p>
                          </div>
                        </div>
                        <Badge
                          className={`${
                            student.currentGrade && student.currentGrade >= 9
                              ? "bg-green-100 text-green-800"
                              : student.currentGrade && student.currentGrade >= 7
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {student.currentGrade?.toFixed(1) || "N/A"}
                        </Badge>
                      </div>
                    ))}
                </CardContent>
                <CardFooter>
                  <Button variant="ghost" className="w-full" asChild>
                    <Link href="#students">Ver todos los estudiantes</Link>
                  </Button>
                </CardFooter>
              </Card>

              {/* Materiales recientes */}
              <Card>
                <CardHeader>
                  <CardTitle>Materiales Recientes</CardTitle>
                  <CardDescription>Últimos materiales publicados</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {materials.slice(0, 3).map((material) => (
                    <div key={material.id} className="flex items-center gap-3">
                      <div className="flex items-center justify-center h-10 w-10">
                        {getFileIcon(material.type, material.format)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{material.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(material.date).toLocaleDateString()} • {material.size}
                        </p>
                      </div>
                      <Badge variant="outline">{material.views} vistas</Badge>
                    </div>
                  ))}
                </CardContent>
                <CardFooter>
                  <Button variant="ghost" className="w-full" asChild>
                    <Link href="#materials">Ver todos los materiales</Link>
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>

          {/* Pestaña de Materiales */}
          <TabsContent value="materials" className="space-y-4" id="materials">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Materiales del Curso</h2>
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
                  <form onSubmit={handleCreateContent}>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="title">Título</Label>
                        <Input id="title" name="name" placeholder="Ej: Introducción a HTML y CSS" required />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="description">Descripción</Label>
                        <Textarea id="description" name="description" placeholder="Breve descripción del material" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="type">Tipo de material</Label>
                        <select
                          id="type"
                          name="type"
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          required
                        >
                          <option value="">Selecciona un tipo</option>
                          <option value="document">Documento</option>
                          <option value="presentation">Presentación</option>
                          <option value="video">Video</option>
                          <option value="code">Código</option>
                        </select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="file">Archivo</Label>
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
                            <input id="file-upload" name="file" type="file" className="hidden" accept=".pdf,.docx,.pptx,.mp4" />
                          </label>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" type="button" onClick={() => setIsCreateContentDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit">Subir material</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {materials.map((material) => (
                <Card key={material.id} className="flex overflow-hidden">
                  <div className="flex items-center justify-center p-6 bg-muted/30">
                    {getFileIcon(material.type, material.format)}
                  </div>
                  <div className="flex-1">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{material.title}</CardTitle>
                          <CardDescription className="line-clamp-1">{material.description}</CardDescription>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <ChevronDown className="h-4 w-4" />
                              <span className="sr-only">Abrir menú</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              <span>Editar</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteContent(material.id)}>
                              <Trash className="mr-2 h-4 w-4" />
                              <span>Eliminar</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 space-y-2">
                      <div className="flex items-center text-sm">
                        <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span>{new Date(material.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span>Tamaño: {material.size}</span>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Vistas: {material.views}</span>
                        <span>Descargas: {material.downloads}</span>
                      </div>
                      <div className="pt-2">
                        <Button
                          className="w-full"
                          disabled={!material.filePath}
                          onClick={() => material.filePath && window.open(material.filePath, "_blank")}
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

          {/* Pestaña de Tareas */}
          <TabsContent value="assignments" className="space-y-4" id="assignments">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Tareas del Curso</h2>
              <Dialog open={isCreateAssignmentDialogOpen} onOpenChange={setIsCreateAssignmentDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Nueva Tarea
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Crear nueva tarea</DialogTitle>
                    <DialogDescription>Completa la información para crear una nueva tarea</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateAssignment}>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="assignment-title">Título</Label>
                        <Input id="assignment-title" name="title" placeholder="Ej: Proyecto Web Frontend" required />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="assignment-description">Descripción</Label>
                        <Textarea id="assignment-description" name="description" placeholder="Instrucciones detalladas de la tarea" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="due-date">Fecha límite</Label>
                        <Input id="due-date" name="due_date" type="date" required />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" type="button" onClick={() => setIsCreateAssignmentDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit">Crear tarea</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {assignments.map((assignment) => (
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
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            <span>Editar</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteAssignment(assignment.id)}>
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
                      <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        Fecha límite: {new Date(assignment.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Entregas</span>
                        <span className="font-medium">
                          {assignment.submissions} de {assignment.totalStudents}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-800">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${(assignment.submissions / assignment.totalStudents) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="pt-2">
                      <Button className="w-full">Ver entregas</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Pestaña de Estudiantes */}
          <TabsContent value="students" className="space-y-4" id="students">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <h2 className="text-xl font-semibold">Estudiantes Matriculados</h2>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar estudiante..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-full"
                />
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="rounded-md border">
                  <table className="w-full caption-bottom text-sm">
                    <thead className="[&_tr]:border-b">
                      <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                          Estudiante
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                          Nota Actual
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                          Última Actividad
                        </th>
                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                      {filteredStudents.map((student) => (
                        <tr
                          key={student.id}
                          className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                        >
                          <td className="p-4 align-middle">
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src={student.profilePhotoUrl || undefined} alt={student.name} />
                                <AvatarFallback>
                                  {student.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{student.name}</div>
                                <div className="text-xs text-muted-foreground">{student.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 align-middle">
                            <span
                              className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                student.currentGrade != null && student.currentGrade >= 9
                                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                  : student.currentGrade != null && student.currentGrade >= 7
                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                                    : student.currentGrade != null
                                      ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                                      : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                              }`}
                            >
                              {student.currentGrade?.toFixed(1) || "N/A"}
                            </span>
                          </td>
                          <td className="p-4 align-middle">{new Date(student.lastActivity).toLocaleDateString()}</td>
                          <td className="p-4 align-middle text-right">
                            <Button variant="outline" size="sm">
                              Ver perfil
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
        </Tabs>
      </div>
    </MainLayout>
  );
}