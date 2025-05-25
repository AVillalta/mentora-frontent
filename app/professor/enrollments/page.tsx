"use client";

import { useState, useEffect, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import MainLayout from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ChevronDown, Download, FileText, Mail, Search } from "lucide-react";
import { AxiosError } from "axios";
import useAuth from "@/hooks/useAuth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface Enrollment {
  id: string;
  student_id: string;
  student_name: string;
  student_email: string | null;
  student_profile_photo_url: string | null;
  course_id: string;
  course_name: string;
  enrollment_date: string;
  semester: { id: string; start_date: string; end_date: string; is_active: boolean } | null;
}

interface Course {
  id: string;
  signature: { name: string };
  status: string;
}

interface ApiErrorResponse {
  message?: string;
  data?: string;
  errors?: { [key: string]: string[] };
}

export default function ProfessorEnrollmentsPage() {
  const router = useRouter();
  const { user, loading: loadingAuth, error: authError } = useAuth("professor");
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar matrículas y cursos
  useEffect(() => {
    if (loadingAuth || authError) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        console.log("Iniciando fetch de datos...");
        const [enrollmentsRes, coursesRes] = await Promise.all([
          api.get("/enrollments", { timeout: 10000 }),
          api.get("/courses", { timeout: 10000 }),
        ]);
        console.log("Respuesta de /enrollments:", enrollmentsRes.data);
        console.log("Respuesta de /courses:", coursesRes.data);
        const enrollmentsData = enrollmentsRes.data.data || [];
        const coursesData = coursesRes.data.data?.map((c: { id: string; signature?: { name: string }; status?: string }) => ({
          id: c.id,
          signature: c.signature || { name: "Curso desconocido" },
          status: c.status || "inactive",
        })) || [];
        console.log("Cursos normalizados:", coursesData);
        console.log("Nombres de cursos únicos:", [...new Set(enrollmentsData.map((e: Enrollment) => e.course_name))]);
        setEnrollments(enrollmentsData);
        setCourses(coursesData);
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

  // Filtrar matrículas
  const filteredEnrollments = enrollments.filter((enrollment) => {
    const matchesSearch =
      (enrollment.student_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (enrollment.student_email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (enrollment.course_name || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCourse = selectedCourse === "all" || enrollment.course_name === selectedCourse;
    const isActive = enrollment.semester?.is_active === true;
    return matchesSearch && matchesCourse && isActive;
  });

  // Placeholder para exportar lista
  const handleExportList = () => {
    console.log("Exportando lista de matrículas...");
    alert("Funcionalidad de exportación no implementada aún.");
  };

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
          <p className="text-xl">Cargando matrículas...</p>
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
      <div className="flex flex-col gap-6 p-4 sm:p-6 w-full max-w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Matrículas</h1>
            <p className="text-muted-foreground">Gestiona los estudiantes matriculados en tus cursos</p>
          </div>
          <Button variant="outline" className="gap-2" onClick={handleExportList}>
            <Download className="h-4 w-4" />
            Exportar lista
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Estudiantes</CardTitle>
            <CardDescription>Visualiza y gestiona los estudiantes matriculados en tus cursos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 sm:flex-row sm:gap-6 mb-6">
              <div className="flex flex-col gap-1 w-full">
                <label htmlFor="search" className="block text-sm font-medium text-muted-foreground">
                  Buscar
                </label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Buscar por nombre, email o curso..."
                    value={searchTerm}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                    className="pl-8 w-full min-h-12 text-base"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1 w-full sm:w-64">
                <label htmlFor="course-filter" className="block text-sm font-medium text-muted-foreground">
                  Filtrar por curso
                </label>
                <select
                  id="course-filter"
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="w-full max-w-full min-h-12 text-base rounded-md border border-input bg-background px-3 py-2 appearance-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 z-10"
                >
                  <option value="all">Todos los cursos</option>
                  {[...new Set(enrollments.map((e) => e.course_name))].map((courseName, index) => (
                    <option key={`${courseName}-${index}`} value={courseName}>
                      {courseName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Estudiante</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Curso</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      Fecha Matrícula
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Estado</th>
                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {filteredEnrollments.map((enrollment) => (
                    <tr
                      key={enrollment.id}
                      className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                    >
                      <td className="p-4 align-middle">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            {enrollment.student_profile_photo_url && (
                              <AvatarImage
                                src={
                                  enrollment.student_profile_photo_url.startsWith("http")
                                    ? enrollment.student_profile_photo_url
                                    : `http://localhost:8000${enrollment.student_profile_photo_url}`
                                }
                                alt={enrollment.student_name}
                              />
                            )}
                            <AvatarFallback>
                              {enrollment.student_name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{enrollment.student_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {enrollment.student_email || "Sin email"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 align-middle">{enrollment.course_name}</td>
                      <td className="p-4 align-middle">
                        {new Date(enrollment.enrollment_date).toLocaleDateString()}
                      </td>
                      <td className="p-4 align-middle">
                        <Badge
                          variant="outline"
                          className={
                            enrollment.semester?.is_active
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                          }
                        >
                          {enrollment.semester?.is_active ? "Activo" : "Inactivo"}
                        </Badge>
                      </td>
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
                              <Mail className="mr-2 h-4 w-4" />
                              <span>Enviar mensaje</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredEnrollments.length === 0 && (
              <div className="text-center text-muted-foreground mt-6">
                No hay matrículas activas que coincidan con los filtros.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}