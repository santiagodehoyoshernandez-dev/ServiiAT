import Swal from 'sweetalert2';
import { Cpu, Fan } from 'lucide-react';
import 'react-calendar/dist/Calendar.css';
import Calendar from 'react-calendar';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { fetchseguro } from '../../utils/fetchseguro';

function Formulario() {
    const [appliance, setAppliance] = useState("");
    const navigate = useNavigate();

    // 1. Recuperar datos del formulario con JSON nativo
    const [datosValidar, setDatosValidar] = useState(() => {
        const borradorGuardado = localStorage.getItem("borrador_formulario_solicitud");
        return borradorGuardado ? JSON.parse(borradorGuardado) : {
            equipo: "",
            categoria: "Industrial",
            nombreCliente: "",
            apellidoCliente: "",
            gmail: "",
            telefono: "",
            direccion: "",
            descripcion: "",
            modelo: ""
        };
    });

    const [horaSeleccionada, setHoraSeleccionada] = useState(() => {
        return localStorage.getItem("borrador_hora") || "";
    });

    const horarios = [
        "07:00 AM", "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM",
        "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM", "06:00 PM"
    ];

    const [fechaSeleccionada, setFechaSeleccionada] = useState(() => {
        const fechaGuardada = localStorage.getItem("borrador_fecha");
        return fechaGuardada ? new Date(fechaGuardada) : new Date();
    });

    // 2. Estados para manejar los horarios ocupados traídos del backend
    const [fechasOcupadas, setFechasOcupadas] = useState([]);

    // 3. Cargar los horarios ocupados desde el backend al montar el componente
    useEffect(() => {
        const cargarHorariosOcupados = async () => {
            try {
                const res = await fetchseguro("/api/solicitudes/horarios-ocupados");
                if (res.ok) {
                    const data = await res.json();
                    setFechasOcupadas(data);
                }
            } catch (error) {
                console.error("Error cargando disponibilidad:", error);
            }
        };
        cargarHorariosOcupados();
    }, []);

    // 4. Sincronizar borradores con localStorage
    useEffect(() => {
        localStorage.setItem("borrador_formulario_solicitud", JSON.stringify(datosValidar));
    }, [datosValidar]);

    useEffect(() => {
        localStorage.setItem("borrador_hora", horaSeleccionada);
    }, [horaSeleccionada]);

    useEffect(() => {
        localStorage.setItem("borrador_fecha", fechaSeleccionada.toISOString());
    }, [fechaSeleccionada]);

    // 5. Calcular horas ocupadas para el día actual seleccionado
    const fechaIsoActual = fechaSeleccionada.toISOString().split('T')[0];
    const registroDelDia = fechasOcupadas.find(item => item.fecha === fechaIsoActual);
    const horasOcupadasHoy = registroDelDia ? registroDelDia.horas : [];

    // Si cambia de día y la hora seleccionada ya está ocupada, limpiarla
    useEffect(() => {
        if (horasOcupadasHoy.includes(horaSeleccionada)) {
            setHoraSeleccionada("");
        }
    }, [fechaSeleccionada, fechasOcupadas]);

    const reservado = [
        { id: 1, Date: new Date(2026, 3, 25) },
        { id: 2, Date: new Date(2026, 3, 31) }
    ];

    const fechasReservas = reservado.map(e => e.Date.toDateString());

    const bloquearFechas = ({ date, view }) => {
        if (view === 'month') {
            const esDomingo = date.getDay() === 0;
            return esDomingo || fechasReservas.includes(date.toDateString());
        }
        return false;
    };

    const manejarCambio = (e) => {
        const { name, value } = e.target;
        let valorFiltrado = value;

        if (name === "nombreCliente" || name === "apellidoCliente") {
            valorFiltrado = value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, "");
        } else if (name === "telefono") {
            valorFiltrado = value.replace(/[^0-9]/g, "").slice(0, 10);
        }

        setDatosValidar(prev => ({ ...prev, [name]: valorFiltrado }));
    };

    const manejarEnvio = async (e) => {
        e.preventDefault();

        if (!appliance || !horaSeleccionada) {
            Swal.fire("Paso faltante", "Por favor selecciona el tipo de servicio y la hora.", "warning");
            return;
        }

        const userGuardado = JSON.parse(sessionStorage.getItem("user"));
        if (!userGuardado) {
            Swal.fire("Atención", "Debes iniciar sesión para agendar un servicio.", "warning");
            return;
        }

        // Doble validación por seguridad antes de pasar a la vista de validación
        if (horasOcupadasHoy.includes(horaSeleccionada)) {
            Swal.fire("Horario no disponible", "Lo sentimos, esta hora ya fue reservada por otro usuario.", "error");
            return;
        }

        // Estructuramos los datos completos que necesita la vista de confirmación
        const datosCompletos = {
            ...datosValidar,
            fecha: fechaIsoActual,
            hora: horaSeleccionada,
            servicio: appliance
        };

        navigate("/ValidarInformacion", { state: datosCompletos });
    };

    return (
        <section className="py-5" style={{ background: '#f0f2f5', minHeight: '100vh' }}>
            <div className="container">
                <div className="row justify-content-center">
                    <div className="col-lg-10">
                        <form onSubmit={manejarEnvio} className="p-4 p-md-5 shadow-lg rounded-4 bg-white border-0">
                            <div className="text-center mb-5">
                                <h2 className="fw-bold text-dark">Agenda tu Servicio Técnico</h2>
                                <p className="text-muted">AR Asistencia Técnica - Profesionalismo a tu alcance</p>
                            </div>

                            <div className="row g-4">
                                <div className="col-md-6">
                                    <label className="form-label fw-semibold">Nombres *</label>
                                    <input type="text" name='nombreCliente' value={datosValidar.nombreCliente} onChange={manejarCambio} className="form-control form-control-lg shadow-sm" placeholder="Ej: Santiago" required />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label fw-semibold">Apellidos *</label>
                                    <input type="text" name='apellidoCliente' value={datosValidar.apellidoCliente} onChange={manejarCambio} className="form-control form-control-lg shadow-sm" placeholder="Ej: De Hoyos" required />
                                </div>

                                <div className="col-12">
                                    <label className="form-label fw-semibold">Dirección Completa *</label>
                                    <input type="text" name='direccion' value={datosValidar.direccion} onChange={manejarCambio} className="form-control form-control-lg shadow-sm" placeholder="Ej: Calle 10 #20-30, Barrio El Prado" required />
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label fw-semibold">Equipo *</label>
                                    <input type="text" name='equipo' value={datosValidar.equipo} onChange={manejarCambio} className="form-control form-control-lg shadow-sm" placeholder="Ej: Aire Acondicionado" required />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label fw-semibold">Categoría</label>
                                    <select name='categoria' value={datosValidar.categoria} onChange={manejarCambio} className="form-select form-select-lg shadow-sm">
                                        <option value="Industrial">Industrial</option>
                                        <option value="Doméstico">Doméstico</option>
                                    </select>
                                </div>

                                <div className="col-12 my-3">
                                    <label className="form-label d-block fw-bold text-center">¿Qué servicio requieres?</label>
                                    <div className="d-flex justify-content-center gap-3">
                                        <button type="button" onClick={() => setAppliance("Reparación")}
                                            className={`btn px-4 py-3 border-2 d-flex align-items-center gap-2 ${appliance === 'Reparación' ? 'btn-primary border-primary' : 'btn-outline-secondary border-light bg-light'}`}>
                                            <Cpu size={20} /> Reparación
                                        </button>
                                        <button type="button" onClick={() => setAppliance("Instalación")}
                                            className={`btn px-4 py-3 border-2 d-flex align-items-center gap-2 ${appliance === 'Instalación' ? 'btn-primary border-primary' : 'btn-outline-secondary border-light bg-light'}`}>
                                            <Fan size={20} /> Instalación
                                        </button>
                                    </div>
                                </div>

                                <div className="col-md-12">
                                    <label className="form-label fw-semibold">Descripción del fallo</label>
                                    <textarea name='descripcion' value={datosValidar.descripcion} onChange={manejarCambio} className="form-control shadow-sm" rows="3" placeholder="Describe brevemente el problema..." required></textarea>
                                </div>

                                <div className="col-md-4">
                                    <label className="form-label fw-semibold">Teléfono</label>
                                    <input type="tel" name='telefono' value={datosValidar.telefono} onChange={manejarCambio} className="form-control shadow-sm" placeholder="3001234567" required />
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label fw-semibold">Modelo (Opcional)</label>
                                    <input type="text" name='modelo' value={datosValidar.modelo} onChange={manejarCambio} className="form-control shadow-sm" />
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label fw-semibold">Email</label>
                                    <input type="email" name='gmail' value={datosValidar.gmail} onChange={manejarCambio} className="form-control shadow-sm" required />
                                </div>

                                <div className="col-lg-7 mt-4">
                                    <p className="fw-bold text-center mb-2">Selecciona la Fecha</p>
                                    <div className="bg-light p-2 rounded shadow-sm d-flex justify-content-center">
                                        <Calendar onChange={setFechaSeleccionada} value={fechaSeleccionada} tileDisabled={bloquearFechas} minDate={new Date()} />
                                    </div>
                                </div>

                                <div className="col-lg-5 mt-4">
                                    <p className="fw-bold text-center mb-2">Horario de Atención</p>
                                    <div className="row g-2">
                                        {horarios.map((h) => {
                                            const estaOcupada = horasOcupadasHoy.includes(h);
                                            return (
                                                <div key={h} className="col-6 col-md-4 col-lg-6">
                                                    <button
                                                        type="button"
                                                        disabled={estaOcupada}
                                                        onClick={() => setHoraSeleccionada(h)}
                                                        className={`btn btn-sm w-100 ${
                                                            estaOcupada
                                                                ? 'btn-secondary opacity-50 text-decoration-line-through'
                                                                : horaSeleccionada === h
                                                                    ? 'btn-primary'
                                                                    : 'btn-outline-primary bg-white'
                                                        }`}
                                                    >
                                                        {h} {estaOcupada ? '(Ocupado)' : ''}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="col-12 mt-5">
                                    <button type='submit' className="btn btn-primary btn-lg w-100 fw-bold shadow">
                                        Ir a Validar Servicio
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default Formulario;