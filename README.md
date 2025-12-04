# Book Reviews API

Una API RESTful construida con **NestJS** para gestionar reseñas de libros. La aplicación permite a los usuarios registrarse, buscar libros a través de la **Google Books API**, guardarlos en una base de datos **PostgreSQL** y realizar operaciones CRUD sobre reseñas y usuarios.

## 📋 Características

  - **Autenticación y Autorización:** Registro e inicio de sesión de usuarios mediante JWT (JSON Web Tokens).
  - **Integración Externa:** Búsqueda de libros en tiempo real utilizando la API de Google Books.
  - **Gestión de Libros:** Persistencia de libros seleccionados en la base de datos local.
  - **Reseñas:** Los usuarios autenticados pueden crear, editar y eliminar reseñas de libros.
  - **Base de Datos Relacional:** Uso de PostgreSQL con TypeORM.
  - **Containerización:** Configuración completa con Docker y Docker Compose.
  - **Testing:** Pruebas unitarias y E2E configuradas con Jest.
  - **CI/CD:** Pipeline de GitHub Actions para integración continua.

## 🛠 Tecnologías

  - [NestJS](https://nestjs.com/) - Framework de Node.js.
  - [TypeORM](https://typeorm.io/) - ORM para TypeScript.
  - [PostgreSQL](https://www.postgresql.org/) - Sistema de gestión de bases de datos.
  - [Passport](http://www.passportjs.org/) - Middleware de autenticación.
  - [Docker](https://www.docker.com/) - Plataforma de contenedores.
  - [Google Books API](https://developers.google.com/books) - Fuente de datos de libros.

## 🚀 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

  - [Node.js](https://nodejs.org/) (v20 o superior recomendado)
  - [npm](https://www.npmjs.com/)
  - [Docker](https://www.docker.com/) y Docker Compose (Opcional, pero recomendado)

## ⚙️ Configuración de Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto. Puedes basarte en el siguiente ejemplo:

```env
# Configuración de la Base de Datos
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=mi_usuario_postgres
DB_PASSWORD=mi_password_postgres
DB_DATABASE=bookreviews_db

# Configuración de JWT (Autenticación)
JWT_SECRET=esta_es_una_clave_secreta_super_segura

# API Key de Google (Necesaria para buscar libros)
GOOGLE_BOOKS_API_KEY=tu_google_api_key_aqui

# Puerto de la aplicación (Opcional, por defecto 3000)
PORT=3000
```

> **Nota:** Si usas Docker, `DB_HOST` debe ser `postgres_db` (el nombre del servicio en `docker-compose.yml`), pero Docker Compose se encargará de inyectar las variables definidas.

## 🐳 Ejecución con Docker (Recomendado)

La forma más sencilla de levantar la aplicación y la base de datos es utilizando Docker Compose.

1.  Asegúrate de tener el archivo `.env` creado.
2.  Ejecuta el siguiente comando:

<!-- end list -->

```bash
docker-compose up --build
```

Esto levantará:

  - La API en `http://localhost:3000`
  - La base de datos PostgreSQL en el puerto `5433` (mapeado desde el 5432 interno).

## 💻 Ejecución Local (Sin Docker)

Si prefieres ejecutarlo manualmente, necesitarás una instancia de PostgreSQL corriendo localmente.

1.  **Instalar dependencias:**

    ```bash
    npm install
    ```

2.  **Configurar la base de datos:** Asegúrate de que los datos en tu `.env` coincidan con tu base de datos local.

3.  **Iniciar en modo desarrollo:**

    ```bash
    npm run start:dev
    ```

## 📡 Endpoints de la API

### Autenticación (`/auth`)

  - `POST /auth/register`: Registrar un nuevo usuario.
      - Body: `{ "email": "user@test.com", "password": "password123" }`
  - `POST /auth/login`: Iniciar sesión y obtener token.
      - Body: `{ "email": "user@test.com", "password": "password123" }`
  - `GET /profile`: Obtener perfil del usuario actual (Requiere Token).

### Libros (`/books`)

  - `GET /books/search?q=Harry Potter`: Buscar libros en Google Books API (Requiere Token).
  - `POST /books`: Guardar un libro en la DB local usando su `googleId`.
      - Body: `{ "googleId": "ID_DE_GOOGLE_BOOKS" }`
  - `GET /books`: Listar todos los libros guardados.
  - `GET /books/:id`: Obtener detalles de un libro específico.

### Reseñas (`/reviews`) - Requiere Token

  - `POST /reviews`: Crear una reseña para un libro.
      - Body: `{ "rating": 5, "comment": "Excelente libro", "bookId": 1 }`
  - `GET /reviews`: Obtener todas las reseñas.
  - `PATCH /reviews/:id`: Actualizar una reseña propia.
  - `DELETE /reviews/:id`: Eliminar una reseña propia.

### Usuarios (`/users`) - Requiere Token

  - `GET /users`: Listar usuarios.
  - `GET /users/:id`: Obtener usuario por ID.
  - `PATCH /users/:id`: Actualizar usuario.
  - `DELETE /users/:id`: Eliminar usuario.

## 🧪 Tests

El proyecto incluye tests unitarios y de extremo a extremo (e2e).

```bash
# Ejecutar tests unitarios
npm run test

# Ejecutar tests e2e
npm run test:e2e

# Ver cobertura de tests
npm run test:cov
```

## 📂 Estructura del Proyecto

```
src/
├── app.module.ts          # Módulo raíz
├── main.ts                # Punto de entrada
├── auth/                  # Módulo de autenticación (JWT, Login)
├── books/                 # Módulo de libros (Conexión Google API)
├── reviews/               # Módulo de reseñas
├── users/                 # Módulo de usuarios
└── database/              # Configuración de TypeORM
```

## 📄 Licencia

Este proyecto está bajo la licencia [MIT](https://www.google.com/search?q=LICENSE).
