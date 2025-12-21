/*********************************************************
 * ADMIN (admin.js) - SERVIDOR 10.40.5.21
 **********************************************************/

// ✅ URL DEL BACKEND (Producción)
const BASE_URL = "http://10.40.5.21:5678/webhook/admin-api";

// Variables de UI
const loginOverlay = document.getElementById("loginOverlay");
const adminContent = document.getElementById("adminContent");
const loginForm = document.getElementById("loginForm");
const CREDENTIALS = { user: "admin", pass: "admin123" };

// Verificar Sesión al cargar
if (sessionStorage.getItem("adminAuth") === "true") {
  showAdminPanel();
}

// Lógica de Login
if (loginForm) {
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const u = document.getElementById("adminUser").value;
    const p = document.getElementById("adminPass").value;
    if (u === CREDENTIALS.user && p === CREDENTIALS.pass) {
      sessionStorage.setItem("adminAuth", "true");
      showAdminPanel();
    } else {
      alert("Credenciales incorrectas");
    }
  });
}

function showAdminPanel() {
  if (loginOverlay) loginOverlay.style.display = "none";
  if (adminContent) adminContent.style.display = "block";
  cargarDatosAdmin();
}

document.getElementById("btnLogout").addEventListener("click", () => {
  sessionStorage.removeItem("adminAuth");
  window.location.reload();
});

// Pestañas
const btnTabUsers = document.getElementById("btnTabUsers");
const btnTabErrors = document.getElementById("btnTabErrors");
const tabUsers = document.getElementById("tabUsers");
const tabErrors = document.getElementById("tabErrors");

btnTabUsers.addEventListener("click", () => switchTab("users"));
btnTabErrors.addEventListener("click", () => switchTab("errors"));

function switchTab(tab) {
  if (tab === "users") {
    tabUsers.style.display = "block";
    tabErrors.style.display = "none";
    btnTabUsers.classList.add("active");
    btnTabErrors.classList.remove("active");
  } else {
    tabUsers.style.display = "none";
    tabErrors.style.display = "block";
    btnTabUsers.classList.remove("active");
    btnTabErrors.classList.add("active");
  }
}

// ---------------------------------------------------------
// FUNCIONES DE DATOS
// ---------------------------------------------------------

async function cargarDatosAdmin() {
  showToast("Conectando con n8n...", "info");

  // 1. Obtener Usuarios
  try {
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_users" }),
    });
    const rawData = await res.json();
    let users = [];
    // N8n puede devolver array directo o un objeto envuelto
    if (Array.isArray(rawData)) users = rawData;
    else if (rawData.data) users = rawData.data;

    renderUsers(users);
  } catch (e) {
    console.error(e);
    showToast("Error cargando usuarios", "error");
  }

  // 2. Obtener Logs
  try {
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_logs" }),
    });
    const rawLogs = await res.json();
    let logs = [];
    if (Array.isArray(rawLogs)) logs = rawLogs;
    else if (rawLogs.data) logs = rawLogs.data;

    renderLogs(logs);
  } catch (e) {
    console.error(e);
    // No mostramos toast de error en logs para no saturar
  }
}

function renderUsers(users) {
  const tbody = document.getElementById("usersBody");
  tbody.innerHTML = "";
  if (!users || users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 2rem;">No hay datos disponibles</td></tr>`;
    return;
  }

  users.forEach((u) => {
    if (!u) return;
    // Normalizamos el estado (puede venir como 'Activa', 'ACTIVA', 'activa')
    const estadoRaw = u.estado || u.Estado || "Inactivo";
    const isActive = estadoRaw.toString().toUpperCase() === "ACTIVA";
    const nextState = isActive ? "PAUSADA" : "ACTIVA";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${u.Email || u.email || "-"}</td>
      <td><strong>${u.Nombre || ""} ${u.Apellido || ""}</strong></td>
      <td>${u["Región"] || u.Region || "-"}</td>
      <td>${u.Frecuencia || "-"}</td>
      <td>
        <span class="badge ${isActive ? "badge-success" : "badge-warning"}">
          ${estadoRaw}
        </span>
      </td>
      <td style="text-align: right;">
        <button class="btn-action ${isActive ? "btn-danger" : "btn-success"}" 
                onclick="window.cambiarEstado('${u.Email}', '${nextState}', this)">
          <i class="ph-bold ${isActive ? "ph-pause" : "ph-play"}"></i> 
          ${isActive ? "Pausar" : "Activar"}
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderLogs(logs) {
  const tbody = document.getElementById("errorsBody");
  tbody.innerHTML = "";
  if (!logs || logs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Sin errores recientes ✨</td></tr>`;
    return;
  }

  // Mostrar solo los últimos 50
  logs.slice(-50).reverse().forEach((log) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="font-size: 0.85rem; white-space: nowrap;">${log.timestamp || "-"}</td>
      <td>${log.workflow || "General"}</td>
      <td><span class="badge badge-info">${log.fuente || "n8n"}</span></td>
      <td style="color: #d32f2f; font-weight: 500;">${log.mensaje || "Error desconocido"}</td>
      <td><code>${log.nodo || "-"}</code></td>
    `;
    tbody.appendChild(tr);
  });
}

// Función global para ser llamada desde el HTML
window.cambiarEstado = async (email, nuevoEstado, btnElement) => {
  const emailLimpio = email.trim();
  if (!confirm(`¿Estás seguro de cambiar el estado de ${emailLimpio} a "${nuevoEstado}"?`)) return;

  const originalText = btnElement.innerHTML;
  btnElement.disabled = true;
  btnElement.innerHTML = `<i class="ph ph-spinner ph-spin"></i> ...`;

  try {
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update_status",
        email: emailLimpio,
        nuevo_estado: nuevoEstado, // Esto coincide con tu JSON de n8n
      }),
    });
    const data = await res.json();

    if (data.status === "ok" || res.ok) {
      showToast(`✅ Usuario actualizado a ${nuevoEstado}`, "success");
      // Esperamos un poco y recargamos la tabla para ver el cambio
      setTimeout(() => cargarDatosAdmin(), 500);
    } else {
      showToast("⚠️ No se pudo actualizar. Revisa el servidor.", "error");
      btnElement.disabled = false;
      btnElement.innerHTML = originalText;
    }
  } catch (error) {
    console.error(error);
    showToast("❌ Error de conexión con n8n", "error");
    btnElement.disabled = false;
    btnElement.innerHTML = originalText;
  }
};

function showToast(msg, type) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const div = document.createElement("div");
  div.className = "toast";

  let icon = "ph-info";
  let colorVar = "--primary";

  if (type === "error") { icon = "ph-warning-circle"; colorVar = "--danger"; }
  else if (type === "success") { icon = "ph-check-circle"; colorVar = "--success"; }

  div.style.borderLeftColor = `var(${colorVar})`;

  div.innerHTML = `
    <i class="ph-fill ${icon}" style="color: var(${colorVar}); font-size: 1.5rem;"></i>
    <span style="font-size: 0.95rem; font-weight: 500;">${msg}</span>
  `;

  container.appendChild(div);

  // Auto-eliminar después de 3 segundos
  setTimeout(() => {
    div.style.opacity = "0";
    div.style.transform = "translateX(100%)";
    setTimeout(() => div.remove(), 300);
  }, 3000);
}