import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';

const mockFrom = jest.fn();

jest.unstable_mockModule('../config/supabase.js', () => ({
  supabase: {
    from: mockFrom,
  },
}));

const { obtenerPerfil, actualizarPerfil } = await import('../controllers/perfilusuario.js');

const crearRespuestaFalsa = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('Pruebas de perfil - perfilusuario', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    mockFrom.mockReset();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test('obtenerPerfil debe devolver 400 si no llega ID válido ni correo', async () => {
    const req = { params: {}, query: {}, body: {} };
    const res = crearRespuestaFalsa();

    await obtenerPerfil(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'No se pudo identificar al usuario actual.' });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  test('obtenerPerfil debe devolver 404 si el usuario no existe en Supabase', async () => {
    mockFrom.mockImplementation((tabla) => {
      if (tabla === 'usuario') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      }
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      };
    });

    const req = { params: { id: '999' }, query: {}, body: {} };
    const res = crearRespuestaFalsa();

    await obtenerPerfil(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Usuario no encontrado.' });
  });

  test('obtenerPerfil debe devolver los datos combinados de las 4 tablas correctamente', async () => {
    mockFrom.mockImplementation((tabla) => {
      if (tabla === 'usuario') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: {
                  id_usuario: 5,
                  nombre_1: 'Laura',
                  nombre_2: '',
                  apellido_1: 'Méndez',
                  apellido_2: 'Ríos',
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (tabla === 'correo_electronico') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: [{ direccion_email: 'laura@correo.com' }],
                error: null,
              }),
            }),
          }),
        };
      }
      if (tabla === 'telefono') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: [{ numero: '3101112233' }],
                error: null,
              }),
            }),
          }),
        };
      }
      if (tabla === 'direccion') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: [{ direccion_completa: 'Calle 80 # 15-20' }],
                error: null,
              }),
            }),
          }),
        };
      }
    });

    const req = { params: { id: '5' }, query: {}, body: {} };
    const res = crearRespuestaFalsa();

    await obtenerPerfil(req, res);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      perfil: {
        nombre_1: 'Laura',
        nombre_2: '',
        apellido_1: 'Méndez',
        apellido_2: 'Ríos',
        email: 'laura@correo.com',
        numero_tel: '3101112233',
        direccion: 'Calle 80 # 15-20',
      },
    });
  });

  test('actualizarPerfil debe devolver 400 si falta primer nombre, primer apellido o correo', async () => {
    const req = {
      params: { id: '5' },
      query: {},
      body: { nombre_1: 'Laura', apellido_1: '   ', email: 'laura@correo.com' },
    };
    const res = crearRespuestaFalsa();

    await actualizarPerfil(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Primer nombre, primer apellido y correo son obligatorios.',
    });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  test('actualizarPerfil debe actualizar usuario/correo y crear teléfono/dirección si no existían', async () => {
    const mockInsertTel = jest.fn().mockResolvedValue({ error: null });
    const mockInsertDir = jest.fn().mockResolvedValue({ error: null });

    mockFrom.mockImplementation((tabla) => {
      if (tabla === 'usuario') {
        return {
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      if (tabla === 'correo_electronico') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: [{ id_usuario: 5 }], error: null }),
            }),
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      if (tabla === 'telefono') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
          insert: mockInsertTel,
        };
      }
      if (tabla === 'direccion') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
          insert: mockInsertDir,
        };
      }
    });

    const req = {
      params: { id: '5' },
      query: {},
      body: {
        nombre_1: '  Laura ',
        nombre_2: '',
        apellido_1: 'Méndez',
        apellido_2: '',
        email: 'nuevo@correo.com',
        numero_tel: '3209998877',
        direccion: 'Av Boyacá # 10-20',
      },
    };
    const res = crearRespuestaFalsa();

    await actualizarPerfil(req, res);

    expect(mockInsertTel).toHaveBeenCalledTimes(1);
    expect(mockInsertDir).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({
      mensaje: 'Perfil actualizado correctamente.',
      perfil: {
        nombre_1: 'Laura',
        nombre_2: '',
        apellido_1: 'Méndez',
        apellido_2: '',
        email: 'nuevo@correo.com',
        numero_tel: '3209998877',
        direccion: 'Av Boyacá # 10-20',
      },
    });
  });
});