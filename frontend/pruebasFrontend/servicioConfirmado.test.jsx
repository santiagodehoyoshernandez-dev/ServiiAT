import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Swal from 'sweetalert2';
import { fetchseguro } from '../src/utils/fetchseguro';
import ServicioConfirmado from '../src/components/client/servicioConfirmado';

const mockNavigate = jest.fn();

// Variable mutable para poder probar tanto CON datos como SIN datos
let mockLocationState = null;

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ state: mockLocationState }),
}));

jest.mock('sweetalert2', () => ({
  fire: jest.fn(),
}));

// Simulamos fetchseguro para no hacer peticiones reales al backend
jest.mock('../src/utils/fetchseguro', () => ({
  fetchseguro: jest.fn(),
}));

const datosMock = {
  fecha: '2026-11-30',
  hora: '10:00 AM',
  nombreCliente: 'Nicolás',
  apellidoCliente: 'Rojas',
  servicio: 'Reparación',
  telefono: '3005635595',
  equipo: 'Horno Industrial',
  modelo: 'X-500',
  categoria: 'Industrial',
  direccion: 'Calle 123 #45-67',
  gmail: 'nicolas@correo.com',
  descripcion: 'No calienta bien',
};

describe('Pruebas del componente ServicioConfirmado', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    Swal.fire.mockClear();
    fetchseguro.mockClear();
    sessionStorage.clear();
    mockLocationState = datosMock; // Por defecto cargamos con datos
    jest.spyOn(console, 'error').mockImplementation(() => {}); // Evita ruido en consola al probar errores
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Prueba 1: Cuando no hay datos en location.state
  test('muestra mensaje de aviso y botón para ir al formulario si no hay datos', () => {
    mockLocationState = null;
    render(<ServicioConfirmado />);

    expect(screen.getByText(/No hay datos de reserva activos/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Ir al formulario/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/Formulario');
  });

  // Prueba 2: Renderizado correcto del resumen y del técnico
  test('renderiza los detalles de la reserva y el nombre del técnico', () => {
    render(<ServicioConfirmado />);

    expect(screen.getByText(/Validación de Reserva/i)).toBeInTheDocument();
    expect(screen.getByText('2026-11-30 a las 10:00 AM')).toBeInTheDocument();
    expect(screen.getByText(/Nicolás Rojas/i)).toBeInTheDocument();
    expect(screen.getByText('Reparación')).toBeInTheDocument();
    expect(screen.getByText('3005635595')).toBeInTheDocument();
    expect(screen.getByText(/Horno Industrial/i)).toBeInTheDocument();
    expect(screen.getByText('Calle 123 #45-67')).toBeInTheDocument();
    expect(screen.getByText('nicolas@correo.com')).toBeInTheDocument();
    expect(screen.getByText(/Fabio Alexander Rojas Lara/i)).toBeInTheDocument();
  });

  // Prueba 3: Botón "Cancelar / Editar"
  test('navega a /Formulario al hacer clic en Cancelar / Editar', () => {
    render(<ServicioConfirmado />);

    fireEvent.click(screen.getByRole('button', { name: /Cancelar \/ Editar/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/Formulario');
  });

  // Prueba 4: Error si no hay usuario en sessionStorage
  test('muestra error con Swal si no hay usuario en sessionStorage', async () => {
    render(<ServicioConfirmado />);

    fireEvent.click(screen.getByRole('button', { name: /Confirmar Reserva/i }));

    await waitFor(() => {
      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({
          icon: 'error',
          title: 'Error al guardar',
          text: 'Debes iniciar sesión para agendar un servicio.',
        })
      );
    });
    expect(fetchseguro).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // Prueba 5: Confirmación exitosa (solicitud + notificación + redirección)
  test('guarda la solicitud, envía notificación, muestra éxito y navega al inicio', async () => {
    sessionStorage.setItem('user', JSON.stringify({ id: 7 }));

    // Simulamos que ambas llamadas a fetchseguro responden correctamente
    fetchseguro
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 100 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });

    Swal.fire.mockResolvedValueOnce({ isConfirmed: true });

    render(<ServicioConfirmado />);

    fireEvent.click(screen.getByRole('button', { name: /Confirmar Reserva/i }));

    await waitFor(() => {
      expect(fetchseguro).toHaveBeenCalledTimes(2);
      expect(fetchseguro).toHaveBeenCalledWith(
        'https://localhost:3001/api/solicitud',
        expect.objectContaining({ method: 'POST' })
      );
      expect(fetchseguro).toHaveBeenCalledWith(
        'https://localhost:3001/api/notificaciones/enviar',
        expect.objectContaining({ method: 'POST' })
      );
      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({
          icon: 'success',
          title: '¡Reserva Confirmada!',
        })
      );
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  // Prueba 6: Error del servidor al crear la solicitud
  test('muestra alerta de error si el servidor rechaza la solicitud', async () => {
    sessionStorage.setItem('user', JSON.stringify({ id: 7 }));

    fetchseguro.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Horario no disponible' }),
    });

    render(<ServicioConfirmado />);

    fireEvent.click(screen.getByRole('button', { name: /Confirmar Reserva/i }));

    await waitFor(() => {
      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({
          icon: 'error',
          title: 'Error al guardar',
          text: 'Horario no disponible',
        })
      );
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});