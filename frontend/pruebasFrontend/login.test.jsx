import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Login from '../src/pages/login';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('Pruebas del componente Login', () => {
  const mockSetEstaAutenticado = jest.fn();
  const mockSetRol = jest.fn();

  beforeEach(() => {
    mockNavigate.mockClear();
    mockSetEstaAutenticado.mockClear();
    mockSetRol.mockClear();
    sessionStorage.clear();
    global.fetch = jest.fn();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Helper para llenar correo y contraseña y enviar el formulario
  const enviarCredenciales = (container, email = 'nicolas@correo.com', password = 'Password123') => {
    const inputEmail = container.querySelector('input[type="email"]');
    const inputPassword = container.querySelector('input[type="password"]');

    fireEvent.change(inputEmail, { target: { value: email } });
    fireEvent.change(inputPassword, { target: { value: password } });
    fireEvent.click(screen.getByRole('button', { name: /Ingresar al Sistema/i }));
  };

  // Prueba 1: Renderizado inicial y navegación de botones auxiliares (cerrar y registro)
  test('renderiza el formulario y navega al inicio o registro con los botones auxiliares', () => {
    render(<Login setEstaAutenticado={mockSetEstaAutenticado} setRol={mockSetRol} />);

    expect(screen.getByRole('heading', { name: /Iniciar Sesión/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ingresar al Sistema/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '✕' }));
    expect(mockNavigate).toHaveBeenCalledWith('/');

    fireEvent.click(screen.getByText(/Regístrate aquí/i));
    expect(mockNavigate).toHaveBeenCalledWith('/registro');
  });

  // Prueba 2: Login exitoso como cliente
  test('inicia sesión como cliente, guarda sessionStorage y redirige a /', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 10,
        nombre: 'Nicolás',
        email: 'nicolas@correo.com',
        rol: 'cliente',
        token: 'jwt-token-cliente',
      }),
    });

    const { container } = render(
      <Login setEstaAutenticado={mockSetEstaAutenticado} setRol={mockSetRol} />
    );
    enviarCredenciales(container);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'https://localhost:3001/api/login',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'nicolas@correo.com', password: 'Password123' }),
        })
      );

      expect(sessionStorage.getItem('token')).toBe('jwt-token-cliente');
      expect(sessionStorage.getItem('rol')).toBe('cliente');
      expect(sessionStorage.getItem('id_usuario')).toBe('10');
      expect(sessionStorage.getItem('userEmail')).toBe('nicolas@correo.com');
      expect(JSON.parse(sessionStorage.getItem('user'))).toMatchObject({
        id: 10,
        nombre: 'Nicolás',
        rol: 'cliente',
      });

      expect(mockSetEstaAutenticado).toHaveBeenCalledWith(true);
      expect(mockSetRol).toHaveBeenCalledWith('cliente');
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  // Prueba 3: Redirección según rol administrador y técnico
  test('redirige a /admin para administrador y a /tecnico para técnico', async () => {
    // Caso administrador
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 1,
        nombre: 'Admin',
        email: 'admin@serviat.com',
        rol: 'administrador',
        token: 'token-admin',
      }),
    });

    const { container, unmount } = render(
      <Login setEstaAutenticado={mockSetEstaAutenticado} setRol={mockSetRol} />
    );
    enviarCredenciales(container, 'admin@serviat.com', 'Admin123');

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/admin');
    });

    unmount();
    mockNavigate.mockClear();

    // Caso técnico
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 2,
        nombre: 'Fabio',
        email: 'fabio@serviat.com',
        rol: 'tecnico',
        token: 'token-tecnico',
      }),
    });

    const { container: containerTecnico } = render(
      <Login setEstaAutenticado={mockSetEstaAutenticado} setRol={mockSetRol} />
    );
    enviarCredenciales(containerTecnico, 'fabio@serviat.com', 'Tecnico123');

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/tecnico');
    });
  });

  // Prueba 4: Credenciales incorrectas (!resp.ok)
  test('muestra el mensaje de error cuando las credenciales son incorrectas', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ mensaje: 'Correo o contraseña inválidos.' }),
    });

    const { container } = render(
      <Login setEstaAutenticado={mockSetEstaAutenticado} setRol={mockSetRol} />
    );
    enviarCredenciales(container);

    expect(await screen.findByText('Correo o contraseña inválidos.')).toBeInTheDocument();
    expect(mockSetEstaAutenticado).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // Prueba 5: Error de red / conexión caída
  test('muestra error de conexión cuando fetch falla', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Failed to fetch'));

    const { container } = render(
      <Login setEstaAutenticado={mockSetEstaAutenticado} setRol={mockSetRol} />
    );
    enviarCredenciales(container);

    expect(await screen.findByText('Error de conexión.')).toBeInTheDocument();
    expect(mockSetEstaAutenticado).not.toHaveBeenCalled();
  });
});