import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';

const mockSendMail = jest.fn();

jest.unstable_mockModule('../config/mailer.js', () => ({
  transporter: {
    sendMail: mockSendMail,
  },
}));

const { enviarNotificacion } = await import('../controllers/notificacionesController.js');

const crearRespuestaFalsa = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('Pruebas de notificaciones - notificacionesController', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    mockSendMail.mockReset();
    process.env.GMAIL_USER = 'soporte@ar-asistencia.com';
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test('enviarNotificacion debe enviar correo verde con hora cuando el estado es "Aprobada y asignada"', async () => {
    mockSendMail.mockResolvedValue({ messageId: 'ok-1' });

    const req = {
      body: {
        nombreCliente: 'Carlos',
        email: 'carlos@correo.com',
        estado: 'Aprobada y asignada',
        fecha_solicitud: '2026-11-25',
        hora: '10:00 AM',
        descripcion: 'Falla de encendido',
        nombre_equipo: 'Nevera',
      },
    };
    const res = crearRespuestaFalsa();

    await enviarNotificacion(req, res);

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'soporte@ar-asistencia.com',
        to: 'carlos@correo.com',
        subject: 'AR Asistencia Técnica: Tu solicitud está Aprobada y asignada',
        html: expect.stringContaining('10:00 AM'),
      })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Alerta enviada a Gmail exitosamente' });
  });

  test('enviarNotificacion debe usar alerta roja (#e74c3c) cuando el estado es "Cancelado"', async () => {
    mockSendMail.mockResolvedValue({ messageId: 'ok-2' });

    const req = {
      body: {
        nombreCliente: 'Carlos',
        email: 'carlos@correo.com',
        estado: 'Cancelado',
        fecha_solicitud: '2026-11-25',
        hora: '03:00 PM',
        descripcion: 'Sin cobertura',
        nombre_equipo: 'Lavadora',
      },
    };
    const res = crearRespuestaFalsa();

    await enviarNotificacion(req, res);

    const opcionesEnviadas = mockSendMail.mock.calls[0][0];
    expect(opcionesEnviadas.html).toContain('#e74c3c');
    expect(opcionesEnviadas.html).toContain('Tu solicitud fue rechazada');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('enviarNotificacion debe usar el texto por defecto si llega un estado desconocido', async () => {
    mockSendMail.mockResolvedValue({ messageId: 'ok-3' });

    const req = {
      body: {
        nombreCliente: 'Carlos',
        email: 'carlos@correo.com',
        estado: 'OtroEstado',
      },
    };
    const res = crearRespuestaFalsa();

    await enviarNotificacion(req, res);

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        html: 'Hay una actualización en tu solicitud de servicio.',
      })
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('enviarNotificacion debe devolver 500 si Gmail falla al enviar el correo', async () => {
    mockSendMail.mockRejectedValue(new Error('SMTP connection timeout'));

    const req = {
      body: { nombreCliente: 'Carlos', email: 'carlos@correo.com', estado: 'Pendiente' },
    };
    const res = crearRespuestaFalsa();

    await enviarNotificacion(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Hubo un error al procesar el envío del correo',
    });
  });
});