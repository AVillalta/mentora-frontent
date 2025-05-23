"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Book,
  ChevronDown,
  FileText,
  GraduationCap,
  Home,
  LogOut,
  Moon,
  Settings,
  Sun,
  Users,
  Calendar,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "next-themes";

interface MainLayoutProps {
  children: React.ReactNode;
  userRole: "student" | "professor" | "admin";
  userName: string;
  userEmail: string;
  profilePhotoUrl?: string | null;
}

export default function MainLayout({ children, userRole, userName, userEmail, profilePhotoUrl }: MainLayoutProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(true);
  const router = useRouter();
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    if (!token) {
      router.push("/login");
    }
  }, [token, router]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const studentNavItems = [
    { title: "Dashboard", icon: Home, href: "/student" },
    { title: "Cursos", icon: Book, href: "/student/courses" },
    { title: "Notas", icon: FileText, href: "/student/grades" },
    { title: "Contenidos", icon: GraduationCap, href: "/student/contents" },
  ];

  const teacherNavItems = [
    { title: "Dashboard", icon: Home, href: "/professor" },
    { title: "Cursos", icon: Book, href: "/professor/courses" },
    { title: "Matrículas", icon: Users, href: "/professor/enrollments" },
    { title: "Contenidos", icon: GraduationCap, href: "/professor/contents" },
  ];

  const adminNavItems = [
    { title: "Dashboard", icon: Home, href: "/admin" },
    { title: "Usuarios", icon: Users, href: "/admin/users" },
    { title: "Semestres", icon: Calendar, href: "/admin/semesters" },
    { title: "Asignaturas", icon: Book, href: "/admin/signatures" },
    { title: "Cursos", icon: GraduationCap, href: "/admin/courses" },
    { title: "Matrículas", icon: FileText, href: "/admin/enrollments" },
    { title: "Notas", icon: FileText, href: "/admin/grades" },
    { title: "Contenidos", icon: FileText, href: "/admin/contents" },
  ];

  const navItems = userRole === "student" ? studentNavItems : userRole === "professor" ? teacherNavItems : adminNavItems;

  const handleSettingsClick = () => {
    router.push("/profile");
  };

  return (
    <SidebarProvider defaultOpen={true} open={open} onOpenChange={setOpen}>
      <div className="flex min-h-screen w-full bg-gray-50 dark:bg-gray-900">
        <Sidebar className="border-r border-gray-200 dark:border-gray-800 flex-shrink-0">
          <SidebarHeader className="px-3 py-2">
            <div className="flex items-center gap-2 px-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-white">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div className="font-semibold text-xl">Mentora</div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Navegación</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.title}>
                        <a href={item.href}>
                          <item.icon className="h-5 w-5" />
                          <span>{item.title}</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="border-t border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  {profilePhotoUrl ? (
                    <AvatarImage
                      src={profilePhotoUrl}
                      alt={`${userName}'s profile photo`}
                      width={40}
                      height={40}
                      className="object-cover"
                    />
                  ) : (
                    <AvatarFallback className="bg-gray-300 text-gray-600">
                      {getInitials(userName)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{userName}</p>
                  <p className="text-xs text-muted-foreground">{userEmail}</p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Mi cuenta</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                    {theme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                    <span>{theme === "dark" ? "Modo claro" : "Modo oscuro"}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSettingsClick}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Configuración</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      localStorage.removeItem("token");
                      router.push("/login");
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Cerrar sesión</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </SidebarFooter>
        </Sidebar>
        <div className="flex flex-col flex-1 w-full max-w-full">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-6 md:px-8">
            <SidebarTrigger />
            <div className="flex-1" />
            <Button variant="outline" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? (
                <Sun className="h-[1.2rem] w-[1.2rem]" />
              ) : (
                <Moon className="h-[1.2rem] w-[1.2rem]" />
              )}
              <span className="sr-only">Toggle theme</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    {profilePhotoUrl ? (
                      <AvatarImage
                        src={profilePhotoUrl}
                        alt={`${userName}'s profile photo`}
                        width={32}
                        height={32}
                        className="object-cover"
                      />
                    ) : (
                      <AvatarFallback className="bg-gray-300 text-gray-600">
                        {getInitials(userName)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Mi cuenta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                  {theme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                  <span>{theme === "dark" ? "Modo claro" : "Modo oscuro"}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSettingsClick}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Configuración</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    localStorage.removeItem("token");
                    router.push("/login");
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Cerrar sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
          <main className="flex-1 p-6 md:p-8 w-full max-w-full overflow-x-auto">{children}</main>
          <footer className="border-t border-gray-200 dark:border-gray-800 p-4 text-center text-sm text-muted-foreground">
            Mentora © {new Date().getFullYear()} |{" "}
            <a href="#" className="hover:underline">
              Términos de uso
            </a>
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
}