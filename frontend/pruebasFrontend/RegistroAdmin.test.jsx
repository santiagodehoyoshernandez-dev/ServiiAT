import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { fetchseguro } from '../src/utils/fetchseguro';
import RegistroAdmin from '../src/components/dashboard/RegistroAdmin';

jest.mock('../src/utils/fetchseguro', () => ({
  fetchseguro: jest.fn(),
}));

describe('Pruebas del componente RegistroAdmin', () => {
  beforeEach(() => {
    fetchseguro.mockClear();
    sessionStorage.clear();
    jest.spyOn(window, 'alert').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Helper para llenar los campos obligatorios
  const llenarFormulario = () => {
    fireEvent.change(screen.getByLabelText(/Primer nombre/i), { target: { value: 'Carlos' } });
    fireEvent.change(screen.getByLabelText(/Primer apellido/i), { target: { value: 'Pérez' } });
    fireEvent.change(screen.getByLabelText(/Número de documento/i), { target: { value: '1020304050' } });
    fireEvent.change(screen.getByLabelText(/Fecha de nacimiento/i), { target: { value: '1995-05-15' } });
    fireEvent.change(screen.getByLabelText(/Correo electrónico/i), { target: { value: 'carlos@serviat.com' } });
    fireEvent.change(screen.getByLabelText(/Teléfono/i), { target: { value: '3001112233' } });
    fireEvent.change(screen.getByLabelText(/Dirección/i), { target: { value: 'Calle 50 #10-20' } });
  };

  // Prueba 1: Renderizado inicial y valores por defecto
  test('renderiza el encabezado, secciones y valores por defecto', () => {
    render(<RegistroAdmin />);

    expect(screen.getByRole('heading', { name: /Registrar nuevo empleado/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Tipo de documento/i)).toHaveValue('CC');
    expect(screen.getByLabelText(/Rol del empleado/i)).toHaveValue('2');
    expect(screen.getByRole('button', { name: /Registrar empleado/i })).toBeInTheDocument();
  });

  // Prueba 2: Registro exitoso, envío correcto del payload y limpieza del formulario
  test('registra un empleado exitosamente, muestra mensaje y limpia el formulario', async () => {
    sessionStorage.setItem('token', 'token-admin-123');
    fetchseguro.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ mensaje: 'Creado' }),
    });

    render(<RegistroAdmin />);
    llenarFormulario();

    fireEvent.click(screen.getByRole('button', { name: /Registrar empleado/i }));

    await waitFor(() => {
      expect(fetchseguro).toHaveBeenCalledWith(
        'https://localhost:3001/api/admin/crear-usuario',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer token-admin-123',
          },
          body: JSON.stringify({
            nombre_1: 'Carlos',
            nombre_2: '',
            apellido_1: 'Pérez',
            apellido_2: '',
            tipo_documento: 'CC',
            documento: '1020304050',
            fecha_nacimiento: '1995-05-15',
            email: 'carlos@serviat.com',
            numero_tel: '3001112233',
            direccion_comp: 'Calle 50 #10-20',
            rol: '2',
          }),
        })
      );

      expect(screen.getByRole('status')).toHaveTextContent(
        '✅ Personal registrado y credenciales enviadas por correo.'
      );
      // Verificamos que el formulario se haya limpiado
      expect(screen.getByLabelText(/Primer nombre/i)).toHaveValue('');
      expect(screen.getByLabelText(/Correo electrónico/i)).toHaveValue('');
    });
  });

  // Prueba 3: Error devuelto por el servidor (!resp.ok)
  test('muestra alerta con el error cuando el servidor rechaza el registro', async () => {
    fetchseguro.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'El correo ya está registrado' }),
    });

    render(<RegistroAdmin />);
    llenarFormulario();

    fireEvent.click(screen.getByRole('button', { name: /Registrar empleado/i }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Error: El correo ya está registrado');
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  // Prueba 4: Error de red / conexión caída
  test('muestra alerta de error de conexión si fetchseguro falla', async () => {
    fetchseguro.mockRejectedValueOnce(new Error('Network Error'));

    render(<RegistroAdmin />);
    llenarFormulario();

    fireEvent.click(screen.getByRole('button', { name: /Registrar empleado/i }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Error de conexión con el servidor.');
    });
  });
});