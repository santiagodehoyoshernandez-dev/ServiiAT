import { render, screen, fireEvent } from '@testing-library/react';
import Footer from '../src/components/common/footer';

describe('Pruebas del componente Footer', () => {
  let openSpy;

  beforeEach(() => {
    // Espiamos window.open y evitamos que intente abrir una ventana real
    openSpy = jest.spyOn(window, 'open').mockImplementation(() => {});
  });

  afterEach(() => {
    openSpy.mockRestore();
  });

  // Prueba 1: Renderizado de la información de la empresa, botón y copyright con año actual
  test('renderiza la información de la empresa, el número de WhatsApp y el año actual', () => {
    render(<Footer />);
    const anioActual = new Date().getFullYear();

    expect(screen.getByText('AR SERVICIO TÉCNICO')).toBeInTheDocument();
    expect(screen.getByText(/sector HORECA/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /WhatsApp: 3005635595/i })).toBeInTheDocument();
    expect(
      screen.getByText(`© ${anioActual} AR SERVICIO TÉCNICO - Todos los derechos reservados - Fabio Alexander Rojas Lara`)
    ).toBeInTheDocument();
  });

  // Prueba 2: Clic en el botón de WhatsApp
  test('abre el enlace correcto de WhatsApp en una nueva pestaña al hacer clic', () => {
    render(<Footer />);

    const botonWhatsapp = screen.getByRole('button', { name: /WhatsApp: 3005635595/i });
    fireEvent.click(botonWhatsapp);

    const urlEsperada = `https://wa.me/573005635595?text=Hola%20${encodeURIComponent('Fabio Alexander Rojas Lara')},%20necesito%20información`;
    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy).toHaveBeenCalledWith(urlEsperada, '_blank');
  });

  // Prueba 3: Efecto hover en el botón
  test('cambia la escala del botón en los eventos mouseOver y mouseOut', () => {
    render(<Footer />);

    const botonWhatsapp = screen.getByRole('button', { name: /WhatsApp: 3005635595/i });

    fireEvent.mouseOver(botonWhatsapp);
    expect(botonWhatsapp.style.transform).toBe('scale(1.05)');

    fireEvent.mouseOut(botonWhatsapp);
    expect(botonWhatsapp.style.transform).toBe('scale(1)');
  });
});