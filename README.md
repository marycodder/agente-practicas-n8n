# Agente Buscador de Prácticas en Informática

Repositorio del proyecto académico basado en **n8n** cuyo objetivo es automatizar la búsqueda, consolidación y envío de oportunidades de **prácticas profesionales y pasantías en informática**, integrando distintas fuentes de empleo en un solo flujo de trabajo. :contentReference[oaicite:0]{index=0}

---

## 1. Descripción General del Proyecto

El proyecto implementa un **agente automatizado** que:

- Consulta portales de empleo (Indeed, Laborum, Santander, Jooble, etc.).
- Aplica filtros según **preferencias del estudiante** (email, frecuencia, modalidad, ubicación, palabras clave).
- Deduplica y normaliza las ofertas.
- Guarda los resultados en una **hoja de cálculo / base de datos** para consulta histórica.
- Envía reportes por correo electrónico con las oportunidades nuevas.
- Permite funcionalidades de **autogestión y administración** (pausa/reanudar, límites, métricas de uso, errores, etc.). :contentReference[oaicite:1]{index=1}

Este repositorio contiene:

- Flujos de n8n exportados en formato `.json`.
- Documentación funcional/técnica.
- Scripts auxiliares (si aplica).
- Plantillas de configuración (por ejemplo, variables de entorno).

---

## 2. Objetivos del Sistema

Al finalizar, el sistema permite: :contentReference[oaicite:2]{index=2}

- Automatizar búsquedas web mediante nodos **HTTP Request + scraping/parsing** en n8n.
- Integrar múltiples fuentes para consolidar datos en un repositorio único.
- Generar y enviar **reportes programados** (diarios/semanales) y **on-demand**.
- Dar trazabilidad del uso: historial de reportes, métricas por usuario y métricas administrativas.
- Gestionar errores de consulta, límites de uso y notificaciones a administradores.

---

## 3. Arquitectura General

### 3.1 Componentes principales

- **n8n** (self-hosted o cloud) como motor de orquestación.
- **Google Sheets / Base de datos** para:
  - Suscripciones de usuarios.
  - Historial de ofertas.
  - Historial de reportes y límites de uso.
  - Logs de errores.
- **Proveedor de correo (SMTP/SendGrid/Gmail)** para:
  - Envío de reportes a estudiantes.
  - Notificación de errores a administradores.
- **Formularios / Webhooks**:
  - Registro y edición de preferencias.
  - Solicitud de reporte inmediato.
  - Activar/pausar suscripción.
- **Portales externos de empleo**:
  - Laborum, Indeed, Santander, Jooble, etc. (vía HTTP Request + scraping/API). :contentReference[oaicite:3]{index=3}

### 3.2 Vista de alto nivel (lógica)

1. **Registro/gestión de preferencias**  
   Formulario → Webhook n8n → Validaciones → Persistencia en `subscriptions` → Cálculo de `next_run`.

2. **Scheduler de reportes programados**  
   Trigger (cron) → Carga suscripciones activas → Para cada suscripción:
   - Consultar plataformas (HU5).
   - Filtrar por preferencias.
   - Normalizar/deduplicar.
   - Generar reporte (HU6).
   - Enviar correo.
   - Registrar uso y resultado.

3. **Reporte on-demand**  
   Formulario/botón → Webhook → Verificación de límites (HU13) → Ejecución de pipeline de búsqueda + reporte (HU5 + HU6) sin alterar el cron (HU4).

4. **Gestión de uso e historial**  
   - Historial de ofertas en `jobs`/Google Sheets (HU3, HU10).
   - Historial de reportes en `runs`/`reports_usage` (HU7).
   - Estado de suscripciones (HU1, HU2, HU8, HU12).
   - Alertas de error a admin (HU9, HU11).

---

## 4. Modelo de Datos (Lógico)

> Puede estar implementado en Google Sheets, base de datos SQL o equivalente. A continuación, se describe el modelo lógico mínimo recomendado. :contentReference[oaicite:4]{index=4}

### 4.1 `subscriptions`

Información de suscripciones de estudiantes.

- `email` (PK, único)
- `frecuencia` (`diaria` | `semanal`)
- `modalidad` (`remoto` | `presencial` | `hibrido`)
- `ubicacion` (texto libre, por ej. “Región Metropolitana”)
- `estado` (`ACTIVA` | `PAUSADA`)
- `next_run` (timestamp, TZ America/Santiago)
- `created_at`
- `updated_at`

### 4.2 `jobs` (ofertas consolidadas)

- `id` (PK)
- `titulo`
- `empresa`
- `ubicacion`
- `modalidad`
- `fecha_publicacion`
- `link`
- `source` (Indeed, Laborum, Santander, etc.)
- `hash_oferta` (clave compuesta para deduplicar, ej. hash(titulo+empresa+link))
- `created_at`

