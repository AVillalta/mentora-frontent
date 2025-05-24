import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { AxiosError } from "axios";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: "admin" | "student" | "professor";
  profilePhotoUrl: string | null;
}

interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
}

const useAuth = (requiredRole?: "admin" | "student" | "professor") => {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const verifyUser = async () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

      if (!token) {
        setAuthState({
          user: null,
          loading: false,
          error: "No estás autenticado. Redirigiendo al login...",
        });
        setTimeout(() => router.push("/login"), 2000);
        return;
      }

      try {
        const response = await api.get("/user");
        const { id, name, email, role, profile_photo_url } = response.data.data;

        if (!["admin", "student", "professor"].includes(role)) {
          throw new Error("Rol de usuario inválido");
        }

        if (requiredRole && role !== requiredRole) {
          setAuthState({
            user: null,
            loading: false,
            error: "Acceso denegado. Redirigiendo al login...",
          });
          localStorage.removeItem("token");
          setTimeout(() => router.push("/login"), 2000);
          return;
        }

        setAuthState({
          user: {
            id,
            name: name || "Usuario",
            email: email || `${role}@mentora.edu`,
            role: role as "admin" | "student" | "professor",
            profilePhotoUrl: profile_photo_url || null,
          },
          loading: false,
          error: null,
        });
      } catch (err: unknown) {
        const error = err as AxiosError<{ message: string }>;
        setAuthState({
          user: null,
          loading: false,
          error: error.response?.data?.message || "Token inválido. Redirigiendo al login...",
        });
        localStorage.removeItem("token");
        setTimeout(() => router.push("/login"), 2000);
      }
    };

    verifyUser();
  }, [router, requiredRole]);

  return authState;
};

export default useAuth;