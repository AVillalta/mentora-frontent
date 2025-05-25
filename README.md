# Mentora Frontend

## ¿Qué es Mentora Frontend?

**Mentora Frontend** es la interfaz de usuario de Mentora, un campus virtual para universidades. Construida con **Next.js 15**, permite a estudiantes, profesores y administradores interactuar con la API de Mentora (`mentora-api`) para gestionar cursos, materiales, tareas y calificaciones. Usa **Tailwind CSS** para el diseño, **Radix UI** para componentes, y **TanStack Query** para peticiones a la API.

### Funcionalidades
- **Estudiantes**: Ver cursos, descargar materiales, enviar tareas, consultar notas.
- **Profesores**: Crear cursos, subir materiales, revisar tareas, asignar notas.
- **Administradores**: Gestionar usuarios desde un panel admin.
- Interfaz moderna con soporte para temas claro/oscuro.

## Requisitos

- **Docker** y **Docker Compose** (instalados).
- **Git** (para clonar el código).
- Terminal (Linux, macOS, o WSL en Windows).
- **Mentora API** corriendo en `http://localhost:8000` (ver README de `mentora-api`).
- 2GB de RAM libres para Docker.

## Cómo probar el frontend en local

Sigue estos pasos para levantar el frontend con **Docker**.

### 1. Clona el repositorio

Abre una terminal y clona el código:

```bash
git clone https://github.com/AVillalta/mentora-frontent.git
cd mentora-frontend
```

### 2. Copia la configuración

Copia `.env.example` para crear `.env`:

```bash
cp .env.example .env
```

No necesitas cambiar nada en `.env`. Los valores por defecto funcionan (frontend en `localhost:3000`, API en `localhost:8000`).

### 3. Asegúrate que la API está corriendo

El frontend necesita `mentora-api`. Sigue el README de `mentora-api` para levantarla en `http://localhost:8000`. Verifica:

```bash
curl http://localhost:8000
```

### 4. Inicia el frontend

Levanta el contenedor de Docker:

```bash
docker-compose up -d
```

Esto inicia el frontend en `http://localhost:3000`.

### 5. Prueba el frontend

Abre `http://localhost:3000` en tu navegador e inicia sesión con estos usuarios (creados por el seeder de `mentora-api`):

- **Profesor**:
  - Email: `professor@example.com`
  - Contraseña: `password1234`
- **Estudiante**:
  - Email: `student@example.com`
  - Contraseña: `password1234`
- **Admin**:
  - Email: `admin@example.com`
  - Contraseña: `password1234`

**Nota**: Los administradores pueden crear nuevos usuarios desde el panel admin (por ejemplo, `/admin/users`).

### 6. Detén el frontend

Para el contenedor:

```bash
docker-compose down
```

## Si algo falla

- **No carga `http://localhost:3000`**:
  - Verifica el contenedor: `docker ps`.
  - Reinicia: `docker-compose down && docker-compose up -d`.
- **No conecta con la API**:
  - Asegúrate que `mentora-api` corre en `http://localhost:8000`.
  - Confirma `.env`: `NEXT_PUBLIC_API_URL=http://localhost:8000`.
- **Errores de autenticación**:
  - Verifica que los usuarios existen (creados con `sail artisan db:seed` en `mentora-api`).
- **CORS errors**:
  - En `mentora-api/.env`, confirma: `SANCTUM_STATEFUL_DOMAINS=localhost:3000,localhost:8000`.

## Qué probar

- **Estudiante**: Navega a `/student/courses` para ver cursos, envía tareas, consulta notas.
- **Profesor**: Ve a `/professor/courses`, sube materiales, crea tareas.
- **Admin**: Accede a `/admin/users` para gestionar usuarios.

## Más info

- **Rutas**: Consulta el código en `app/` para rutas específicas.
- **API**: Verifica `mentora-api/routes/api.php` para endpoints.
- **Estilos**: Usa Tailwind CSS y Radix UI.
