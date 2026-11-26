import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { fetchseguro } from '../src/utils/fetchseguro';
import ClienteDashboard from '../src/pages/ClienteDashboard';

jest.mock('../src/utils/fetchseguro', () => ({
  fetchseguro: jest.fn(),
}));

// Mock de PayPal para simular el clic, la creación de orden y la aprobación
jest.mock('@paypal/react-paypal-js', () => ({
  PayPalScriptProvider: ({ children }) => <div data-testid="paypal-provider">{children}</div>,
  PayPalButtons: ({ createOrder, onApprove, disabled }) => (
    <button
      type="button"
      disabled={disabled}
      onClick={async () => {
        const orderID = await createOrder();
        await onApprove({ orderID });
      }}
    >
      Pagar con PayPal
    </button>
  ),
}));

const solicitudesMock = [
  {
    id_solicitud: 10,
    nombre_estado: 'En proceso',
    nombre_equipo: 'Horno Industrial',
    marca_equipo: 'Rational',
    fecha_solicitud: '2026-11-30',
    descripcion: 'No calienta bien',
    precio_servicio: 200000,
    pagado: false,
    direccion_servicio: 'Calle 123 #45-67',
  },
  {
    id_solicitud: 11,
    nombre_estado: 'Pendiente',
    nombre_equipo: 'Nevera Comercial',
    marca_equipo: 'No especificada',
    fecha_solicitud: '2026-12-01',
    descripcion: 'No enfría',
    precio_servicio: 0,
    pagado: false,
    direccion_servicio: 'Carrera 15 #80-20',
  },
];

describe('Pruebas del componente ClienteDashboard', () => {
  beforeEach(() => {
    fetchseguro.mockClear();
    sessionStorage.clear();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(window, 'print').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Prueba 1: Sin sesión en sessionStorage
  test('muestra error si no hay sesión del usuario en sessionStorage', async () => {
    render(<ClienteDashboard />);

    expect(
      await screen.findByText(/No se encontró tu sesión\. Por favor, vuelve a iniciar sesión\./i)
    ).toBeInTheDocument();
    expect(fetchseguro).not.toHaveBeenCalled();
  });

  // Prueba 2: Historial vacío
  test('muestra mensaje informativo cuando el cliente no tiene solicitudes', async () => {
    sessionStorage.setItem('id_usuario', '5');
    fetchseguro
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ modo: 'deshabilitado' }) });

    render(<ClienteDashboard />);

    expect(await screen.findByText(/Aún no tienes solicitudes registradas/i)).toBeInTheDocument();
  });

  // Prueba 3: Error del servidor al cargar el historial
  test('muestra mensaje de error si falla la carga del historial', async () => {
    sessionStorage.setItem('id_usuario', '5');
    fetchseguro.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Error interno del servidor' }),
    });

    render(<ClienteDashboard />);

    expect(await screen.findByText(/Error interno del servidor/i)).toBeInTheDocument();
  });

  // Prueba 4: Renderizado de solicitudes con pagos deshabilitados y precio pendiente
  test('renderiza las solicitudes, estado de precio pendiente y aviso de pagos deshabilitados', async () => {
    sessionStorage.setItem('user', JSON.stringify({ id: 5 }));
    fetchseguro
      .mockResolvedValueOnce({ ok: true, json: async () => solicitudesMock })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ modo: 'deshabilitado' }) });

    render(<ClienteDashboard />);

    expect(await screen.findByText(/Horno Industrial \(Rational\)/i)).toBeInTheDocument();
    expect(screen.getByText('Nevera Comercial')).toBeInTheDocument();
    expect(screen.getByText(/El técnico aún no ha definido el valor del servicio\./i)).toBeInTheDocument();
    expect(screen.getByText(/Los pagos no están habilitados actualmente\./i)).toBeInTheDocument();
  });

  // Prueba 5: Flujo completo de pago con PayPal y generación de ticket
  test('procesa el pago con PayPal, muestra el ticket y permite imprimirlo', async () => {
    sessionStorage.setItem('id_usuario', '5');
    fetchseguro
      // 1. Historial de solicitudes
      .mockResolvedValueOnce({ ok: true, json: async () => [solicitudesMock[0]] })
      // 2. Modo de pago PayPal
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ modo: 'paypal', clientId: 'test-client-id', tasaCopUsd: 0.00025 }),
      })
      // 3. Crear orden de PayPal
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'ORDER-123' }) })
      // 4. Capturar pago de PayPal
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id_ticket: 999, monto: 200000, metodo_pago: 'PayPal' }),
      });

    render(<ClienteDashboard />);

    const botonPaypal = await screen.findByRole('button', { name: /Pagar con PayPal/i });
    expect(screen.getByTestId('paypal-provider')).toBeInTheDocument();

    fireEvent.click(botonPaypal);

    await waitFor(() => {
      expect(fetchseguro).toHaveBeenCalledWith(
        'https://localhost:3001/api/pagos/solicitudes/10/paypal/orden',
        { method: 'POST' }
      );
      expect(fetchseguro).toHaveBeenCalledWith(
        'https://localhost:3001/api/pagos/solicitudes/10/paypal/capturar',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ orderID: 'ORDER-123' }),
        })
      );
      expect(screen.getByText(/¡Gracias por tu pago!/i)).toBeInTheDocument();
      expect(screen.getByText('#999')).toBeInTheDocument();
      expect(screen.getByText('Pago confirmado')).toBeInTheDocument();
    });

    // Probamos el botón de imprimir ticket
    fireEvent.click(screen.getByRole('button', { name: /Imprimir ticket/i }));
    expect(window.print).toHaveBeenCalledTimes(1);
  });
});