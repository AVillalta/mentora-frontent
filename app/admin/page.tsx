"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import MainLayout from "@/components/layout/main-layout";
import { Book, FileText, TrendingUp, Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AxiosError } from "axios";
import useAuth from "@/hooks/useAuth";

const COLORS = ['#1976d2', '#dc004e', '#ff9800'];

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at?: string;
}

interface Course {
  id: number;
  code: string;
  schedule: { day: string; start_time: string; end_time: string }[] | null;
  weighting: { homework: number; midterms: number; final_exam: number } | null;
  signature: string;
  semester: { id: string; name: string; is_active: boolean };
  professor?: string;
  students: number;
  status: "active" | "inactive";
}

interface Enrollment {
  id: number;
  course_id: number;
  student_id: number;
  final_grade?: string;
}

interface Grade {
  id: number;
  grade_value: string;
  enrollment_id: number;
}

interface Stats {
  totalUsers: number;
  newUsersThisMonth: number;
  totalCourses: number;
  totalEnrollments: number;
  averageGrade: number;
}

interface UserStats {
  name: string;
  value: number;
}

interface UserDistribution {
  name: string;
  value: number;
}

interface CourseStats {
  name: string;
  value: number;
}

interface ApiErrorResponse {
  message: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user, loading: loadingAuth, error: authError } = useAuth("admin");
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    newUsersThisMonth: 0,
    totalCourses: 0,
    totalEnrollments: 0,
    averageGrade: 0,
  });
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [userDistribution, setUserDistribution] = useState<UserDistribution[]>([]);
  const [courseStats, setCourseStats] = useState<CourseStats[]>([]);
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loadingAuth || authError) return;

    const fetchDashboard = async () => {
      try {
        setLoading(true);

        const [usersRes, coursesRes, enrollmentsRes, gradesRes] = await Promise.all([
          api.get("/users"),
          api.get("/courses"),
          api.get("/enrollments"),
          api.get("/grades"),
        ]);

        const users: User[] = Array.isArray(usersRes.data.data) ? usersRes.data.data : [];
        const coursesData: Course[] = Array.isArray(coursesRes.data.data) ? coursesRes.data.data : [];
        const enrollments: Enrollment[] = Array.isArray(enrollmentsRes.data.data) ? enrollmentsRes.data.data : [];
        const grades: Grade[] = Array.isArray(gradesRes.data.data) ? gradesRes.data.data : [];

        // Procesar estadísticas
        const totalUsers = users.length;
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const newUsersThisMonth = users.filter((user) => {
          if (!user.created_at) return false;
          const createdAt = new Date(user.created_at);
          return createdAt.getMonth() === currentMonth && createdAt.getFullYear() === currentYear;
        }).length;
        const totalCourses = coursesData.length;
        const totalEnrollments = enrollments.length;
        const averageGrade =
          grades.length > 0
            ? grades.reduce((sum: number, grade: Grade) => sum + parseFloat(grade.grade_value || "0"), 0) / grades.length
            : 0;

        setStats({
          totalUsers,
          newUsersThisMonth,
          totalCourses,
          totalEnrollments,
          averageGrade: parseFloat(averageGrade.toFixed(1)),
        });

        // Procesar crecimiento de usuarios (por mes)
        const userStatsData = Array.from({ length: 6 }, (_, i) => {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          const name = date.toLocaleString("es", { month: "short" });
          const value = users.filter((user) => {
            if (!user.created_at) return false;
            const createdAt = new Date(user.created_at);
            return createdAt.getMonth() === date.getMonth() && createdAt.getFullYear() === date.getFullYear();
          }).length;
          return { name, value };
        }).reverse();

        setUserStats(userStatsData);

        // Procesar distribución de usuarios (por rol)
        const userDistributionData = [
          { name: "Estudiantes", value: users.filter((u) => u.role.toLowerCase() === "student").length },
          { name: "Profesores", value: users.filter((u) => u.role.toLowerCase() === "professor").length },
          { name: "Administradores", value: users.filter((u) => u.role.toLowerCase() === "admin").length },
        ].filter((d) => d.value > 0);

        setUserDistribution(userDistributionData);

        // Procesar cursos por semestre
        const courseStatsData = coursesData.reduce((acc: CourseStats[], course: Course) => {
          const semester = course.semester?.name || "Sin semestre";
          const existing = acc.find((s) => s.name === semester);
          if (existing) {
            existing.value += 1;
          } else {
            acc.push({ name: semester, value: 1 });
          }
          return acc;
        }, []);

        setCourseStats(courseStatsData);

        // Usuarios recientes (últimos 5)
        const recentUsersData = users
          .filter((user) => !!user.created_at)
          .sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime())
          .slice(0, 5);

        setRecentUsers(recentUsersData);

        // Cursos ya tienen students desde CourseResource
        setCourses(coursesData);
      } catch (err: unknown) {
        const error = err as AxiosError<ApiErrorResponse>;
        setError(error.response?.data?.message || "Error al cargar los datos. Inténtalo de nuevo.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [loadingAuth, authError]);

  // Ajustar la URL de la foto de perfil
  const profilePhotoUrl = user?.profilePhotoUrl
    ? user.profilePhotoUrl.startsWith("http")
      ? user.profilePhotoUrl
      : `http://localhost:80${user.profilePhotoUrl}`
    : null;

  if (loadingAuth) {
    return (
      <MainLayout
        userRole={user?.role || "admin"}
        userName={user?.name || "Cargando..."}
        userEmail={user?.email || "cargando@mentora.edu"}
        profilePhotoUrl={profilePhotoUrl}
      >
        <div className="p-6 text-primary">Cargando dashboard...</div>
      </MainLayout>
    );
  }

  if (authError) {
    return (
      <MainLayout
        userRole={user?.role || "admin"}
        userName={user?.name || "Error"}
        userEmail={user?.email || "error@mentora.edu"}
        profilePhotoUrl={profilePhotoUrl}
      >
        <div className="p-6 text-destructive">{authError}</div>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      userRole={user?.role || "admin"}
      userName={user?.name || "Usuario Desconocido"}
      userEmail={user?.email || "sin@correo.com"}
      profilePhotoUrl={profilePhotoUrl}
    >
      <div className="flex flex-col gap-6 p-6 w-full max-w-full">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Dashboard Administrador</h1>
        <p className="text-muted-foreground">Bienvenido de nuevo. Aquí tienes un resumen de la plataforma Mentora.</p>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">+{stats.newUsersThisMonth} este mes</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cursos</CardTitle>
              <Book className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCourses}</div>
              <p className="text-xs text-muted-foreground">Semestre actual</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Matrículas</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEnrollments}</div>
              <p className="text-xs text-muted-foreground">Este semestre</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Promedio General</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageGrade}</div>
              <p className="text-xs text-muted-foreground">Todos los cursos</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Resumen</TabsTrigger>
            <TabsTrigger value="users">Usuarios</TabsTrigger>
            <TabsTrigger value="courses">Cursos</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="col-span-4">
                <CardHeader>
                  <CardTitle>Crecimiento de Usuarios</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={userStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="value" stroke="#1976d2" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card className="col-span-3">
                <CardHeader>
                  <CardTitle>Distribución de Usuarios</CardTitle>
                  <CardDescription>Por rol</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={userDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {userDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="col-span-3">
                <CardHeader>
                  <CardTitle>Cursos por Semestre</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={courseStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#1976d2" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card className="col-span-4">
                <CardHeader>
                  <CardTitle>Usuarios Recientes</CardTitle>
                  <CardDescription>Últimos usuarios registrados en la plataforma</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                      >
                        <div className="flex items-center gap-4">
                          <Avatar>
                            <AvatarFallback>
                              {user.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span
                            className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              user.role === "student"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                                : user.role === "professor"
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                : "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
                            }`}
                          >
                            {user.role === "student" ? "Estudiante" : user.role === "professor" ? "Profesor" : "Admin"}
                          </span>
                          <Button variant="outline" size="sm">
                            Ver perfil
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Gestión de Usuarios</CardTitle>
                <CardDescription>Administra los usuarios de la plataforma</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-end mb-4">
                  <Button className="gap-2 bg-primary hover:bg-blue-700">
                    <Plus className="h-4 w-4" />
                    Añadir Usuario
                  </Button>
                </div>
                <div className="rounded-md border">
                  <table className="w-full caption-bottom text-sm">
                    <thead className="[&_tr]:border-b">
                      <tr className="border-b transition-colors hover:bg-muted/50">
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Nombre</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Email</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Rol</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                          Fecha Registro
                        </th>
                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                      {recentUsers.map((user) => (
                        <tr key={user.id} className="border-b transition-colors hover:bg-muted/50">
                          <td className="p-4 align-middle font-medium">{user.name}</td>
                          <td className="p-4 align-middle">{user.email}</td>
                          <td className="p-4 align-middle">
                            <span
                              className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                user.role === "student"
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                                  : user.role === "professor"
                                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                  : "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
                              }`}
                            >
                              {user.role === "student" ? "Estudiante" : user.role === "professor" ? "Profesor" : "Admin"}
                            </span>
                          </td>
                          <td className="p-4 align-middle">
                            {user.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}
                          </td>
                          <td className="p-4 align-middle text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm">
                                Editar
                              </Button>
                              <Button variant="outline" size="sm" className="text-destructive">
                                Eliminar
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="courses">
            <Card>
              <CardHeader>
                <CardTitle>Gestión de Cursos</CardTitle>
                <CardDescription>Administra los cursos de la plataforma</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-end mb-4">
                  <Button className="gap-2 bg-primary hover:bg-blue-700">
                    <Plus className="h-4 w-4" />
                    Añadir Curso
                  </Button>
                </div>
                <div className="rounded-md border">
                  <table className="w-full caption-bottom text-sm">
                    <thead className="[&_tr]:border-b">
                      <tr className="border-b transition-colors hover:bg-muted/50">
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Código</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Título</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Profesor</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Semestre</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Estudiantes</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Estado</th>
                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                      {courses.map((course) => (
                        <tr key={course.id} className="border-b transition-colors hover:bg-muted/50">
                          <td className="p-4 align-middle font-medium">{course.code}</td>
                          <td className="p-4 align-middle">{course.signature}</td>
                          <td className="p-4 align-middle">{course.professor || "Sin asignar"}</td>
                          <td className="p-4 align-middle">{course.semester?.name || "Sin semestre"}</td>
                          <td className="p-4 align-middle">{course.students || 0}</td>
                          <td className="p-4 align-middle">
                            <span
                              className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                course.semester?.is_active
                                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                  : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                              }`}
                            >
                              {course.semester?.is_active ? "Activo" : "Inactivo"}
                            </span>
                          </td>
                          <td className="p-4 align-middle text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm">
                                Editar
                              </Button>
                              <Button variant="outline" size="sm" className="text-destructive">
                                Eliminar
                              </Button>
                            </div>
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