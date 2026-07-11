# 📑 Guía Técnica: Arquitectura y Funcionamiento de la Base de Datos

**Radiometro** utiliza **SQLite** como motor de base de datos relacional en el backend, gestionado a través de los paquetes `sqlite` y `sqlite3` de Node.js. Al ser una base de datos embebida, no requiere un servidor externo; toda la información se almacena de forma eficiente en un único archivo local llamado `database.sqlite`.

---

## 🗺️ 1. Diagrama de Relaciones (Estructura Entidad-Relación)

La base de datos se compone de dos tablas principales conectadas mediante una relación de **Uno a Muchos (1:N)**: *Un usuario puede tener muchas emisoras favoritas, pero una emisora favorita en la tabla pertenece a un único usuario.*

```text
  ┌─────────────────┐             ┌─────────────────────────┐
  │   USERS (1)     │             │     FAVORITES (N)       │
  ├─────────────────┤             ├─────────────────────────┤
  │ id (PK)         │◄──┐         │ id (PK)                 │
  │ username (UNIQUE)│   └─────────┼─ user_id (FK)           │
  │ password        │             │ stationuuid             │
  │                 │             │ name                    │
  └─────────────────┘             │ favicon                 │
                                  │ url_resolved            │
                                  └─────────────────────────┘
```

---

## 🛠️ 2. Ciclo de Vida y Flujo de los Datos

### A. Inicialización Automática (Auto-Migration)
Cuando el servidor Node.js arranca (`src/config/db.js`), ejecuta un script de inicialización con la propiedad `IF NOT EXISTS`.

* **Beneficio:** Si clonas el proyecto en un ordenador nuevo, no necesitas importar scripts SQL. El backend detecta la ausencia del archivo `database.sqlite`, lo crea en el acto y monta las tablas estructuradas automáticamente.

### B. Registro y Seguridad de Usuarios
Cuando un usuario se registra (`POST /api/auth/register`):
- El backend recibe la contraseña en texto plano.
- Se aplica `bcryptjs` para generar un hash seguro con 10 rondas de salado (salt).
- **Nunca se almacena la contraseña real.** En la columna `password` de la tabla `users` se guarda una cadena alfanumérica irreversible (ej. `$2a$10$X7v...`).
- Al hacer login, `bcryptjs.compare()` verifica matemáticamente si la contraseña introducida coincide con el hash guardado.

### C. Aislamiento estricto de Datos (Multi-Tenant)
La privacidad de los favoritos se apoya en el **Middleware de Autenticación** y la clave foránea (`user_id`):
- El cliente envía una petición HTTP incluyendo el Token JWT en las cabeceras (`Authorization: Bearer <TOKEN>`).
- El middleware descifra el token, valida que sea legítimo y extrae el `id` del usuario, inyectándolo en la petición como `req.user.id`.
- Las consultas SQL se parametrizan utilizando ese ID específico:

```sql
-- Obtener favoritos solo del usuario activo
SELECT * FROM favorites WHERE user_id = ?;

-- Eliminar un favorito asegurando que pertenezca al usuario que lo solicita
DELETE FROM favorites WHERE user_id = ? AND stationuuid = ?;
```

---

## 🔒 3. Mecanismos de Integridad y Robustez

Para evitar fallos de rendimiento o datos corruptos causados por el uso simultáneo, se implementaron dos reglas a nivel de base de datos:

### Restricción Única Compuesta (UNIQUE)
En la tabla `favorites`, se definió un índice único combinando dos columnas:

```sql
UNIQUE(user_id, stationuuid)
```

* **¿Qué resuelve?** Evita que el mismo usuario guarde dos o más veces la misma radio si hace clic rápido en el botón del corazón. Sin embargo, permite que el Usuario A y el Usuario B tengan guardada la misma radio (`stationuuid`) en sus respectivas cuentas sin conflicto.

### Prevención de Inyección SQL (Consultas Preparadas)
El controlador evita concatenar strings directamente en las consultas (ej. `WHERE user_id = ` + id). En su lugar, utiliza marcadores de posición (`?`) provistos por el driver de SQLite:

```javascript
// ✅ Forma segura e implementada
await db.run(
  'INSERT INTO favorites (user_id, stationuuid, name, favicon, url_resolved) VALUES (?, ?, ?, ?, ?)',
  [userId, stationuuid, name, favicon, url_resolved]
);
```

* **¿Qué resuelve?** Los parámetros se envían de forma separada al motor de la base de datos, garantizando que cualquier texto malicioso introducido por un usuario sea tratado estrictamente como texto y nunca como código SQL ejecutable.

---

## 🧪 4. Mantenimiento y Depuración en Desarrollo

Al trabajar con SQLite, el mantenimiento es sumamente sencillo gracias a su naturaleza local:

- **Reset Completo:** Si deseas limpiar todas las cuentas de prueba y empezar de cero, simplemente elimina el archivo `backend/database.sqlite` con el servidor apagado. Al encenderlo, todo volverá a su estado inicial limpio.
- **Visualización de datos:** Puedes instalar la extensión *"SQLite Viewer"* en VS Code o descargar el programa gratuito *DB Browser for SQLite* para abrir el archivo `database.sqlite` y examinar visualmente las filas de usuarios y favoritos en tiempo real mientras pruebas la aplicación.

