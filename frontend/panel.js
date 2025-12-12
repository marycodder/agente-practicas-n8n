/*********************************************************
 * PANEL DE USUARIO - GESTIÓN DE PRÁCTICAS (V. FINAL)
 * -------------------------------------------------------
 * Autor: Generado por Asistente
 * Descripción: Controla toda la interacción del usuario:
 * carga de datos, filtros, actualización de preferencias,
 * cambio de estado (Pausa/Activo) y gestión de ofertas.
 **********************************************************/

// ==========================================
// 1. CONFIGURACIÓN DE RUTAS (ENDPOINTS)
// ==========================================
// URL base donde corre n8n.
const BASE_URL = "http://localhost:5678";

// Objeto con todas las rutas para facilitar el mantenimiento
const ENDPOINTS = {
  READ: `${BASE_URL}/webhook/panel/usuario`, // Obtener perfil y ofertas
  UPDATE: `${BASE_URL}/webhook/panel/usuario/update`, // Guardar preferencias
  DELETE: `${BASE_URL}/webhook/panel/ofertas/delete`, // Descartar ofertas (Soft Delete)
  POSTULAR: `${BASE_URL}/webhook/panel/ofertas/postular`, // Marcar como postulado
  PAUSE: `${BASE_URL}/webhook/panel/usuario/pause`, // Alternar estado Activa/Pausada
};

// Regex simple para validar email antes de enviar nada
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ==========================================
// 2. REFERENCIAS A ELEMENTOS DEL DOM
// ==========================================

// --- Cabecera ---
const panelTitulo = document.getElementById("panelTitulo");
const panelSubtitulo = document.getElementById("panelSubtitulo");
const panelEmail = document.getElementById("panelEmail");

// --- Formulario de Preferencias ---
const prefsForm = document.getElementById("prefsForm");
const selectFrec = document.getElementById("frecuencia");
const selectMod = document.getElementById("modalidad");
const selectReg = document.getElementById("region");
const savePrefsBtn = document.getElementById("savePrefsBtn");
const btnPausar = document.getElementById("btnPausar"); // Botón de estado servicio

// --- Tabla y Botones de Acción ---
const historialBody = document.getElementById("historialBody");
const historialEmpty = document.getElementById("historialEmpty");
const checkAll = document.getElementById("checkAll");
const btnDescartar = document.getElementById("btnDescartar");
const btnPostular = document.getElementById("btnPostular");
const countSeleccion = document.getElementById("countSeleccion");

// --- Filtros y Búsqueda ---
const searchInput = document.getElementById("searchInput");
const btnClearSearch = document.getElementById("btnClearSearch");
const filterFuente = document.getElementById("filterFuente");
const filterModalidad = document.getElementById("filterModalidad");
const filterEstado = document.getElementById("filterEstado");
const sortOrder = document.getElementById("sortOrder");
const btnResetFilters = document.getElementById("btnResetFilters");

// Estado Global de la Aplicación
let emailUsuario = "";
let ofertasOriginales = []; // Copia local para filtrar sin volver a pedir datos

// ==========================================
// 3. UTILIDADES UX (NOTIFICACIONES & LOADING)
// ==========================================

/**
 * Muestra una notificación flotante (Toast) en la esquina inferior.
 * Reemplaza a los alert() invasivos.
 * @param {string} message - Texto a mostrar.
 * @param {string} type - 'info', 'success', o 'error'.
 */
function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  // Icono según el tipo de mensaje
  let icon = "ph-info";
  if (type === "success") icon = "ph-check-circle";
  if (type === "error") icon = "ph-warning-circle";

  toast.innerHTML = `<i class="ph-fill ${icon}" style="font-size: 1.2rem;"></i> <span>${message}</span>`;
  container.appendChild(toast);

  // Auto-eliminar después de 4 segundos con animación
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/**
 * Cambia el estado de un botón para mostrar un spinner de carga.
 * @param {HTMLElement} btn - El botón a modificar.
 * @param {boolean} isLoading - true para mostrar carga, false para restaurar.
 * @param {string} text - Texto a mostrar junto al spinner.
 */
