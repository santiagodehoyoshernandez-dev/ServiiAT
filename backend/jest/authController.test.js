import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Doble de acción para Supabase
const mockFrom = jest.fn();

jest.unstable_mockModule('../config/supabase.js', () => ({
  supabase: {
    from: mockFrom,
  },
}));

const { registro, login } = await import('../controllers/authController.js');

const crearRespuestaFalsa = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('Pruebas de autenticación - authController', () => {
  const SECRETO_PRUEBA = 'clave_secreta_de_pruebas';

  beforeEach(() => {
    mockFrom.mockReset();
    process.env.JWT_TOKEN = SECRETO_PRUEBA;
  });

  //  LOGIN 

  test('login debe devolver 401 si el correo no está registrado', async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: { message: 'No encontrado' } }),
        }),
      }),
    });

    const req = { body: { email: 'noexiste@correo.com', password: '123' } };
    const res = crearRespuestaFalsa();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ mensaje: 'Correo no registrado' });
  });

  test('login debe devolver 401 si la contraseña no coincide con el hash guardado', async () => {
    const hashGuardado = bcrypt.hashSync('ClaveCorrecta123', 4);

    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id_usuario: 10, nombre_1: 'Carlos', id_roles: 1, clave: hashGuardado },
            error: null,
          }),
        }),
      }),
    });

    const req = { body: { email: 'carlos@correo.com', password: 'ClaveEquivocada' } };
    const res = crearRespuestaFalsa();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ mensaje: 'Contraseña incorrecta' });
  });

  test('login exitoso debe mapear el rol, devolver datos y firmar un JWT válido', async () => {
    const hashGuardado = bcrypt.hashSync('ClaveCorrecta123', 4);

    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id_usuario: 20, nombre_1: 'Ana', id_roles: 2, clave: hashGuardado },
            error: null,
          }),
        }),
      }),
    });

    // También comprobamos que ignore espacios al inicio/final en la contraseña
    const req = { body: { email: 'ana@correo.com', password: '  ClaveCorrecta123  ' } };
    const res = crearRespuestaFalsa();

    await login(req, res);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        mensaje: 'Bienvenido',
        rol: 'tecnico',
        id: 20,
        nombre: 'Ana',
        email: 'ana@correo.com',
        token: expect.any(String),
      })
    );

    // Verificamos que el token devuelto sea válido y traiga los datos del usuario
    const respuestaEnviada = res.json.mock.calls[0][0];
    const tokenDecodificado = jwt.verify(respuestaEnviada.token, SECRETO_PRUEBA);
    expect(tokenDecodificado.id).toBe(20);
    expect(tokenDecodificado.rol).toBe('tecnico');
    expect(tokenDecodificado.id_roles).toBe(2);
  });

  test('login debe devolver 500 si ocurre una excepción inesperada', async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockRejectedValue(new Error('Fallo de conexión')),
        }),
      }),
    });

    const req = { body: { email: 'ana@correo.com', password: '123' } };
    const res = crearRespuestaFalsa();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Fallo de conexión' });
  });

  //REGISTRO 

  test('registro exitoso debe encriptar la clave, asignar rol cliente (1) y guardar datos adicionales', async () => {
    const mockInsertUsuario = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue({ data: [{ id_usuario: 55 }], error: null }),
    });

    mockFrom.mockImplementation((tabla) => {
      if (tabla === 'usuario') {
        return { insert: mockInsertUsuario };
      }
      return { insert: jest.fn().mockResolvedValue({ error: null }) };
    });

    const req = {
      body: {
        nombre_1: 'Juan',
        nombre_2: 'David',
        apellido_1: 'Pérez',
        apellido_2: 'Gómez',
        tipo_documento: 'CC',
        documento: '10101010',
        clave: 'MiPassword2026',
        fecha_nacimiento: '2000-05-10',
        email: 'juan@correo.com',
        numero_tel: '3001234567',
        direccion_comp: 'Calle 10 # 20-30',
      },
    };
    const res = crearRespuestaFalsa();

    await registro(req, res);

    // Comprobamos que NO guardó la contraseña en texto plano y forzó rol 1
    const usuarioInsertado = mockInsertUsuario.mock.calls[0][0][0];
    expect(usuarioInsertado.id_roles).toBe(1);
    expect(usuarioInsertado.clave).not.toBe('MiPassword2026');
    expect(bcrypt.compareSync('MiPassword2026', usuarioInsertado.clave)).toBe(true);

    expect(res.json).toHaveBeenCalledWith({ mensaje: 'Registro completo en Supabase' });
  });

  test('registro debe devolver 500 si Supabase rechaza el usuario (ej. documento duplicado)', async () => {
    mockFrom.mockReturnValue({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'duplicate key value' },
        }),
      }),
    });

    const req = { body: { nombre_1: 'Juan', documento: '10101010', clave: 'MiPassword2026' } };
    const res = crearRespuestaFalsa();

    await registro(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Error al guardar en Supabase',
      detalle: 'duplicate key value',
    });
  });

  test('registro debe devolver 500 si falla al guardar correo, teléfono o dirección', async () => {
    mockFrom.mockImplementation((tabla) => {
      if (tabla === 'usuario') {
        return {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({ data: [{ id_usuario: 55 }], error: null }),
          }),
        };
      }
      if (tabla === 'correo_electronico') {
        return { insert: jest.fn().mockResolvedValue({ error: { message: 'Correo duplicado' } }) };
      }
      return { insert: jest.fn().mockResolvedValue({ error: null }) };
    });

    const req = {
      body: {
        nombre_1: 'Juan',
        clave: 'MiPassword2026',
        email: 'repetido@correo.com',
        numero_tel: '3001234567',
        direccion_comp: 'Calle 10',
      },
    };
    const res = crearRespuestaFalsa();

    await registro(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Error al vincular datos adicionales' });
  });
});