import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import "./login.css";

const API_URL = (import.meta.env.VITE_IP_ELASTICA_URL || "https://44.197.89.200:4000").replace(/\/$/, "");

const RecuperarContrasena = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRecuperar = async (e) => {
    e.preventDefault();
    setError("");
    setMensaje("");

    if (nuevaPassword !== confirmarPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);

    try {
      const resp = await fetch(`${API_URL}/api/recuperar-contrasena`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          nuevaPassword,
        }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        setError(data.mensaje || data.error || "No se pudo actualizar la contraseña.");
        return;
      }

      setMensaje(data.mensaje || "¡Contraseña actualizada! Redirigiendo...");
      setTimeout(() => {
        navigate("/Login");
      }, 1500);
    } catch (err) {
      console.error('Error:', err.message);
      setError("Error de conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1050 }}>
      <div className="ventana-login">
        <button className="btn-cerrar" onClick={() => navigate('/')}>✕</button>
        <h2>Cambiar Contraseña</h2>
        <p className="sub-login" style={{ marginBottom: '15px' }}>
          Ingresa tu correo registrado y escribe tu nueva contraseña.
        </p>

        {error && (
          <p style={{ color: 'red', backgroundColor: '#fee2e2', padding: '10px', borderRadius: '5px', textAlign: 'center' }}>
            {error}
          </p>
        )}

        {mensaje && (
          <p style={{ color: '#166534', backgroundColor: '#dcfce7', padding: '10px', borderRadius: '5px', textAlign: 'center' }}>
            {mensaje}
          </p>
        )}

        <form className="formulario-datos" onSubmit={handleRecuperar}>
          <label>Correo Electrónico *</label>
          <input
            type="email"
            placeholder="ejemplo@correo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label>Nueva Contraseña *</label>
          <input
            type="password"
            value={nuevaPassword}
            onChange={(e) => setNuevaPassword(e.target.value)}
            required
          />

          <label>Confirmar Nueva Contraseña *</label>
          <input
            type="password"
            value={confirmarPassword}
            onChange={(e) => setConfirmarPassword(e.target.value)}
            required
          />

          <button type="submit" className="btn-enviar-login" disabled={loading}>
            {loading ? 'Actualizando...' : 'Guardar Nueva Contraseña'}
          </button>
        </form>

        <p className="footer-link" onClick={() => navigate('/Login')} style={{ marginTop: '15px', cursor: 'pointer' }}>
          ¿Ya la recordaste? <span style={{ color: '#E57373', fontWeight: 'bold' }}>Inicia sesión aquí</span>
        </p>
      </div>
    </div>
  );
};

export default RecuperarContrasena;