import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { fetchseguro } from '../src/utils/fetchseguro';
import PerfilUsuario from '../src/pages/PerfilUsuario';

jest.mock('../src/utils/fetchseguro', () => ({
  fetchseguro: jest.fn(),
}));

const perfilMock = {
  nombre_1: 'Nicolás',
  nombre_2: 'Andrés',
  apellido_1: 'Rojas',
  apellido_2: 'Lara',
  email: 'nicolas@correo.com',
  numero_tel: '3001234567',
  direccion: 'Calle 100 #15-20',
};

describe('Pruebas del componente PerfilUsuario', () => {
  beforeEach(() => {
    fetchseguro.mockClear();
    sessionStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Prueba 1: Carga inicial exitosa con datos desde sessionStorage
  test('carga el perfil usando id y email de sessionStorage y llena los campos', async () => {
    sessionStorage.setItem('rol', 'cliente');
    sessionStorage.setItem('userEmail', 'nicolas@correo.com');
    sessionStorage.setItem(
      'user',
      JSON.stringify({ id_usuario: 10, nombre: 'Nicolás', email: 'nicolas@correo.com' })
    );

    fetchseguro.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ perfil: perfilMock }),
    });

    render(<PerfilUsuario />);

    expect(screen.getByText(/Cargando tus datos.../i)).toBeInTheDocument();

    expect(await screen.findByLabelText('Primer nombre')).toHaveValue('Nicolás');
    expect(screen.getByLabelText('Segundo nombre')).toHaveValue('Andrés');
    expect(screen.getByLabelText('Primer apellido')).toHaveValue('Rojas');
    expect(screen.getByLabelText('Segundo apellido')).toHaveValue('Lara');
    expect(screen.getByLabelText('Correo electrónico')).toHaveValue('nicolas@correo.com');
    expect(screen.getByLabelText('Teléfono')).toHaveValue('3001234567');
    expect(screen.getByLabelText('Dirección')).toHaveValue('Calle 100 #15-20');

    expect(screen.getByRole('heading', { name: 'Nicolás Andrés Rojas Lara' })).toBeInTheDocument();
    expect(screen.getByText('cliente')).toBeInTheDocument();

    expect(fetchseguro).toHaveBeenCalledWith(
      'https://localhost:3001/api/perfil?id=10&email=nicolas%40correo.com'
    );
  });

  // Prueba 2: Error al cargar el perfil desde el servidor
  test('muestra alerta de error si falla la carga inicial del perfil', async () => {
    fetchseguro.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Usuario no encontrado.' }),
    });

    render(<PerfilUsuario />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Usuario no encontrado.');
  });

  // Prueba 3: Edición, guardado exitoso y actualización de sessionStorage
  test('actualiza el perfil, muestra mensaje de éxito y sincroniza sessionStorage', async () => {
    sessionStorage.setItem('id_usuario', '10');
    sessionStorage.setItem('userEmail', 'nicolas@correo.com');
    sessionStorage.setItem(
      'user',
      JSON.stringify({ id: 10, nombre: 'Nicolás', email: 'nicolas@correo.com', rol: 'cliente' })
    );

    const perfilActualizado = {
      ...perfilMock,
      nombre_1: 'Nico',
      email: 'nuevo@correo.com',
      numero_tel: '3109998877',
    };

    // 1. Carga inicial GET, 2. Guardado PUT
    fetchseguro
      .mockResolvedValueOnce({ ok: true, json: async () => ({ perfil: perfilMock }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          perfil: perfilActualizado,
          mensaje: 'Perfil actualizado con éxito.',
        }),
      });

    render(<PerfilUsuario />);

    const inputNombre = await screen.findByLabelText('Primer nombre');
    const inputEmail = screen.getByLabelText('Correo electrónico');
    const inputTelefono = screen.getByLabelText('Teléfono');

    fireEvent.change(inputNombre, { target: { value: 'Nico' } });
    fireEvent.change(inputEmail, { target: { value: 'nuevo@correo.com' } });
    fireEvent.change(inputTelefono, { target: { value: '3109998877' } });

    fireEvent.click(screen.getByRole('button', { name: /Guardar cambios/i }));

    await waitFor(() => {
      expect(fetchseguro).toHaveBeenCalledWith(
        'https://localhost:3001/api/perfil',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...perfilActualizado,
            id_usuario: '10',
            email_actual: 'nicolas@correo.com',
          }),
        })
      );

      expect(screen.getByRole('status')).toHaveTextContent('Perfil actualizado con éxito.');
      expect(sessionStorage.getItem('userEmail')).toBe('nuevo@correo.com');
      expect(JSON.parse(sessionStorage.getItem('user'))).toMatchObject({
        id: 10,
        nombre: 'Nico Andrés',
        email: 'nuevo@correo.com',
        rol: 'cliente',
      });
    });
  });

  // Prueba 4: Error al guardar los cambios
  test('muestra alerta de error cuando el servidor rechaza la actualización', async () => {
    sessionStorage.setItem('id_usuario', '10');

    fetchseguro
      .mockResolvedValueOnce({ ok: true, json: async () => ({ perfil: perfilMock }) })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'El correo ya está en uso.' }),
      });

    render(<PerfilUsuario />);
    await screen.findByLabelText('Primer nombre');

    fireEvent.click(screen.getByRole('button', { name: /Guardar cambios/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('El correo ya está en uso.');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});