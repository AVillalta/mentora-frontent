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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Book, ChevronDown, Edit, Plus, Search, Trash, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { AxiosError } from "axios";
import useAuth from "@/hooks/useAuth";

interface Course {
  id: string;
  code: string;
  schedule: { day: string; start_time: string; end_time: string }[] | null;
  weighting: { homework: number; midterms: number; final_exam: number } | null;
  signature: string | null;
  semester: { id: string; name: string; is_active: boolean } | null;
  professor: string | null;
  students: number;
  status: "active" | "inactive";
}

interface Signature {
  id: string;
  name: string;
}

interface Professor {
  id: string;
  name: string;
}

interface Semester {
  id: string;
  name: string;
  is_active: boolean;
}

interface ApiErrorResponse {
  message: string;
}

export default function AdminCoursesPage() {
  const router = useRouter();
  const { user, loading: loadingAuth, error: authError } = useAuth("admin");
  const [courses, setCourses] = useState<Course[]>([]);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingSignatures, setLoadingSignatures] = useState(true);
  const [loadingProfessors, setLoadingProfessors] = useState(true);
  const [loadingSemesters, setLoadingSemesters] = useState(true);
  const [errorCourses, setErrorCourses] = useState<string | null>(null);
  const [errorSignatures, setErrorSignatures] = useState<string | null>(null);
  const [errorProfessors, setErrorProfessors] = useState<string | null>(null);
  const [errorSemesters, setErrorSemesters] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [selectedSemester, setSelectedSemester] = useState("all");
  const [showInactive, setShowInactive] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [courseFormData, setCourseFormData] = useState({
    code: "",
    scheduleDay: "",
    scheduleStartTime: "",
    scheduleEndTime: "",
    weighting: { homework: "0.3", midterms: "0.4", final_exam: "0.3" },
    signature_id: "",
    semester_id: "",
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Cargar datos
  useEffect(() => {
    if (loadingAuth || authError) return;

    const fetchCourses = async () => {
      try {
        setLoadingCourses(true);
        const response = await api.get("/courses");
        setCourses(response.data.data || []);
        setErrorCourses(null);
      } catch (err: unknown) {
        const error = err as AxiosError<ApiErrorResponse>;
        setErrorCourses(error.response?.data?.message || "Error al cargar los cursos.");
      } finally {
        setLoadingCourses(false);
      }
    };

    const fetchSignatures = async () => {
      try {
        setLoadingSignatures(true);
        const response = await api.get("/signatures");
        setSignatures(response.data.data || []);
        setErrorSignatures(null);
      } catch (err: unknown) {
        const error = err as AxiosError<ApiErrorResponse>;
        setErrorSignatures(error.response?.data?.message || "Error al cargar las asignaturas.");
      } finally {
        setLoadingSignatures(false);
      }
    };

    const fetchProfessors = async () => {
      try {
        setLoadingProfessors(true);
        const response = await api.get("/users?role=professor");
        setProfessors(response.data.data || []);
        setErrorProfessors(null);
      } catch (err: unknown) {
        const error = err as AxiosError<ApiErrorResponse>;
        setErrorProfessors(error.response?.data?.message || "Error al cargar los profesores.");
      } finally {
        setLoadingProfessors(false);
      }
    };

    const fetchSemesters = async () => {
      try {
        setLoadingSemesters(true);
        const response = await api.get("/semesters");
        setSemesters(response.data.data || []);
        setErrorSemesters(null);
      } catch (err: unknown) {
        const error = err as AxiosError<ApiErrorResponse>;
        setErrorSemesters(error.response?.data?.message || "Error al cargar los semestres.");
      } finally {
        setLoadingSemesters(false);
      }
    };

    fetchCourses();
    fetchSignatures();
    fetchProfessors();
    fetchSemesters();
  }, [loadingAuth, authError]);

  // Validar ponderaciones
  const validateWeighting = () => {
    const { homework, midterms, final_exam } = courseFormData.weighting;
    const total = parseFloat(homework) + parseFloat(midterms) + parseFloat(final_exam);
    if (Math.abs(total - 1.0) > 0.01) {
      setFormError("Las ponderaciones deben sumar exactamente 1.0");
      return false;
    }
    setFormError(null);
    return true;
  };

  // Manejar creación de curso
  const handleCreateCourse = async () => {
    if (!validateWeighting()) return;
    try {
      const schedule = courseFormData.scheduleDay && courseFormData.scheduleStartTime && courseFormData.scheduleEndTime
        ? [{
            day: courseFormData.scheduleDay,
            start_time: courseFormData.scheduleStartTime,
            end_time: courseFormData.scheduleEndTime,
          }]
        : null;
      await api.post("/courses", {
        code: courseFormData.code,
        schedule,
        weighting: {
          homework: parseFloat(courseFormData.weighting.homework),
          midterms: parseFloat(courseFormData.weighting.midterms),
          final_exam: parseFloat(courseFormData.weighting.final_exam),
        },
        signature_id: courseFormData.signature_id,
        semester_id: courseFormData.semester_id,
      });
      setIsCreateDialogOpen(false);
      setCourseFormData({
        code: "",
        scheduleDay: "",
        scheduleStartTime: "",
        scheduleEndTime: "",
        weighting: { homework: "0.3", midterms: "0.4", final_exam: "0.3" },
        signature_id: "",
        semester_id: "",
      });
      const response = await api.get("/courses");
      setCourses(response.data.data || []);
      setErrorCourses(null);
    } catch (err: unknown) {
      const error = err as AxiosError<ApiErrorResponse>;
      setErrorCourses(error.response?.data?.message || "Error al crear el curso. Inténtalo de nuevo.");
    }
  };

  // Manejar edición de curso
  const handleEditCourse = async () => {
    if (!selectedCourse || !validateWeighting()) return;
    try {
      const schedule = courseFormData.scheduleDay && courseFormData.scheduleStartTime && courseFormData.scheduleEndTime
        ? [{
            day: courseFormData.scheduleDay,
            start_time: courseFormData.scheduleStartTime,
            end_time: courseFormData.scheduleEndTime,
          }]
        : null;
      await api.put(`/courses/${selectedCourse.id}`, {
        code: courseFormData.code,
        schedule,
        weighting: {
          homework: parseFloat(courseFormData.weighting.homework),
          midterms: parseFloat(courseFormData.weighting.midterms),
          final_exam: parseFloat(courseFormData.weighting.final_exam),
        },
        signature_id: courseFormData.signature_id,
        semester_id: courseFormData.semester_id,
      });
      setIsEditDialogOpen(false);
      setCourseFormData({
        code: "",
        scheduleDay: "",
        scheduleStartTime: "",
        scheduleEndTime: "",
        weighting: { homework: "0.3", midterms: "0.4", final_exam: "0.3" },
        signature_id: "",
        semester_id: "",
      });
      setSelectedCourse(null);
      const response = await api.get("/courses");
      setCourses(response.data.data || []);
      setErrorCourses(null);
    } catch (err: unknown) {
      const error = err as AxiosError<ApiErrorResponse>;
      setErrorCourses(error.response?.data?.message || "Error al editar el curso. Inténtalo de nuevo.");
    }
  };

  // Manejar eliminación de curso
  const handleDeleteCourse = async (id: string) => {
    try {
      await api.delete(`/courses/${id}`);
      const response = await api.get("/courses");
      setCourses(response.data.data || []);
      setErrorCourses(null);
    } catch (err: unknown) {
      const error = err as AxiosError<ApiErrorResponse>;
      setErrorCourses(error.response?.data?.message || "Error al eliminar el curso. Inténtalo de nuevo.");
    }
  };

  // Manejar clic en ver detalles
  const handleViewDetails = (courseId: string) => {
    router.push(`/admin/courses/${courseId}`);
  };

  // Manejar clic en ver estudiantes
  const handleViewStudents = (courseId: string) => {
    router.push(`/admin/courses/${courseId}/students`);
  };

  // Manejar clic en editar
  const handleEditClick = (course: Course) => {
    setSelectedCourse(course);
    setCourseFormData({
      code: course.code || "",
      scheduleDay: course.schedule && course.schedule[0] ? course.schedule[0].day : "",
      scheduleStartTime: course.schedule && course.schedule[0] ? course.schedule[0].start_time : "",
      scheduleEndTime: course.schedule && course.schedule[0] ? course.schedule[0].end_time : "",
      weighting: {
        homework: course.weighting?.homework?.toString() || "0.3",
        midterms: course.weighting?.midterms?.toString() || "0.4",
        final_exam: course.weighting?.final_exam?.toString() || "0.3",
      },
      signature_id: course.signature ? signatures.find((s) => s.name === course.signature)?.id || "" : "",
      semester_id: course.semester?.name ? semesters.find((s) => s.name === course.semester.name)?.id || "" : "",
    });
    setIsEditDialogOpen(true);
  };

  // Formatear horario para la tabla
  const formatSchedule = (schedule: Course['schedule']): string => {
    if (!schedule || !Array.isArray(schedule)) return "Sin horario";
    return schedule
      .map((item) => {
        if (item.day && item.start_time && item.end_time) {
          return `${item.day} ${item.start_time}-${item.end_time}`;
        }
        return "";
      })
      .filter((item) => item)
      .join(", ") || "Sin horario";
  };

  // Filtrar cursos
  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      (course.code || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (course.signature || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (course.professor || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject =
      selectedSubject === "all" ||
      signatures.find((s) => s.id === selectedSubject)?.name === course.signature;
    const matchesSemester = selectedSemester === "all" ||
      (course.semester && semesters.find((s) => s.id === selectedSemester)?.name === course.semester.name);
    const matchesStatus = showInactive || course.status === "active";

    return matchesSearch && matchesSubject && matchesSemester && matchesStatus;
  });

  // Ajustar la URL de la foto de perfil
  const profilePhotoUrl = user?.profilePhotoUrl
    ? user.profilePhotoUrl.startsWith("http")
      ? user.profilePhotoUrl
      : `http://localhost:80${user.profilePhotoUrl}`
    : null;

  const isLoading = loadingCourses || loadingSignatures || loadingProfessors || loadingSemesters;
  const hasError = errorCourses || errorSignatures || errorProfessors || errorSemesters;

  return (
    <MainLayout
      userRole={user?.role || "admin"}
      userName={user?.name || "Cargando..."}
      userEmail={user?.email || "cargando@mentora.edu"}
      profilePhotoUrl={profilePhotoUrl}
    >
      <div className="flex flex-col gap-6 p-4">
        {loadingAuth ? (
          <div className="text-center animate-pulse">Verificando autenticación...</div>
        ) : authError ? (
          <div className="text-red-500 text-center">{authError}</div>
        ) : isLoading ? (
          <div className="text-center animate-pulse">Cargando datos...</div>
        ) : hasError ? (
          <div className="text-red-500 text-center">
            {errorCourses || errorSignatures || errorProfessors || errorSemesters}
          </div>
        ) : (
          <>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Cursos</h1>
                <p className="text-muted-foreground">Gestiona los cursos disponibles en la plataforma</p>
              </div>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Nuevo Curso
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Crear nuevo curso</DialogTitle>
                    <DialogDescription>Completa la información para crear un nuevo curso</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="code">Código</Label>
                      <Input
                        id="code"
                        placeholder="Ej: CS101-A"
                        value={courseFormData.code}
                        onChange={(e) => setCourseFormData({ ...courseFormData, code: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Horario</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label htmlFor="schedule-day">Día</Label>
                          <Input
                            id="schedule-day"
                            placeholder="Ej: Lunes"
                            value={courseFormData.scheduleDay}
                            onChange={(e) => setCourseFormData({ ...courseFormData, scheduleDay: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="schedule-start-time">Inicio</Label>
                          <Input
                            id="schedule-start-time"
                            type="time"
                            value={courseFormData.scheduleStartTime}
                            onChange={(e) => setCourseFormData({ ...courseFormData, scheduleStartTime: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="schedule-end-time">Fin</Label>
                          <Input
                            id="schedule-end-time"
                            type="time"
                            value={courseFormData.scheduleEndTime}
                            onChange={(e) => setCourseFormData({ ...courseFormData, scheduleEndTime: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label>Ponderación</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label htmlFor="weighting-homework">Tareas</Label>
                          <Input
                            id="weighting-homework"
                            type="number"
                            step="0.1"
                            min="0"
                            max="1"
                            value={courseFormData.weighting.homework}
                            onChange={(e) =>
                              setCourseFormData({
                                ...courseFormData,
                                weighting: { ...courseFormData.weighting, homework: e.target.value },
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="weighting-midterms">Parciales</Label>
                          <Input
                            id="weighting-midterms"
                            type="number"
                            step="0.1"
                            min="0"
                            max="1"
                            value={courseFormData.weighting.midterms}
                            onChange={(e) =>
                              setCourseFormData({
                                ...courseFormData,
                                weighting: { ...courseFormData.weighting, midterms: e.target.value },
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="weighting-final_exam">Examen final</Label>
                          <Input
                            id="weighting-final_exam"
                            type="number"
                            step="0.1"
                            min="0"
                            max="1"
                            value={courseFormData.weighting.final_exam}
                            onChange={(e) =>
                              setCourseFormData({
                                ...courseFormData,
                                weighting: { ...courseFormData.weighting, final_exam: e.target.value },
                              })
                            }
                          />
                        </div>
                      </div>
                      {formError && <div className="text-red-500 text-sm">{formError}</div>}
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="subject">Asignatura</Label>
                      <select
                        id="subject"
                        value={courseFormData.signature_id}
                        onChange={(e) => setCourseFormData({ ...courseFormData, signature_id: e.target.value })}
                        className="w-full border rounded-md p-2"
                      >
                        <option value="">Selecciona una asignatura</option>
                        {signatures.map((signature) => (
                          <option key={signature.id} value={signature.id}>
                            {signature.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="semester">Semestre</Label>
                      <select
                        id="semester"
                        value={courseFormData.semester_id}
                        onChange={(e) => setCourseFormData({ ...courseFormData, semester_id: e.target.value })}
                        className="w-full border rounded-md p-2"
                      >
                        <option value="">Selecciona un semestre</option>
                        {semesters.map((semester) => (
                          <option key={semester.id} value={semester.id}>
                            {semester.name} {semester.is_active ? "(Activo)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleCreateCourse}>Crear curso</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Lista de Cursos</CardTitle>
                <CardDescription>Visualiza y gestiona los cursos disponibles</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por código, asignatura o profesor..."
                        value={searchTerm}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                        className="pl-8 w-full"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="w-full sm:w-[200px]">
                      <Label htmlFor="subject-filter">Filtrar por asignatura</Label>
                      <select
                        id="subject-filter"
                        value={selectedSubject}
                        onChange={(e) => setSelectedSubject(e.target.value)}
                        className="w-full border rounded-md p-2"
                      >
                        <option value="all">Todas las asignaturas</option>
                        {signatures.map((signature) => (
                          <option key={signature.id} value={signature.id}>
                            {signature.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-full sm:w-[150px]">
                      <Label htmlFor="semester-filter">Filtrar por semestre</Label>
                      <select
                        id="semester-filter"
                        value={selectedSemester}
                        onChange={(e) => setSelectedSemester(e.target.value)}
                        className="w-full border rounded-md p-2"
                      >
                        <option value="all">Todos los semestres</option>
                        {semesters.map((semester) => (
                          <option key={semester.id} value={semester.id}>
                            {semester.name} {semester.is_active ? "(Activo)" : ""}
                          </option>
                        ))}
                      </select>
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
                        Mostrar cursos inactivos
                      </label>
                    </div>
                  </div>
                </div>

                <div className="rounded-md border">
                  <table className="w-full caption-bottom text-sm">
                    <thead className="[&_tr]:border-b">
                      <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Código</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Asignatura</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Profesor</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Semestre</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Horario</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Estudiantes</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Estado</th>
                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                      {filteredCourses.map((course) => (
                        <tr
                          key={course.id}
                          className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                        >
                          <td className="p-4 align-middle font-medium">{course.code || "Sin código"}</td>
                          <td className="p-4 align-middle">{course.signature || "Sin asignatura"}</td>
                          <td className="p-4 align-middle">{course.professor || "Sin profesor"}</td>
                          <td className="p-4 align-middle">{course.semester?.name || "Sin semestre"}</td>
                          <td className="p-4 align-middle">{formatSchedule(course.schedule)}</td>
                          <td className="p-4 align-middle">{course.students || 0}</td>
                          <td className="p-4 align-middle">
                            <Badge
                              variant="outline"
                              className={
                                course.status === "active"
                                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                  : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                              }
                            >
                              {course.status === "active" ? "Activo" : "Inactivo"}
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
                                <DropdownMenuItem onClick={() => handleViewDetails(course.id)}>
                                  <Book className="mr-2 h-4 w-4" />
                                  <span>Ver detalles</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditClick(course)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  <span>Editar</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleViewStudents(course.id)}>
                                  <Users className="mr-2 h-4 w-4" />
                                  <span>Ver estudiantes</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDeleteCourse(course.id)}
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
                  <DialogTitle>Editar curso</DialogTitle>
                  <DialogDescription>Modifica la información del curso</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-code">Código</Label>
                    <Input
                      id="edit-code"
                      placeholder="Ej: CS101-A"
                      value={courseFormData.code}
                      onChange={(e) => setCourseFormData({ ...courseFormData, code: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Horario</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label htmlFor="edit-schedule-day">Día</Label>
                        <Input
                          id="edit-schedule-day"
                          placeholder="Ej: Lunes"
                          value={courseFormData.scheduleDay}
                          onChange={(e) => setCourseFormData({ ...courseFormData, scheduleDay: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-schedule-start-time">Inicio</Label>
                        <Input
                          id="edit-schedule-start-time"
                          type="time"
                          value={courseFormData.scheduleStartTime}
                          onChange={(e) => setCourseFormData({ ...courseFormData, scheduleStartTime: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-schedule-end-time">Fin</Label>
                        <Input
                          id="edit-schedule-end-time"
                          type="time"
                          value={courseFormData.scheduleEndTime}
                          onChange={(e) => setCourseFormData({ ...courseFormData, scheduleEndTime: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Ponderación</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label htmlFor="edit-weighting-homework">Tareas</Label>
                        <Input
                          id="edit-weighting-homework"
                          type="number"
                          step="0.1"
                          min="0"
                          max="1"
                          value={courseFormData.weighting.homework}
                          onChange={(e) =>
                            setCourseFormData({
                              ...courseFormData,
                              weighting: { ...courseFormData.weighting, homework: e.target.value },
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-weighting-midterms">Parciales</Label>
                        <Input
                          id="edit-weighting-midterms"
                          type="number"
                          step="0.1"
                          min="0"
                          max="1"
                          value={courseFormData.weighting.midterms}
                          onChange={(e) =>
                            setCourseFormData({
                              ...courseFormData,
                              weighting: { ...courseFormData.weighting, midterms: e.target.value },
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-weighting-final_exam">Examen final</Label>
                        <Input
                          id="edit-weighting-final_exam"
                          type="number"
                          step="0.1"
                          min="0"
                          max="1"
                          value={courseFormData.weighting.final_exam}
                          onChange={(e) =>
                            setCourseFormData({
                              ...courseFormData,
                              weighting: { ...courseFormData.weighting, final_exam: e.target.value },
                            })
                          }
                        />
                      </div>
                    </div>
                    {formError && <div className="text-red-500 text-sm">{formError}</div>}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-subject">Asignatura</Label>
                    <select
                      id="edit-subject"
                      value={courseFormData.signature_id}
                      onChange={(e) => setCourseFormData({ ...courseFormData, signature_id: e.target.value })}
                      className="w-full border rounded-md p-2"
                    >
                      <option value="">Selecciona una asignatura</option>
                      {signatures.map((signature) => (
                        <option key={signature.id} value={signature.id}>
                          {signature.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-semester">Semestre</Label>
                    <select
                      id="edit-semester"
                      value={courseFormData.semester_id}
                      onChange={(e) => setCourseFormData({ ...courseFormData, semester_id: e.target.value })}
                      className="w-full border rounded-md p-2"
                    >
                      <option value="">Selecciona un semestre</option>
                      {semesters.map((semester) => (
                        <option key={semester.id} value={semester.id}>
                          {semester.name} {semester.is_active ? "(Activo)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleEditCourse}>Guardar cambios</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </MainLayout>
  );
}