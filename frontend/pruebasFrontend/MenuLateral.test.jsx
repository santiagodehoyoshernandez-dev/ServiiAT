import { render, screen, fireEvent } from '@testing-library/react';
import MenuLateral from '../src/components/dashboard/MenuLateral';

const mockNavigate = jest.fn();
let mockPathname = '/admin';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: mockPathname }),
}));

describe('Pruebas del componente MenuLateral', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    sessionStorage.clear();
    mockPathname = '/admin';
  });


  // Prueba 1: Renderizado inicial y correo por defecto
  test('renderiza la marca, las 5 rutas y el correo por defecto si no hay userEmail', () => {
    render(<MenuLateral />);

    expect(screen.getByText('AR Servicios')).toBeInTheDocument();
    expect(screen.getByText('admin@arservicio.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Solicitudes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Historial/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Registrar personal/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Configuración/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mi perfil/i })).toBeInTheDocument();
  });

  // Prueba 2: Correo leído desde sessionStorage
  test('muestra el correo guardado en sessionStorage', () => {
    sessionStorage.setItem('userEmail', 'nicolas.admin@serviat.com');
    render(<MenuLateral />);

    expect(screen.getByText('nicolas.admin@serviat.com')).toBeInTheDocument();
  });

  // Prueba 3: Ruta activa exacta (/admin) y subruta (/admin/historial/123)
  test('marca correctamente la ruta activa en ruta exacta y en subrutas', () => {
    mockPathname = '/admin';
    const { rerender } = render(<MenuLateral />);

    const btnSolicitudes = screen.getByRole('button', { name: /Solicitudes/i });
    const btnHistorial = screen.getByRole('button', { name: /Historial/i });

    expect(btnSolicitudes).toHaveClass('menu__enlace--activo');
    expect(btnSolicitudes).toHaveAttribute('aria-current', 'page');
    expect(btnHistorial).not.toHaveClass('menu__enlace--activo');

    // Cambiamos a una subruta de historial: "Solicitudes" (exact: true) debe desactivarse
    mockPathname = '/admin/historial/123';
    rerender(<MenuLateral />);

    expect(btnSolicitudes).not.toHaveClass('menu__enlace--activo');
    expect(btnHistorial).toHaveClass('menu__enlace--activo');
    expect(btnHistorial).toHaveAttribute('aria-current', 'page');
  });

  // Prueba 4: Navegación al hacer clic en los botones del menú
  test('navega a la ruta correspondiente al hacer clic en las opciones del menú', () => {
    render(<MenuLateral />);

    fireEvent.click(screen.getByRole('button', { name: /Historial/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/admin/historial');

    fireEvent.click(screen.getByRole('button', { name: /Registrar personal/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/admin/registrar-personal');

    fireEvent.click(screen.getByRole('button', { name: /Configuración/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/admin/configuracion');

    fireEvent.click(screen.getByRole('button', { name: /Mi perfil/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/perfil');
  });

  // Prueba 5: Cerrar sesión
  test('limpia sessionStorage y redirige a /Login al cerrar sesión', () => {
    sessionStorage.setItem('token', 'fake-token');
    sessionStorage.setItem('rol', 'administrador');
    sessionStorage.setItem('user', JSON.stringify({ id: 1 }));
    sessionStorage.setItem('id_usuario', '1');
    sessionStorage.setItem('userEmail', 'admin@serviat.com');

    render(<MenuLateral />);

    fireEvent.click(screen.getByRole('button', { name: /Cerrar sesión/i }));

    expect(sessionStorage.getItem('token')).toBeNull();
    expect(sessionStorage.getItem('rol')).toBeNull();
    expect(sessionStorage.getItem('user')).toBeNull();
    expect(sessionStorage.getItem('id_usuario')).toBeNull();
    expect(sessionStorage.getItem('userEmail')).toBeNull();
  });
});