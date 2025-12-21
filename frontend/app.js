// ===============================
// IMPORTANTE: Asegúrate de que theme.js esté cargado antes en el HTML
// ===============================
// URL APUNTANDO AL SERVIDOR DE LA U

const form = document.getElementById("registroForm");
const mensaje = document.getElementById("mensaje");
const submitBtn = document.getElementById("submitBtn");

// ✅ URL APUNTANDO AL SERVIDOR DE LA U
const WEBHOOK_URL = "http://10.40.5.21:5678/webhook/practica/form";

// ===============================
// 3. Manejador del envío del formulario
// ===============================
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  mensaje.hidden = true;
  mensaje.textContent = "";
  mensaje.classList.remove(
    "message--success",
    "message--warning",
    "message--error"
  );
  submitBtn.disabled = true;

  const payload = {
    Nombre: form.nombre.value.trim(),
    Apellido: form.apellido.value.trim(),
    Email: form.email.value.trim(),
    Frecuencia: form.frecuencia.value,
    Modalidad: form.modalidad.value,
    Region: form.region.value,
  };

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error("Error en el servidor");

    const data = await res.json().catch(() => ({}));
    const status = data.status || "ok";
    const texto =
      data.mensaje ||
      (status === "ya_registrado"
        ? "Ya estás registrado. Actualizamos tus preferencias."
        : "¡Registro enviado con éxito! Revisa tu correo.");

    mensaje.hidden = false;
    mensaje.textContent = texto;

    if (status === "ya_registrado") {
      mensaje.classList.add("message--warning");
    } else if (status === "ok") {
      mensaje.classList.add("message--success");
      form.reset();
    } else {
      mensaje.classList.add("message--error");
    }
  } catch (error) {
    console.error("Error en el envío:", error);
    mensaje.hidden = false;
    mensaje.classList.add("message--error");
    mensaje.textContent = "Error de conexión con el servidor (10.40.5.21).";
  } finally {
    submitBtn.disabled = false;
  }
});

// Scroll suave al formulario desde el hero
const scrollBtn = document.getElementById("scrollToFormBtn");
if (scrollBtn) {
  scrollBtn.addEventListener("click", () => {
    document.getElementById("formSection").scrollIntoView({
      behavior: "smooth"
    });
  });
}

