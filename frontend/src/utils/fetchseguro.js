export async function fetchseguro(url, opciones = {}) {
  const token = sessionStorage.getItem("token");

  const headers = {
    ...(opciones.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  const respuesta = await fetch(url, { ...opciones, headers });

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