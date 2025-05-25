"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import MainLayout from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "recharts";
import { Book, Calendar, Clock, FileText, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { AxiosError } from "axios";
import useAuth from "@/hooks/useAuth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface Course {
  id: number;
  signature: string;
  description: string;
  semester: {
    id: string;
    name: string;
    is_active: boolean;
  };
  professor: string;
  students: number;
  status: "active" | "inactive";
  progress?: number;
  next_class?: string;
  pending_assignments?: number;
  new_messages?: number;
}

interface Grade {
  id: number;
  grade_type: string;
  grade_value: number;
  grade_date: string;
  enrollment_id: number;
  course_id: number;
  course_name: string;
}

interface Content {
  id: number;
  name: string;
  description: string;
  bibliography: string;
  order: number;
  course_id: number;
  grade_id: number | null;
  created_at: string;
  updated_at: string;
}

interface Event {
  id: number;
  title: string;
  course: string;
  date: string;
  time: string;
}

interface CourseStats {
  id: number;
  name: string;
  students: number;
  avgGrade: number;
  pendingAssignments: number;
  newMessages: number;
  nextClass: string;
  progress: number;
  gradient: string;
}

interface GradeDistribution {
  name: string;
  value: number;
}

interface GradeEvolution {
  name: string;
  [key: string]: number | string;
}

interface ApiErrorResponse {
  message?: string;
  data?: string;
  errors?: { [key: string]: string[] };
}

