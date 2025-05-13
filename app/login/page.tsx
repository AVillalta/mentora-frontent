'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Depuración: Verificar variables de entorno
  //console.log('API_URL:', process.env.NEXT_PUBLIC_API_URL);
  //console.log('API_BASE_URL:', process.env.NEXT_PUBLIC_API_BASE_URL);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Enviar solicitud de login
      const loginResponse = await api.post(
        '/login', // ya no necesitas concatenar baseURL, el api.ts ya la tiene
        { email, password },
        { timeout: 5000 }
      );

      const { token, user } = loginResponse.data;

      if (!token || !user) {
        throw new Error('Respuesta inválida del servidor');
      }

      // Depuración: Mostrar datos del usuario
      //console.log('Login response:', { token, user });

      // Almacenar el token
      localStorage.setItem('token', token);

      // Redirigir según el rol
      const role = user.role;
      switch (role) {
        case 'admin':
          router.push('/admin');
          break;
        case 'student':
          router.push('/student');
          break;
        case 'teacher':
          router.push('/teacher');
          break;
        default:
          throw new Error('Rol no reconocido o no asignado');
      }
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        setError(err.response?.data?.message || 'Error al iniciar sesión. Verifica tus credenciales.');
      } else {
        setError('Error inesperado al iniciar sesión.');
      }
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">Iniciar Sesión - Mentora</CardTitle>
          </div>
          <CardDescription>Ingresa tus credenciales para acceder a la plataforma</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
          <CardFooter className="mt-4">
            <Button className="w-full bg-primary hover:bg-blue-700" type="submit" disabled={loading}>
              {loading ? 'Cargando...' : 'Iniciar Sesión'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}