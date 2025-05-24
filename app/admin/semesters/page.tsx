"use client";

import { useState, useEffect, ChangeEvent } from "react";
import api from "@/lib/api";
import MainLayout from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Calendar, ChevronDown, Edit, Plus, Search, Trash, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { AxiosError } from "axios";
import useAuth from "@/hooks/useAuth";

// Definir tipo para los eventos del calendario
interface CalendarEvent {
  date: string;
  description: string;
}

interface Semester {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  calendar: CalendarEvent[] | null;
  is_active: boolean;
  courses_count: number;
  enrollments_count: number;
}

interface ApiErrorResponse {
  message: string;
}

export default function AdminSemestersPage() {
  const router = useRouter();
  const { user, loading: loadingAuth, error: authError } = useAuth("admin");
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedSemester, setSelectedSemester] = useState<Semester | null>(null);

  const [semesterFormData, setSemesterFormData] = useState<{
    name: string;
    start_date: string;
    end_date: string;
    calendar: CalendarEvent[];
    is_active: boolean;
  }>({
    name: "",
    start_date: "",
    end_date: "",
    calendar: [],
    is_active: false,
  });

  // Cargar semestres
  useEffect(() => {
    if (loadingAuth || authError) return;

    const fetchSemesters = async () => {
      try {
        setLoading(true);
        const response = await api.get("/semesters");
        setSemesters(response.data.data || []);
      } catch (err: unknown) {
        const error = err as AxiosError<ApiErrorResponse>;
        setError(error.response?.data?.message || "Error al cargar los semestres. Inténtalo de nuevo.");
      } finally {
        setLoading(false);
      }
    };

    fetchSemesters();
  }, [loadingAuth, authError]);

  // Manejar creación de semestre
  const handleCreateSemester = async () => {
    try {
      await api.post("/semesters", {
        name: semesterFormData.name,
        start_date: semesterFormData.start_date,
        end_date: semesterFormData.end_date,
        calendar: semesterFormData.calendar,
        is_active: semesterFormData.is_active,
      });
      setIsCreateDialogOpen(false);
      setSemesterFormData({
        name: "",
        start_date: "",
        end_date: "",
        calendar: [],
        is_active: false,
      });
      const response = await api.get("/semesters");
      setSemesters(response.data.data || []);
      setError(null);
    } catch (err: unknown) {
      const error = err as AxiosError<ApiErrorResponse>;
      setError(error.response?.data?.message || "Error al crear el semestre. Inténtalo de nuevo.");
    }
  };

  // Manejar edición de semestre
  const handleEditSemester = async () => {
    if (!selectedSemester) return;
    try {
      await api.put(`/semesters/${selectedSemester.id}`, {
        name: semesterFormData.name,
        start_date: semesterFormData.start_date,
        end_date: semesterFormData.end_date,
        calendar: semesterFormData.calendar,
        is_active: semesterFormData.is_active,
      });
      setIsEditDialogOpen(false);
      setSemesterFormData({
        name: "",
        start_date: "",
        end_date: "",
        calendar: [],
        is_active: false,
      });
      setSelectedSemester(null);
      const response = await api.get("/semesters");
      setSemesters(response.data.data || []);
      setError(null);
    } catch (err: unknown) {
      const error = err as AxiosError<ApiErrorResponse>;
      setError(error.response?.data?.message || "Error al editar el semestre. Inténtalo de nuevo.");
    }
  };

  // Manejar eliminación de semestre
  const handleDeleteSemester = async (id: string) => {
    try {
      await api.delete(`/semesters/${id}`);
      const response = await api.get("/semesters");
      setSemesters(response.data.data || []);
      setError(null);
    } catch (err: unknown) {
      const error = err as AxiosError<ApiErrorResponse>;
      setError(error.response?.data?.message || "Error al eliminar el semestre. Inténtalo de nuevo.");
    }
  };

  // Manejar clic en editar
  const handleEditClick = (semester: Semester) => {
    setSelectedSemester(semester);
    setSemesterFormData({
      name: semester.name || "",
      start_date: semester.start_date || "",
      end_date: semester.end_date || "",
      calendar: semester.calendar || [],
      is_active: semester.is_active || false,
    });
    setIsEditDialogOpen(true);
  };

  // Filtrar semestres
  const filteredSemesters = semesters.filter((semester) => {
    const matchesSearch = (semester.name || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = showInactive || semester.is_active;
    return matchesSearch && matchesStatus;
  });

  // Ajustar la URL de la foto de perfil para el MainLayout
  const profilePhotoUrl = user?.profilePhotoUrl
    ? user.profilePhotoUrl.startsWith("http")
      ? user.profilePhotoUrl
      : `http://localhost:80${user.profilePhotoUrl}`
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
          <div className="text-red-500 text-center">{authError}</div>
        ) : loading ? (
          <div className="text-center">Cargando...</div>
        ) : (
          <>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Semestres</h1>
                <p className="text-muted-foreground">Gestiona los períodos académicos de la plataforma</p>
              </div>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Nuevo Semestre
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Crear nuevo semestre</DialogTitle>
                    <DialogDescription>Completa la información para crear un nuevo período académico</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Nombre del semestre</Label>
                      <Input
                        id="name"
                        placeholder="Ej: 2025-2"
                        value={semesterFormData.name}
                        onChange={(e) => setSemesterFormData({ ...semesterFormData, name: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="startDate">Fecha de inicio</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={semesterFormData.start_date}
                        onChange={(e) => setSemesterFormData({ ...semesterFormData, start_date: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="endDate">Fecha de finalización</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={semesterFormData.end_date}
                        onChange={(e) => setSemesterFormData({ ...semesterFormData, end_date: e.target.value })}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="is-active"
                        checked={semesterFormData.is_active}
                        onChange={(e) => setSemesterFormData({ ...semesterFormData, is_active: e.target.checked })}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="is-active" className="text-sm text-gray-700">
                        Semestre activo
                      </label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleCreateSemester}>Crear semestre</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Lista de Semestres</CardTitle>
                <CardDescription>Visualiza y gestiona los períodos académicos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por nombre..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 w-full"
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="show-inactive"
                      checked={showInactive}
                      onChange={(e) => setShowInactive(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="show-inactive" className="text-sm text-gray-700">
                      Mostrar semestres inactivos
                    </label>
                  </div>
                </div>

                <div className="rounded-md border">
                  <table className="w-full caption-bottom text-sm">
                    <thead className="[&_tr]:border-b">
                      <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Nombre</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Fecha Inicio</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Fecha Fin</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Estado</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Cursos</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Matrículas</th>
                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                      {filteredSemesters.map((semester) => (
                        <tr
                          key={semester.id}
                          className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                        >
                          <td className="p-4 align-middle font-medium">{semester.name}</td>
                          <td className="p-4 align-middle">{new Date(semester.start_date).toLocaleDateString()}</td>
                          <td className="p-4 align-middle">{new Date(semester.end_date).toLocaleDateString()}</td>
                          <td className="p-4 align-middle">
                            <Badge
                              variant="outline"
                              className={
                                semester.is_active
                                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                  : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
                              }
                            >
                              {semester.is_active ? "Activo" : "Inactivo"}
                            </Badge>
                          </td>
                          <td className="p-4 align-middle">{semester.courses_count || 0}</td>
                          <td className="p-4 align-middle">{semester.enrollments_count || 0}</td>
                          <td className="p-4 align-middle text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <ChevronDown className="h-4 w-4" />
                                  <span className="sr-only">Abrir menú</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditClick(semester)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  <span>Editar</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDeleteSemester(semester.id)}
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
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Editar semestre</DialogTitle>
                  <DialogDescription>Modifica la información del período académico</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-name">Nombre del semestre</Label>
                    <Input
                      id="edit-name"
                      placeholder="Ej: 2025-2"
                      value={semesterFormData.name}
                      onChange={(e) => setSemesterFormData({ ...semesterFormData, name: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-startDate">Fecha de inicio</Label>
                    <Input
                      id="edit-startDate"
                      type="date"
                      value={semesterFormData.start_date}
                      onChange={(e) => setSemesterFormData({ ...semesterFormData, start_date: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-endDate">Fecha de finalización</Label>
                    <Input
                      id="edit-endDate"
                      type="date"
                      value={semesterFormData.end_date}
                      onChange={(e) => setSemesterFormData({ ...semesterFormData, end_date: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="edit-is-active"
                      checked={semesterFormData.is_active}
                      onChange={(e) => setSemesterFormData({ ...semesterFormData, is_active: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="edit-is-active" className="text-sm text-gray-700">
                      Semestre activo
                    </label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleEditSemester}>Guardar cambios</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </MainLayout>
  );
}