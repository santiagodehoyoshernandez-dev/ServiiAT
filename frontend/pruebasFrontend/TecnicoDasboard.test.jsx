import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { fetchseguro } from '../src/utils/fetchseguro';
import TecnicoDashboard from '../src/components/dashboard/TecnicoDashboard';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../src/utils/fetchseguro', () => ({
  fetchseguro: jest.fn(),
}));

const solicitudesMock = [
  {
    id_solicitud: 1,
    nombre_equipo: 'Horno Industrial',
    fecha_solicitud: '2026-11-25',
    descripcion: 'No enciende el quemador',
    nombre_estado: 'Pendiente',
    direccion_servicio: 'Calle 100 #15-20',
    nombre_1: 'Nicolás',
    apellido_1: 'Rojas',
    marca_equipo: 'Rational',
    precio_servicio: null,
    pagado: false,
  },
  {
    id_solicitud: 2,
    nombre_equipo: 'Nevera Comercial',
    fecha_solicitud: '2026-11-24',
    descripcion: 'Fuga de refrigerante',
    nombre_estado: 'En proceso',
    direccion_servicio: 'Carrera 15 #80-20',
    nombre_1: 'Santiago',
    apellido_1: 'De Hoyos',
    marca_equipo: 'LG',
    precio_servicio: null,
    pagado: false,
  },
  {
    id_solicitud: 3,
    nombre_equipo: 'Lavavajillas',
    fecha_solicitud: '2026-11-20',
    descripcion: 'Cambio de bomba',
    nombre_estado: 'Finalizado',
    direccion_servicio: 'Avenida Suba #120-10',
    nombre_1: 'Danna',
    apellido_1: 'Ortiz',
    marca_equipo: 'No especificada',
    precio_servicio: 180000,
    pagado: true,
  },
];

