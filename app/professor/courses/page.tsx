"use client";

import { useState, useEffect, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import MainLayout from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Users } from "lucide-react";
import { AxiosError } from "axios";
import useAuth from "@/hooks/useAuth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

// Interfaz para la respuesta de la API de cursos
interface ApiCourse {
  id: string;
  signature: string;
  description: string;
  semester: { id: string; name: string; is_active: boolean };
  students: number;
  status: string;
}

// Interfaz para curso en el estado
interface Course {
  id: string;
  title: string;
  description: string;
  semester: { id: string; name: string; is_active: boolean };
  students: number;
  is_active: boolean;
}

interface ApiErrorResponse {
  message?: string;
  data?: string;
  errors?: { [key: string]: string[] };
}

export default function ProfessorCoursesPage() {
  const router = useRouter();
  const { user, loading: loadingAuth, error: authError } = useAuth("professor");
  const [courses, setCourses] = useState<Course[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar cursos
  useEffect(() => {
    if (loadingAuth || authError) return;

    const fetchCourses = async () => {
      try {
        setLoading(true);
        console.log("Iniciando fetch de cursos...");
        const response = await api.get("/courses", { timeout: 10000 });
        console.log("Respuesta de /courses:", response.data);
        const normalizedCourses = response.data.data?.map((c: ApiCourse) => ({
          id: c.id,
          title: c.signature || "Curso desconocido",
          description: c.description || "Sin descripción",
          semester: c.semester || { id: "", name: "Desconocido", is_active: false },
          students: Number(c.students ?? 0),
          is_active: c.status === "active",
        })) || [];
        console.log("Cursos normalizados:", normalizedCourses);
        console.log("Cursos activos:", normalizedCourses.filter(c => c.is_active).length);
        console.log("Cursos inactivos:", normalizedCourses.filter(c => !c.is_active).length);
        setCourses(normalizedCourses);
        setError(null);
      } catch (err: unknown) {
        const error = err as AxiosError<ApiErrorResponse>;
        console.error("Error al cargar datos:", error.response?.data || error.message);
        setError(error.response?.data?.message || "Error al cargar los cursos. Inténtalo de nuevo.");
      } finally {
        setLoading(false);
        console.log("Fetch de datos completado, loading:", false);
      }
    };

    fetchCourses();
  }, [loadingAuth, authError]);

  // Filtrar cursos según el término de búsqueda y estado activo
  const filteredCourses = courses.filter(
    (course) =>
      course.is_active &&
      (course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
       course.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
          <p className="text-xl">Cargando cursos...</p>
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
      <div className="flex flex-col gap-6 p-3 xs:p-4 w-full min-w-full max-w-full">
        {/* Encabezado */}
        <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-4">
          <div>
            <h1 className="text-2xl xs:text-3xl font-bold tracking-tight">Mis Cursos</h1>
            <p className="text-muted-foreground text-sm xs:text-base">Gestiona los cursos que impartes</p>
          </div>
        </div>

        {/* Tabla de cursos */}
        <Card className="w-full max-w-full">
          <CardHeader>
            <CardTitle className="text-lg xs:text-xl">Lista de Cursos</CardTitle>
            <CardDescription className="text-sm xs:text-base">Visualiza y gestiona tus cursos actuales</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col xs:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2.5 top-3.5 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por título o descripción..."
                    value={searchTerm}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full min-h-14 text-base bg-white dark:bg-gray-800 border border-input rounded-md"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto w-full">
              <table className="w-full min-w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <th className="h-12 px-3 xs:px-4 text-left align-middle font-medium text-muted-foreground">Título</th>
                    <th className="h-12 px-3 xs:px-4 text-left align-middle font-medium text-muted-foreground">Descripción</th>
                    <th className="h-12 px-3 xs:px-4 text-left align-middle font-medium text-muted-foreground">Semestre</th>
                    <th className="h-12 px-3 xs:px-4 text-left align-middle font-medium text-muted-foreground">Estudiantes</th>
                    <th className="h-12 px-3 xs:px-4 text-left align-middle font-medium text-muted-foreground">Estado</th>
                    <th className="h-12 px-3 xs:px-4 text-right align-middle font-medium text-muted-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {filteredCourses.map((course) => (
                    <tr
                      key={course.id}
                      className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                    >
                      <td className="p-3 xs:p-4 align-middle font-medium text-sm xs:text-base">{course.title}</td>
                      <td className="p-3 xs:p-4 align-middle text-sm xs:text-base">{course.description}</td>
                      <td className="p-3 xs:p-4 align-middle text-sm xs:text-base">{course.semester.name}</td>
                      <td className="p-3 xs:p-4 align-middle text-sm xs:text-base">{course.students}</td>
                      <td className="p-3 xs:p-4 align-middle">
                        <Badge
                          variant="outline"
                          className={`text-xs xs:text-sm ${
                            course.is_active
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {course.is_active ? "Activo" : "Inactivo"}
                        </Badge>
                      </td>
                      <td className="p-3 xs:p-4 align-middle text-right">
                        <Button variant="outline" size="sm" className="text-xs xs:text-sm" asChild>
                          <Link href={`/professor/courses/${course.id}/students`}>
                            <Users className="h-4 w-4 mr-2" />
                            Ver estudiantes
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredCourses.length === 0 && (
              <div className="text-center text-muted-foreground mt-6 text-sm xs:text-base">
                No hay cursos activos que coincidan con los filtros.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}