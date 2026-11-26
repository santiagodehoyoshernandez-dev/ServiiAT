import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';

const mockFrom = jest.fn();

jest.unstable_mockModule('../config/supabase.js', () => ({
  supabase: {
    from: mockFrom,
  },
}));

const { obtenerHistorialCliente } = await import('../controllers/clienteController.js');

const crearRespuestaFalsa = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('Pruebas de cliente - clienteController', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    mockFrom.mockReset();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test('obtenerHistorialCliente debe devolver [] sin consultar órdenes si el cliente no tiene solicitudes', async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    });

    const req = { params: { id: '12' } };
    const res = crearRespuestaFalsa();

    await obtenerHistorialCliente(req, res);

    expect(mockFrom).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith([]);
  });

  test('obtenerHistorialCliente debe cruzar precios y marcar correctamente servicios pagados y pendientes', async () => {
    mockFrom.mockImplementation((tabla) => {
      if (tabla === 'solicitud') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [
                  {
                    id_solicitud: 101,
                    fecha_solicitud: '2026-11-20',
                    descripcion: 'Cambio de motor',
                    direccion_servicio: 'Calle 10',
                    estado: { nombre_estado: 'Finalizado' },
                    equipo: { nombre_equipo: 'Lavadora', marca_equipo: 'Samsung' },
                  },
                  {
                    id_solicitud: 102,
                    fecha_solicitud: '2026-11-21',
                    descripcion: 'Revisión general',
                    direccion_servicio: 'Calle 20',
                    estado: null,
                    equipo: null,
                  },
                ],
                error: null,
              }),
            }),
          }),
        };
      }
      if (tabla === 'orden_servicio') {
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({
              data: [{ id_orden_servicio: 500, id_solicitud: 101, precio_servicio: 120000 }],
              error: null,
            }),
          }),
        };
      }
      if (tabla === 'ticket') {
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({
              data: [{ id_orden_servicio: 500 }],
              error: null,
            }),
          }),
        };
      }
    });

    const req = { params: { id: '12' } };
    const res = crearRespuestaFalsa();

    await obtenerHistorialCliente(req, res);

    expect(res.json).toHaveBeenCalledWith([
      {
        id_solicitud: 101,
        fecha_solicitud: '2026-11-20',
        descripcion: 'Cambio de motor',
        direccion_servicio: 'Calle 10',
        nombre_estado: 'Finalizado',
        nombre_equipo: 'Lavadora',
        marca_equipo: 'Samsung',
        precio_servicio: 120000,
        pagado: true,
      },
      {
        id_solicitud: 102,
        fecha_solicitud: '2026-11-21',
        descripcion: 'Revisión general',
        direccion_servicio: 'Calle 20',
        nombre_estado: 'Pendiente',
        nombre_equipo: 'Equipo no especificado',
        marca_equipo: 'No especificada',
        precio_servicio: null,
        pagado: false,
      },
    ]);
  });

  test('obtenerHistorialCliente debe devolver 500 si Supabase falla', async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: null, error: new Error('DB caída') }),
        }),
      }),
    });

    const req = { params: { id: '12' } };
    const res = crearRespuestaFalsa();

    await obtenerHistorialCliente(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Error al cargar historial',
      detalle: 'DB caída',
    });
  });
});