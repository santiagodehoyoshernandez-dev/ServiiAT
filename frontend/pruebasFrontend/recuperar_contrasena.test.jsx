import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import RecuperarContrasena from '../src/pages/recuperar_contrasena';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('Pruebas del componente RecuperarContrasena', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    global.fetch = jest.fn();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  // Helper para llenar los campos del formulario
  const llenarFormulario = (
    container,
    email = 'nicolas@correo.com',
    nueva = 'NuevaClave123',
    confirmar = 'NuevaClave123'
  ) => {
    const inputEmail = screen.getByPlaceholderText('ejemplo@correo.com');
    const inputsPassword = container.querySelectorAll('input[type="password"]');

    fireEvent.change(inputEmail, { target: { value: email } });
    fireEvent.change(inputsPassword[0], { target: { value: nueva } });
    fireEvent.change(inputsPassword[1], { target: { value: confirmar } });
  };

  // Prueba 1: Renderizado inicial y navegación de botones auxiliares
  test('renderiza el formulario y navega al inicio o al login con los enlaces auxiliares', () => {
    render(<RecuperarContrasena />);

    expect(screen.getByRole('heading', { name: /Cambiar Contraseña/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Guardar Nueva Contraseña/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '✕' }));
    expect(mockNavigate).toHaveBeenCalledWith('/');

    fireEvent.click(screen.getByText(/Inicia sesión aquí/i));
    expect(mockNavigate).toHaveBeenCalledWith('/Login');
  });

  // Prueba 2: Validación cuando las contraseñas no coinciden
  test('muestra error y no llama a fetch si las contraseñas no coinciden', () => {
    const { container } = render(<RecuperarContrasena />);

    llenarFormulario(container, 'nicolas@correo.com', 'Clave123', 'OtraClave456');
    fireEvent.click(screen.getByRole('button', { name: /Guardar Nueva Contraseña/i }));

    expect(screen.getByText('Las contraseñas no coinciden.')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  // Prueba 3: Actualización exitosa y redirección a /Login después de 1.5 segundos
  test('actualiza la contraseña, muestra mensaje de éxito y redirige a /Login tras 1.5 segundos', async () => {
    jest.useFakeTimers();

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ mensaje: '¡Contraseña actualizada correctamente!' }),
    });

    const { container } = render(<RecuperarContrasena />);
    llenarFormulario(container);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Guardar Nueva Contraseña/i }));
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://localhost:3001/api/recuperar-contrasena',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nicolas@correo.com',
          nuevaPassword: 'NuevaClave123',
        }),
      })
    );

    expect(screen.getByText('¡Contraseña actualizada correctamente!')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();

    // Avanzamos el temporizador de 1500 ms
    act(() => {
      jest.advanceTimersByTime(1500);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/Login');
  });

  // Prueba 4: Error devuelto por el servidor (!resp.ok)
  test('muestra el mensaje de error cuando el servidor rechaza la actualización', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ mensaje: 'Correo no registrado en el sistema.' }),
    });

    const { container } = render(<RecuperarContrasena />);
    llenarFormulario(container);

    fireEvent.click(screen.getByRole('button', { name: /Guardar Nueva Contraseña/i }));

    expect(await screen.findByText('Correo no registrado en el sistema.')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // Prueba 5: Error de red / servidor caído
  test('muestra error de conexión cuando fetch falla', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network Error'));

    const { container } = render(<RecuperarContrasena />);
    llenarFormulario(container);

    fireEvent.click(screen.getByRole('button', { name: /Guardar Nueva Contraseña/i }));

    await waitFor(() => {
      expect(screen.getByText('Error de conexión con el servidor.')).toBeInTheDocument();
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});