"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import api from "@/lib/api"
import MainLayout from "@/components/layout/main-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { AxiosError } from "axios"

interface ApiErrorResponse {
  message?: string
  data?: string
  errors?: { [key: string]: string[] }
}

export default function ProfilePage() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(
    typeof window !== "undefined" ? localStorage.getItem("token") : null
  )
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const [userName, setUserName] = useState("Cargando...")
  const [userEmail, setUserEmail] = useState("cargando@mentora.edu")
  const [userRole, setUserRole] = useState<"student" | "professor" | "admin">("student")
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setAuthError("No estás autenticado. Redirigiendo al login...")
      router.push("/login")
      return
    }

    const verifyUser = async () => {
      try {
        console.log("Verificando usuario...")
        const response = await api.get("/user", { timeout: 10000 })
        const { role, name, email, profile_photo_url } = response.data.data || {}
        console.log("Usuario verificado:", { role, name, email, profile_photo_url })
        if (!["student", "professor", "admin"].includes(role)) {
          throw new Error("Rol no válido. Redirigiendo al login...")
        }
        setUserRole(role)
        setUserName(name || "Usuario")
        setUserEmail(email || `${role}@mentora.edu`)
        setProfilePhotoUrl(profile_photo_url)
        setLoadingAuth(false)
      } catch (err: unknown) {
        const error = err as AxiosError<ApiErrorResponse>
        console.error("Error al verificar usuario:", error.message, error.response?.data)
        setAuthError(error.response?.data?.message || "Token inválido. Redirigiendo al login...")
        localStorage.removeItem("token")
        router.push("/login")
      }
    }

    verifyUser()
  }, [token, router])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(e.target.files?.[0] || null)
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Por favor, selecciona una imagen.")
      return
    }

    try {
      const formData = new FormData()
      formData.append("profile_photo", selectedFile)

      const response = await api.post("/user/update-profile-photo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })

      setProfilePhotoUrl(response.data.data.profile_photo_url)
      setSelectedFile(null)
      setError(null)
      alert("Foto de perfil actualizada con éxito")
    } catch (err: unknown) {
      const error = err as AxiosError<ApiErrorResponse>
      console.error("Error al subir la foto:", error.response?.data || error.message)
      setError(error.response?.data?.message || "Error al subir la foto. Inténtalo de nuevo.")
    }
  }

  if (loadingAuth) {
    return (
      <MainLayout userRole={userRole} userName={userName} userEmail={userEmail} profilePhotoUrl={profilePhotoUrl}>
        <div className="flex flex-col items-center justify-center h-[50vh]">
          <p className="text-xl">Verificando autenticación...</p>
        </div>
      </MainLayout>
    )
  }

  if (authError) {
    return (
      <MainLayout userRole={userRole} userName={userName} userEmail={userEmail} profilePhotoUrl={profilePhotoUrl}>
        <div className="flex flex-col items-center justify-center h-[50vh]">
          <p className="text-red-500 text-xl">{authError}</p>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout userRole={userRole} userName={userName} userEmail={userEmail} profilePhotoUrl={profilePhotoUrl}>
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
                  src={profilePhotoUrl.startsWith('http') ? profilePhotoUrl : `http://localhost:80${profilePhotoUrl}`}
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
  )
}