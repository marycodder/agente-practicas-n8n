/*********************************************************
 * PANEL DE USUARIO (panel.js) - SERVIDOR 10.40.5.21
 **********************************************************/

// ✅ URL APUNTANDO AL SERVIDOR DE LA U
const API_URL = "http://10.40.5.21:5678/webhook/panel/usuario";

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const email = params.get("email");

  if (!email) {
    document.getElementById("panelSubtitulo").innerText =
      "Error: Falta correo en la URL.";
    document.getElementById("panelTitulo").style.color = "#ef4444";
    return;
  }

  cargarDatosUsuario(email);
  setupListeners(email);
});

async function cargarDatosUsuario(email) {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email }),
    });

    const data = await res.json();

    if (data.status === "ok" && data.usuario) {
      renderCabecera(data.usuario);
      renderPreferencias(data.usuario);
      renderHistorial(data.ofertas);
      showToast("Datos cargados correctamente", "info");
    } else {
      document.getElementById("panelSubtitulo").innerText =
        data.msg || "Usuario no encontrado.";
      showToast("No se encontraron datos", "error");
    }
  } catch (error) {
    console.error(error);
    showToast("Error de conexión con el servidor (n8n)", "error");
  }
}

function renderCabecera(usuario) {
  document.getElementById("panelEmail").innerText = usuario.Email;
  document.getElementById(
    "panelSubtitulo"
  ).innerText = `Hola, ${usuario.Nombre}. Aquí tienes tu resumen.`;

  const btnPausar = document.getElementById("btnPausar");
  const estadoActual = (usuario.Estado || "ACTIVA").toUpperCase();

  if (estadoActual === "PAUSADA") {
    btnPausar.innerHTML =
      '<i class="ph-bold ph-play-circle"></i> Reanudar Servicio';
    btnPausar.className = "btn-success";
  } else {
    btnPausar.innerHTML =
      '<i class="ph-bold ph-pause-circle"></i> Pausar Servicio';
    btnPausar.className = "btn-warning";
  }
}

function renderPreferencias(usuario) {
  setSelectValue("frecuencia", usuario.Frecuencia);
  setSelectValue("modalidad", usuario.Modalidad);
  setSelectValue("region", usuario.Region);
}

function setSelectValue(id, valor) {
  const select = document.getElementById(id);
  if (select && valor) {
    select.value = valor;
    if (select.selectedIndex === -1) {
      for (let i = 0; i < select.options.length; i++) {
        if (
          select.options[i].value.includes(valor) ||
          valor.includes(select.options[i].value)
        ) {
          select.selectedIndex = i;
          break;
        }
      }
    }
  }
}

function renderHistorial(ofertas) {
  const tbody = document.getElementById("historialBody");
  const emptyDiv = document.getElementById("historialEmpty");
  tbody.innerHTML = "";

  if (!ofertas || ofertas.length === 0) {
    emptyDiv.hidden = false;
    return;
  }
  emptyDiv.hidden = true;

  ofertas.forEach((oferta, index) => {
    const row = document.createElement("tr");

    let accionHtml = "";
    if (oferta.link) {
      accionHtml = `<a href="${oferta.link}" target="_blank" class="btn-link-oferta" style="text-decoration:none; color: #6366f1; font-weight: 600;">Ver Oferta <i class="ph-bold ph-arrow-square-out"></i></a>`;
    } else {
      accionHtml = `<span style="color: #999; font-size: 0.85rem;">Sin enlace</span>`;
    }

    let badgeClass = "badge-gray";
    const estado = (oferta.estado_usuario || "Pendiente").toLowerCase();
    if (estado === "postulado") badgeClass = "badge-success";
    if (estado === "descartado") badgeClass = "badge-danger";
    if (estado === "pendiente") badgeClass = "badge-warning";

    row.innerHTML = `
      <td style="text-align: center"><input type="checkbox" class="offer-check" data-index="${index}"></td>
      <td>${oferta.fecha || "-"}</td>
      <td><span class="badge badge-info">${oferta.fuente || "Web"}</span></td>
      <td><strong>${oferta.empresa || "Empresa Confidencial"
      }</strong><br><span style="font-size: 0.85rem; color: #666;">${oferta.titulo || "Puesto no especificado"
      }</span></td>
      <td>${oferta.ubicacion || "Chile"}</td>
      <td>${oferta.modalidad || "-"}</td>
      <td><span class="badge ${badgeClass}">${oferta.estado_usuario || "Pendiente"
      }</span></td>
      <td style="text-align: right;">${accionHtml}</td>
    `;
    tbody.appendChild(row);
  });
}

function setupListeners(email) {
  document.getElementById("prefsForm").addEventListener("submit", (e) => {
    e.preventDefault();
    alert("Función de guardar pendiente de implementar webhook update_prefs.");
  });



  const checkAll = document.getElementById("checkAll");
  checkAll.addEventListener("change", (e) => {
    document
      .querySelectorAll(".offer-check")
      .forEach((c) => (c.checked = e.target.checked));
    updateActionButtons();
  });

  document.getElementById("historialBody").addEventListener("change", (e) => {
    if (e.target.classList.contains("offer-check")) updateActionButtons();
  });
}

function updateActionButtons() {
  const selected = document.querySelectorAll(".offer-check:checked").length;
  document.getElementById("btnPostular").disabled = selected === 0;
  document.getElementById("btnDescartar").disabled = selected === 0;
  document.getElementById("countSeleccion").innerText = selected;
}

function showToast(msg, type) {
  const container = document.getElementById("toast-container");
  const div = document.createElement("div");
  div.className = "toast";

  // Icono según tipo
  let icon = "ph-info";
  let colorVar = "--primary";

  if (type === "error") { icon = "ph-warning-circle"; colorVar = "--danger"; }
  else if (type === "success") { icon = "ph-check-circle"; colorVar = "--success"; }

  div.style.borderLeftColor = `var(${colorVar})`;

  div.innerHTML = `
    <i class="ph-fill ${icon}" style="color: var(${colorVar}); font-size: 1.2rem;"></i>
    <span>${msg}</span>
  `;

  container.appendChild(div);
  setTimeout(() => {
    div.style.opacity = "0";
    div.style.transform = "translateX(100%)";
    setTimeout(() => div.remove(), 300); // Esperar animación
  }, 3000);
}

