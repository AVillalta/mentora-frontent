"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ChevronDown, Download, Edit, FileText, Plus, Search, Trash, AlertCircle } from "lucide-react";
import { AxiosError } from "axios";
import useAuth from "@/hooks/useAuth";

interface Enrollment {
  id: string;
  student_id: string;
  student_name: string;
  student_email: string | null;
  student_profile_photo_url: string | null;
  course_id: string;
  course_name: string;
  professor_name: string | null;
  enrollment_date: string;
  created_at: string;
  final_grade: number | string | null | undefined;
  semester: { id: string; start_date: string; end_date: string; is_active: boolean } | null;
  signature: { id: string; name: string } | null;
}

interface Course {
  id: string;
  signature?: { name: string };
  name?: string;
  is_active?: boolean;
}

interface Student {
  id: string;
  name: string;
}

interface Semester {
  id: string;
  start_date: string;
  end_date: string;
}

interface ApiErrorResponse {
  message?: string;
  data?: string;
  errors?: { [key: string]: string[] };
}

const getSemesterName = (semester: Semester | null): string => {
  if (!semester) return "Sin semestre";
  const year = new Date(semester.start_date).getFullYear();
  const month = new Date(semester.start_date).getMonth() + 1;
  const semesterNumber = month <= 6 ? "1" : "2";
  return `${year}-${semesterNumber}`;
};

const formatFinalGrade = (grade: number | string | null | undefined): string => {
  if (grade == null || grade === undefined) return "Pendiente";
  const num = typeof grade === "string" ? parseFloat(grade) : grade;
  return typeof num === "number" && !isNaN(num) && num > 0 ? num.toFixed(1) : "Pendiente";
};

const getCourseName = (course: Course, enrollments: Enrollment[]): string => {
  const enrollment = enrollments.find((e) => e.course_id === course.id);
  return enrollment?.course_name || course.signature?.name || course.name || "Curso sin nombre";
};

