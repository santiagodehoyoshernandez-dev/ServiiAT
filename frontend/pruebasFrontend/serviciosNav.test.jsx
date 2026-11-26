import { render, screen } from '@testing-library/react';
import ServiciosNav from '../src/pages/serviciosNav';

describe('Pruebas del componente ServiciosNav', () => {
  // Prueba 1: Renderizado de los dos servicios y sus descripciones
  test('renderiza los títulos y descripciones de ambos servicios HORECA', () => {
    render(<ServiciosNav />);

    expect(
      screen.getByRole('heading', { name: /Instalación Profesional HORECA/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/puesta en marcha técnica de equipos/i)
    ).toBeInTheDocument();

    expect(
      screen.getByRole('heading', { name: /Reparación Especializada HORECA/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Servicio técnico de urgencia y correctivo/i)
    ).toBeInTheDocument();
  });

  // Prueba 2: Enlaces de solicitud apuntando a /infoUsuario
  test('renderiza los dos enlaces "Solicitar este servicio" dirigiendo a /infoUsuario', () => {
    render(<ServiciosNav />);

    const enlaces = screen.getAllByRole('link', { name: /Solicitar este servicio/i });
    expect(enlaces).toHaveLength(2);

    enlaces.forEach((enlace) => {
      expect(enlace).toHaveAttribute('href', '/infoUsuario');
    });
  });

  // Prueba 3: Íconos de Bootstrap en cada tarjeta
  test('renderiza los íconos correspondientes en cada tarjeta', () => {
    const { container } = render(<ServiciosNav />);

    expect(container.querySelector('.bi-gear-fill')).toBeInTheDocument();
    expect(container.querySelector('.bi-wrench-adjustable')).toBeInTheDocument();
  });
});