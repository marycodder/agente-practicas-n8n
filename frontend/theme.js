/**
 * Gestor de Temas (Dark/Light Mode)
 * Se encarga de aplicar el tema preferido y persistirlo en localStorage.
 */

const THEME_KEY = "practicas_theme_preference";

/**
 * Inicializa el tema al cargar la página.
 * Busca en localStorage o usa 'dark' por defecto.
 */
function initTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY) || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
    updateThemeIcon(savedTheme);
}

/**
 * Alterna entre tema claro y oscuro.
 */
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";

    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
    updateThemeIcon(newTheme);
}

/**
 * Actualiza el icono del botón de toggle si existe.
 * @param {string} theme - 'light' o 'dark'
 */
function updateThemeIcon(theme) {
    const btn = document.getElementById("themeToggleBtn");
    if (!btn) return;

    // Iconos Phosphor
    const icon = btn.querySelector("i");
    if (icon) {
        if (theme === "dark") {
            icon.className = "ph-fill ph-moon";
        } else {
            icon.className = "ph-fill ph-sun";
        }
    }
}

// Exponer funciones globalmente
window.initTheme = initTheme;
window.toggleTheme = toggleTheme;

// Ejecutar init inmediatamente para establecer variable CSS
initTheme();

// Asegurar que el icono se actualice cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        updateThemeIcon(document.documentElement.getAttribute("data-theme"));
        setupThemeToggle();
    });
} else {
    updateThemeIcon(document.documentElement.getAttribute("data-theme"));
    setupThemeToggle();
}

/**
 * Configura el listener del botón de forma centralizada si no se hizo externamente
 */
function setupThemeToggle() {
    const btn = document.getElementById("themeToggleBtn");
    if (btn) {
        // Remover listener previo para evitar duplicados si se llama múltiples veces
        btn.removeEventListener("click", handleToggleClick);
        btn.addEventListener("click", handleToggleClick);
    }
}

function handleToggleClick(e) {
    e.preventDefault();
    toggleTheme();
}

