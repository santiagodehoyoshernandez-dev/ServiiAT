import { render, screen, fireEvent, act } from '@testing-library/react';
import Configuracion from '../src/pages/Configuracion';

describe('Pruebas del componente Configuracion', () => {
  beforeEach(() => {
    sessionStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  // Prueba 1: Valores iniciales por defecto cuando sessionStorage está vacío
  test('renderiza el título y los valores por defecto cuando no hay datos en sessionStorage', () => {
    render(<Configuracion />);

    expect(screen.getByRole('heading', { name: /Configuración/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Fabio Alexander Rojas Lara')).toBeInTheDocument();
    expect(screen.getByDisplayValue('3005635595')).toBeInTheDocument();
    expect(screen.getByDisplayValue(/Equipos HORECA/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Lunes a Sábado: 8:00 AM - 6:00 PM')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Guardar Configuración/i })).toBeInTheDocument();
  });

  // Prueba 2: Carga previa desde sessionStorage al montar el componente
  test('carga los datos guardados previamente en sessionStorage', () => {
    const configGuardada = {
      nombre: 'Carlos Pérez',
      telefono: '3109998877',
      especialidades: 'Hornos y Refrigeración',
      descripcion: 'Técnico certificado.',
      horario: 'Lunes a Viernes: 9:00 AM - 5:00 PM',
      titulo: 'Soporte Técnico Industrial',
      subtitulo: 'Atención especializada.',
    };
    sessionStorage.setItem('config', JSON.stringify(configGuardada));

    render(<Configuracion />);

    expect(screen.getByDisplayValue('Carlos Pérez')).toBeInTheDocument();
    expect(screen.getByDisplayValue('3109998877')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Hornos y Refrigeración')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Soporte Técnico Industrial')).toBeInTheDocument();
  });

  // Prueba 3: Edición de campos y guardado en sessionStorage
  test('permite editar los campos y guarda la nueva configuración en sessionStorage', () => {
    const { container } = render(<Configuracion />);

    const inputNombre = container.querySelector('input[name="nombre"]');
    const inputTelefono = container.querySelector('input[name="telefono"]');
    const textareaSubtitulo = container.querySelector('textarea[name="subtitulo"]');

    fireEvent.change(inputNombre, { target: { value: 'Nicolás Rojas' } });
    fireEvent.change(inputTelefono, { target: { value: '3001112233' } });
    fireEvent.change(textareaSubtitulo, { target: { value: 'Servicio garantizado en Bogotá.' } });

    fireEvent.click(screen.getByRole('button', { name: /Guardar Configuración/i }));

    const guardado = JSON.parse(sessionStorage.getItem('config'));
    expect(guardado).toMatchObject({
      nombre: 'Nicolás Rojas',
      telefono: '3001112233',
      subtitulo: 'Servicio garantizado en Bogotá.',
    });
  });

  // Prueba 4: Mensaje de éxito y desaparición automática a los 3 segundos
  test('muestra el mensaje de éxito al guardar y lo oculta después de 3 segundos', () => {
    render(<Configuracion />);

    expect(screen.queryByText('Configuración guardada correctamente')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Guardar Configuración/i }));

    expect(screen.getByText('Configuración guardada correctamente')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(screen.queryByText('Configuración guardada correctamente')).not.toBeInTheDocument();
  });
});