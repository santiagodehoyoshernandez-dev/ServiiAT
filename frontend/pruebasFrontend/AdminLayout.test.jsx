import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AdminLayout from '../src/components/dashboard/AdminLayout';

// Simulamos MenuLateral para probar AdminLayout de forma aislada
jest.mock('../src/components/dashboard/MenuLateral', () => {
  return function MockMenuLateral() {
    return <aside data-testid="menu-lateral">Menú Lateral</aside>;
  };
});

describe('Pruebas del componente AdminLayout', () => {
  // Prueba 1: Estructura principal y renderizado del menú lateral
  test('renderiza el contenedor principal, el menú lateral y la etiqueta main', () => {
    const { container } = render(
      <MemoryRouter>
        <AdminLayout />
      </MemoryRouter>
    );

    expect(container.querySelector('.app.admin-layout')).toBeInTheDocument();
    expect(screen.getByTestId('menu-lateral')).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveClass('contenido', 'admin-layout__contenido');
  });

  // Prueba 2: Verificar que <Outlet /> renderiza el contenido de una ruta hija
  test('renderiza el contenido de la ruta hija dentro del Outlet', () => {
    render(
      <MemoryRouter initialEntries={['/admin/prueba']}>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="prueba" element={<h1>Contenido de Ruta Hija</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('menu-lateral')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Contenido de Ruta Hija' })).toBeInTheDocument();
  });
});