import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';

const mockFrom = jest.fn();

jest.unstable_mockModule('../config/supabase.js', () => ({
  supabase: {
    from: mockFrom,
  },
}));

const {
  obtenerSolicitudesTecnico,
  guardarPrecioServicio,
  cambiarEstadoPorTecnico,
} = await import('../controllers/tecnicoController.js');

const crearRespuestaFalsa = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('Pruebas de negocio - tecnicoController', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    mockFrom.mockReset();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  // ==================== OBTENER SOLICITUDES ====================

  test('obtenerSolicitudesTecnico debe devolver 401 si la sesión del técnico no es válida', async () => {
    const req = { auth: { id: 0 } };
    const res = crearRespuestaFalsa();

    await obtenerSolicitudesTecnico(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  test('obtenerSolicitudesTecnico debe devolver [] si el técnico no tiene órdenes asignadas', async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });

    const req = { auth: { id: 7 } };
    const res = crearRespuestaFalsa();

    await obtenerSolicitudesTecnico(req, res);

    expect(res.json).toHaveBeenCalledWith([]);
  });

  // ==================== GUARDAR PRECIO ====================

  test('guardarPrecioServicio debe devolver 400 si el precio es <= 0 o tiene más de 2 decimales', async () => {
    const res1 = crearRespuestaFalsa();
    await guardarPrecioServicio(
      { params: { id: '10' }, auth: { id: 7 }, body: { precio_servicio: -5000 } },
      res1
    );
    expect(res1.status).toHaveBeenCalledWith(400);

    const res2 = crearRespuestaFalsa();
    await guardarPrecioServicio(
      { params: { id: '10' }, auth: { id: 7 }, body: { precio_servicio: 50000.123 } },
      res2
    );
    expect(res2.status).toHaveBeenCalledWith(400);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  test('guardarPrecioServicio debe devolver 409 si la solicitud aún está Pendiente', async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id_solicitud: 10, estado: { nombre_estado: 'Pendiente' } },
            error: null,
          }),
        }),
      }),
    });

    const req = { params: { id: '10' }, auth: { id: 7 }, body: { precio_servicio: 80000 } };
    const res = crearRespuestaFalsa();

    await guardarPrecioServicio(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: 'El técnico solo puede cotizar un servicio en proceso o finalizado.',
    });
  });

  test('guardarPrecioServicio debe devolver 403 si el trabajo pertenece a otro técnico', async () => {
    mockFrom.mockImplementation((tabla) => {
      if (tabla === 'solicitud') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id_solicitud: 10, estado: { nombre_estado: 'En proceso' } },
                error: null,
              }),
            }),
          }),
        };
      }
      if (tabla === 'orden_servicio') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: { id_orden_servicio: 50, precio_servicio: 0, usuario_id_tecnico: 99 },
                error: null,
              }),
            }),
          }),
        };
      }
    });

    const req = { params: { id: '10' }, auth: { id: 7 }, body: { precio_servicio: 80000 } };
    const res = crearRespuestaFalsa();

    await guardarPrecioServicio(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Este trabajo está asignado a otro técnico.',
    });
  });

  test('guardarPrecioServicio debe devolver 409 si el servicio ya fue pagado (tiene ticket)', async () => {
    mockFrom.mockImplementation((tabla) => {
      if (tabla === 'solicitud') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id_solicitud: 10, estado: { nombre_estado: 'Finalizado' } },
                error: null,
              }),
            }),
          }),
        };
      }
      if (tabla === 'orden_servicio') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: { id_orden_servicio: 50, precio_servicio: 80000, usuario_id_tecnico: 7 },
                error: null,
              }),
            }),
          }),
        };
      }
      if (tabla === 'ticket') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: { id_ticket: 300 },
                error: null,
              }),
            }),
          }),
        };
      }
    });

    const req = { params: { id: '10' }, auth: { id: 7 }, body: { precio_servicio: 90000 } };
    const res = crearRespuestaFalsa();

    await guardarPrecioServicio(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: 'El servicio ya fue pagado y su precio no se puede modificar.',
    });
  });

  test('guardarPrecioServicio debe devolver 409 si ya se envió una cotización con otro precio', async () => {
    mockFrom.mockImplementation((tabla) => {
      if (tabla === 'solicitud') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id_solicitud: 10, estado: { nombre_estado: 'En proceso' } },
                error: null,
              }),
            }),
          }),
        };
      }
      if (tabla === 'orden_servicio') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: { id_orden_servicio: 50, precio_servicio: 80000, usuario_id_tecnico: 7 },
                error: null,
              }),
            }),
          }),
        };
      }
      if (tabla === 'ticket') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      }
    });

    const req = { params: { id: '10' }, auth: { id: 7 }, body: { precio_servicio: 95000 } };
    const res = crearRespuestaFalsa();

    await guardarPrecioServicio(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: 'La cotización ya fue enviada al cliente y no se puede modificar.',
    });
  });

  test('guardarPrecioServicio debe guardar la cotización correctamente cuando todo es válido', async () => {
    mockFrom.mockImplementation((tabla) => {
      if (tabla === 'solicitud') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id_solicitud: 10,
                  fecha_solicitud: '2026-11-20',
                  hora_servicio: '10:00:00',
                  id_estado_solicitud: 2,
                  estado: { nombre_estado: 'En proceso' },
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (tabla === 'orden_servicio') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: { id_orden_servicio: 50, precio_servicio: null, usuario_id_tecnico: 7 },
                error: null,
              }),
            }),
          }),
          upsert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id_orden_servicio: 50, precio_servicio: 85000 },
                error: null,
              }),
            }),
          }),
        };
      }
      if (tabla === 'ticket') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      }
    });

    const req = { params: { id: '10' }, auth: { id: 7 }, body: { precio_servicio: 85000 } };
    const res = crearRespuestaFalsa();

    await guardarPrecioServicio(req, res);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      mensaje: 'Precio guardado en pesos colombianos.',
      precio_servicio: 85000,
    });
  });

  // ==================== CAMBIAR ESTADO ====================

  test('cambiarEstadoPorTecnico debe devolver 400 si el estado enviado no está permitido', async () => {
    const req = { params: { id: '10' }, auth: { id: 7 }, body: { nombre_estado: 'Pendiente' } };
    const res = crearRespuestaFalsa();

    await cambiarEstadoPorTecnico(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  test('cambiarEstadoPorTecnico debe devolver 403 si la solicitud no ha sido asignada por el admin', async () => {
    mockFrom.mockImplementation((tabla) => {
      if (tabla === 'solicitud') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: { id_solicitud: 10, estado: { nombre_estado: 'Pendiente' } },
                error: null,
              }),
            }),
          }),
        };
      }
      if (tabla === 'orden_servicio') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      }
    });

    const req = { params: { id: '10' }, auth: { id: 7 }, body: { nombre_estado: 'En proceso' } };
    const res = crearRespuestaFalsa();

    await cambiarEstadoPorTecnico(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Esta solicitud aún no ha sido asignada por el administrador.',
    });
  });

  test('cambiarEstadoPorTecnico debe devolver 409 si intenta saltar de Pendiente a Finalizado', async () => {
    mockFrom.mockImplementation((tabla) => {
      if (tabla === 'solicitud') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: { id_solicitud: 10, estado: { nombre_estado: 'Pendiente' } },
                error: null,
              }),
            }),
          }),
        };
      }
      if (tabla === 'orden_servicio') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: { id_orden_servicio: 50, usuario_id_tecnico: 7 },
                error: null,
              }),
            }),
          }),
        };
      }
    });

    const req = { params: { id: '10' }, auth: { id: 7 }, body: { nombre_estado: 'Finalizado' } };
    const res = crearRespuestaFalsa();

    await cambiarEstadoPorTecnico(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: 'No se puede cambiar el trabajo desde su estado actual.',
    });
  });

  test('cambiarEstadoPorTecnico debe actualizar de Pendiente a En proceso correctamente', async () => {
    mockFrom.mockImplementation((tabla) => {
      if (tabla === 'solicitud') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: {
                  id_solicitud: 10,
                  id_estado_solicitud: 1,
                  estado: { nombre_estado: 'Pendiente' },
                },
                error: null,
              }),
            }),
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: { id_solicitud: 10, estado: { nombre_estado: 'En proceso' } },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (tabla === 'orden_servicio') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: { id_orden_servicio: 50, usuario_id_tecnico: 7 },
                error: null,
              }),
            }),
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          }),
        };
      }
      if (tabla === 'estado') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { id_estado: 2 }, error: null }),
            }),
          }),
        };
      }
    });

    const req = { params: { id: '10' }, auth: { id: 7 }, body: { nombre_estado: 'En proceso' } };
    const res = crearRespuestaFalsa();

    await cambiarEstadoPorTecnico(req, res);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      mensaje: 'Estado actualizado y trabajo asignado al técnico.',
      solicitud: { id_solicitud: 10, estado: { nombre_estado: 'En proceso' } },
    });
  });
});