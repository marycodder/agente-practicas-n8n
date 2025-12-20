/*********************************************************
 * ADMIN (admin.js) - SERVIDOR 10.40.5.21
 **********************************************************/

// ✅ URL APUNTANDO AL SERVIDOR DE LA U
const BASE_URL = "http://10.40.5.21:5678/webhook/admin-api";

const loginOverlay = document.getElementById("loginOverlay");
const adminContent = document.getElementById("adminContent");
const loginForm = document.getElementById("loginForm");
const CREDENTIALS = { user: "admin", pass: "admin123" };

if (sessionStorage.getItem("adminAuth") === "true") {
  showAdminPanel();
}

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

async function cargarDatosAdmin() {
  showToast("Conectando con n8n...", "info");

  // Usuarios
  try {
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_users" }),
    });
    const rawData = await res.json();
    let users = [];
    if (Array.isArray(rawData)) users = rawData;
    else if (rawData.data) users = rawData.data;

    renderUsers(users);
  } catch (e) {
    console.error(e);
    showToast("Error cargando usuarios", "error");
  }

  // Logs
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
  }
}

function renderUsers(users) {
  const tbody = document.getElementById("usersBody");
  tbody.innerHTML = "";
  if (!users || users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No hay datos</td></tr>`;
    return;
  }

  users.forEach((u) => {
    if (!u) return;
    const estadoRaw = u.estado || u.Estado || "Inactivo";
    const isActive = estadoRaw.toString().toUpperCase() === "ACTIVA";
    const nextState = isActive ? "PAUSADA" : "ACTIVA";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${u.Email || u.email || "-"}</td>
      <td>${u.Nombre || ""} ${u.Apellido || ""}</td>
      <td>${u["Región"] || u.Region || "-"}</td>
      <td>${u.Frecuencia || "-"}</td>
      <td><span class="badge ${
        isActive ? "badge-success" : "badge-warning"
      }">${estadoRaw}</span></td>
      <td style="text-align: right;">
        <button class="btn-action ${
          isActive ? "btn-danger" : "btn-success"
        }" onclick="window.cambiarEstado('${u.Email}', '${nextState}', this)">
          <i class="ph ${isActive ? "ph-pause" : "ph-play"}"></i> ${
      isActive ? "Pausar" : "Activar"
    }
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderLogs(logs) {
  const tbody = document.getElementById("errorsBody");
  tbody.innerHTML = "";
  if (!logs || logs.length === 0) return;

  logs
    .slice(-50)
    .reverse()
    .forEach((log) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
      <td style="font-size: 0.85rem;">${log.timestamp || "-"}</td>
      <td>${log.workflow || "General"}</td>
      <td><span class="badge badge-info">${log.fuente || "n8n"}</span></td>
      <td style="color: #d32f2f;">${log.mensaje || "Error"}</td>
      <td><code>${log.nodo || "-"}</code></td>
    `;
      tbody.appendChild(tr);
    });
}

window.cambiarEstado = async (email, nuevoEstado, btnElement) => {
  const emailLimpio = email.trim();
  if (!confirm(`¿Cambiar estado de ${emailLimpio} a ${nuevoEstado}?`)) return;

  btnElement.disabled = true;
  btnElement.innerHTML = "...";

  try {
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update_status",
        email: emailLimpio,
        nuevo_estado: nuevoEstado,
      }),
    });
    const data = await res.json();

    if (data.status === "ok" || data.msg) {
      showToast("✅ Estado actualizado", "success");
      cargarDatosAdmin(); // Recargamos la tabla
    } else {
      showToast("Error al actualizar", "error");
      btnElement.disabled = false;
    }
  } catch (error) {
    showToast("Error de conexión", "error");
    btnElement.disabled = false;
  }
};

function showToast(msg, type) {
  const container = document.getElementById("toast-container");
  const div = document.createElement("div");
  div.style.background = type === "error" ? "#ef4444" : "#10b981";
  if (type === "info") div.style.background = "#3b82f6";
  div.style.color = "white";
  div.style.padding = "10px 20px";
  div.style.marginBottom = "10px";
  div.style.borderRadius = "5px";
  div.innerText = msg;
  container.appendChild(div);
  setTimeout(() => div.remove(), 3000);
}
