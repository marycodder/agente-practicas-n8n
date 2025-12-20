Sistema automatizado de búsqueda y notificación de prácticas profesionales.

## 🌐 URLs de Acceso

**Servidor de Producción: `10.40.5.21`**

- **Frontend:** http://10.40.5.21/frontend/index.html
- **n8n Dashboard:** http://10.40.5.21:5678
- **Panel Admin:** http://10.40.5.21/frontend/admin.html
- **Panel usuario:** http://10.40.5.21/frontend/panel.html

## 🚀 Despliegue Rápido

### Desde el servidor Ubuntu:

```bash
# 1. Conectarse al servidor
ssh alumno@10.40.5.21

# 2. Clonar/subir proyecto
cd ~/practica

# 3. Verificar sistema
chmod +x check-system.sh
./check-system.sh

# 4. Desplegar
chmod +x deploy.sh
./deploy.sh
```

## 📖 Documentación Completa

Ver [DEPLOY.md](DEPLOY.md) para:

- Guía paso a paso de despliegue
- Configuración de VPN para acceso remoto
- Solución de problemas
- Checklist del Review Sprint 3

## 🏗️ Arquitectura

```
┌─────────────────┐
│   Formulario    │  → http://10.40.5.21
│   (Nginx)       │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│      n8n        │  → http://10.40.5.21:5678
│   (Workflows)   │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Google Sheets  │
│   (Database)    │
└─────────────────┘
```

## 🛠️ Tecnologías

- **Frontend:** HTML5, CSS3, JavaScript
- **Backend:** n8n (Workflow Automation)
- **Base de Datos:** Google Sheets
- **Infraestructura:** Docker + Docker Compose
- **Web Server:** Nginx
- **Servidor:** Ubuntu 24.04

## 👥 Equipo - Grupo 14

Universidad Andrés Bello - Sprint 3

---

**Estado:** ✅ Listo para Review del Sprint 3
