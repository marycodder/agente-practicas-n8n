# 🧠 Agente Buscador de Prácticas Informáticas  
### Proyecto Técnico en n8n

---

## 📌 1. Descripción General

Este proyecto implementa un **agente automatizado** construido en **n8n** que busca, consolida y envía oportunidades de **prácticas profesionales en informática**, integrando múltiples plataformas en un solo flujo.

El sistema funciona **sin webhooks**.  
Toda la interacción de las usuarias ocurre mediante:

- **Google Forms** → escribe en  
- **Google Sheets**, que n8n lee continuamente mediante  
- **Schedule Trigger**, ejecutando:
  - Scraping  
  - Filtros  
  - Construcción del mensaje  
  - Envío de reportes  
  - Registro de métricas  

El agente además permite:

- Reportes programados  
- Reportes inmediatos (on-demand)  
- Pausar y reanudar suscripciones  
- Límite mensual de solicitudes  
- Métricas de uso  
- Historial completo de ofertas  

---

## 📌 2. Arquitectura General

### 🔹 Componentes

| Componente | Función |
|-----------|---------|
| **Google Forms** | Entrada de datos de usuarias: registro, edición, pausa, reanudar, petición de reporte inmediato. |
| **Google Sheets** | Base de datos principal: Suscripciones, Solicitudes, Historial, Acciones y Límites. |
| **n8n** | Motor principal del procesamiento. No usa webhooks. Ejecuta todo mediante triggers. |
| **Schedule Trigger** | Ejecuta los flujos cada X minutos o diariamente. |
| **Manual Trigger** | Para pruebas internas. |
| **SMTP / Gmail Node** | Envío de correos con el reporte final. |
| **HTTP Request + Code** | Scraping y parseo de las plataformas de empleo. |

---

## 📌 3. Flujo Global del Sistema

### 3.1 Registro y gestión de preferencias (HU1 y HU2)

1. Google Forms recibe:
   - Email  
   - Frecuencia  
   - Modalidad  
   - Región  
2. Google Forms escribe en la hoja `Suscripciones`.  
3. El flujo en n8n (Schedule Trigger):
   - Detecta nuevas filas o modificaciones  
   - Valida datos  
   - Actualiza preferencias  
   - Ajusta `next_run` según frecuencia  
   - Registra evento en la hoja `Eventos`  

---

### 3.2 Ejecución programada (HU5, HU6, HU7)

El **Schedule Trigger** corre cada 30–60 minutos:

1. Lee `Suscripciones`  
2. Filtra solo las ACTIVAS  
3. Evalúa si `now >= next_run`  
4. Si corresponde enviar:
   - Ejecuta scraping (Laborum, Indeed, Santander, etc.)
   - Normaliza y filtra resultados
   - Deduplica contra histórico
   - Construye HTML mediante nodo Code
   - Envía correo
   - Registra resultado en `Historial_Reportes`
   - Calcula nuevo `next_run`  

---

### 3.3 Reporte inmediato / On-Demand (HU4 + HU13)

1. Google Form escribe una fila del tipo:
  email: usuario@correo.cl
  accion: "reporte_inmediato"
2. El flujo (Schedule Trigger cada minuto):
- Busca solicitudes pendientes en `Solicitudes`
- Verifica límite mensual HU13
- Ejecuta pipeline HU5 → HU6
- Envía correo
- Registra uso en `Historial_Reportes`
- Limpia la fila para evitar repetición  

---

### 3.4 Pausar y reanudar suscripciones (HU8)

1. El formulario escribe en:
email | accion: PAUSAR / REANUDAR
2. El flujo:
- Actualiza `estado` en la hoja `Suscripciones`
- Registra el cambio en `Eventos`
- Si se reanuda, recalcula `next_run`  

---

### 3.5 Métricas e historial (HU7)

n8n mantiene:

- Cantidad total de reportes enviados  
- Reportes programados vs. on-demand  
- Historial completo con:
- fecha,  
- resultados encontrados,  
- estado de envío.  

Todo se almacena en `Historial_Reportes`.

---

## 📌 4. Modelo de Datos (Google Sheets)

### 📘 4.1 `Suscripciones`
| Campo | Descripción |
|-------|-------------|
| email | PK |
| frecuencia | diaria / semanal |
| modalidad | remoto / híbrido / presencial |
| region | Texto libre |
| estado | ACTIVA / PAUSADA |
| next_run | Fecha-hora del próximo envío |
| created_at | Fecha registro |
| updated_at | Última actualización |

---

### 📘 4.2 `Historial_Reportes`
| Campo | Descripción |
|-------|-------------|
| email | usuaria |
| tipo | programado / inmediato |
| resultados | cantidad |
| fecha_envio | timestamp |
| estado | OK / ERROR |
| error_msg | opcional |

