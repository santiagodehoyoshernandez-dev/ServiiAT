import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// Doble de acción para Supabase: intercepta .from() sin conectarse a la BD real
const mockFrom = jest.fn();

jest.unstable_mockModule('../config/supabase.js', () => ({
  supabase: {
    from: mockFrom,
  },
}));

// Se importa el controlador DESPUÉS de activar el mock
const { resolverSolicitud, registrarUsuarioPorAdmin } = await import(
  '../controllers/adminController.js'
);

const crearRespuestaFalsa = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('Pruebas de negocio - adminController', () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  // --- BLOQUE 1: Datos inválidos (debe responder 400 sin tocar Supabase) ---

  test('Debe devolver 400 si el ID de la solicitud no es válido', async () => {
    const req = { params: { id: 'abc' }, body: { decision: 'aprobar', id_tecnico: 5 } };
    const res = crearRespuestaFalsa();

    await resolverSolicitud(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  test('Debe devolver 400 si la decisión no es "aprobar" ni "rechazar"', async () => {
    const req = { params: { id: '78' }, body: { decision: 'borrar', id_tecnico: 5 } };
    const res = crearRespuestaFalsa();

    await resolverSolicitud(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  test('Debe devolver 400 si aprueba la solicitud sin elegir un técnico válido', async () => {
    const req = { params: { id: '78' }, body: { decision: 'aprobar', id_tecnico: 0 } };
    const res = crearRespuestaFalsa();

    await resolverSolicitud(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  test('registrarUsuarioPorAdmin debe devolver 400 si intentan crear un rol que no sea Técnico (2) ni Admin (3)', async () => {
    const req = { body: { rol: '1', nombre_1: 'Prueba' } };
    const res = crearRespuestaFalsa();

    await registrarUsuarioPorAdmin(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  // --- BLOQUE 2: Respuestas simuladas de Supabase (404 y 409) ---

  test('Debe devolver 404 si la solicitud no existe en Supabase', async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });

    const req = { params: { id: '9999' }, body: { decision: 'aprobar', id_tecnico: 5 } };
    const res = crearRespuestaFalsa();

    await resolverSolicitud(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'No se encontró la solicitud.' });
  });

  test('Debe devolver 409 si intentan resolver una solicitud que ya está Finalizada', async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({
            data: { id_solicitud: 78, estado: { nombre_estado: 'Finalizado' } },
            error: null,
          }),
        }),
      }),
    });

    const req = { params: { id: '78' }, body: { decision: 'aprobar', id_tecnico: 5 } };
    const res = crearRespuestaFalsa();

    await resolverSolicitud(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Solo se pueden resolver solicitudes pendientes.',
    });
  });
});