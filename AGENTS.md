# Guía de trabajo para Radiometro

## Estructura de ramas (Git Flow)

Este proyecto usa un modelo **Git Flow** para mantener el control de cada modificación.

- `main` — Código de producción. Solo recibe merges de `release/*` y `hotfix/*`. Siempre debe estar estable y desplegable.
- `develop` — Rama de integración. Todas las `feature/*` y `bugfix/*` se fusionan aquí. Base para crear releases.
- `feature/<descripcion>` — Nuevas funcionalidades. Se crean desde `develop` y se integran vía PR a `develop`.
- `bugfix/<descripcion>` — Correcciones sobre `develop` (no urgentes).
- `release/<version>` — Preparación de una versión. Se crean desde `develop` y se fusionan a `main` y `develop` (con tag `v<version>`).
- `hotfix/<descripcion>` — Correcciones urgentes de producción. Se crean desde `main` y se fusionan a `main` y `develop`.

## Reglas de trabajo

1. **Nunca commitear directamente en `main` ni `develop`.** Todas las modificaciones van en una rama `feature/*` (o `hotfix/*`/`bugfix/*` según el caso).
2. Toda rama se crea desde `develop` (salvo hotfix, que se crea desde `main`).
3. Antes de crear una `feature/*`, asegurarse de que `develop` esté al día: `git switch develop && git pull origin develop`.
4. Después de cada commit, mantener la rama sincronizada con `develop` para evitar conflictos grandes.
5. Al terminar la feature, abrir un Pull Request de `feature/*` → `develop` y esperar revisión antes de mergear.
6. Las ramas `release/*` solo añaden cambios de versionado/empaquetado; los fixes de código van a `develop` y luego se cherry-pick a la release.
7. Unificar los mensajes de commit:
   - `feat:` nueva funcionalidad
   - `fix:` corrección de bug
   - `chore:` tareas de mantenimiento (deps, limpieza, tooling)
   - `docs:` documentación
   - `security:` cambios de seguridad
8. No se usa el ejecutable `git-flow`; el flujo se lleva con los comandos de git puro.

## Modelo de datos y entorno

- Base de datos SQLite: `backend/data/database.sqlite` (NO versionar; ver `.gitignore`).
- El backend requiere `JWT_SECRET` en `backend/.env` (ver `backend/.env.example`). No arranca sin esa variable.
- Frontend: React + Vite + TailwindCSS v4 + PWA. Scripts: `pnpm dev`, `pnpm build`, `pnpm lint`.
- Backend: Express + SQLite. Scripts: `pnpm dev`, `pnpm start`, `pnpm test`, `pnpm lint`.

## Verificación antes de mergear una feature

- Frontend: `pnpm lint` y `pnpm build` sin errores.
- Backend: `pnpm test` (0 fallos) y `pnpm lint` (0 errores/warnings).