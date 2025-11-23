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
