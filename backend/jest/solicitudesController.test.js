import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';

const mockFrom = jest.fn();

jest.unstable_mockModule('../config/supabase.js', () => ({
  supabase: {
    from: mockFrom,
  },
}));

const { crearSolicitud } = await import('../controllers/solicitudesController.js');

const crearRespuestaFalsa = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('Pruebas de solicitudes - solicitudesController', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    mockFrom.mockReset();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test('crearSolicitud debe devolver 400 si la hora no tiene formato AM/PM válido o pasa de 12', async () => {
    const res1 = crearRespuestaFalsa();
    await crearSolicitud({ body: { hora_servicio: '15:00' } }, res1);
    expect(res1.status).toHaveBeenCalledWith(400);

    const res2 = crearRespuestaFalsa();
    await crearSolicitud({ body: { hora_servicio: '13:30 PM' } }, res2);
    expect(res2.status).toHaveBeenCalledWith(400);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  test('crearSolicitud debe convertir correctamente hora PM a 24h y guardar equipo y solicitud', async () => {
    const mockInsertSolicitud = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue({ data: [{ id_solicitud: 120 }], error: null }),
    });

    mockFrom.mockImplementation((tabla) => {
      if (tabla === 'categoria_equipo') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { id_categoria_equipo: 3 }, error: null }),
            }),
          }),
        };
      }
      if (tabla === 'estado') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { id_estado: 1 }, error: null }),
            }),
          }),
        };
      }
      if (tabla === 'equipo') {
        return {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({ data: [{ id_equipo: 99 }], error: null }),
          }),
        };
      }
      if (tabla === 'solicitud') {
        return { insert: mockInsertSolicitud };
      }
    });

    const req = {
      body: {
        equipo: 'Lavadora',
        modelo: 'LG-2024',
        categoria: 'Electrodomésticos',
        fecha: '2026-11-25',
        descripcion: 'No centrifuga',
        direccion: 'Calle 50 # 10-20',
        id_cliente: 12,
        hora_servicio: '02:30 PM',
      },
    };
    const res = crearRespuestaFalsa();

    await crearSolicitud(req, res);

    // Verificamos que "02:30 PM" se convirtió en "14:30:00" y vinculó el equipo 99
    const solicitudInsertada = mockInsertSolicitud.mock.calls[0][0][0];
    expect(solicitudInsertada.hora_servicio).toBe('14:30:00');
    expect(solicitudInsertada.id_equipo).toBe(99);
    expect(solicitudInsertada.usuario_id_cliente).toBe(12);

    expect(res.json).toHaveBeenCalledWith({
      mensaje: '¡Solicitud y equipo guardados en Supabase con éxito!',
      id_solicitud: 120,
    });
  });

  test('crearSolicitud debe convertir 12:00 AM a 00:00:00', async () => {
    const mockInsertSolicitud = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue({ data: [{ id_solicitud: 121 }], error: null }),
    });

    mockFrom.mockImplementation((tabla) => {
      if (tabla === 'categoria_equipo') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { id_categoria_equipo: 1 }, error: null }),
            }),
          }),
        };
      }
      if (tabla === 'estado') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { id_estado: 1 }, error: null }),
            }),
          }),
        };
      }
      if (tabla === 'equipo') {
        return {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({ data: [{ id_equipo: 100 }], error: null }),
          }),
        };
      }
      if (tabla === 'solicitud') {
        return { insert: mockInsertSolicitud };
      }
    });

    const req = {
      body: {
        equipo: 'Nevera',
        categoria: 'Refrigeración',
        fecha: '2026-11-26',
        descripcion: 'No enfría',
        direccion: 'Cra 7 # 40-10',
        id_cliente: 12,
        hora_servicio: '12:00 AM',
      },
    };
    const res = crearRespuestaFalsa();

    await crearSolicitud(req, res);

    expect(mockInsertSolicitud.mock.calls[0][0][0].hora_servicio).toBe('00:00:00');
  });

  test('crearSolicitud debe devolver 500 si la categoría no existe en Supabase', async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
        }),
      }),
    });

    const req = {
      body: { categoria: 'Inexistente', hora_servicio: '09:00 AM' },
    };
    const res = crearRespuestaFalsa();

    await crearSolicitud(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Categoría no encontrada' });
  });
});