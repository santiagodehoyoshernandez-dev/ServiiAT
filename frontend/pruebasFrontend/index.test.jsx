import { render, screen, fireEvent, getAllByText } from '@testing-library/react';
import Index from '../src/pages/index';

// Función espía para simular navigate()
const mockNavigate = jest.fn();

// Reemplazamos useNavigate de react-router-dom por nuestra función espía
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('Pruebas del componente Index', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

test('renderiza la sección principal, imágenes y enlace de WhatsApp', () => {
    render(<Index />);

    expect(screen.getByText(/SERVICIO PREMIUM 5 ESTRELLAS/i)).toBeInTheDocument();
    expect(screen.getByText(/Reparación Profesional de Electrodomésticos/i)).toBeInTheDocument();
    expect(screen.getByAltText('AR Servicio Técnico')).toBeInTheDocument();
    expect(screen.getByAltText('Técnico')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /WhatsApp 3005635595/i })).toBeInTheDocument();
  });

  // Prueba 2: Las 3 tarjetas de servicios y la sección final
  test('renderiza las tres tarjetas de servicios y la sección final', () => {
    render(<Index />);

    expect(screen.getByText('Reparación de electrodomésticos')).toBeInTheDocument();
    expect(screen.getByText('Servicio Especializado')).toBeInTheDocument();
    expect(screen.getByText('Equipos Industriales')).toBeInTheDocument();
    expect(screen.getByText('Expertos en Reparación')).toBeInTheDocument();
  });

  // Prueba 3: Botones de la sección principal (Hero)
  test('navega correctamente desde los botones de la sección principal', () => {
    render(<Index />);

    fireEvent.click(screen.getByRole('button', { name: /Conoce nuestros servicios/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/InfoUsuario');

    fireEvent.click(screen.getByRole('button', { name: /Historial/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/ClienteHistorial');
  });

  // Prueba 4: Botones de las tarjetas y botón final
  test('navega correctamente desde las tarjetas y la sección final', () => {
    render(<Index />);

    fireEvent.click(screen.getByRole('button', { name: /Agendar servicio/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/InfoUsuario');

    fireEvent.click(screen.getByRole('button', { name: /Consultar ahora/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/ServiciosNav');

    fireEvent.click(screen.getByRole('button', { name: /Ver servicios/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/InfoUsuario');

    fireEvent.click(screen.getByRole('button', { name: /Solicitar Servicio Ahora/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/InfoUsuario');

    expect(mockNavigate).toHaveBeenCalledTimes(4);
  });
});