### 4.3 `reports` / `runs`

Histórico de ejecuciones de reportes (programados y on-demand).

- `id`
- `email`
- `tipo` (`PROGRAMADO` | `ON_DEMAND`)
- `fecha_ejecucion`
- `cantidad_resultados`
- `estado_envio` (`OK` | `ERROR` | `REINTENTANDO`)
- `error_code` (opcional)
- `error_message` (sanitizado)
- `created_at`

### 4.4 `subscription_events`

Trazabilidad de cambios de suscripción.

- `id`
- `email`
- `tipo_evento` (`ALTA`, `EDICION`, `PAUSA`, `REANUDAR`, `ERROR`)
- `payload` (JSON simplificado/observaciones)
- `created_at`

### 4.5 `job_user_actions` (marcado de ofertas)

- `id`
- `email`
- `job_id`
- `estado_usuario` (`POSTULADO` | `DESCARTADO`)
- `updated_at`

### 4.6 `admin_limits`

- `id`
- `scope` (`DEFAULT` | `USER`)
- `email` (nullable si es DEFAULT)
- `limite_mensual_on_demand`
- `created_at`
- `updated_at`

---

## 5. Endpoints Lógicos / Webhooks

> En n8n estos endpoints se implementan como nodos **Webhook** y flujos asociados; el nombre de los endpoints es la interfaz lógica, no necesariamente la URL exacta. :contentReference[oaicite:5]{index=5}

- `POST /subscriptions`  
  Alta o actualización de suscripción (HU1).
- `PATCH /subscriptions` o `POST /subscriptions/update`  
  Edición de preferencias (HU2).
- `POST /subscriptions/pause`  
  Pausar reportes (HU8).
- `POST /subscriptions/resume`  
  Reanudar reportes (HU8).
- `GET /reports`  
  Visualizar histórico de ofertas (HU3).
- `GET /reports/usage`  
  Ver cantidad e historial de reportes (HU7).
- `POST /reports/now`  
  Generar reporte inmediato (HU4).
- `PATCH /jobs/:id/user_state`  
  Marcar oferta como `POSTULADO`/`DESCARTADO` (HU10).
- `GET /admin/subscriptions`  
  Estado de suscripciones (HU12).
- `POST /admin/limits`  
  Definir límite de reportes on-demand (HU13).

---

## 6. Historias de Usuario y Flujos Técnicos

A continuación se describe el comportamiento y flujo técnico de cada HU según la especificación. :contentReference[oaicite:6]{index=6}

### 6.1 HU1 – Registro con preferencias

**Objetivo**  
Permitir que una estudiante se registre y defina email, frecuencia, modalidad y ubicación para recibir reportes automáticos.

**Flujo técnico (n8n)**

1. **Webhook: `POST /subscriptions`**
2. **Validación de input** (nodo Code/Function):
   - Validar formato de email.
   - Validar frecuencia ∈ {diaria, semanal}.
   - Validar modalidad ∈ {remoto, presencial, hibrido}.
   - Validar que ubicación no esté vacía.
3. **Upsert en `subscriptions`** (Google Sheets / DB):
   - Si el email no existe → crear suscripción ACTIVA.
   - Si existe → actualizar preferencias (upsert).
4. **Cálculo de `next_run`**:
   - Frecuencia diaria: `now + 1 día`.
   - Frecuencia semanal: `now + 7 días`.
   - Siempre en TZ `America/Santiago`.
5. **Registro en `subscription_events`** (ALTA/EDICION).
6. **Envío de correo de confirmación** (SMTP).
7. **Respuesta estándar (JSON)**:
   - `200 OK` con mensaje de confirmación o
   - `4xx/5xx` según error.

---

### 6.2 HU2 – Edición de preferencias

**Objetivo**  
Permitir cambiar frecuencia, modalidad y ubicación sin afectar el estado (ACTIVA/PAUSADA).

**Flujo técnico**

1. **Webhook: `PATCH /subscriptions`**
2. Cargar suscripción por `email`.
3. Comparar valores entrantes vs. valores actuales:
   - Si no hay cambios → devolver 400 “sin cambios”.
   - Si hay cambios → actualizar solo campos modificados.
4. Si cambia frecuencia → recalcular `next_run`.
5. Registrar evento en `subscription_events` (EDICION).
6. Enviar correo de confirmación.

---

### 6.3 HU3 – Visualización de reportes (histórico)

**Objetivo**  
Visualizar ofertas históricas en un repositorio de consulta con filtros. 

**Flujo técnico**

