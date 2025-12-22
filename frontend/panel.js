/*********************************************************
 * PANEL DE USUARIO (panel.js) - SERVIDOR 10.40.5.21
 **********************************************************/

// ✅ URLS DEL BACKEND (n8n)
const API_URL = "http://10.40.5.21:5678/webhook/panel/usuario";
const UPDATE_URL = "http://10.40.5.21:5678/webhook/panel/usuario/update";
const REPORTE_URL = "http://10.40.5.21:5678/webhook/panel/reporte";
const ESTADO_URL = "http://10.40.5.21:5678/webhook/panel/estado";
const ACCION_URL = "http://10.40.5.21:5678/webhook/panel/ofertas/postular";

// ✅ VARIABLES GLOBALES
let todasLasOfertas = [];
let limitesGlobales = { disponibles: 0 };

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const email = params.get("email");

  if (!email) {
    document.getElementById("panelSubtitulo").innerText = "Error: Falta correo en la URL.";
    document.getElementById("panelTitulo").style.color = "#ef4444";
    return;
  }

  cargarDatosUsuario(email);
  setupListeners(email);
  setupFilterListeners();
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

      // =========================================================
      // 🛑 LÓGICA DE INTERCEPCIÓN (Reporte Inicial Automático)
      // =========================================================
      // Si n8n nos dice "requiere_reporte_inicial: true" y el usuario tiene cupos:
      if (data.requiere_reporte_inicial === true && data.limites && data.limites.disponibles > 0) {

        console.log("⚡ Usuario sin historial detectado. Generando reporte primero...");

        // 1. Mostrar estado de carga en la UI (No renderizamos la tabla vacía aún)
        document.getElementById("panelEmail").innerText = data.usuario.Email;
        document.getElementById("panelSubtitulo").innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i> Generando tu primer reporte de ofertas...';
        showToast("👋 ¡Bienvenido! Buscando ofertas para ti...", "info");

        // Guardamos límites en la variable global por si acaso
        limitesGlobales = data.limites;

        // 2. Ejecutar reporte y DETENER la carga normal
        // La función solicitarReporte se encargará de recargar la página al finalizar.
        await solicitarReporte(email, true);
        return; // <--- IMPORTANTE: Detenemos aquí. 
      }
      // =========================================================

      // Si NO requiere reporte inicial (flujo normal):
      renderCabecera(data.usuario);
      renderPreferencias(data.usuario);

      if (data.limites) {
        limitesGlobales = data.limites;
        renderLimites(data.limites);
      } else {
        renderLimites({ disponibles: "..." });
      }

      todasLasOfertas = data.ofertas || [];
      filtrarYOrdenar();
      showToast("Datos cargados correctamente", "info");

    } else {
      document.getElementById("panelSubtitulo").innerText = data.msg || "Usuario no encontrado.";
      showToast("No se encontraron datos", "error");
    }
  } catch (error) {
    console.error(error);
    showToast("Error de conexión con el servidor", "error");
  }
}

// =========================================================
// ⚡ FUNCIÓN UNIFICADA DE REPORTE (Manual y Automático)
// =========================================================
async function solicitarReporte(email, esAutomatico = false) {

  // 🛑 VALIDACIÓN DE LÍMITES
  if (limitesGlobales.disponibles <= 0) {
    showToast("⛔ Límite alcanzado: No tienes reportes disponibles.", "error");
    return;
  }

  const btnReporte = document.getElementById("btnReporteInmediato");
  let originalText = "";

  // UI: Bloquear botón visualmente
  if (btnReporte) {
    originalText = btnReporte.innerHTML;
    btnReporte.disabled = true;
    btnReporte.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i> Procesando...';
  }

  try {
    const res = await fetch(REPORTE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email }),
    });

    if (res.ok) {
      if (esAutomatico) {
        showToast("✅ Primer reporte generado. Cargando ofertas...", "success");
      } else {
        showToast("🚀 Reporte generado exitosamente.", "success");
      }

      // RECARGA DE PÁGINA
      // Esto hará que al volver a cargar, n8n encuentre las ofertas nuevas
      // y ya no pida el reporte inicial (rompiendo el bucle).
      setTimeout(() => {
        if (esAutomatico) showToast("📥 Actualizando tabla...", "info");
        location.reload();
      }, 4000);

    } else {
      showToast("⚠️ Hubo un problema al generar el reporte", "error");
      // Si falla en automático, recargamos igual para que el usuario no quede atrapado en el spinner
      if (esAutomatico) setTimeout(() => location.reload(), 4000);
    }

  } catch (e) {
    console.error(e);
    showToast("❌ Error de conexión al solicitar reporte", "error");
    if (esAutomatico) setTimeout(() => location.reload(), 4000);
  } finally {
    // Restaurar botón (solo si no se recarga antes)
    if (btnReporte) {
      setTimeout(() => {
        btnReporte.disabled = false;
        btnReporte.innerHTML = originalText || '<i class="ph-bold ph-paper-plane-right"></i> Solicitar Ahora';
      }, 2000);
    }
  }
}