export default function ProfessorDashboard() {
  const router = useRouter();
  const { user, loading: loadingAuth, error: authError } = useAuth("professor");
  const [courses, setCourses] = useState<Course[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [contents, setContents] = useState<Content[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar datos
  useEffect(() => {
    if (loadingAuth || authError) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        console.log("Iniciando fetch de datos...");
        const [coursesRes, gradesRes, contentsRes, eventsRes] = await Promise.all([
          api.get("/courses", { timeout: 10000 }),
          api.get("/grades", { timeout: 10000 }),
          api.get("/contents", { timeout: 10000 }),
          api.get("/events", { timeout: 10000 }).catch(() => ({ data: { data: [] } })),
        ]);

        console.log("Respuesta de /courses (raw):", coursesRes.data);
        console.log("Respuesta de /grades (raw):", gradesRes.data);
        console.log("Respuesta de /contents:", contentsRes.data);
        console.log("Respuesta de /events:", eventsRes.data);

        const normalizedCourses = coursesRes.data.data?.map((course: Course) => {
          const students = Number(course.students ?? 0);
          console.log(`Curso ${course.signature}: students=${students}, course_id=${course.id}`);
          return {
            ...course,
            students,
            status: course.status ?? (course.semester?.is_active ? "active" : "inactive"),
            semester: course.semester ?? { id: "", name: "", is_active: false },
          };
        }) || [];
        console.log("Cursos normalizados:", normalizedCourses);

        const normalizedGrades = gradesRes.data.data?.map((grade: Grade) => {
          const gradeValue = grade.grade_value != null && typeof grade.grade_value === 'string'
            ? parseFloat(grade.grade_value)
            : grade.grade_value ?? 0;
          console.log(`Grade ${grade.id}: course_id=${grade.course_id}, course_name=${grade.course_name}, grade_value=${gradeValue}`);
          return {
            ...grade,
            grade_value: isNaN(gradeValue) ? 0 : gradeValue,
          };
        }).filter((grade: Grade) => typeof grade.grade_value === 'number') || [];
        console.log("Notas normalizadas:", normalizedGrades);

        setCourses(normalizedCourses);
        setGrades(normalizedGrades);
        setContents(contentsRes.data.data || []);
        setEvents(eventsRes.data.data || []);
        setError(null);
      } catch (err: unknown) {
        const error = err as AxiosError<ApiErrorResponse>;
        console.error("Error al cargar datos:", error.response?.data || error.message);
        setError(error.response?.data?.message || "Error al cargar los datos. Inténtalo de nuevo.");
      } finally {
        setLoading(false);
        console.log("Fetch de datos completado, loading:", false);
      }
    };

    fetchData();
  }, [loadingAuth, authError]);

  // Procesar estadísticas de cursos
  const computeCourseStats = (courses: Course[], grades: Grade[], contents: Content[]): CourseStats[] => {
    const gradientColors = [
      'from-blue-500 to-blue-700',
      'from-green-500 to-green-700',
      'from-purple-500 to-purple-700',
      'from-red-500 to-red-700',
      'from-indigo-500 to-indigo-700',
    ];

    // Filtrar solo cursos activos
    const activeCourses = courses.filter(course => course.status === "active");

    return activeCourses.map((course, index) => {
      const courseGrades = grades.filter(grade => grade.course_name === course.signature);
      const validGrades = courseGrades.filter(grade => typeof grade.grade_value === 'number' && !isNaN(grade.grade_value));
      const avgGrade = validGrades.length
        ? validGrades.reduce((sum, grade) => sum + grade.grade_value, 0) / validGrades.length
        : 0;
      console.log(`Curso ${course.signature}: courseGrades=`, courseGrades, `avgGrade=${avgGrade}`);
      const courseContents = contents.filter((content) => content.course_id === course.id);
      const pendingAssignments = courseContents.filter(
        (content) => content.grade_id === null && new Date(content.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).length;

      return {
        id: course.id,
        name: course.signature,
        students: course.students,
        avgGrade: parseFloat(avgGrade.toFixed(1)),
        pendingAssignments,
        newMessages: 0, // Simulado
        nextClass: course.next_class || "No programada",
        progress: course.progress || Math.floor(Math.random() * 50 + 50), // Simulado
        gradient: gradientColors[index % gradientColors.length],
      };
    });
  };

  // Procesar distribución de notas
  const computeGradeDistribution = (grades: Grade[], courses: Course[]): GradeDistribution[] => {
    // Filtrar notas de cursos activos
    const activeCourseSignatures = courses.filter(course => course.status === "active").map(course => course.signature);
    const activeGrades = grades.filter(grade => activeCourseSignatures.includes(grade.course_name));

    const ranges = [
      { name: "0-4.9", min: 0, max: 4.9 },
      { name: "5-5.9", min: 5, max: 5.9 },
      { name: "6-6.9", min: 6, max: 6.9 },
      { name: "7-7.9", min: 7, max: 7.9 },
      { name: "8-8.9", min: 8, max: 8.9 },
      { name: "9-10", min: 9, max: 10 },
    ];

    return ranges.map((range) => ({
      name: range.name,
      value: activeGrades.filter((grade) => grade.grade_value >= range.min && grade.grade_value <= range.max).length,
    }));
  };

  // Procesar evolución de notas por curso
  const computeGradeEvolution = (courses: Course[], grades: Grade[]): GradeEvolution[] => {
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

    // Filtrar solo cursos activos
    const activeCourses = courses.filter(course => course.status === "active");

    const evolution: GradeEvolution[] = months.map((month, index) => {
      const entry: GradeEvolution = { name: month };
      activeCourses.forEach((course) => {
        const courseGrades = grades.filter(
          (grade) =>
            grade.course_name === course.signature &&
            new Date(grade.grade_date).getMonth() === index
        );
        entry[course.signature] = courseGrades.length
          ? parseFloat(
              (courseGrades.reduce((sum, grade) => sum + grade.grade_value, 0) / courseGrades.length).toFixed(1)
            )
          : 0;
      });
      return entry;
    });

    console.log("Grade evolution:", evolution);

    // Incluir meses con al menos una nota válida (incluso si es 0)
    return evolution.filter((entry) =>
      Object.values(entry).some((value) => typeof value === "number")
    );
  };

  const courseStats = computeCourseStats(courses, grades, contents);
  const gradeDistribution = computeGradeDistribution(grades, courses);
  const gradeEvolution = computeGradeEvolution(courses, grades);
  const COLORS = ["#1976d2", "#dc004e", "#ff9800", "#388e3c"];

  // Simular próxima clase si no hay datos
  const nextClass = courseStats.length > 0 ? courseStats[0].nextClass : "No programada";

  // Si está cargando autenticación
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

  // Si hay error de autenticación
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

  // Si está cargando datos
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

  // Si hay error
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
            <Link href="/professor">Volver a intentar</Link>
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
      <div className="flex flex-col gap-6 p-4">
        {/* Breadcrumbs */}
        <Breadcrumb className="mb-2">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/professor">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink>Profesor</BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <h1 className="text-3xl font-bold tracking-tight">Dashboard Profesor</h1>
        <p className="text-muted-foreground">
          Bienvenido de nuevo, {user?.name || "Profesor"}. Aquí tienes un resumen de tus cursos y actividades.
        </p>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cursos</CardTitle>
              <Book className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{courseStats.length}</div>
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
                {courseStats.reduce((sum, course) => sum + course.students, 0)}
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
              <CardTitle className="text-sm font-medium">Próxima Clase</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{nextClass.split(",")[0]}</div>
              <p className="text-xs text-muted-foreground">{nextClass}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="courses" className="space-y-4">
          <TabsList>
            <TabsTrigger value="courses">Mis Cursos</TabsTrigger>
            <TabsTrigger value="overview">Estadísticas</TabsTrigger>
            <TabsTrigger value="calendar">Próximos Eventos</TabsTrigger>
          </TabsList>

          <TabsContent value="courses" className="space-y-4">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {courseStats.length > 0 ? (
                courseStats.map((course) => (
                  <Link href={`/professor/courses/${course.id}`} key={course.id} className="block">
                    <Card className="h-full overflow-hidden transition-all hover:shadow-md">
                      <div className={`aspect-video w-full bg-gradient-to-r ${course.gradient} flex items-center justify-center transition-all hover:scale-105`}>
                        <Book className="h-16 w-16 text-white opacity-80" />
                      </div>
                      <CardHeader className="p-4 pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-xl">{course.name}</CardTitle>
                          {course.pendingAssignments > 0 && (
                            <Badge variant="destructive">{course.pendingAssignments} pendientes</Badge>
                          )}
                        </div>
                        <CardDescription>
                          {course.students} estudiantes • Nota media: {course.avgGrade.toFixed(1)}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Progreso del curso</span>
                          <span className="font-medium">{course.progress}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${course.progress}%` }} />
                        </div>
                        <div className="flex items-center justify-between pt-2 text-sm">
                          <div className="flex items-center">
                            <Clock className="mr-1 h-4 w-4 text-muted-foreground" />
                            <span>{course.nextClass}</span>
                          </div>
                          <Button variant="ghost" size="sm" className="gap-1">
                            <span>Ver curso</span>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-muted-foreground">No tienes cursos activos.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

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
                      {courseStats.map((course, index) => (
                        <Line
                          key={course.id}
                          type="monotone"
                          dataKey={course.name}
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
                  <CardDescription>Cursos activos</CardDescription>
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

          <TabsContent value="calendar" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Próximos Eventos</CardTitle>
                <CardDescription>Calendario de actividades programadas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {events.length === 0 ? (
                    <p className="text-center text-muted-foreground">No hay eventos programados.</p>
                  ) : (
                    events.map((event) => (
                      <div key={event.id} className="flex items-start space-x-4">
                        <div className="min-w-[60px] rounded-md bg-primary/10 p-3 text-center">
                          <div className="text-sm font-medium text-primary">
                            {
                              new Date(event.date)
                                .toLocaleDateString("es-ES", { day: "2-digit", month: "short" })
                                .split(" ")[0]
                            }
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(event.date).toLocaleDateString("es-ES", { month: "short" }).split(" ")[0]}
                          </div>
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium leading-none">{event.title}</p>
                            <Badge variant="outline">{event.course}</Badge>
                          </div>
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Calendar className="mr-1 h-3 w-3" />
                            <span>
                              {new Date(event.date).toLocaleDateString()} • {event.time}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}