---

### 📘 4.3 `Solicitudes`
Registro de peticiones manuales.

| Campo | Ejemplo |
|-------|---------|
| email | usuario@correo.cl |
| accion | reporte_inmediato |

---

### 📘 4.4 `Acciones`
Pausar y reanudar.

| email | accion |
|-------|--------|
| usuaria | PAUSAR / REANUDAR |

---

### 📘 4.5 `Límites`
Límites de solicitudes on-demand.

| Campo | Descripción |
|--------|-------------|
| default_monthly_limit | Límite por defecto |
| overrides | Límites individuales opcionales |

---

## 📌 5. HU Técnicas y Flujos

### 5.1 HU1 — Registro de preferencias
- Fuente: Google Form  
- n8n valida, normaliza y actualiza hoja  
- Calcula `next_run`  

### 5.2 HU2 — Edición de preferencias
- Mismo flujo, detecta cambios  
- Recalcula `next_run`  
- Registra evento  

### 5.3 HU3 — Visualización (Histórico)
- No hay endpoint  
- Toda la información está en Google Sheets  

### 5.4 HU4 — Reporte inmediato
- Detecta solicitud en hoja  
- Verifica límites HU13  
- Ejecuta pipeline HU5→HU6  
- Limpia la fila  

### 5.5 HU5 — Scraping
Flujo modular:

1. Laborum (HTTP Request + parseo HTML)  
2. Indeed (HTTP Request + parseo JSON/HTML)  
3. Santander (HTTP Request + parseo JSON)  
4. Normalización general  
5. Deduplicación por *hash(titulo + empresa + link)*  

### 5.6 HU6 — Generación de reporte
- Nodo Code construye HTML  
- Se envía con Gmail/SMTP  
- Se registra envío  

### 5.7 HU7 — Trazabilidad
- Cada envío queda en `Historial_Reportes`  
- Contabilidad mensual y total  

### 5.8 HU8 — Pausar/Reanudar
- Leer hoja `Acciones`  
- Cambiar estado en `Suscripciones`  
- Registrar evento  

### 5.9 HU9 — Manejo de errores
- No expone errores técnicos a la usuaria  
- Todos se almacenan internamente  

### 5.10 HU10 — Marcar ofertas
> Esta funcionalidad depende del diseño final.  
**Si no se implementó, dejar como pendiente.**

### 5.11 HU11 — Alertas admin
- Correos automáticos si un portal falla varias veces seguidas  
- Registro de errores para diagnóstico  

### 5.12 HU12 — Estado de suscripciones
- Vista interna a partir de Google Sheets  

### 5.13 HU13 — Límite de solicitudes
- Lectura de hoja `Límites`  
- Cálculo mensual dinámico  
- Bloqueo con mensaje si excede límite  

---

## 📌 6. Flujos de n8n incluidos en este repositorio

| Archivo | Descripción |
|---------|-------------|
| `/n8n/flujo_principal.json` | Pipelines programados completa HU1→HU7 |
| `/n8n/scraping_laborum.json` | Scraping dedicado Laborum |
| `/n8n/scraping_indeed.json` | Scraping dedicado Indeed |
| `/n8n/scraping_santander.json` | Scraping dedicado Santander |
| `/n8n/reporte_html_builder.json` | Constructor de correo HTML (HU6) |
| `/n8n/historial_usage.json` | Flujo de métricas (HU7) |

---

## 📌 7. Requisitos Técnicos

- n8n (cloud o self-hosted)
- Google API Credentials  
- Cuenta SMTP o Gmail App Password  
- Permisos en Sheets  
- Nodos:
- Code / Function
- HTTP Request
- Merge / IF
- Schedule Trigger
- Gmail / Email  
- Google Sheets Nodes  

---

## 📌 8. Buenas Prácticas

- Mantener los flujos modulares en n8n.  
- No exponer credenciales en nodos “Code”.  
- Limpiar ofertas duplicadas.  
- Usar User-Agent rotativo para scraping.  
- Registrar errores para diagnóstico.  

---

## 📌 9. Roadmap (Mejoras Futuras)

- App web para consultar historial  
- Notificaciones por Telegram  
- Recomendador inteligente según historial  
- Dashboard de métricas  
- Integración con más portales (Computrabajo, GetOnBoard, etc.)

---

## 📌 10. Licencia

Proyecto académico.  
La licencia puede definirse según preferencia del equipo.

---

## 👩‍💻 Autores
- Equipo completo del proyecto de práctica profesional  
- Documentación técnica redactada por Laura + soporte IA  

---

