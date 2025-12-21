# Sistema automatizado de búsqueda y notificación de prácticas profesionales

## 🌐 Acceso a la Aplicación

> **Nota:** Debes estar conectado a la VPN institucional para acceder a las siguientes vistas.

### Frontend (Usuarios y Administradores)

- **Formulario de Registro (Página Principal):** [http://10.40.5.21:8080/index.html](http://10.40.5.21:8080/index.html)
- **Panel de Usuario (Historial de ofertas):** [http://10.40.5.21:8080/panel.html](http://10.40.5.21:8080/panel.html)
- **Panel de Administración:** [http://10.40.5.21:8080/admin.html](http://10.40.5.21:8080/admin.html)

### Backend (Desarrollo y Automatización)

- **Editor de flujos n8n:** [http://10.40.5.21:5678](http://10.40.5.21:5678)

---

## 🚀 Despliegue Rápido

1. **Conéctate al servidor:**
   ```bash
   ssh alumno@10.40.5.21
   ```
2. **Clona o sube el proyecto:**
   ```bash
   cd ~/practica
   ```
3. **Verifica el sistema:**
   ```bash
   chmod +x check-system.sh
   ./check-system.sh
   ```
4. **Despliega la aplicación:**
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

---

## 🏗️ Arquitectura del Sistema

```
┌──────────────────────────────┐
│      Frontend (Nginx)        │
│  Registro, Panel Usuario,    │
│  Panel Admin                 │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│         n8n (Workflows)      │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│     Google Sheets (DB)       │
└──────────────────────────────┘
```

---

## 🛠️ Tecnologías Utilizadas

- **Frontend:** HTML5, CSS3, JavaScript
- **Backend:** n8n (Automatización de flujos)
- **Base de Datos:** Google Sheets
- **Infraestructura:** Docker + Docker Compose
- **Servidor Web:** Nginx
- **Servidor:** Ubuntu 24.04

---

## 📖 Documentación

Consulta [DEPLOY.md](DEPLOY.md) para:

- Guía paso a paso de despliegue
- Configuración de VPN para acceso remoto
- Solución de problemas
- Checklist del Review Sprint 3

---

## 👥 Equipo

Grupo 14 — Universidad Andrés Bello  
**Estado:** ✅ Listo para Review del Sprint 3

---