function setLoading(btn, isLoading, text) {
  if (isLoading) {
    btn.disabled = true;
    // Guardamos el HTML original para restaurarlo luego
    if (!btn.dataset.originalText) btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = `<div class="spinner"></div> ${text}`;
  } else {
    btn.disabled = false;
    // Si existe texto original guardado, lo usamos, si no, usamos el texto pasado
    btn.innerHTML = btn.dataset.originalText || text;
  }
}

/** Actualiza el subtítulo del panel */
function setSubtitulo(texto) {
  if (panelSubtitulo) panelSubtitulo.textContent = texto;
}

// ==========================================
// 4. INICIALIZACIÓN Y DATOS USUARIO
// ==========================================

/** Lee el email de la URL (ej: panel.html?email=test@test.com) */
function obtenerEmailDesdeURL() {
  const params = new URLSearchParams(window.location.search);
  const crudo = (params.get("email") || "").trim().toLowerCase();

  if (!crudo || !EMAIL_REGEX.test(crudo)) {
    setSubtitulo("⚠️ Enlace inválido. Revisa tu correo.");
    // Deshabilitar todo si no hay email válido
    if (prefsForm)
      Array.from(prefsForm.elements).forEach((el) => (el.disabled = true));
    if (btnPausar) btnPausar.disabled = true;
    return null;
  }
  return crudo;
}

/**
 * Pinta los datos del perfil y CONFIGURA EL BOTÓN DE PAUSA/ACTIVAR.
 */
function mostrarDatosUsuario(usuario) {
  const nombre = `${usuario.Nombre || ""} ${usuario.Apellido || ""}`.trim();
  if (panelTitulo)
    panelTitulo.textContent = nombre ? `Hola, ${nombre}` : "Panel de Usuario";
  if (panelEmail) panelEmail.textContent = usuario.Email || emailUsuario;

  // Pre-llenar formulario
  if (selectFrec) selectFrec.value = usuario.Frecuencia || "";
  if (selectMod) selectMod.value = usuario.Modalidad || "";
  if (selectReg) selectReg.value = usuario.Region || "";

  // -----------------------------------------------------------
  // LÓGICA INTELIGENTE DEL BOTÓN DE ESTADO (PAUSAR / ACTIVAR)
  // -----------------------------------------------------------
  if (btnPausar) {
    // 1. Obtenemos el estado normalizado (minúsculas y sin espacios)
    const estadoRaw = usuario.estado || usuario.Estado || "Activa";
    const estadoActual = estadoRaw.toString().toLowerCase().trim();

    // 2. Guardamos el estado en el botón para usarlo en el click
    btnPausar.dataset.status = estadoActual;

    if (estadoActual === "pausada") {
      // SI ESTÁ PAUSADA -> BOTÓN VERDE (OPCIÓN DE ACTIVAR)
      btnPausar.className = "btn-success";
      btnPausar.innerHTML =
        '<i class="ph-bold ph-play-circle"></i> Activar Servicio';
    } else {
      // SI ESTÁ ACTIVA -> BOTÓN AMARILLO (OPCIÓN DE PAUSAR)
      btnPausar.className = "btn-warning";
      btnPausar.innerHTML =
        '<i class="ph-bold ph-pause-circle"></i> Pausar Servicio';
    }
  }
}

// ==========================================
// 5. GESTIÓN DE TABLA Y FILTROS
// ==========================================

/**
 * Recibe las ofertas de la API, las guarda y llama al renderizado.
 */
function mostrarHistorialOfertas(ofertas) {
  ofertasOriginales = ofertas || []; // Guardamos copia maestra
  aplicarFiltrosYOrden(); // Aplicamos filtros por defecto
}

/**
 * Filtra y ordena las ofertas locales y luego las dibuja.
 */
