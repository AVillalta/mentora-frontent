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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown, Edit, Plus, Search, Trash, FileText, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { AxiosError } from "axios";
import useAuth from "@/hooks/useAuth";

interface Signature {
  id: string;
  name: string;
  syllabus_pdf_url: string | null;
  professor_id: string | null;
  professor_name: string | null;
  courses_count: number;
}

interface Professor {
  id: string;
  name: string;
}

interface ApiErrorResponse {
  message: string;
}

export default function AdminSignaturesPage() {
  const router = useRouter();
  const { user, loading: loadingAuth, error: authError } = useAuth("admin");
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedSignature, setSelectedSignature] = useState<Signature | null>(null);

  const [signatureFormData, setSignatureFormData] = useState<{
    name: string;
    syllabus_pdf: File | null;
    professor_id: string;
  }>({
    name: "",
    syllabus_pdf: null,
    professor_id: "",
  });

  // Cargar asignaturas y profesores
  useEffect(() => {
    if (loadingAuth || authError) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const [signaturesRes, professorsRes] = await Promise.all([
          api.get("/signatures"),
          api.get("/users?role=professor"),
        ]);
        setSignatures(signaturesRes.data.data || []);
        setProfessors(professorsRes.data.data || []);
      } catch (err: unknown) {
        const error = err as AxiosError<ApiErrorResponse>;
        setError(error.response?.data?.message || "Error al cargar los datos. Inténtalo de nuevo.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [loadingAuth, authError]);

  // Manejar creación de asignatura
  const handleCreateSignature = async () => {
    try {
      const formData = new FormData();
      formData.append("name", signatureFormData.name);
      if (signatureFormData.syllabus_pdf) {
        formData.append("syllabus_pdf", signatureFormData.syllabus_pdf);
      }
      if (signatureFormData.professor_id) {
        formData.append("professor_id", signatureFormData.professor_id);
      }

      await api.post("/signatures", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setIsCreateDialogOpen(false);
      setSignatureFormData({ name: "", syllabus_pdf: null, professor_id: "" });
      const response = await api.get("/signatures");
      setSignatures(response.data.data || []);
      setError(null);
    } catch (err: unknown) {
      const error = err as AxiosError<ApiErrorResponse>;
      setError(error.response?.data?.message || "Error al crear la asignatura. Inténtalo de nuevo.");
    }
  };

  // Manejar edición de asignatura
  const handleEditSignature = async () => {
    if (!selectedSignature) return;
    try {
      const formData = new FormData();
      formData.append("name", signatureFormData.name);
      if (signatureFormData.syllabus_pdf) {
        formData.append("syllabus_pdf", signatureFormData.syllabus_pdf);
      }
      if (signatureFormData.professor_id) {
        formData.append("professor_id", signatureFormData.professor_id);
      }
      formData.append("_method", "PUT");

      await api.post(`/signatures/${selectedSignature.id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setIsEditDialogOpen(false);
      setSignatureFormData({ name: "", syllabus_pdf: null, professor_id: "" });
      setSelectedSignature(null);
      const response = await api.get("/signatures");
      setSignatures(response.data.data || []);
      setError(null);
    } catch (err: unknown) {
      const error = err as AxiosError<ApiErrorResponse>;
      setError(error.response?.data?.message || "Error al editar la asignatura. Inténtalo de nuevo.");
    }
  };

  // Manejar eliminación de asignatura
  const handleDeleteSignature = async (id: string) => {
    try {
      await api.delete(`/signatures/${id}`);
      const response = await api.get("/signatures");
      setSignatures(response.data.data || []);
      setError(null);
    } catch (err: unknown) {
      const error = err as AxiosError<ApiErrorResponse>;
      setError(error.response?.data?.message || "Error al eliminar la asignatura. Inténtalo de nuevo.");
    }
  };

  // Manejar clic en editar
  const handleEditClick = (signature: Signature) => {
    setSelectedSignature(signature);
    setSignatureFormData({
      name: signature.name || "",
      syllabus_pdf: null,
      professor_id: signature.professor_id || "",
    });
    setIsEditDialogOpen(true);
  };

  // Filtrar asignaturas
  const filteredSignatures = signatures.filter(
    (signature) =>
      (signature.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (signature.professor_name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                <h1 className="text-3xl font-bold tracking-tight">Asignaturas</h1>
                <p className="text-muted-foreground">Gestiona las asignaturas disponibles en la plataforma</p>
              </div>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Nueva Asignatura
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Crear nueva asignatura</DialogTitle>
                    <DialogDescription>Completa la información para crear una nueva asignatura</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Nombre</Label>
                      <Input
                        id="name"
                        placeholder="Ej: Programación Web"
                        value={signatureFormData.name}
                        onChange={(e) => setSignatureFormData({ ...signatureFormData, name: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="syllabus_pdf">PDF del temario</Label>
                      <Input
                        id="syllabus_pdf"
                        type="file"
                        accept="application/pdf"
                        onChange={(e) =>
                          setSignatureFormData({
                            ...signatureFormData,
                            syllabus_pdf: e.target.files ? e.target.files[0] : null,
                          })
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="professor">Profesor</Label>
                      <select
                        id="professor"
                        value={signatureFormData.professor_id}
                        onChange={(e) => setSignatureFormData({ ...signatureFormData, professor_id: e.target.value })}
                        className="w-full border rounded-md p-2"
                      >
                        <option value="">Sin profesor</option>
                        {professors.map((professor) => (
                          <option key={professor.id} value={professor.id}>
                            {professor.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleCreateSignature}>Crear asignatura</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Lista de Asignaturas</CardTitle>
                <CardDescription>Visualiza y gestiona las asignaturas disponibles</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por nombre o profesor..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 w-full"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-md border">
                  <table className="w-full caption-bottom text-sm">
                    <thead className="[&_tr]:border-b">
                      <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Nombre</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                          PDF del temario
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Profesor</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Cursos</th>
                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                      {filteredSignatures.map((signature) => (
                        <tr
                          key={signature.id}
                          className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                        >
                          <td className="p-4 align-middle font-medium">{signature.name}</td>
                          <td className="p-4 align-middle">
                            {signature.syllabus_pdf_url ? (
                              <a
                                href={signature.syllabus_pdf_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline flex items-center gap-1"
                              >
                                <FileText className="h-4 w-4" />
                                Ver PDF
                              </a>
                            ) : (
                              "Sin PDF"
                            )}
                          </td>
                          <td className="p-4 align-middle">{signature.professor_name || "Sin profesor"}</td>
                          <td className="p-4 align-middle">{signature.courses_count || 0}</td>
                          <td className="p-4 align-middle text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <ChevronDown className="h-4 w-4" />
                                  <span className="sr-only">Abrir menú</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditClick(signature)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  <span>Editar</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDeleteSignature(signature.id)}
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
                  <DialogTitle>Editar asignatura</DialogTitle>
                  <DialogDescription>Modifica la información de la asignatura</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-name">Nombre</Label>
                    <Input
                      id="edit-name"
                      placeholder="Ej: Programación Web"
                      value={signatureFormData.name}
                      onChange={(e) => setSignatureFormData({ ...signatureFormData, name: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-syllabus_pdf">PDF del temario (opcional)</Label>
                    <Input
                      id="edit-syllabus_pdf"
                      type="file"
                      accept="application/pdf"
                      onChange={(e) =>
                        setSignatureFormData({
                          ...signatureFormData,
                          syllabus_pdf: e.target.files ? e.target.files[0] : null,
                        })
                      }
                    />
                    {selectedSignature?.syllabus_pdf_url && (
                      <a
                        href={selectedSignature.syllabus_pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1 text-sm"
                      >
                        <FileText className="h-4 w-4" />
                        Ver PDF actual
                      </a>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-professor">Profesor</Label>
                    <select
                      id="edit-professor"
                      value={signatureFormData.professor_id}
                      onChange={(e) => setSignatureFormData({ ...signatureFormData, professor_id: e.target.value })}
                      className="w-full border rounded-md p-2"
                    >
                      <option value="">Sin profesor</option>
                      {professors.map((professor) => (
                        <option key={professor.id} value={professor.id}>
                          {professor.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleEditSignature}>Guardar cambios</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </MainLayout>
  );
}