import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SolicitudesAdmin from '../src/components/dashboard/SolicitudesAdmin';

const solicitudesMock = [
  {
    id_solicitud: 1,
    nombre_1: 'Nicolás',
    apellido_1: 'Rojas',
    email: 'nicolas@correo.com',
    nombre_equipo: 'Horno Industrial',
    marca_equipo: 'Rational',
    nombre_estado: 'Pendiente',
    descripcion: 'No calienta bien',
    direccion_servicio: 'Calle 123 #45-67',
    fecha_solicitud: '2026-11-30',
  },
];

describe('Pruebas del componente SolicitudesAdmin', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    jest.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Prueba 1: Carga inicial exitosa y renderizado de datos
  test('carga y renderiza la lista de solicitudes correctamente', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => solicitudesMock,
    });

    render(<SolicitudesAdmin />);

    expect(screen.getByText(/Cargando solicitudes.../i)).toBeInTheDocument();

    expect(await screen.findByText(/Solicitudes totales encontradas: 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Nicolás Rojas/i)).toBeInTheDocument();
    expect(screen.getByText(/Horno Industrial/i)).toBeInTheDocument();
    expect(screen.getByText(/No calienta bien/i)).toBeInTheDocument();
  });

  // Prueba 2: Error al conectar con el servidor
  test('muestra mensaje de error si falla la conexión con el servidor', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network Error'));

    render(<SolicitudesAdmin />);

    expect(
      await screen.findByText(/No se pudo conectar con el servidor \(puerto 3001\)\./i)
    ).toBeInTheDocument();
  });

  // Prueba 3: Cambiar hora programada y actualizar estado (PUT + notificación POST)
  test('actualiza el estado con la hora elegida, envía notificación y muestra alerta de éxito', async () => {
    // 1. Carga inicial, 2. PUT de estado, 3. POST de notificación
    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => solicitudesMock })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });

    const { container } = render(<SolicitudesAdmin />);

    await screen.findByText(/Nicolás Rojas/i);

    // Cambiamos la hora programada a 14:30
    const inputHora = container.querySelector('input[type="time"]');
    fireEvent.change(inputHora, { target: { value: '14:30' } });

    // Cambiamos el estado a "En proceso"
    const selectEstado = screen.getByRole('combobox');
    fireEvent.change(selectEstado, { target: { value: 'En proceso' } });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'https://localhost:3001/api/admin/solicitudes/1/estado',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ id_estado: 2, nombre_estado: 'En proceso' }),
        })
      );

      expect(global.fetch).toHaveBeenCalledWith(
        'https://localhost:3001/api/notificaciones/enviar',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            nombreCliente: 'Nicolás Rojas',
            email: 'nicolas@correo.com',
            estado: 'En proceso',
            fecha_solicitud: '2026-11-30',
            hora: '14:30',
            descripcion: 'No calienta bien',
            nombre_equipo: 'Horno Industrial',
          }),
        })
      );

      expect(window.alert).toHaveBeenCalledWith('✅ Estado actualizado a "En proceso"');
      expect(selectEstado).toHaveValue('En proceso');
    });
  });

  // Prueba 4: Error del servidor al intentar cambiar el estado
  test('muestra alerta de error si el servidor falla al actualizar el estado', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => solicitudesMock })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Error al actualizar en BD' }) });

    render(<SolicitudesAdmin />);
    await screen.findByText(/Nicolás Rojas/i);

    const selectEstado = screen.getByRole('combobox');
    fireEvent.change(selectEstado, { target: { value: 'Finalizado' } });

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('❌ Error al actualizar en BD');
    });
    // No debería haber llamado al endpoint de notificaciones
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});