// =========================================================
// RENDERIZAR LÍMITES
// =========================================================
function renderLimites(limites) {
  const badge = document.getElementById("badgeLimites");
  const btn = document.getElementById("btnReporteInmediato");

  if (!badge) return;

  const disp = limites.disponibles;
  badge.innerText = `${disp} Disponibles`;

  if (disp > 0 || disp === "...") {
    badge.className = "badge badge-success";
    if (btn) {
      btn.disabled = false;
      btn.style.opacity = "1";
      btn.style.cursor = "pointer";
      btn.style.backgroundColor = "#6366f1";
    }
  } else {
    badge.className = "badge badge-danger";
    badge.innerText = "0 Disponibles (Agotado)";
    if (btn) {
      btn.disabled = true;
      btn.title = "Has alcanzado tu límite mensual.";
      btn.style.backgroundColor = "#94a3b8";
      btn.style.cursor = "not-allowed";
    }
  }
}

// =========================================================
// LÓGICA DE FILTRADO
// =========================================================

function setupFilterListeners() {
  const inputs = [
    document.getElementById("searchInput"),
    document.getElementById("filterFuente"),
    document.getElementById("filterModalidad"),
    document.getElementById("filterEstado"),
    document.getElementById("filterFechaInicio"),
    document.getElementById("filterFechaFin"),
    document.getElementById("sortOrder")
  ];

  inputs.forEach(el => {
    if (el) {
      el.addEventListener("input", filtrarYOrdenar);
      el.addEventListener("change", filtrarYOrdenar);
    }
  });

  const btnClear = document.getElementById("btnClearSearch");
  if (btnClear) btnClear.addEventListener("click", () => {
    const input = document.getElementById("searchInput");
    if (input) input.value = "";
    filtrarYOrdenar();
  });

  const btnReset = document.getElementById("btnResetFilters");
  if (btnReset) btnReset.addEventListener("click", () => {
    const ids = ["searchInput", "filterFuente", "filterModalidad", "filterEstado", "filterFechaInicio", "filterFechaFin"];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    const sort = document.getElementById("sortOrder");
    if (sort) sort.value = "desc";
    filtrarYOrdenar();
  });
}

function filtrarYOrdenar() {
  const textoBusqueda = document.getElementById("searchInput")?.value.toLowerCase().trim() || "";
  const fuenteVal = document.getElementById("filterFuente")?.value || "";
  const modalidadVal = document.getElementById("filterModalidad")?.value || "";
  const estadoVal = document.getElementById("filterEstado")?.value || "";
  const fechaInicioVal = document.getElementById("filterFechaInicio")?.value || "";
  const fechaFinVal = document.getElementById("filterFechaFin")?.value || "";
  const ordenVal = document.getElementById("sortOrder")?.value || "desc";

  let resultados = todasLasOfertas.filter(oferta => {
    const titulo = (oferta.titulo || "").toLowerCase();
    const coincideTexto = titulo.includes(textoBusqueda);
    const coincideFuente = fuenteVal === "" || (oferta.fuente || "").toLowerCase().includes(fuenteVal.toLowerCase());
    const coincideModalidad = modalidadVal === "" || (oferta.modalidad || "").toLowerCase().includes(modalidadVal.toLowerCase());
    const estadoOferta = (oferta.estado_usuario || "pendiente").toLowerCase();
    const coincideEstado = estadoVal === "" || estadoOferta === estadoVal.toLowerCase();

    let coincideFecha = true;
    if (oferta.fecha) {
      const fechaOferta = oferta.fecha.substring(0, 10);
      if (fechaInicioVal && fechaOferta < fechaInicioVal) coincideFecha = false;
      if (fechaFinVal && fechaOferta > fechaFinVal) coincideFecha = false;
    }
    return coincideTexto && coincideFuente && coincideModalidad && coincideEstado && coincideFecha;
  });

  resultados.sort((a, b) => {
    const fechaA = new Date(a.fecha || 0);
    const fechaB = new Date(b.fecha || 0);
    return ordenVal === "asc" ? fechaA - fechaB : fechaB - fechaA;
  });

  renderHistorial(resultados);
}

