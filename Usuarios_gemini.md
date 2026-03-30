# Propuesta de Arquitectura de Usuarios y Perfiles - Hunger Velocity

Esta propuesta detalla la estructura de **Autenticación y Seguridad** para el sistema Hunger Carwash, utilizando **Supabase Auth** y **Vercel** como infraestructura central.

---

## 1. Niveles de Acceso (Roles)

Se proponen tres perfiles principales para la operación del negocio:

| Rol | Alcance de Funciones (Frontend) | Permisos de Datos (Backend) |
| :--- | :--- | :--- |
| **ADMIN** | Acceso TOTAL: Dashboard, Punto de Venta, Seguimiento, Reportes, Recursos, Membresías y Configuración. | Lectura y Escritura en TODAS las tablas sin restricciones. |
| **SUPERVISOR** | Acceso a: Dashboard (resumido), seguimiento operativo, gestión de personal (lavadores) y reportes de desempeño. | Lectura general. Escritura en tablas de personal y estados de orden. No puede editar precios. |
| **CAJERO** | Acceso exclusivo a: Punto de Venta (POS), Seguimiento de Órdenes y Registro de Membresías. | Lectura de catálogos (precios/lavadores). Escritura solo para nuevas órdenes. |

---

## 2. Flujo de Seguridad y Autenticación

### A. Autenticación Centralizada (Supabase Auth)
*   **Identificación Única:** Cada usuario ingresará con su correo corporativo y contraseña.
*   **Sesiones Seguras:** El sistema recordará la sesión según el dispositivo (ideal para tablets en estaciones de lavado).
*   **Recuperación de Acceso:** Posibilidad de restablecer contraseñas vía correo electrónico de forma automática.

### B. Seguridad de Datos (Row Level Security - RLS)
Incluso si un usuario avanzado intentara acceder a la base de datos "por fuera" de la interfaz, Supabase bloqueará el acceso basándose en su rol. 

*Ejemplo:* Si un **Cajero** intenta consultar la tabla de `ingresos_totales` o `margen_de_ganancia`, la base de datos Postgres devolverá un error de "Acceso Denegado" automáticamente.

---

## 3. Tabla de Perfiles Propuesta

Se requiere una tabla adicional en la base de datos para gestionar estos privilegios:

```sql
CREATE TABLE perfiles (
  id uuid REFERENCES auth.users NOT NULL PRIMARY KEY,
  full_name text,
  role text CHECK (role IN ('admin', 'supervisor', 'cajero')),
  sucursal_id uuid REFERENCES sucursales(id),
  created_at timestamp with time zone DEFAULT now()
);
```

---

## 4. Beneficios para el Cliente

1.  **Auditoría de Operaciones:** Cada orden creada quedará vinculada al ID del cajero que la realizó. Sabrás exactamente quién recibió qué auto.
2.  **Protección de Información Sensible:** Los empleados operativos no podrán ver las métricas de rentabilidad ni los costos del negocio.
3.  **Control de Precios:** Evita que el personal modifique los precios de los servicios o aplique descuentos no autorizados.
4.  **Escalabilidad Multi-Sucursal:** Si el negocio crece, puedes asignar "Gerentes de Sucursal" que solo vean los datos de su propia ubicación.

---

**Estado de Implementación:** *PENDIENTE DE APROBACIÓN*
*Una vez aprobado, se puede integrar el Login y los permisos en aproximadamente 4 horas de desarrollo.*
