// ===============================
// 1. Referencias al DOM
// ===============================
const form = document.getElementById("registroForm");
const mensaje = document.getElementById("mensaje");
const submitBtn = document.getElementById("submitBtn");

// ===============================
// 2. URL del Webhook de n8n
// ===============================
//
// Ajusta ESTA constante según dónde estés corriendo n8n:
//
// - En tu PC/local con n8n en localhost:
//   const WEBHOOK_URL = "http://localhost:5678/webhook/practica/form";
//
// - En el servidor de la U (ejemplo):
//   const WEBHOOK_URL = "http://10.40.5.21:5678/webhook/practica/form";
//
const WEBHOOK_URL = "http://localhost:5678/webhook/practica/form";

// ===============================
// 3. Manejador del envío del formulario
// ===============================
form.addEventListener("submit", async (e) => {
  e.preventDefault(); // Evita que el formulario recargue la página

  // --- Limpiar estado visual previo ---
  mensaje.hidden = true;
  mensaje.textContent = "";
  // Quitamos todas las clases de estado por si vienen de un envío anterior
  mensaje.classList.remove(
    "message--success",
    "message--warning",
    "message--error"
  );
  submitBtn.disabled = true; // Evita múltiples clics mientras se envía

  // --- Construimos el objeto que enviaremos a n8n ---
  const payload = {
    Nombre: form.nombre.value.trim(),
    Apellido: form.apellido.value.trim(),
    Email: form.email.value.trim(),
    Frecuencia: form.frecuencia.value,
    Modalidad: form.modalidad.value,
    Region: form.region.value,
  };

  try {
    // ===============================
    // 4. Llamada al webhook de n8n
    // ===============================
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    // Si la respuesta HTTP no es 2xx, lanzamos error
    if (!res.ok) {
      throw new Error("Error en el servidor");
    }

    // Intentamos parsear el JSON que responde n8n
    // Esperamos algo como: { "status": "ok" | "ya_registrado", "mensaje": "..." }
    const data = await res.json().catch((err) => {
      console.warn("Respuesta no es JSON válido, usando objeto vacío:", err);
      return {};
    });

    // ===============================
    // 5. Interpretar respuesta de n8n
    // ===============================
    const status = data.status || "ok"; // por defecto asumimos "ok"
    const texto =
      data.mensaje ||
      (status === "ya_registrado"
        ? "Ya estás registrado. Actualizamos tus preferencias."
        : "¡Registro enviado con éxito! Revisa tu correo.");

    // Mostramos el mensaje en pantalla
    mensaje.hidden = false;
    mensaje.textContent = texto;

    // Según el status, aplicamos un estilo diferente
    if (status === "ya_registrado") {
      // Usuario ya estaba registrado → advertencia
      mensaje.classList.add("message--warning");
      // No limpiamos el formulario (opcional)
    } else if (status === "ok") {
      // Registro nuevo correcto → éxito
      mensaje.classList.add("message--success");
      form.reset(); // Limpiamos campos SOLO en registros nuevos
    } else {
      // Cualquier otro status inesperado → error genérico
      mensaje.classList.add("message--error");
    }
  } catch (error) {
    // ===============================
    // 6. Manejo de errores de red / servidor
    // ===============================
    console.error(error);

    mensaje.hidden = false;
    mensaje.classList.add("message--error");
    mensaje.textContent =
      "Ocurrió un problema al enviar el registro. Intenta nuevamente en unos minutos.";
  } finally {
    // Rehabilitamos el botón siempre, ocurra lo que ocurra
    submitBtn.disabled = false;
  }
});