1. **Webhook/API: `GET /reports`** con parámetros:
   - `desde`, `hasta` (rango de fechas),
   - `fuente`,
   - `modalidad`,
   - `q` (texto libre).
2. Nodo de consulta (Google Sheets/DB):
   - Filtro por fecha, fuente y modalidad.
   - Filtro textual por título/empresa (`q`).
3. Normalización de campos (limpieza de HTML, truncado de textos largos).
4. Orden por `fecha_publicacion` o `created_at` descendente.
5. Respuesta:
   - Lista de ofertas sin duplicados.
   - `204` si no hay resultados.

---

### 6.4 HU4 – Reporte inmediato (On-Demand)

**Objetivo**  
Generar un reporte inmediato sin alterar el reporte programado.

**Flujo técnico**

1. **Webhook: `POST /reports/now`** (requiere email).
2. Validar que el email tenga suscripción.
3. Verificar **límite mensual on-demand** (HU13):
   - Consultar consumo actual.
   - Si superó límite → `429` con mensaje claro.
4. Verificar que no haya ya una ejecución on-demand en curso (`runs` con estado `EN_CURSO`):
   - Si existe → `409`.
5. Ejecutar pipeline HU5 + HU6:
   - Consulta a plataformas.
   - Filtros por preferencias.
   - Generar reporte.
   - Enviar correo.
6. Registrar `runs` con tipo `ON_DEMAND` y actualizar contador de uso.

---

### 6.5 HU5 – Consulta a plataformas externas

**Objetivo**  
Consultar Laborum, Indeed y Santander para ampliar la cantidad de ofertas. :contentReference[oaicite:7]{index=7}

**Flujo técnico**

1. Nodo **Code/Function** prepara las queries según:
   - modalidad,
   - ubicación,
   - keywords (ej. “práctica informática”, “internship informática”).
2. Nodos **HTTP Request** por fuente:
   - Headers y User-Agent propios si es necesario.
   - Manejo de paginación (si aplica).
3. Nodos de **parseo (HTML/JSON)**:
   - Extraer `titulo`, `empresa`, `ubicacion`, `modalidad`, `fecha_publicacion`, `link`.
4. Normalización:
   - Mapeo a esquema común.
   - Normalización de campos (ej. modalidad: remoto/hibrido/presencial).
5. Manejo de errores por fuente:
   - Timeouts y reintentos (3 reintentos con backoff).
   - Si una fuente falla, se registra y se sigue con las demás.
6. Consolidación de resultados:
   - Unión de resultados por fuente.
   - Marcado de `source` por oferta.

---

### 6.6 HU6 – Reporte completo

**Objetivo**  
Enviar un reporte con la información mínima necesaria (título, empresa, modalidad, ubicación, fecha, link). :contentReference[oaicite:8]{index=8}

**Flujo técnico**

1. Input: lista de ofertas ya filtradas y normalizadas (salida de HU5).
2. **Deduplicación**:
   - Generar `hash_oferta` por oferta.
   - Eliminar duplicados dentro de la ejecución y contra el histórico si se requiere.
3. **Generación de contenido**:
   - Plantilla en HTML/Markdown.
   - Tabla con columnas:
     - Título
     - Empresa
     - Modalidad
     - Ubicación
     - Fecha de publicación
     - Link (clicable)
   - Si algún campo falta → “No disponible”.
   - Si no hay resultados → mensaje “Sin resultados” manteniendo el formato.
4. **Envío de correo** (SMTP):
   - Asunto estándar (ej. `[Agente Prácticas] Reporte de oportunidades`).
   - Cuerpo con tabla de ofertas.
5. **Registro de envíos**:
   - Guardar estado de envío (`OK`, `ERROR`, etc.).
   - Para errores, programar reintento si aplica.

---

### 6.7 HU7 – Visualizar cantidad de reportes

**Objetivo**  
Permitir que la estudiante vea cuántas veces se le han enviado reportes y en qué fechas. 

**Flujo técnico**

1. **Webhook: `GET /reports/usage`**.
2. Consultar tabla `runs` por `email`.
3. Calcular:
   - Contador total.
   - Listado por fecha con tipo (`PROGRAMADO` | `ON_DEMAND`).
4. Filtros opcionales:
   - Rango de fechas.
   - Tipo de reporte.
5. Respuesta:
   - `total`, `lista` (fecha, tipo).
   - Si no hay datos → contador en 0 y mensaje “Sin registros”.

---

### 6.8 HU8 – Activar/Pausar reportes

**Objetivo**  
Permitir pausar y reanudar reportes sin borrar la configuración.

**Flujo técnico**

1. **Webhook: `POST /subscriptions/pause` / `POST /subscriptions/resume`**.
2. Cargar suscripción por `email`.
3. Validar estado actual:
   - Si ya está en el estado solicitado → 400 con mensaje “ya se encuentra ACTIVA/PAUSADA”.
