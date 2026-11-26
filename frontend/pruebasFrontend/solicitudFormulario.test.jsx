import { render, screen, fireEvent } from '@testing-library/react';
import Swal from 'sweetalert2';
import Formulario from '../src/components/client/solicitudFormulario';

const mockNavigate = jest.fn();

// Mock de react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock de sweetalert2 para verificar las alertas sin abrir ventanas reales
jest.mock('sweetalert2', () => ({
  fire: jest.fn(),
}));

// Mock de react-calendar para evitar el error de ES Modules
jest.mock('react-calendar', () => {
  return function MockCalendar() {
    return <div data-testid="mock-calendar">Calendario</div>;
  };
});

describe('Pruebas del componente Formulario (solicitudFormulario)', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    Swal.fire.mockClear();
    sessionStorage.clear();
  });

  // Función auxiliar para llenar los campos obligatorios del formulario
  const llenarCamposObligatorios = (container) => {
    fireEvent.change(screen.getByPlaceholderText(/Ej: Santiago/i), { target: { value: 'Nicolás' } });
    fireEvent.change(screen.getByPlaceholderText(/Ej: De Hoyos/i), { target: { value: 'Rojas' } });
    fireEvent.change(screen.getByPlaceholderText(/Ej: Calle 10/i), { target: { value: 'Calle 123 #45-67' } });
    fireEvent.change(screen.getByPlaceholderText(/Ej: Aire Acondicionado/i), { target: { value: 'Horno Industrial' } });
    fireEvent.change(screen.getByPlaceholderText(/Describe brevemente el problema/i), { target: { value: 'No calienta bien' } });
    fireEvent.change(screen.getByPlaceholderText('3001234567'), { target: { value: '3005635595' } });
    
    // Como el input de email no tiene placeholder ni htmlFor, lo buscamos por su atributo name
    const inputEmail = container.querySelector('input[name="gmail"]');
    fireEvent.change(inputEmail, { target: { value: 'nicolas@correo.com' } });
  };

  // Prueba 1: Renderizado inicial
  test('renderiza el título, botones de servicio, horarios y botón de envío', () => {
    render(<Formulario />);

    expect(screen.getByText(/Agenda tu Servicio Técnico/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reparación/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Instalación/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '09:00 AM' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ir a Validar Servicio/i })).toBeInTheDocument();
  });

  // Prueba 2: Alerta si falta seleccionar servicio u hora
  test('muestra advertencia si se envía sin seleccionar servicio u hora', () => {
    const { container } = render(<Formulario />);
    llenarCamposObligatorios(container);

    fireEvent.click(screen.getByRole('button', { name: /Ir a Validar Servicio/i }));

    expect(Swal.fire).toHaveBeenCalledWith(
      'Paso faltante',
      'Por favor selecciona el tipo de servicio y la hora.',
      'warning'
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // Prueba 3: Alerta si el usuario no ha iniciado sesión en sessionStorage
  test('muestra advertencia si no hay usuario guardado en sessionStorage', () => {
    const { container } = render(<Formulario />);
    llenarCamposObligatorios(container);

    // Seleccionamos servicio y hora, pero dejamos sessionStorage vacío
    fireEvent.click(screen.getByRole('button', { name: /Reparación/i }));
    fireEvent.click(screen.getByRole('button', { name: '09:00 AM' }));
    fireEvent.click(screen.getByRole('button', { name: /Ir a Validar Servicio/i }));

    expect(Swal.fire).toHaveBeenCalledWith(
      'Atención',
      'Debes iniciar sesión para agendar un servicio.',
      'warning'
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // Prueba 4: Envío exitoso cuando todo está completo y hay sesión activa
  test('navega a /ValidarInformacion con los datos completos cuando todo es válido', () => {
    // Simulamos un usuario autenticado
    sessionStorage.setItem('user', JSON.stringify({ id: 1, nombre: 'Nicolás' }));

    const { container } = render(<Formulario />);
    llenarCamposObligatorios(container);

    fireEvent.click(screen.getByRole('button', { name: /Reparación/i }));
    fireEvent.click(screen.getByRole('button', { name: '10:00 AM' }));
    fireEvent.click(screen.getByRole('button', { name: /Ir a Validar Servicio/i }));

    expect(Swal.fire).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/ValidarInformacion', {
      state: expect.objectContaining({
        nombreCliente: 'Nicolás',
        apellidoCliente: 'Rojas',
        equipo: 'Horno Industrial',
        categoria: 'Industrial',
        servicio: 'Reparación',
        hora: '10:00 AM',
        gmail: 'nicolas@correo.com',
      }),
    });
  });
});