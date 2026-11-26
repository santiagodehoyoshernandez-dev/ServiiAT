import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { fetchseguro } from '../src/utils/fetchseguro';
import AdminDashboard from '../src/components/dashboard/AdminDashboard';

jest.mock('../src/utils/fetchseguro', () => ({
  fetchseguro: jest.fn(),
}));

const solicitudesMock = [
  {
    id_solicitud: 101,
    nombre_1: 'Nicolás',
    apellido_1: 'Rojas',
    email: 'nicolas@correo.com',
    nombre_equipo: 'Horno Industrial',
    marca_equipo: 'Rational',
    descripcion: 'No calienta bien',
    fecha_solicitud: '2026-11-30',
    hora_servicio: '10:00 AM',
    direccion_servicio: 'Calle 123 #45-67',
    nombre_estado: 'Pendiente',
    id_tecnico_asignado: null,
    nombre_tecnico: '',
  },
  {
    id_solicitud: 102,
    nombre_1: 'Santiago',
    apellido_1: 'De Hoyos',
    email: 'santiago@correo.com',
    nombre_equipo: 'Nevera Comercial',
    marca_equipo: 'LG',
    descripcion: 'Fuga de gas',
    fecha_solicitud: '2026-12-01',
    hora_servicio: '02:00 PM',
    direccion_servicio: 'Carrera 15 #80-20',
    nombre_estado: 'En proceso',
    id_tecnico_asignado: 5,
    nombre_tecnico: 'Fabio Rojas',
  },
];

const tecnicosMock = [
  { id_usuario: 5, nombre: 'Fabio Rojas' },
  { id_usuario: 6, nombre: 'Carlos Pérez' },
];

// Helper para simular la carga inicial exitosa (solicitudes + técnicos)
const mockCargaInicialExitosa = (solicitudes = solicitudesMock, tecnicos = tecnicosMock) => {
  fetchseguro
    .mockResolvedValueOnce({ ok: true, json: async () => solicitudes })
    .mockResolvedValueOnce({ ok: true, json: async () => tecnicos });
};

describe('Pruebas del componente AdminDashboard', () => {
  beforeEach(() => {
    fetchseguro.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Prueba 1: Carga inicial y renderizado de solicitudes
  test('carga y muestra las solicitudes y técnicos correctamente', async () => {
    mockCargaInicialExitosa();
    render(<AdminDashboard />);

    expect(screen.getByText(/Cargando solicitudes.../i)).toBeInTheDocument();

    expect(await screen.findByText('Nicolás Rojas')).toBeInTheDocument();
    expect(screen.getByText('Santiago De Hoyos')).toBeInTheDocument();
    expect(screen.getByText(/Horno Industrial · Rational/i)).toBeInTheDocument();
    expect(screen.getByText(/Mostrando/i)).toHaveTextContent('Mostrando 2 de 2');
  });

  // Prueba 2: Error al cargar desde el servidor
  test('muestra alerta de error si falla la carga inicial de solicitudes', async () => {
    fetchseguro
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Error de base de datos' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => [] });

    render(<AdminDashboard />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Error de base de datos');
    expect(screen.getByRole('button', { name: /Reintentar/i })).toBeInTheDocument();
  });

  // Prueba 3: Filtrado por búsqueda y por estado
  test('filtra las solicitudes por texto de búsqueda y por estado', async () => {
    mockCargaInicialExitosa();
    render(<AdminDashboard />);

    await screen.findByText('Nicolás Rojas');

    // Filtro por búsqueda
    const inputBusqueda = screen.getByPlaceholderText(/Buscar cliente, equipo, dirección/i);
    fireEvent.change(inputBusqueda, { target: { value: 'Nevera' } });

    expect(screen.queryByText('Nicolás Rojas')).not.toBeInTheDocument();
    expect(screen.getByText('Santiago De Hoyos')).toBeInTheDocument();

    // Limpiar búsqueda
    fireEvent.click(screen.getByRole('button', { name: /Limpiar búsqueda/i }));
    expect(screen.getByText('Nicolás Rojas')).toBeInTheDocument();

    // Filtro por estado "Pendiente"
    fireEvent.click(screen.getByRole('button', { name: /Pendiente/i }));
    expect(screen.getByText('Nicolás Rojas')).toBeInTheDocument();
    expect(screen.queryByText('Santiago De Hoyos')).not.toBeInTheDocument();
  });

  // Prueba 4: Validación al intentar aprobar sin seleccionar técnico
  test('muestra error si se intenta aprobar sin seleccionar un técnico', async () => {
    mockCargaInicialExitosa();
    render(<AdminDashboard />);

    await screen.findByText('Nicolás Rojas');

    fireEvent.click(screen.getByRole('button', { name: /Aprobar y asignar/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Selecciona un técnico antes de aprobar la solicitud.'
    );
    expect(fetchseguro).toHaveBeenCalledTimes(2); // Solo las 2 llamadas iniciales
  });

  // Prueba 5: Aprobar y asignar técnico exitosamente
  test('aprueba y asigna un técnico y envía la notificación por correo', async () => {
    mockCargaInicialExitosa();

    // Respuestas para el PUT de decisión y el POST de notificación
    fetchseguro
      .mockResolvedValueOnce({ ok: true, json: async () => ({ mensaje: 'Solicitud #101 aprobada.' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });

    render(<AdminDashboard />);
    await screen.findByText('Nicolás Rojas');

    // Seleccionamos al técnico Carlos Pérez (id 6)
    const selectTecnico = screen.getByRole('combobox');
    fireEvent.change(selectTecnico, { target: { value: '6' } });

    fireEvent.click(screen.getByRole('button', { name: /Aprobar y asignar/i }));

    await waitFor(() => {
      expect(fetchseguro).toHaveBeenCalledWith(
        'https://localhost:3001/api/admin/solicitudes/101/decision',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ decision: 'aprobar', id_tecnico: 6 }),
        })
      );
      expect(fetchseguro).toHaveBeenCalledWith(
        'https://localhost:3001/api/notificaciones/enviar',
        expect.objectContaining({ method: 'POST' })
      );
      expect(screen.getByRole('status')).toHaveTextContent('Solicitud #101 aprobada.');
      expect(screen.getByText('Carlos Pérez')).toBeInTheDocument();
    });
  });

  // Prueba 6: Rechazar una solicitud con confirmación
  test('rechaza la solicitud cuando el administrador confirma en window.confirm', async () => {
    mockCargaInicialExitosa();
    jest.spyOn(window, 'confirm').mockReturnValue(true);

    fetchseguro
      .mockResolvedValueOnce({ ok: true, json: async () => ({ mensaje: 'Solicitud #101 rechazada.' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });

    render(<AdminDashboard />);
    await screen.findByText('Nicolás Rojas');

    fireEvent.click(screen.getByRole('button', { name: /Rechazar/i }));

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith('¿Seguro que deseas rechazar la solicitud #101?');
      expect(fetchseguro).toHaveBeenCalledWith(
        'https://localhost:3001/api/admin/solicitudes/101/decision',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ decision: 'rechazar' }),
        })
      );
      expect(screen.getByRole('status')).toHaveTextContent('Solicitud #101 rechazada.');
    });
  });
});