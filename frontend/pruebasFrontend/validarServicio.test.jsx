import { render, screen, fireEvent, act } from '@testing-library/react';
import ValidarInformacion from '../src/components/client/validarServicio';

const mockNavigate = jest.fn();

// Datos simulados que normalmente llegan desde el formulario anterior
const datosMock = {
  servicio: 'Reparación',
  equipo: 'Horno Industrial',
  categoria: 'Industrial',
  fecha: '2026-11-30',
  hora: '10:00 AM',
  nombreCliente: 'Nicolás',
  telefono: '3005635595',
  modelo: 'X-500',
  direccion: 'Calle 123 #45-67',
  descripcion: 'No calienta bien',
};

// Mock de react-router-dom incluyendo useNavigate y useLocation
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ state: datosMock }),
}));

describe('Pruebas del componente ValidarInformacion (validarServicio)', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    jest.useFakeTimers(); // Activamos el reloj simulado antes de cada prueba
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers(); // Restauramos el reloj normal al terminar
  });

  // Prueba 1: Verificar que se muestren todos los datos del resumen
  test('renderiza correctamente todos los datos del resumen del servicio', () => {
    render(<ValidarInformacion />);

    expect(screen.getByText(/Validar tipo de servicio/i)).toBeInTheDocument();
    expect(screen.getByText('Reparación')).toBeInTheDocument();
    expect(screen.getByText('Horno Industrial (Industrial)')).toBeInTheDocument();
    expect(screen.getByText('2026-11-30 a las 10:00 AM')).toBeInTheDocument();
    expect(screen.getByText('Nicolás')).toBeInTheDocument();
    expect(screen.getByText('3005635595')).toBeInTheDocument();
    expect(screen.getByText('X-500')).toBeInTheDocument();
    expect(screen.getByText('Calle 123 #45-67')).toBeInTheDocument();
    expect(screen.getByText('No calienta bien')).toBeInTheDocument();
  });

  // Prueba 2: Botón "Volver a Editar"
  test('navega a /Formulario al hacer clic en Volver a Editar', () => {
    render(<ValidarInformacion />);

    fireEvent.click(screen.getByRole('button', { name: /Volver a Editar/i }));

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/Formulario');
  });

  // Prueba 3: Botón "Confirmar Reserva", estado de carga y redirección tras los timers
  test('muestra estado de carga y navega a /ServicioConfirmado con los datos', () => {
    render(<ValidarInformacion />);

    const botonConfirmar = screen.getByRole('button', { name: /Confirmar Reserva/i });
    fireEvent.click(botonConfirmar);

    // Justo después del clic debe deshabilitarse y mostrar "Guardando..."
    expect(botonConfirmar).toBeDisabled();
    expect(screen.getByText(/Guardando.../i)).toBeInTheDocument();

    // Adelantamos los primeros 2 segundos (termina la carga)
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(botonConfirmar).not.toBeDisabled();

    // Adelantamos los siguientes 2 segundos (ejecuta navigate)
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/ServicioConfirmado', { state: datosMock });
  });
});