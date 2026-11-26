import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Navbar from '../src/components/common/navVar';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('Pruebas del componente Navbar', () => {
  const mockSetEstaAutenticado = jest.fn();
  const mockSetRol = jest.fn();

  beforeEach(() => {
    mockNavigate.mockClear();
    mockSetEstaAutenticado.mockClear();
    mockSetRol.mockClear();
    sessionStorage.clear();
  });

  // Helper para renderizar el Navbar siempre dentro de MemoryRouter
  const renderNavbar = () =>
    render(
      <MemoryRouter>
        <Navbar setEstaAutenticado={mockSetEstaAutenticado} setRol={mockSetRol} />
      </MemoryRouter>
    );

  // Prueba 1: Usuario público (no autenticado)
  test('muestra el menú público y botones de acceso cuando no hay sesión', () => {
    renderNavbar();

    expect(screen.getByText('AR SERVICIO TÉCNICO')).toBeInTheDocument();
    expect(screen.getByText('Inicio')).toBeInTheDocument();
    expect(screen.getByText('Servicios')).toBeInTheDocument();
    expect(screen.getByText('Acerca de nosotros')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Solicitar' })).toHaveAttribute('href', '/Registro');

    // No deben aparecer opciones privadas
    expect(screen.queryByText('Mis Solicitudes')).not.toBeInTheDocument();
    expect(screen.queryByText('Mi perfil')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cerrar Sesión/i })).not.toBeInTheDocument();

    // Botones de Login y Registro
    fireEvent.click(screen.getByRole('button', { name: /Iniciar sesión/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/Login');

    fireEvent.click(screen.getByRole('button', { name: /Registrarse/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/Registro');
  });

  // Prueba 2: Cliente autenticado
  test('muestra el menú de cliente autenticado y redirige Solicitar a /infoUsuario', () => {
    sessionStorage.setItem('token', 'fake-token');
    sessionStorage.setItem('rol', 'cliente');

    renderNavbar();

    expect(screen.getByText('Mis Solicitudes')).toBeInTheDocument();
    expect(screen.getByText('Mi perfil')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Solicitar' })).toHaveAttribute('href', '/infoUsuario');
    expect(screen.getByRole('button', { name: /Cerrar Sesión/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Iniciar sesión/i })).not.toBeInTheDocument();
  });

  // Prueba 3: Menú Administrador
  test('muestra el menú exclusivo de administrador', () => {
    sessionStorage.setItem('token', 'fake-token');
    sessionStorage.setItem('rol', 'administrador');

    renderNavbar();

    expect(screen.getByText('Gestión de Solicitudes')).toBeInTheDocument();
    expect(screen.getByText('Historial')).toBeInTheDocument();
    expect(screen.getByText('Configuración')).toBeInTheDocument();
    expect(screen.getByText('Mi perfil')).toBeInTheDocument();
    expect(screen.queryByText('Inicio')).not.toBeInTheDocument();
  });

  // Prueba 4: Menú Técnico
  test('muestra el menú exclusivo de técnico', () => {
    sessionStorage.setItem('token', 'fake-token');
    sessionStorage.setItem('rol', 'tecnico');

    renderNavbar();

    expect(screen.getByText('Panel de Técnico')).toBeInTheDocument();
    expect(screen.getByText('Mi perfil')).toBeInTheDocument();
    expect(screen.queryByText('Gestión de Solicitudes')).not.toBeInTheDocument();
  });

  // Prueba 5: Cerrar sesión (handleLogout)
  test('limpia sessionStorage, actualiza estados y navega al inicio al cerrar sesión', () => {
    sessionStorage.setItem('token', 'fake-token');
    sessionStorage.setItem('rol', 'cliente');
    sessionStorage.setItem('id_usuario', '10');
    sessionStorage.setItem('user', JSON.stringify({ id: 10 }));
    sessionStorage.setItem('userEmail', 'nicolas@correo.com');

    renderNavbar();

    fireEvent.click(screen.getByRole('button', { name: /Cerrar Sesión/i }));

    expect(sessionStorage.getItem('token')).toBeNull();
    expect(sessionStorage.getItem('rol')).toBeNull();
    expect(sessionStorage.getItem('id_usuario')).toBeNull();
    expect(sessionStorage.getItem('user')).toBeNull();
    expect(sessionStorage.getItem('userEmail')).toBeNull();

    expect(mockSetEstaAutenticado).toHaveBeenCalledWith(false);
    expect(mockSetRol).toHaveBeenCalledWith(null);
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});