// =========================================================
// RENDERIZADO CABECERA Y TABLA
// =========================================================

function renderCabecera(usuario) {
  document.getElementById("panelEmail").innerText = usuario.Email;
  document.getElementById("panelSubtitulo").innerText = `Hola, ${usuario.Nombre}. Aquí tienes tu resumen.`;
  actualizarBotonPausar(usuario.Estado);
}

function actualizarBotonPausar(estado) {
  const btnPausar = document.getElementById("btnPausar");
  if (!btnPausar) return;
  const estadoNormalizado = (estado || "ACTIVA").toUpperCase();

  if (estadoNormalizado === "PAUSADA") {
    btnPausar.innerHTML = '<i class="ph-bold ph-play-circle"></i> Reanudar Servicio';
    btnPausar.className = "btn-success";
    btnPausar.dataset.estadoActual = "PAUSADA";
  } else {
    btnPausar.innerHTML = '<i class="ph-bold ph-pause-circle"></i> Pausar Servicio';
    btnPausar.className = "btn-warning";
    btnPausar.dataset.estadoActual = "ACTIVA";
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
        if (select.options[i].value.includes(valor) || valor.includes(select.options[i].value)) {
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
    if (emptyDiv) emptyDiv.hidden = false;
    updateActionButtons();
    return;
  }
  if (emptyDiv) emptyDiv.hidden = true;

  ofertas.forEach((oferta) => {
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

    const identificador = JSON.stringify({
      link: oferta.link || "",
      empresa: oferta.empresa || "",
      titulo: oferta.titulo || ""
    });

    row.innerHTML = `
      <td style="text-align: center">
        <input type="checkbox" class="offer-check" value='${identificador}'>
      </td>
      <td>${oferta.fecha || "-"}</td>
      <td><span class="badge badge-info">${oferta.fuente || "Web"}</span></td>
      <td><strong>${oferta.empresa || "Empresa Confidencial"}</strong><br><span style="font-size: 0.85rem; color: #666;">${oferta.titulo || "Puesto no especificado"}</span></td>
      <td>${oferta.ubicacion || "Chile"}</td>
      <td>${oferta.modalidad || "-"}</td>
      <td><span class="badge ${badgeClass}">${oferta.estado_usuario || "Pendiente"}</span></td>
      <td style="text-align: right;">${accionHtml}</td>
    `;
    tbody.appendChild(row);
  });

  updateActionButtons();
}

// =========================================================
// LISTENERS Y ACCIONES
// =========================================================
function setupListeners(email) {

  const btnReporte = document.getElementById("btnReporteInmediato");
  if (btnReporte) {
    btnReporte.addEventListener("click", () => solicitarReporte(email, false));
  }

  const btnPostular = document.getElementById("btnPostular");
  const btnDescartar = document.getElementById("btnDescartar");
  if (btnPostular) btnPostular.addEventListener("click", () => procesarAccionMasiva(email, "Postulado"));
  if (btnDescartar) btnDescartar.addEventListener("click", () => procesarAccionMasiva(email, "Descartado"));

  const checkAll = document.getElementById("checkAll");
  if (checkAll) {
    checkAll.addEventListener("change", (e) => {
      document.querySelectorAll(".offer-check").forEach((c) => (c.checked = e.target.checked));
      updateActionButtons();
    });
  }
  const historialBody = document.getElementById("historialBody");
  if (historialBody) {
    historialBody.addEventListener("change", (e) => {
      if (e.target.classList.contains("offer-check")) updateActionButtons();
    });
  }

  const prefsForm = document.getElementById("prefsForm");
  if (prefsForm) {
    prefsForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = document.getElementById("savePrefsBtn");
      const originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i> Guardando...';

      const payload = {
        Email: email,
        Frecuencia: document.getElementById("frecuencia").value,
        Modalidad: document.getElementById("modalidad").value,
        Region: document.getElementById("region").value
      };

      try {
        const res = await fetch(UPDATE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.status === "ok") showToast("✅ Preferencias actualizadas", "success");
        else showToast("⚠️ Hubo un problema", "error");
      } catch (error) { showToast("❌ Error de conexión", "error"); }
      finally { btn.disabled = false; btn.innerHTML = originalText; }
    });
  }

  const btnPausar = document.getElementById("btnPausar");
  if (btnPausar) {
    btnPausar.addEventListener("click", async () => {
      const estadoActual = btnPausar.dataset.estadoActual;
      const accion = estadoActual === "ACTIVA" ? "PAUSAR" : "REANUDAR";
      if (!confirm(`¿Deseas ${accion} el servicio?`)) return;

      btnPausar.disabled = true;
      btnPausar.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i> Procesando...';
      try {
        const res = await fetch(ESTADO_URL, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email, accion: accion }),
        });
        if (res.ok) {
          showToast(`✅ Servicio ${accion === "PAUSAR" ? "pausado" : "reanudado"}`, "success");
          actualizarBotonPausar(accion === "PAUSAR" ? "PAUSADA" : "ACTIVA");
        }
      } catch (e) { showToast("❌ Error", "error"); }
      finally { btnPausar.disabled = false; actualizarBotonPausar(btnPausar.dataset.estadoActual); }
    });
  }
}

