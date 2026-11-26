import { render, screen, fireEvent } from '@testing-library/react';
import InformacionPaso1 from '../src/components/client/infoFormulario';

// Función espía para simular navigate()
const mockNavigate = jest.fn();

// Reemplazamos useNavigate de react-router-dom por nuestra función espía
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// describe() agrupa todas las pruebas de este componente
describe('Pruebas del componente InformacionPaso1', () => {
  
  // beforeEach() se ejecuta antes de cada test para limpiar el contador de llamadas
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  // Prueba 1: Verificar que los textos principales y la lista se muestren
  test('renderiza los textos principales y la lista de información importante', () => {
    render(<InformacionPaso1 />);

    expect(screen.getByText(/Sigue los pasos para completar tu solicitud de servicio/i)).toBeInTheDocument();
    expect(screen.getByText(/Registrar solicitud de servicio/i)).toBeInTheDocument();
    expect(screen.getByText(/Información importante/i)).toBeInTheDocument();

    // Verificamos los 4 puntos de la lista
    expect(screen.getByText(/Asegúrate de tener la información del electrodoméstico/i)).toBeInTheDocument();
    expect(screen.getByText(/Prepara tu dirección completa para la visita/i)).toBeInTheDocument();
    expect(screen.getByText(/Ten a mano tu número de teléfono/i)).toBeInTheDocument();
    expect(screen.getByText(/Revisa los horarios disponibles antes de agendar/i)).toBeInTheDocument();
  });

  // Prueba 2: Verificar que el botón navega a "/Formulario" al hacer clic
  test('navega a /Formulario cuando el usuario hace clic en el botón continuar', () => {
    render(<InformacionPaso1 />);

    const boton = screen.getByRole('button', { name: /Continuar al Siguiente Paso/i });
    fireEvent.click(boton);

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/Formulario');
  });

  // Prueba 3: Verificar el efecto visual del botón al pasar y quitar el mouse
  test('cambia la escala del botón en los eventos mouseOver y mouseOut', () => {
    render(<InformacionPaso1 />);

    const boton = screen.getByRole('button', { name: /Continuar al Siguiente Paso/i });

    fireEvent.mouseOver(boton);
    expect(boton.style.transform).toBe('scale(1.05)');

    fireEvent.mouseOut(boton);
    expect(boton.style.transform).toBe('scale(1)');
  });
});