function aplicarFiltrosYOrden() {
  let ofertasFiltradas = [...ofertasOriginales];

  // 1. Búsqueda por Texto (Título o Empresa)
  const palabraClave = searchInput
    ? searchInput.value.toLowerCase().trim()
    : "";
  if (palabraClave) {
    ofertasFiltradas = ofertasFiltradas.filter((o) => {
      const titulo = (o.titulo || "").toLowerCase();
      const empresa = (o.empresa || "").toLowerCase();
      return titulo.includes(palabraClave) || empresa.includes(palabraClave);
    });
  }

  // 2. Filtros de Selects (Fuente, Modalidad, Estado)
  if (filterFuente && filterFuente.value) {
    ofertasFiltradas = ofertasFiltradas.filter(
      (o) =>
        (o.fuente || "").toLowerCase().trim() ===
        filterFuente.value.toLowerCase().trim()
    );
  }
  if (filterModalidad && filterModalidad.value) {
    ofertasFiltradas = ofertasFiltradas.filter(
      (o) =>
        (o.modalidad || "").toLowerCase().trim() ===
        filterModalidad.value.toLowerCase().trim()
    );
  }
  if (filterEstado && filterEstado.value) {
    ofertasFiltradas = ofertasFiltradas.filter(
      (o) =>
        (o.estado_usuario || "Pendiente").toLowerCase().trim() ===
        filterEstado.value.toLowerCase().trim()
    );
  }

  // 3. Ordenamiento (Por fecha)
  const orden = sortOrder ? sortOrder.value : "desc";
  ofertasFiltradas.sort((a, b) => {
    const fechaA = new Date(a.fecha || 0);
    const fechaB = new Date(b.fecha || 0);
    return orden === "desc" ? fechaB - fechaA : fechaA - fechaB;
  });

  renderizarOfertas(ofertasFiltradas);
}

/**
 * Dibuja el HTML de la tabla fila por fila.
 */
function renderizarOfertas(ofertas) {
  historialBody.innerHTML = "";
  if (checkAll) checkAll.checked = false;
  actualizarBotonesAccion();

  // Si no hay resultados tras filtrar
  if (!ofertas || ofertas.length === 0) {
    historialEmpty.hidden = false;
    return;
  }
  historialEmpty.hidden = true;

  ofertas.forEach((oferta) => {
    const tr = document.createElement("tr");

    // Datos seguros (fallback si vienen vacíos)
    const fecha = oferta.fecha ? oferta.fecha.split(" ")[0] : "—";
    const link = oferta.link || "#";
    const empresa = oferta.empresa || "—";
    const region = oferta.ubicacion || "—";
    const titulo = oferta.titulo || "Oferta de práctica";
    const modalidad = oferta.modalidad || "—";
    const fuente = oferta.fuente || "Web";
    const estado = oferta.estado_usuario || "Pendiente";

    // Estilos del Badge según estado
    let claseBadge = "status-badge--pendiente";
    let iconoBadge = "ph-hourglass";

    if (estado === "Postulado") {
      claseBadge = "status-badge--postulado";
      iconoBadge = "ph-check";
    }

    tr.innerHTML = `
      <td style="text-align: center;">
        <input type="checkbox" class="row-checkbox" data-link="${link}">
      </td>
      <td style="color: #94a3b8; font-size: 0.75rem;">${fecha}</td>
      <td>
        <span style="font-weight: 600; color: #cbd5e1; background: #334155; padding: 3px 6px; border-radius: 4px; font-size: 0.7rem;">
          ${fuente}
        </span>
      </td>
      <td>
        <div style="display: flex; flex-direction: column; gap: 3px;">
            <strong style="color: #f1f5f9; line-height: 1.3; font-size: 0.85rem;">${titulo}</strong>
            <span style="font-size: 0.75rem; color: #64748b;">${empresa}</span>
        </div>
      </td>
      <td style="color: #cbd5e1; font-size: 0.8rem;">${region}</td>
      <td style="color: #cbd5e1; font-size: 0.8rem;">${modalidad}</td>
      <td>
        <span class="status-badge ${claseBadge}">
            <i class="ph-bold ${iconoBadge}"></i> ${estado}
        </span>
      </td>
      <td style="text-align: center;">
        ${
          link !== "#" && link !== ""
            ? `<a href="${link}" target="_blank" class="btn-link" style="font-size: 0.8rem; padding: 4px 8px;">Abrir <i class="ph-bold ph-arrow-square-out"></i></a>`
            : `<span style="color:#64748b; font-size: 0.75rem;">Sin link</span>`
        }
      </td>
    `;
    historialBody.appendChild(tr);
  });

  // Reactivar listeners de los nuevos checkboxes
  document.querySelectorAll(".row-checkbox").forEach((chk) => {
    chk.addEventListener("change", actualizarBotonesAccion);
  });
}