async function procesarAccionMasiva(email, nuevoEstado) {
  const checkboxes = document.querySelectorAll(".offer-check:checked");
  if (checkboxes.length === 0) return;

  if (!confirm(`¿Vas a marcar ${checkboxes.length} ofertas como "${nuevoEstado}"?`)) return;

  const ofertasSeleccionadas = Array.from(checkboxes).map(cb => JSON.parse(cb.value));
  const btnId = nuevoEstado === "Postulado" ? "btnPostular" : "btnDescartar";
  const btn = document.getElementById(btnId);
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<i class="ph-bold ph-spinner ph-spin"></i> Enviando...`;

  try {
    const payload = { email: email, estado: nuevoEstado, ofertas: ofertasSeleccionadas };
    const res = await fetch(ACCION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (data.status === "ok" || res.ok) {
      showToast(`✅ ${checkboxes.length} ofertas actualizadas`, "success");
      todasLasOfertas.forEach(oferta => {
        ofertasSeleccionadas.forEach(sel => {
          if ((oferta.link && oferta.link === sel.link) ||
            (oferta.titulo === sel.titulo && oferta.empresa === sel.empresa)) {
            oferta.estado_usuario = nuevoEstado;
          }
        });
      });
      filtrarYOrdenar();
      document.getElementById("checkAll").checked = false;
      updateActionButtons();
    } else {
      showToast("⚠️ Error al actualizar ofertas", "error");
    }
  } catch (error) {
    console.error(error);
    showToast("❌ Error de conexión", "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

function updateActionButtons() {
  const selected = document.querySelectorAll(".offer-check:checked").length;
  const btnPostular = document.getElementById("btnPostular");
  const btnDescartar = document.getElementById("btnDescartar");
  const countSpan = document.getElementById("countSeleccion");

  if (btnPostular) btnPostular.disabled = selected === 0;
  if (btnDescartar) btnDescartar.disabled = selected === 0;
  if (countSpan) countSpan.innerText = selected;
}

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
  div.innerHTML = `<i class="ph-fill ${icon}" style="color: var(${colorVar}); font-size: 1.2rem;"></i><span>${msg}</span>`;
  container.appendChild(div);
  setTimeout(() => {
    div.style.opacity = "0";
    div.style.transform = "translateX(100%)";
    setTimeout(() => div.remove(), 300);
  }, 3000);
}