export default function AdminEnrollmentsPage() {
  const router = useRouter();
  const { user, loading: loadingAuth, error: authError } = useAuth("admin");
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("all");
  const [selectedSemester, setSelectedSemester] = useState("all");
  const [showInactiveSemesters, setShowInactiveSemesters] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);
  const createDialogRef = useRef<HTMLDivElement>(null);
  const editDialogRef = useRef<HTMLDivElement>(null);

  const [enrollmentFormData, setEnrollmentFormData] = useState({
    student_id: "",
    course_id: "",
    enrollment_date: "",
  });

  const apiWithTimeout = async (url: string, timeoutMs: number = 10000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await api.get(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  };

  useEffect(() => {
    if (loadingAuth || authError) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const [enrollmentsRes, coursesRes, studentsRes, semestersRes] = await Promise.all([
          apiWithTimeout("/enrollments"),
          apiWithTimeout("/courses"),
          apiWithTimeout("/users?role=student"),
          apiWithTimeout("/semesters"),
        ]);
        setEnrollments(enrollmentsRes.data.data || []);
        setCourses(coursesRes.data.data || []);
        setStudents(studentsRes.data.data || []);
        setSemesters(semestersRes.data.data || []);
        if (!coursesRes.data.data.length || !studentsRes.data.data.length || !semestersRes.data.data.length) {
          setApiError("No se pudieron cargar algunos datos. Inténtalo de nuevo.");
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

  useEffect(() => {
    if (formError && isCreateDialogOpen && createDialogRef.current) {
      createDialogRef.current.scrollTop = 0;
    }
    if (formError && isEditDialogOpen && editDialogRef.current) {
      editDialogRef.current.scrollTop = 0;
    }
  }, [formError, isCreateDialogOpen, isEditDialogOpen]);

  const handleCreateEnrollment = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    try {
      await api.post("/enrollments", enrollmentFormData);
      setIsCreateDialogOpen(false);
      setEnrollmentFormData({ student_id: "", course_id: "", enrollment_date: "" });
      setFormError(null);
      const response = await apiWithTimeout("/enrollments");
      setEnrollments(response.data.data || []);
      setApiError(null);
    } catch (err: unknown) {
      const error = err as AxiosError<ApiErrorResponse>;
      const errorMessages = error.response?.data?.errors
        ? Object.values(error.response.data.errors).flat().join(" ")
        : error.response?.data?.message || error.response?.data?.data || "Error al crear la matrícula. Inténtalo de nuevo.";
      setFormError(errorMessages);
    }
  };

  const handleEditEnrollment = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (!selectedEnrollment) return;

    try {
      await api.put(`/enrollments/${selectedEnrollment.id}`, enrollmentFormData);
      setIsEditDialogOpen(false);
      setEnrollmentFormData({ student_id: "", course_id: "", enrollment_date: "" });
      setSelectedEnrollment(null);
      setFormError(null);
      const response = await apiWithTimeout("/enrollments");
      setEnrollments(response.data.data || []);
      setApiError(null);
    } catch (err: unknown) {
      const error = err as AxiosError<ApiErrorResponse>;
      const errorMessages = error.response?.data?.errors
        ? Object.values(error.response.data.errors).flat().join(" ")
        : error.response?.data?.message || error.response?.data?.data || "Error al editar la matrícula. Inténtalo de nuevo.";
      setFormError(errorMessages);
    }
  };

  const handleDeleteEnrollment = async (id: string) => {
    try {
      await api.delete(`/enrollments/${id}`);
      const response = await apiWithTimeout("/enrollments");
      setEnrollments(response.data.data || []);
      setApiError(null);
    } catch (err: unknown) {
      const error = err as AxiosError<ApiErrorResponse>;
      setApiError(error.response?.data?.message || error.response?.data?.data || "Error al eliminar la matrícula. Inténtalo de nuevo.");
    }
  };

  const handleEditClick = (enrollment: Enrollment) => {
    setSelectedEnrollment(enrollment);
    setEnrollmentFormData({
      student_id: enrollment.student_id,
      course_id: enrollment.course_id,
      enrollment_date: enrollment.enrollment_date,
    });
    setFormError(null);
    setIsEditDialogOpen(true);
  };

  const filteredEnrollments = enrollments.filter((enrollment) => {
    // Debug log to inspect semester.is_active and student_profile_photo_url
    console.log(`Enrollment ${enrollment.id}, Student ID: ${enrollment.student_id}, Name: ${enrollment.student_name}, Semester is_active: ${enrollment.semester?.is_active}, Student photo: ${enrollment.student_profile_photo_url}`);
    const matchesSearch =
      (enrollment.student_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (enrollment.student_email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (enrollment.course_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (enrollment.professor_name || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCourse = selectedCourse === "all" || enrollment.course_id === selectedCourse;
    const matchesSemester =
      selectedSemester === "all" || (enrollment.semester && enrollment.semester.id === selectedSemester);
    const matchesSemesterStatus = showInactiveSemesters || (enrollment.semester && enrollment.semester.is_active === true);
    return matchesSearch && matchesCourse && matchesSemester && matchesSemesterStatus;
  });

  const filteredCourses = showInactiveSemesters ? courses : courses.filter((course) => {
    const enrollment = enrollments.find((e) => e.course_id === course.id);
    return enrollment?.semester?.is_active === true;
  });

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
                <h1 className="text-3xl font-bold tracking-tight">Matrículas</h1>
                <p className="text-muted-foreground">Gestiona las matrículas de estudiantes en cursos</p>
              </div>
              <div className="flex gap-2">
                <Dialog
                  open={isCreateDialogOpen}
                  onOpenChange={(open) => {
                    setIsCreateDialogOpen(open);
                    if (!open) setFormError(null);
                  }}
                >
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Nueva Matrícula
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[80vh] overflow-y-auto" ref={createDialogRef}>
                    <DialogHeader>
                      <DialogTitle>Crear nueva matrícula</DialogTitle>
                      <DialogDescription>
                        Completa la información para matricular un estudiante en un curso
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateEnrollment}>
                      {formError && (
                        <Alert variant="destructive" className="mb-4">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Error</AlertTitle>
                          <AlertDescription>{formError}</AlertDescription>
                        </Alert>
                      )}
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="student">Estudiante</Label>
                          <select
                            id="student"
                            value={enrollmentFormData.student_id}
                            onChange={(e) => setEnrollmentFormData({ ...enrollmentFormData, student_id: e.target.value })}
                            className="w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">Selecciona un estudiante</option>
                            {students.map((student) => (
                              <option key={student.id} value={student.id}>
                                {student.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="course">Curso</Label>
                          <select
                            id="course"
                            value={enrollmentFormData.course_id}
                            onChange={(e) => setEnrollmentFormData({ ...enrollmentFormData, course_id: e.target.value })}
                            className="w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">Selecciona un curso</option>
                            {filteredCourses.map((course) => (
                              <option key={course.id} value={course.id}>
                                {getCourseName(course, enrollments)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="enrollmentDate">Fecha de matrícula</Label>
                          <Input
                            id="enrollmentDate"
                            type="date"
                            value={enrollmentFormData.enrollment_date}
                            onChange={(e) =>
                              setEnrollmentFormData({ ...enrollmentFormData, enrollment_date: e.target.value })
                            }
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button type="submit">Crear matrícula</Button>
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
                <CardTitle>Lista de Matrículas</CardTitle>
                <CardDescription>Visualiza y gestiona las matrículas de estudiantes en cursos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por estudiante, email, curso o profesor..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 w-full"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="showInactiveSemesters"
                        checked={showInactiveSemesters}
                        onChange={(e) => setShowInactiveSemesters(e.target.checked)}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="showInactiveSemesters" className="text-sm">
                        Mostrar semestres inactivos
                      </Label>
                    </div>
                    <select
                      value={selectedCourse}
                      onChange={(e) => setSelectedCourse(e.target.value)}
                      className="w-full sm:w-[250px] border rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="all">Todos los cursos</option>
                      {filteredCourses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {getCourseName(course, enrollments)}
                        </option>
                      ))}
                    </select>
                    <select
                      value={selectedSemester}
                      onChange={(e) => setSelectedSemester(e.target.value)}
                      className="w-full sm:w-[150px] border rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="all">Todos los semestres</option>
                      {semesters.map((semester) => (
                        <option key={semester.id} value={semester.id}>
                          {getSemesterName(semester)}
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
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Semestre</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                          Fecha Matrícula
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Nota Final</th>
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
                          <td className="p-4 align-middle">{enrollment.course_name || "Sin curso"}</td>
                          <td className="p-4 align-middle">{enrollment.professor_name || "Sin profesor"}</td>
                          <td className="p-4 align-middle">{getSemesterName(enrollment.semester)}</td>
                          <td className="p-4 align-middle">
                            {new Date(enrollment.enrollment_date).toLocaleDateString()}
                          </td>
                          <td className="p-4 align-middle">{formatFinalGrade(enrollment.final_grade)}</td>
                          <td className="p-4 align-middle">
                            <Badge
                              variant="outline"
                              className={
                                enrollment.semester?.is_active
                                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                  : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
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
                                <DropdownMenuItem onClick={() => handleEditClick(enrollment)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  <span>Editar</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDeleteEnrollment(enrollment.id)}
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

            <Dialog
              open={isEditDialogOpen}
              onOpenChange={(open) => {
                setIsEditDialogOpen(open);
                if (!open) setFormError(null);
              }}
            >
              <DialogContent className="max-h-[80vh] overflow-y-auto" ref={editDialogRef}>
                <DialogHeader>
                  <DialogTitle>Editar matrícula</DialogTitle>
                  <DialogDescription>Modifica la información de la matrícula</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleEditEnrollment}>
                  {formError && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{formError}</AlertDescription>
                    </Alert>
                  )}
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-student">Estudiante</Label>
                      <select
                        id="edit-student"
                        value={enrollmentFormData.student_id}
                        onChange={(e) => setEnrollmentFormData({ ...enrollmentFormData, student_id: e.target.value })}
                        className="w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Selecciona un estudiante</option>
                        {students.map((student) => (
                          <option key={student.id} value={student.id}>
                            {student.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-course">Curso</Label>
                      <select
                        id="edit-course"
                        value={enrollmentFormData.course_id}
                        onChange={(e) => setEnrollmentFormData({ ...enrollmentFormData, course_id: e.target.value })}
                        className="w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Selecciona un curso</option>
                        {filteredCourses.map((course) => (
                          <option key={course.id} value={course.id}>
                            {getCourseName(course, enrollments)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-enrollmentDate">Fecha de matrícula</Label>
                      <Input
                        id="edit-enrollmentDate"
                        type="date"
                        value={enrollmentFormData.enrollment_date}
                        onChange={(e) =>
                          setEnrollmentFormData({ ...enrollmentFormData, enrollment_date: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit">Guardar cambios</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </MainLayout>
  );
}