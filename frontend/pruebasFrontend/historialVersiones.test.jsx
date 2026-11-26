import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { fetchseguro } from '../src/utils/fetchseguro';
import HistorialVersiones from '../src/pages/historialVersiones';

jest.mock('../src/utils/fetchseguro', () => ({
  fetchseguro: jest.fn(),
}));

const datosBackendMock = [
  {
    id_solicitud: 1,
    nombre_equipo: 'Horno Industrial',
    fecha_solicitud: '2026-11-20',
    descripcion: 'No calienta bien',
    nombre_estado: 'Pendiente',
    direccion_servicio: 'Calle 10 #20-30',
    nombre_1: 'Nicolás',
    apellido_1: 'Rojas',
    marca_equipo: 'Rational',
  },
  {
    id_solicitud: 2,
    nombre_equipo: 'Nevera Comercial',
    fecha_solicitud: '2026-11-22',
    descripcion: 'Fuga de refrigerante',
    nombre_estado: 'En proceso',
    direccion_servicio: 'Carrera 15 #80-20',
    nombre_1: 'Santiago',
    apellido_1: 'De Hoyos',
    marca_equipo: 'No especificada',
  },
  {
    id_solicitud: 3,
    nombre_equipo: '',
    fecha_solicitud: '',
    descripcion: '',
    nombre_estado: 'Finalizado',
    direccion_servicio: '',
    nombre_1: '',
    apellido_1: '',
    marca_equipo: 'No especificada',
  },
];

describe('Pruebas del componente HistorialVersiones', () => {
  beforeEach(() => {
    fetchseguro.mockClear();
    sessionStorage.clear();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Prueba 1: Carga inicial, envío de token y adaptación de datos (incluyendo valores por defecto)
  test('carga el historial con el token y renderiza los datos adaptados', async () => {
    sessionStorage.setItem('token', 'token-admin-123');
    fetchseguro.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => datosBackendMock,
    });

    render(<HistorialVersiones />);

    expect(screen.getByText(/Cargando historial.../i)).toBeInTheDocument();

    expect(await screen.findByText('Horno Industrial')).toBeInTheDocument();
    expect(screen.getByText('Nevera Comercial')).toBeInTheDocument();
    expect(screen.getByText('Nicolás Rojas')).toBeInTheDocument();

    // Verificamos los valores por defecto del tercer registro incompleto
    expect(screen.getByText('Equipo no especificado')).toBeInTheDocument();
    expect(screen.getByText('Sin fecha')).toBeInTheDocument();
    expect(screen.getByText('Sin descripción')).toBeInTheDocument();
    expect(screen.getByText('Cliente Anónimo')).toBeInTheDocument();

    // Verificamos que la petición envió el header Authorization
    expect(fetchseguro).toHaveBeenCalledWith('https://localhost:3001/api/admin/solicitudes', {
      headers: { Authorization: 'Bearer token-admin-123' },
    });
  });

  // Prueba 2: Contadores y filtrado por estado
  test('muestra los contadores correctos y filtra las solicitudes al hacer clic en los botones', async () => {
    fetchseguro.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => datosBackendMock,
    });

    render(<HistorialVersiones />);
    await screen.findByText('Horno Industrial');

    // Verificamos los contadores en los botones
    expect(screen.getByRole('button', { name: 'Todos (3)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pendiente (1)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'En proceso (1)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Finalizado (1)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelado (0)' })).toBeInTheDocument();

    // Filtrar por "Pendiente"
    fireEvent.click(screen.getByRole('button', { name: 'Pendiente (1)' }));
    expect(screen.getByText('Horno Industrial')).toBeInTheDocument();
    expect(screen.queryByText('Nevera Comercial')).not.toBeInTheDocument();

    // Filtrar por "Cancelado" (0 resultados)
    fireEvent.click(screen.getByRole('button', { name: 'Cancelado (0)' }));
    expect(screen.getByText('No hay solicitudes para mostrar.')).toBeInTheDocument();

    // Volver a "Todos"
    fireEvent.click(screen.getByRole('button', { name: 'Todos (3)' }));
    expect(screen.getByText('Horno Industrial')).toBeInTheDocument();
    expect(screen.getByText('Nevera Comercial')).toBeInTheDocument();
  });

  // Prueba 3: Lista vacía desde el servidor
  test('muestra el mensaje de estado vacío cuando el backend devuelve un arreglo vacío', async () => {
    fetchseguro.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => [],
    });

    render(<HistorialVersiones />);

    expect(await screen.findByText('No hay solicitudes para mostrar.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Todos (0)' })).toBeInTheDocument();
  });

  // Prueba 4: Error HTTP o de conexión
  test('maneja errores HTTP sin romper el componente y muestra el estado vacío', async () => {
    fetchseguro.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    render(<HistorialVersiones />);

    await waitFor(() => {
      expect(screen.queryByText(/Cargando historial.../i)).not.toBeInTheDocument();
      expect(screen.getByText('No hay solicitudes para mostrar.')).toBeInTheDocument();
      expect(console.error).toHaveBeenCalled();
    });
  });
});