// Helpers de Limpieza
function resetearFiltros() {
  if (searchInput) searchInput.value = "";
  if (btnClearSearch) btnClearSearch.classList.remove("visible");
  filterFuente.value = "";
  filterModalidad.value = "";
  filterEstado.value = "";
  sortOrder.value = "desc";
  aplicarFiltrosYOrden();
  showToast("Filtros limpiados", "info");
}

function limpiarBusqueda() {
  if (searchInput) {
    searchInput.value = "";
    searchInput.focus();
  }
  if (btnClearSearch) btnClearSearch.classList.remove("visible");
  aplicarFiltrosYOrden();
}

// ==========================================
// 6. SELECCIÓN Y ACCIONES MASIVAS
// ==========================================

// Checkbox Maestro
if (checkAll) {
  checkAll.addEventListener("change", (e) => {
    const isChecked = e.target.checked;
    document.querySelectorAll(".row-checkbox").forEach((chk) => {
      chk.checked = isChecked;
    });
    actualizarBotonesAccion();
  });
}

// Actualizar estado de botones (habilitar/deshabilitar)
function actualizarBotonesAccion() {
  const seleccionados = document.querySelectorAll(
    ".row-checkbox:checked"
  ).length;
  if (countSeleccion) countSeleccion.textContent = seleccionados;

  const botones = [btnDescartar, btnPostular];
  botones.forEach((btn) => {
    if (!btn) return;
    if (seleccionados > 0) {
      btn.disabled = false;
      btn.classList.add("is-active");
    } else {
      btn.disabled = true;
      btn.classList.remove("is-active");
    }
  });
}

function obtenerSeleccionados() {
  const checkboxes = document.querySelectorAll(".row-checkbox:checked");
  return Array.from(checkboxes).map((chk) => chk.dataset.link);
}

// Click Botón Descartar
if (btnDescartar) {
  btnDescartar.addEventListener("click", () => {
    const seleccionados = obtenerSeleccionados();
    if (seleccionados.length === 0) return;
    if (
      !confirm(`¿Estás seguro de DESCARTAR ${seleccionados.length} oferta(s)?`)
    )
      return;
    ejecutarAccionMasiva(
      ENDPOINTS.DELETE,
      seleccionados,
      btnDescartar,
      "Descartando..."
    );
  });
}

// Click Botón Postular
if (btnPostular) {
  btnPostular.addEventListener("click", () => {
    const seleccionados = obtenerSeleccionados();
    if (seleccionados.length === 0) return;
    // Acción positiva, no suele requerir confirmación estricta
    ejecutarAccionMasiva(
      ENDPOINTS.POSTULAR,
      seleccionados,
      btnPostular,
      "Marcando..."
    );
  });
}

/** Ejecuta la llamada al backend para acciones masivas */
async function ejecutarAccionMasiva(url, links, boton, textoCarga) {
  setLoading(boton, true, textoCarga);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailUsuario, links: links }),
    });

    const data = await res.json();

    if (data.status === "ok") {
      const accion = boton === btnDescartar ? "descartadas" : "postuladas";
      showToast(`Ofertas ${accion} correctamente.`, "success");
      cargarPanel(emailUsuario); // Recargar datos frescos
    } else {
      showToast("Error: " + (data.msg || "Desconocido"), "error");
    }
  } catch (err) {
    console.error(err);
    showToast("Error de conexión con el servidor.", "error");
  } finally {
    setLoading(boton, false);
  }
}

// ==========================================
// 7. LÓGICA BOTÓN PAUSAR / ACTIVAR
// ==========================================

