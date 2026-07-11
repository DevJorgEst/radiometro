# 📻 Radiometro

Radiometro es una aplicación web e instalable (PWA) de radio en streaming minimalista y en modo oscuro, construida con arquitectura Fullstack. Permite a los usuarios buscar emisoras globales en tiempo real a través de la API de Radio Browser, reproducir audio sin interrupciones y gestionar su propia lista de favoritos de forma aislada mediante cuentas de usuario seguras.

---

## ✨ Características Principales

- 🎨 **Diseño Premium Horizontal**: Interfaz minimalista en modo oscuro optimizada para una navegación fluida en PC y dispositivos móviles.
- 📱 **Progressive Web App (PWA)**: Totalmente instalable en iOS y Android, ejecutándose a pantalla completa y con estrategia de caché inteligente para rendimiento óptimo.
- 🔐 **Autenticación Multiusuario**: Registro e inicio de sesión seguro mediante encriptación de contraseñas con `bcrypt` y sesiones controladas por tokens JWT.
- 💾 **Persistencia con SQLite**: Base de datos relacional ligera integrada en el backend que aísla de forma estricta las emisoras favoritas de cada perfil en tiempo real.
- 🛡️ **Robustez y Fallbacks**: Control automatizado de bloqueos CORS de servidores de streaming externos mediante imágenes de sustitución (*fallback*).

---

## 🛠️ Stack Tecnológico

### Frontend
- **React** (con Vite) + **TypeScript**
- **Tailwind CSS** (Diseño Mobile-First)
- **Vite PWA Plugin** (Estrategia NetworkFirst para API)

### Backend
- **Node.js** + **Express**
- **SQLite3** + **SQLite** (Base de datos en archivo local)
- **JSON Web Tokens (JWT)** & **Bryptjs** (Seguridad y Auth)

---

## 🚀 Instalación y Uso Local

Sigue estos pasos para levantar el entorno de desarrollo en tu ordenador.

### Prerrequisitos
Tener instalado [Node.js](https://nodejs.org) y un gestor de paquetes como `pnpm` o `npm`.

### 1. Clonar el repositorio
```bash
git clone https://github.com
cd radiometro
```

### 2. Configurar y arrancar el Backend
```bash
cd backend
pnpm install
# Crea un archivo .env si necesitas cambiar el puerto (Por defecto: 5000)
pnpm run dev
```

### 3. Configurar y arrancar el Frontend
En otra ventana de la terminal:
```bash
cd frontend
pnpm install
pnpm run dev
```
Abre tu navegador en `http://localhost:5173` y ¡listo!

---

## 🧪 Comandos Útiles

- **Probar la PWA en local:**
  ```bash
  cd frontend
  pnpm run build && pnpm run preview
  ```
- **Resetear Base de Datos:** Elimina el archivo `backend/database.sqlite` y reinicia el backend; las tablas se generarán limpias automáticamente.

---
Desarrollado con ⚡ por DevJorgEst.
