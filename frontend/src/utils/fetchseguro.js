export const API_URL = (
  import.meta.env.VITE_IP_ELASTICA_URL || "https://44.197.89.200:3001"
).replace(/\/$/, "");

export async function fetchseguro(url, opciones = {}) {
  const token = sessionStorage.getItem("token");

  // Reemplaza localhost/127.0.0.1 si quedó escrito, o pega API_URL delante de rutas relativas ("/api/...")
  const urlFinal = url.startsWith("http")
    ? url.replace(/^https?:\/\/(localhost|127\.0\.0\.1):3001/, API_URL)
    : `${API_URL}${url.startsWith("/") ? url : `/${url}`}`;

  const headers = {
    ...(opciones.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  const respuesta = await fetch(urlFinal, { ...opciones, headers });

  // Si el backend mandó un token renovado, lo actualizamos en sessionStorage
  const nuevoToken = respuesta.headers.get("x-nuevo-token");
  if (nuevoToken) {
    sessionStorage.setItem("token", nuevoToken);
  }

  // Si ya pasaron 15 minutos sin actividad y el backend respondió 401, cerramos sesión
  if (respuesta.status === 401) {
    sessionStorage.clear();
    window.location.href = "/login";
  }

  return respuesta;
}