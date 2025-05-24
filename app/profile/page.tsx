"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import api from "@/lib/api";
import MainLayout from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AxiosError } from "axios";
import useAuth from "@/hooks/useAuth";

interface ApiErrorResponse {
  message?: string;
  data?: string;
  errors?: { [key: string]: string[] };
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: loadingAuth, error: authError } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(e.target.files?.[0] || null);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Por favor, selecciona una imagen.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("profile_photo", selectedFile);

      const response = await api.post("/user/update-profile-photo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // Actualizar la URL de la foto en el estado del usuario
      const newProfilePhotoUrl = response.data.data.profile_photo_url;
      setError(null);
      alert("Foto de perfil actualizada con éxito");
      // Forzar recarga para actualizar la foto en todas las páginas
      window.location.reload();
    } catch (err: unknown) {
      const error = err as AxiosError<ApiErrorResponse>;
      console.error("Error al subir la foto:", error.response?.data || error.message);
      setError(error.response?.data?.message || "Error al subir la foto. Inténtalo de nuevo.");
    }
  };

  if (loadingAuth) {
    return (
      <MainLayout
        userRole={user?.role || "student"}
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
        userRole={user?.role || "student"}
        userName={user?.name || "Cargando..."}
        userEmail={user?.email || "cargando@mentora.edu"}
        profilePhotoUrl={user?.profilePhotoUrl || null}
      >
        <div className="flex flex-col items-center justify-center h-[50vh]">
          <p className="text-red-500 text-xl">{authError}</p>
        </div>
      </MainLayout>
    );
  }

  const profilePhotoUrl = user?.profilePhotoUrl
    ? user.profilePhotoUrl.startsWith('http')
      ? user.profilePhotoUrl
      : `http://localhost:80${user.profilePhotoUrl}`
    : null;

  return (
    <MainLayout
      userRole={user?.role || "student"}
      userName={user?.name || "Cargando..."}
      userEmail={user?.email || "cargando@mentora.edu"}
      profilePhotoUrl={profilePhotoUrl}
    >
      <div className="flex flex-col gap-6 p-4">
        <h1 className="text-3xl font-bold tracking-tight">Perfil</h1>
        <Card>
          <CardHeader>
            <CardTitle>Foto de perfil</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              {profilePhotoUrl && (
                <Image
                  src={profilePhotoUrl}
                  alt="Foto de perfil"
                  width={128}
                  height={128}
                  className="rounded-full object-cover"
                  priority
                  unoptimized
                />
              )}
              <div className="grid gap-2">
                <Label htmlFor="profile-photo">Subir nueva foto</Label>
                <Input
                  id="profile-photo"
                  type="file"
                  accept="image/jpeg,image/png,image/jpg,image/gif"
                  onChange={handleFileChange}
                />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <Button onClick={handleUpload} disabled={!selectedFile}>
                Subir foto
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}