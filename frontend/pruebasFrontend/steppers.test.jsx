import { render, screen } from '@testing-library/react';
import Stepper from '../src/components/client/steppers';

// Variable mutable para cambiar la ruta en cada prueba
let mockPathname = '/';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: () => ({ pathname: mockPathname }),
}));

describe('Pruebas del componente Stepper', () => {
  beforeEach(() => {
    mockPathname = '/';
  });

  // Prueba 1: Renderizado de los 3 pasos
  test('renderiza las etiquetas de los tres pasos', () => {
    render(<Stepper />);

    expect(screen.getByText('Registrar solicitud')).toBeInTheDocument();
    expect(screen.getByText('Ingresa información')).toBeInTheDocument();
    expect(screen.getByText('Validar servicio')).toBeInTheDocument();
  });

  // Prueba 2: Estado en la ruta "/" (Paso 1 activo, ninguno completado)
  test('marca el primer paso como activo en la ruta "/"', () => {
    mockPathname = '/';
    const { container } = render(<Stepper />);

    expect(screen.getByText('Registrar solicitud')).toHaveClass('fw-bold', 'text-dark');
    expect(screen.getByText('Ingresa información')).toHaveClass('text-secondary');
    expect(screen.getByText('Validar servicio')).toHaveClass('text-secondary');

    // No debe haber ningún ícono de paso completado todavía
    expect(container.querySelectorAll('.bi-check-circle')).toHaveLength(0);
  });

  // Prueba 3: Estado en "/Formulario" (Paso 1 completado, Paso 2 activo)
  test('marca el primer paso como completado y el segundo como activo en "/Formulario"', () => {
    mockPathname = '/Formulario';
    const { container } = render(<Stepper />);

    expect(screen.getByText('Registrar solicitud')).toHaveClass('text-secondary');
    expect(screen.getByText('Ingresa información')).toHaveClass('fw-bold', 'text-dark');
    expect(screen.getByText('Validar servicio')).toHaveClass('text-secondary');

    // Debe haber 1 ícono de check (paso 1 completado)
    expect(container.querySelectorAll('.bi-check-circle')).toHaveLength(1);
  });

  // Prueba 4: Estado en "/ValidarInformacion" (Pasos 1 y 2 completados, Paso 3 activo)
  test('marca los dos primeros pasos como completados y el tercero como activo en "/ValidarInformacion"', () => {
    mockPathname = '/ValidarInformacion';
    const { container } = render(<Stepper />);

    expect(screen.getByText('Registrar solicitud')).toHaveClass('text-secondary');
    expect(screen.getByText('Ingresa información')).toHaveClass('text-secondary');
    expect(screen.getByText('Validar servicio')).toHaveClass('fw-bold', 'text-dark');

    // Debe haber 2 íconos de check (pasos 1 y 2 completados)
    expect(container.querySelectorAll('.bi-check-circle')).toHaveLength(2);
  });
});