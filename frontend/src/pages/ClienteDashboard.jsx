import React, { useState, useEffect } from "react";
import "../index.css";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import { fetchseguro } from "../utils/fetchseguro";

const obtenerIdCliente = () => {
  const idDirecto = sessionStorage.getItem("id_usuario");
  if (idDirecto) return idDirecto;

  try {
    const usuario = JSON.parse(sessionStorage.getItem("user") || "{}");
    return usuario.id_usuario || usuario.id || "";
  } catch {
    return "";
  }
};

const ClienteDashboard = () => {
  const [misSolicitudes, setMisSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorLocal, setErrorLocal] = useState("");
  const [pagandoId, setPagandoId] = useState(null);
  const [modoPago, setModoPago] = useState("deshabilitado");
  const [paypalClientId, setPaypalClientId] = useState("");
  const [tasaCopUsd, setTasaCopUsd] = useState(0);
  const [ticketGenerado, setTicketGenerado] = useState(null);

  useEffect(() => {
    obtenerMiHistorial();
  }, []);

  async function obtenerMiHistorial() {
    setCargando(true);
    setErrorLocal("");

    const idUsuario = obtenerIdCliente();

    if (!idUsuario) {
      setErrorLocal("No se encontró tu sesión. Por favor, vuelve a iniciar sesión.");
      setCargando(false);
      return;
    }

    try {
      const historialRes = await fetchseguro(`http://localhost:3001/api/cliente/solicitudes/${idUsuario}`);

      if (!historialRes.ok) {
        let mensajeError = `Error al cargar el historial (${historialRes.status}).`;
        try {
          const error = await historialRes.json();
          mensajeError = error.error || error.detalle || mensajeError;
        } catch {
          // Si el backend responde HTML (ej. 404), conserva el mensaje con el código HTTP
        }
        throw new Error(mensajeError);
      }

      const data = await historialRes.json();
      setMisSolicitudes(data);

      // Consulta el modo de pago sin romper el historial si la ruta no está activa
      try {
        const modoRes = await fetchseguro("http://localhost:3001/api/pagos/modo");
        if (modoRes.ok) {
          const configuracionPago = await modoRes.json();
          if (["paypal", "deshabilitado"].includes(configuracionPago.modo)) {
            setModoPago(configuracionPago.modo);
            if (configuracionPago.modo === "paypal") {
              setPaypalClientId(configuracionPago.clientId);
              setTasaCopUsd(Number(configuracionPago.tasaCopUsd));
            }
          }
        }
      } catch {
        setModoPago("deshabilitado");
      }
    } catch (error) {
      console.error("Error:", error);
      setErrorLocal(error.message || "Ocurrió un problema al conectar con el historial.");
    } finally {
      setCargando(false);
    }
  }

  async function capturarPagoPaypal(item, orderID) {
    setPagandoId(item.id_solicitud);
    setErrorLocal("");
    setTicketGenerado(null);

    try {
      const res = await fetchseguro(
        `http://localhost:3001/api/pagos/solicitudes/${item.id_solicitud}/paypal/capturar`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderID })
        }
      );
      const resultado = await res.json();
      if (!res.ok) throw new Error(resultado.error || "No se pudo confirmar el pago de PayPal.");
      if (!resultado.id_ticket) {
        throw new Error("PayPal confirmó el pago, pero no se recibió el ticket.");
      }

      setMisSolicitudes((solicitudes) => solicitudes.map((solicitud) => (
        solicitud.id_solicitud === item.id_solicitud
          ? { ...solicitud, pagado: true }
          : solicitud
      )));
      setTicketGenerado({
        ...resultado,
        nombre_equipo: item.nombre_equipo,
        marca_equipo: item.marca_equipo,
        direccion_servicio: item.direccion_servicio,
        fecha_pago: new Date().toLocaleString("es-CO")
      });
    } catch (error) {
      setErrorLocal(error.message || "No se pudo confirmar el pago de PayPal.");
    } finally {
      setPagandoId(null);
    }
  }

  const formatoCOP = (valor) => new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(Number(valor));

  const formatoUSD = (valor) => new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(Number(valor));

  const contenido = (
    <div className="container p-4 mt-3">
      <div className="mb-4 text-center">
        <h2 style={{ color: '#0d47a1', fontWeight: 'bold' }}>
          <i className="bi bi-clock-history me-2"></i> Mi Historial
        </h2>
        <p className="text-muted">Aquí puedes rastrear el estado de tus servicios técnicos.</p>
      </div>

      {errorLocal && (
        <div className="alert alert-danger text-center shadow-sm">
          <i className="bi bi-exclamation-triangle-fill me-2"></i> {errorLocal}
        </div>
      )}
      {modoPago === "paypal" && (
        <div className="alert alert-info text-center shadow-sm" role="status">
          Los pagos se procesan con PayPal en USD. La conversión desde COP usa la tasa configurada por el comercio.
        </div>
      )}
      {ticketGenerado && (
        <section className="ticket-recibo mx-auto my-4" role="status" aria-label="Ticket de pago generado">
          <header className="ticket-encabezado">
            <div className="ticket-marca">
              <i className="bi bi-tools" aria-hidden="true"></i>
              <span>ServiiAT</span>
            </div>
            <span className="ticket-estado">PAGO EXITOSO</span>
            <h3>¡Gracias por tu pago!</h3>
            <p>Comprobante de tu servicio técnico</p>
          </header>
          <div className="ticket-total">
            <span>Total pagado</span>
            <strong>{formatoCOP(ticketGenerado.monto)}</strong>
            <small>Pago confirmado por PayPal</small>
          </div>
          <div className="ticket-detalles">
            <div>
              <span>Número de ticket</span>
              <strong>#{ticketGenerado.id_ticket}</strong>
            </div>
            <div>
              <span>Fecha de pago</span>
              <strong>{ticketGenerado.fecha_pago}</strong>
            </div>
            <div>
              <span>Servicio</span>
              <strong>
                {ticketGenerado.nombre_equipo}
                {ticketGenerado.marca_equipo && ticketGenerado.marca_equipo !== "No especificada"
                  ? ` (${ticketGenerado.marca_equipo})`
                  : ""}
              </strong>
            </div>
            <div>
              <span>Método de pago</span>
              <strong>{ticketGenerado.metodo_pago}</strong>
            </div>
            <div className="ticket-direccion">
              <span>Dirección del servicio</span>
              <strong>{ticketGenerado.direccion_servicio}</strong>
            </div>
          </div>
          <footer className="ticket-acciones">
            <button type="button" className="btn btn-primary fw-bold" onClick={() => window.print()}>
              <i className="bi bi-printer me-2" aria-hidden="true"></i>
              Imprimir ticket
            </button>
          </footer>
        </section>
      )}

      {cargando ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="mt-2 text-muted">Cargando tu historial...</p>
        </div>
      ) : misSolicitudes.length === 0 && !errorLocal ? (
        <div className="alert alert-info text-center shadow-sm p-4">
          <i className="bi bi-info-circle fs-1 d-block mb-3"></i>
          <h5>Aún no tienes solicitudes registradas</h5>
          <p className="mb-0">Cuando solicites un servicio técnico, aparecerá aquí.</p>
        </div>
      ) : (
        <div className="row g-4">
          {misSolicitudes.map((item) => {
            const estadoVisual = {
              Pendiente: ["pendiente", "bi-hourglass-split"],
              "En proceso": ["proceso", "bi-gear-fill"],
              Finalizado: ["finalizado", "bi-check-circle-fill"]
            }[item.nombre_estado] || ["otro", "bi-info-circle-fill"];
            const [estadoClase, iconoEstado] = estadoVisual;

            return (
              <div key={item.id_solicitud} className="col-12 col-md-6 col-lg-4">
                <article className="solicitud-card">
                  <div className="solicitud-card__cabecera">
                    <span className={`solicitud-card__estado solicitud-card__estado--${estadoClase}`}>
                      <i className={`bi ${iconoEstado}`} aria-hidden="true"></i>
                      {item.nombre_estado}
                    </span>
                    <span className="solicitud-card__numero">Solicitud #{item.id_solicitud}</span>
                  </div>

                  <div className="solicitud-card__contenido">
                    <div className="solicitud-card__equipo">
                      <span className="solicitud-card__equipo-icono">
                        <i className="bi bi-tools" aria-hidden="true"></i>
                      </span>
                      <div className="solicitud-card__equipo-info">
                        <span>Servicio técnico</span>
                        <h3>
                          {item.nombre_equipo}
                          {item.marca_equipo && item.marca_equipo !== "No especificada"
                            ? ` (${item.marca_equipo})`
                            : ""}
                        </h3>
                      </div>
                    </div>

                    <div className="solicitud-card__fecha">
                      <i className="bi bi-calendar3" aria-hidden="true"></i>
                      <span>Solicitado el <strong>{item.fecha_solicitud}</strong></span>
                    </div>

                    <section className="solicitud-card__problema">
                      <div className="solicitud-card__etiqueta">
                        <i className="bi bi-chat-left-text" aria-hidden="true"></i>
                        <span>Descripción del problema</span>
                      </div>
                      <p>{item.descripcion}</p>
                    </section>

                    {Number(item.precio_servicio) > 0 ? (
                      <section className="solicitud-card__pago">
                        <div className="solicitud-card__precio">
                          <div>
                            <span>Valor del servicio</span>
                            <strong>{formatoCOP(item.precio_servicio)}</strong>
                          </div>
                          <span className="solicitud-card__precio-icono">
                            <i className="bi bi-receipt" aria-hidden="true"></i>
                          </span>
                        </div>
                        {item.pagado ? (
                          <span className="solicitud-card__pagado">
                            <i className="bi bi-check-circle-fill" aria-hidden="true"></i>
                            Pago confirmado
                          </span>
                        ) : modoPago === "paypal" ? (
                          <div className="solicitud-card__formulario-pago">
                            <p className="mb-2">
                              Total aproximado en PayPal:{" "}
                              <strong>{formatoUSD(
                                Math.round(Number(item.precio_servicio) * tasaCopUsd * 100) / 100
                              )}</strong>
                            </p>
                            <PayPalButtons
                              style={{ layout: "vertical", label: "paypal" }}
                              disabled={pagandoId === item.id_solicitud}
                              createOrder={async () => {
                                const res = await fetchseguro(
                                  `http://localhost:3001/api/pagos/solicitudes/${item.id_solicitud}/paypal/orden`,
                                  { method: "POST" }
                                );
                                const resultado = await res.json();
                                if (!res.ok) {
                                  throw new Error(resultado.error || "No se pudo crear la orden de PayPal.");
                                }
                                return resultado.id;
                              }}
                              onApprove={async (data) => capturarPagoPaypal(item, data.orderID)}
                              onError={() => setErrorLocal("PayPal no pudo iniciar el pago. Inténtalo de nuevo.")}
                              onClick={() => setErrorLocal("")}
                            />
                          </div>
                        ) : (
                          <div className="alert alert-secondary mb-0" role="status">
                            Los pagos no están habilitados actualmente.
                          </div>
                        )}
                      </section>
                    ) : (
                      <div className="solicitud-card__precio-pendiente">
                        <i className="bi bi-hourglass-split" aria-hidden="true"></i>
                        <span>El técnico aún no ha definido el valor del servicio.</span>
                      </div>
                    )}
                  </div>

                  <footer className="solicitud-card__ubicacion">
                    <i className="bi bi-geo-alt-fill" aria-hidden="true"></i>
                    <div>
                      <span>Dirección del servicio</span>
                      <strong>{item.direccion_servicio}</strong>
                    </div>
                  </footer>
                </article>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return modoPago === "paypal"
    ? (
      <PayPalScriptProvider options={{
        clientId: paypalClientId,
        currency: "USD",
        intent: "capture"
      }}>
        {contenido}
      </PayPalScriptProvider>
    )
    : contenido;
};

export default ClienteDashboard;