4. Actualizar `estado`.
5. Si se reanuda:
   - Recalcular `next_run`.
6. Registrar en `subscription_events` (PAUSA/REANUDAR).
7. Efectos:
   - Estado PAUSADA → no se ejecutan reportes programados.
   - On-demand sigue permitido.

---

### 6.9 HU9 – Mensajes de error al usuario

**Objetivo**  
Informar errores de forma clara, sin exponer datos sensibles, e indicando reintentos cuando corresponda.

**Flujo técnico**

- Capa de formateo de errores:
  - Traducir códigos técnicos a mensajes amigables:
    - 500: “Tuvimos un problema. Reintentaremos a las HH:MM.”
    - Timeout en fuente: “Tiempo de espera agotado en la fuente X. Reintentaremos a las HH:MM.”
    - 429 en fuente: “Límite alcanzado en la fuente X. Reintento a las HH:MM.”
  - Si hay fallas parciales:
    - Mostrar resultados disponibles + aviso “Fuentes con error: X, Y”.
  - Nunca incluir:
    - Tokens, claves, IDs internos, URLs con credenciales.

---

### 6.10 HU10 – Marcado de ofertas (Postulado / Descartado)

**Objetivo**  
Permitir que la usuaria gestione su proceso marcando ofertas como `POSTULADO` o `DESCARTADO`.

**Flujo técnico**

1. **Webhook/API: `PATCH /jobs/:id/user_state`**.
2. Validar:
   - Que `job_id` exista.
   - Que pertenece al alcance del usuario.
   - Que `estado_usuario` sea uno de {POSTULADO, DESCARTADO}.
3. Upsert en `job_user_actions`:
   - Si no existe → crear nuevo estado.
   - Si existe → actualizar estado y `updated_at`.
4. Devolver estado actualizado.

---

### 6.11 HU11 – Alerta de errores (Admin)

**Objetivo**  
Enviar reportes automáticos de errores a la administración. 

**Flujo técnico**

1. En cualquier flujo donde ocurra un error:
   - Capturar `fuente`, `mensaje` (sanitizado) y `momento`.
2. Guardar log técnico.
3. Ejecutar sub-flujo de notificación:
   - Enviar correo al admin con:
     - Fuente.
     - Mensaje resumido.
     - Momento del error.
4. Anti-spam:
   - Agrupar errores repetidos.
   - Aplicar umbral (ej. notificar solo si hay ≥3 errores en X minutos).
5. Mantener histórico de errores (ej. 90 días).

---

### 6.12 HU12 – Estado de suscripción (Admin)

**Objetivo**  
Permitir que administración visualice la cantidad de usuarios y sus estados de suscripción. 

**Flujo técnico**

1. **Webhook/API: `GET /admin/subscriptions`** con filtros opcionales (`estado`, `page`).
2. Consultar `subscriptions`:
   - Totales:
     - `total_usuarios`.
     - `total_activas`.
     - `total_pausadas`.
   - Listado:
     - email/ID.
     - estado actual.
3. Filtros:
   - Por estado (ACTIVA/PAUSADA).
4. Control de acceso:
   - Nodo de validación (ej. token, IP permitida, etc.) para asegurar sólo admins.

---

### 6.13 HU13 – Límite de reportes on-demand

**Objetivo**  
Definir y aplicar límite mensual de reportes on-demand. 

**Flujo técnico**

1. **Webhook: `POST /admin/limits`**:
   - Definir límite por defecto (ej. 5/mes).
   - Definir límite por usuario (override).
2. Al ejecutar `POST /reports/now`:
   - Consultar `admin_limits` para:
     - Límite por usuario si existe.
     - Límite por defecto en caso contrario.
   - Consultar consumo mensual actual (conteo en `runs` tipo `ON_DEMAND` del mes).
   - Si consumo ≥ límite → `429` con mensaje claro.
3. Reinicio mensual:
   - Job programado que resetea contadores o se basa en consulta por rango de fechas mes actual.

---

## 7. Requisitos Técnicos

- Instancia de **n8n** (Cloud o self-hosted).
- Acceso a **Google Sheets** o base de datos SQL.
- Cuenta SMTP (Gmail, SendGrid u otra).
- Node.js (para despliegue de n8n self-hosted, si aplica).
- Credenciales y tokens **almacenados en n8n Credentials**, nunca en texto plano en flujos o repositorio. :contentReference[oaicite:9]{index=9}

---

## 8. Configuración y Puesta en Marcha

### 8.1 Clonado del repositorio

```bash
git clone <URL_DEL_REPO>
cd agente-practicas-informatica
