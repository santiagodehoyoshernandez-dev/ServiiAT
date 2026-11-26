import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import jwt from 'jsonwebtoken';
import { verificarToken, permitirRoles } from '../seguridad/middlewareSeguridad.js';

const crearRespuestaFalsa = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn();
  return res;
};

describe('Pruebas de seguridad - middlewareSeguridad', () => {
  const SECRETO_PRUEBA = 'clave_secreta_de_pruebas';

  beforeEach(() => {
    process.env.JWT_TOKEN = SECRETO_PRUEBA;
  });

  test('Debe devolver 401 si no se envía el header Authorization', () => {
    const req = { headers: {} };
    const res = crearRespuestaFalsa();
    const next = jest.fn();

    verificarToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('Debe devolver 401 si el token es falso o fue alterado', () => {
    const req = { headers: { authorization: 'Bearer token.falso.123' } };
    const res = crearRespuestaFalsa();
    const next = jest.fn();

    verificarToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('Debe dejar pasar un token válido, llenar req.auth/req.usuario y renovar el token', () => {
    const tokenValido = jwt.sign({ id_usuario: 15, rol: 'tecnico' }, SECRETO_PRUEBA, {
      expiresIn: '15m',
    });
    const req = { headers: { authorization: `Bearer ${tokenValido}` } };
    const res = crearRespuestaFalsa();
    const next = jest.fn();

    verificarToken(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.auth.id).toBe(15);
    expect(req.usuario.rol).toBe('tecnico');
    expect(res.setHeader).toHaveBeenCalledWith('x-nuevo-token', expect.any(String));
  });

  test('permitirRoles debe devolver 403 si un cliente intenta entrar a una ruta de administrador', () => {
    const req = { auth: { id: 7, rol: 'cliente' } };
    const res = crearRespuestaFalsa();
    const next = jest.fn();

    const middlewareAdmin = permitirRoles('administrador');
    middlewareAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('permitirRoles debe dejar pasar si el rol coincide (sin importar mayúsculas)', () => {
    const req = { auth: { id: 1, rol: 'Administrador' } };
    const res = crearRespuestaFalsa();
    const next = jest.fn();

    const middlewareAdmin = permitirRoles('administrador');
    middlewareAdmin(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});