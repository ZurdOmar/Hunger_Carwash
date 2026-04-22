# CONDICIONES DE ENTREGA Y ALOJAMIENTO

**Sistema Hunger Car Wash — Punto de Venta y Reportes**

Fecha: 18 de abril de 2026
Cliente: _______________________________
Proveedor: _______________________________

---

## 1. Objeto de la entrega

Se entrega el acceso al sistema "Hunger Car Wash" en su versión operativa, accesible en línea desde cualquier navegador. Comprende: registro de órdenes, control de cajones y lavadores, corte de caja, Perfiles de usuarioreportes analíticos y exportación de datos (CSV).

## 2. Alojamiento (hosting)

El sistema se publica en dos servicios externos:

- **Vercel** — aplicación web.
- **Supabase** — base de datos, autenticación y almacenamiento de archivos.

Al momento de la entrega, el sistema opera dentro de los **planes gratuitos (Free tier)** de ambas plataformas. **No hay costo para el cliente** mientras el uso se mantenga dentro de los límites de estos planes.

## 3. Escalabilidad y costos futuros

Si por crecimiento del negocio, volumen de órdenes, almacenamiento, número de usuarios o cualquier otro factor, el uso **excediera los límites del plan gratuito** de Vercel y/o Supabase, será necesario migrar a un plan de pago.

En ese escenario, **los costos de Vercel y/o Supabase serán cubiertos en su totalidad por el cliente**. El proveedor avisará con antelación razonable cuando se aproxime dicho límite.

## 4. Código fuente

El código fuente **no forma parte de esta entrega**. El cliente recibe el **derecho de uso** del sistema en su versión operativa.

La entrega del código fuente (licencia o cesión de derechos) constituye un servicio **adicional con costo separado**, no contemplado en el alcance actual. De requerirse en el futuro, se cotizará de manera independiente.

## 5. Cambios y desarrollos adicionales

Cualquier modificación, nueva funcionalidad, integración con sistemas externos, rediseño o ajuste que el cliente solicite **posterior a la entrega** del sistema en su versión operativa actual, constituye un **desarrollo adicional con costo extra**.

Cada solicitud será evaluada y cotizada de forma independiente por el proveedor antes de su ejecución, y solo se iniciará una vez aceptada por escrito por el cliente.

# Hunger Carwash — Documentación de Roles de Usuario

Este documento detalla la arquitectura, implementación y reglas de negocio del sistema de gestión de accesos (RBAC - Role Based Access Control) del ERP/POS Hunger Carwash.

---

## 1. Definición de Roles

El sistema está diseñado para manejar tres niveles de acceso claramente diferenciados, garantizando que cada usuario vea y manipule solo lo necesario para su función:

| Rol | Descripción | Permisos Clave |
| :--- | :--- | :--- |
| **admin** | Administrador total del sistema. | Gestión de precios, servicios, empleados y reportes financieros globales. |
| **supervisor** | Personal con autoridad sobre la operación diaria. | Supervisión de órdenes, gestión de inventarios y visualización de reportes de sucursal. |
| **cajero** | Personal operativo del punto de venta. | Creación de órdenes, asignación de lavadores, recepción de pagos y corte de caja. |

> [!IMPORTANT]
> **Restricción de Cajeros**: Por regla de negocio, el sistema limita el número de cajeros activos a un máximo de **2** simultáneos, controlado mediante triggers en la base de datos para prevenir el uso indebido de licencias o el acceso no supervisado.

# Accesos al sistema
  para crear los usuarios, se deberan mandar un correo electronico a [zoteksolucionesia@gmail.com], con los siguientes datos:
  nombre completo, correo electronico,  rol (admin, supervisor, cajero), una vez recibido el correo con los correos de los usuarios, se les hará llegar un link para que cada usuario genere su propia contraseña, la cual debe cumplir con los siguientes requisitos:
  8 caracteres de longitud, incluir mayusculas, minusculas y numeros. Los usuarios no pueden tener el mismo correo electronico. por defecto, todos los usuarios son cajeros, para cambiar el rol a admin (administrador) que existirá solo 1, una vez que se registre el usuario, deberá de mandar correo[zoteksolucionesia@gmail.com] para solicitar el cambio de rol, el cual se hará manualmente desde la base de datos.
  
  
