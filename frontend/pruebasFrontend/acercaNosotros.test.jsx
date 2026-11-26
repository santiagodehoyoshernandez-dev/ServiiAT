import { render, screen, fireEvent } from '@testing-library/react';
import AcercaDeNosotros from '../src/pages/acercaNosotros';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('Pruebas del componente AcercaDeNosotros', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  // Prueba 1: Misión, Visión, imágenes y métricas principales
  test('renderiza las secciones de Misión, Visión, métricas e imágenes', () => {
    render(<AcercaDeNosotros />);

    expect(screen.getByRole('heading', { name: /Nuestra Misión/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Nuestra Visión/i })).toBeInTheDocument();
    expect(screen.getByText('10+ Años')).toBeInTheDocument();
    expect(screen.getByText('24/7')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();

    expect(screen.getByAltText('Técnico profesional reparando lavadora')).toBeInTheDocument();
    expect(screen.getByAltText('Visión')).toBeInTheDocument();
  });

  // Prueba 2: Servicios especializados y sección de reclutamiento
  test('renderiza los servicios especializados y el banner de únete al equipo', () => {
    render(<AcercaDeNosotros />);

    expect(screen.getByRole('heading', { name: /Nuestros Servicios Especializados/i })).toBeInTheDocument();
    expect(screen.getByText('Equipos Industriales HORECA')).toBeInTheDocument();
    expect(screen.getByText('Refrigeración Comercial')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /¡Únete a Nuestro Equipo!/i })).toBeInTheDocument();
    expect(screen.getByText(/Capacitación/i)).toBeInTheDocument();
  });

  // Prueba 3: Navegación de ambos botones "Solicitar servicio"
  test('navega a /infoUsuario al hacer clic en cualquiera de los botones Solicitar servicio', () => {
    render(<AcercaDeNosotros />);

    const botonesSolicitar = screen.getAllByRole('button', { name: /Solicitar servicio/i });
    expect(botonesSolicitar).toHaveLength(2);

    fireEvent.click(botonesSolicitar[0]);
    fireEvent.click(botonesSolicitar[1]);

    expect(mockNavigate).toHaveBeenCalledTimes(2);
    expect(mockNavigate).toHaveBeenNthCalledWith(1, '/infoUsuario');
    expect(mockNavigate).toHaveBeenNthCalledWith(2, '/infoUsuario');
  });
});