if (btnPausar) {
  btnPausar.addEventListener("click", async () => {
    // Leemos el estado actual guardado en el dataset del botón
    const estadoActual = btnPausar.dataset.status;
    const isPausada = estadoActual === "pausada";

    // Mensaje dinámico según la acción futura
    const msg = isPausada
      ? "🎉 ¿Quieres ACTIVAR nuevamente el envío de correos?"
      : "⏸️ ¿Estás seguro de PAUSAR tu servicio? Dejarás de recibir ofertas temporalmente.";

    if (!confirm(msg)) return;

    // Loading dinámico
    const loadingText = isPausada ? "Activando..." : "Pausando...";
    setLoading(btnPausar, true, loadingText);

    try {
      const res = await fetch(ENDPOINTS.PAUSE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailUsuario }),
      });

      const data = await res.json();

      if (data.status === "ok") {
        showToast("Estado actualizado correctamente. 🔄", "success");
        // Recargar todo el panel para que el botón y la UI se actualicen solos
        cargarPanel(emailUsuario);
      } else {
        showToast(
          "Error: " + (data.msg || "No se pudo cambiar estado"),
          "error"
        );
      }
    } catch (err) {
      console.error(err);
      showToast("Error de conexión.", "error");
    } finally {
      setLoading(btnPausar, false);
    }
  });
}

// ==========================================
// 8. FETCH DATOS Y GUARDADO PREFS
// ==========================================

async function cargarPanel(email) {
  setSubtitulo("Sincronizando datos...");
  try {
    const res = await fetch(ENDPOINTS.READ, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (!res.ok) throw new Error("Error HTTP");
    const data = await res.json();

    if (data.status !== "ok") {
      setSubtitulo("Usuario no encontrado.");
      showToast(data.msg || "Usuario no encontrado", "error");
      return;
    }

    // Actualizamos UI
    mostrarDatosUsuario(data.usuario || {});
    mostrarHistorialOfertas(data.ofertas || []);
    setSubtitulo("Información actualizada.");
  } catch (err) {
    console.error(err);
    setSubtitulo("Sin conexión.");
    showToast("No se pudo conectar con el servidor.", "error");
  }
}

async function guardarPreferencias(event) {
  event.preventDefault();
  if (!emailUsuario) return;

  const payload = {
    Email: emailUsuario,
    Frecuencia: selectFrec.value,
    Modalidad: selectMod.value,
    Region: selectReg.value,
  };

  setLoading(savePrefsBtn, true, "Guardando...");

  try {
    const res = await fetch(ENDPOINTS.UPDATE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (data.status === "ok") {
      showToast("Preferencias guardadas correctamente.", "success");
    } else {
      showToast("No se pudo guardar.", "error");
    }
  } catch (err) {
    console.error(err);
    showToast("Error de conexión.", "error");
  } finally {
    setLoading(savePrefsBtn, false);
  }
}

// ==========================================
// 9. PUNTO DE ENTRADA (INIT)
// ==========================================

function init() {
  const email = obtenerEmailDesdeURL();
  if (!email) return; // Si no hay email válido, detiene todo

  emailUsuario = email;
  cargarPanel(email); // Carga inicial de datos

  // Listeners de formularios
  if (prefsForm) prefsForm.addEventListener("submit", guardarPreferencias);

  // Listeners de Búsqueda
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      // Mostrar/ocultar botón 'X'
      if (btnClearSearch) {
        btnClearSearch.classList.toggle("visible", e.target.value.length > 0);
      }
      aplicarFiltrosYOrden();
    });
  }
  if (btnClearSearch) {
    btnClearSearch.addEventListener("click", limpiarBusqueda);
  }

  // Listeners de Filtros (cambios en selects)
  [filterFuente, filterModalidad, filterEstado, sortOrder].forEach((el) => {
    if (el) el.addEventListener("change", aplicarFiltrosYOrden);
  });

  if (btnResetFilters)
    btnResetFilters.addEventListener("click", resetearFiltros);
}

// Ejecutar cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", init);