describe('Pruebas del componente TecnicoDashboard', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    fetchseguro.mockClear();
    sessionStorage.clear();
    jest.spyOn(window, 'alert').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Prueba 1: Carga inicial y navegación entre pestañas Nuevas e Historial
  test('carga las solicitudes y separa correctamente Nuevas de Historial', async () => {
    fetchseguro.mockResolvedValueOnce({
      ok: true,
      json: async () => solicitudesMock,
    });

    render(<TecnicoDashboard />);

    expect(screen.getByText(/Buscando trabajos.../i)).toBeInTheDocument();

    // En la pestaña "Nuevas" debe aparecer solo la solicitud pendiente
    expect(await screen.findByText('Horno Industrial')).toBeInTheDocument();
    expect(screen.getByText(/No enciende el quemador/i)).toBeInTheDocument();
    expect(screen.queryByText(/Nevera Comercial/i)).not.toBeInTheDocument();

    // Cambiamos a la pestaña "Historial"
    fireEvent.click(screen.getByRole('button', { name: /Mis Trabajos \(Historial\)/i }));

    expect(screen.getByText(/Nevera Comercial \(LG\)/i)).toBeInTheDocument();
    expect(screen.getByText('Lavavajillas')).toBeInTheDocument();
    expect(screen.getByText(/Pago recibido:/i)).toBeInTheDocument();
    expect(screen.queryByText('Horno Industrial')).not.toBeInTheDocument();
  });

  // Prueba 2: Error al cargar y botón Reintentar
  test('muestra alerta de error si falla la carga y permite reintentar', async () => {
    fetchseguro
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Error al consultar la base de datos' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => solicitudesMock,
      });

    render(<TecnicoDashboard />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Error al consultar la base de datos');

    fireEvent.click(screen.getByRole('button', { name: /Reintentar/i }));

    expect(await screen.findByText('Horno Industrial')).toBeInTheDocument();
    expect(fetchseguro).toHaveBeenCalledTimes(2);
  });

  // Prueba 3: Aceptar una solicitud nueva
  test('acepta un trabajo pendiente, cambia a Historial y muestra alerta', async () => {
    fetchseguro
      .mockResolvedValueOnce({ ok: true, json: async () => [solicitudesMock[0]] })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });

    render(<TecnicoDashboard />);
    await screen.findByText('Horno Industrial');

    fireEvent.click(screen.getByRole('button', { name: /Aceptar/i }));

    await waitFor(() => {
      expect(fetchseguro).toHaveBeenCalledWith(
        'https://localhost:3001/api/tecnico/solicitudes/1/estado',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ nombre_estado: 'En proceso' }),
        })
      );
      expect(window.alert).toHaveBeenCalledWith('¡Trabajo Aceptado!');
      expect(screen.getByRole('button', { name: /Marcar como Finalizado/i })).toBeInTheDocument();
    });
  });

  // Prueba 4: Validación y guardado de precio en el historial
  test('valida precio inválido y guarda correctamente un precio válido', async () => {
    fetchseguro
      .mockResolvedValueOnce({ ok: true, json: async () => [solicitudesMock[1]] })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ precio_servicio: 150000 }),
      });

    render(<TecnicoDashboard />);

    await screen.findByText(/No hay trabajos pendientes/i);
    fireEvent.click(screen.getByRole('button', { name: /Mis Trabajos \(Historial\)/i }));

    const inputPrecio = screen.getByLabelText(/Precio del servicio \(COP\)/i);
    const btnGuardar = screen.getByRole('button', { name: /Guardar precio/i });

    // Intento con precio inválido (vacío / 0)
    fireEvent.click(btnGuardar);
    expect(window.alert).toHaveBeenCalledWith(
      'Ingresa un precio mayor que cero en pesos colombianos.'
    );
    expect(fetchseguro).toHaveBeenCalledTimes(1);

    // Intento con precio válido
    fireEvent.change(inputPrecio, { target: { value: '150000' } });
    fireEvent.click(btnGuardar);

    await waitFor(() => {
      expect(fetchseguro).toHaveBeenCalledWith(
        'https://localhost:3001/api/tecnico/solicitudes/2/precio',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ precio_servicio: 150000 }),
        })
      );
      expect(window.alert).toHaveBeenCalledWith(
        'Precio guardado. Ya aparece en el historial del cliente.'
      );
      expect(inputPrecio).toBeDisabled();
    });
  });

  // Prueba 5: Marcar trabajo en proceso como Finalizado
  test('marca un trabajo en proceso como Finalizado', async () => {
    fetchseguro
      .mockResolvedValueOnce({ ok: true, json: async () => [solicitudesMock[1]] })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });

    render(<TecnicoDashboard />);

    await screen.findByText(/No hay trabajos pendientes/i);
    fireEvent.click(screen.getByRole('button', { name: /Mis Trabajos \(Historial\)/i }));

    fireEvent.click(screen.getByRole('button', { name: /Marcar como Finalizado/i }));

    await waitFor(() => {
      expect(fetchseguro).toHaveBeenCalledWith(
        'https://localhost:3001/api/tecnico/solicitudes/2/estado',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ nombre_estado: 'Finalizado' }),
        })
      );
      expect(window.alert).toHaveBeenCalledWith('Marcado como Finalizado');
      expect(screen.getByText('Finalizado')).toBeInTheDocument();
    });
  });

  // Prueba 6: Navegación a Mi perfil y cierre de sesión
  test('navega a /perfil y limpia sessionStorage al cerrar sesión', async () => {
    sessionStorage.setItem('token', 'token-tecnico');
    sessionStorage.setItem('rol', 'tecnico');

    fetchseguro.mockResolvedValueOnce({ ok: true, json: async () => [] });

    render(<TecnicoDashboard />);
    await screen.findByText(/No hay trabajos pendientes/i);

    fireEvent.click(screen.getByRole('button', { name: /Mi perfil/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/perfil');

    fireEvent.click(screen.getByRole('button', { name: /Cerrar Sesión/i }));
    expect(sessionStorage.getItem('token')).toBeNull();
    expect(sessionStorage.getItem('rol')).toBeNull();
  });
});