import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import https from 'https';
import fs from 'fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 1. IMPORTAMOS TODAS LAS RUTAS
import authRoutes from './routes/authRoutes.js';
import solicitudRoutes from './routes/solicitudRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import notificacionesRoutes from './routes/notificacionesRoutes.js';
import tecnicoRoutes from './routes/tecnicoRoutes.js';
import clienteRoutes from './routes/clienteRoutes.js';
import pagosRoutes from './routes/pagosRoutes.js';
import perfilRoutes from './routes/perfilRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDist = path.resolve(__dirname, '../frontend/dist');

const app = express();
const PORT = process.env.PORT || 4000;

// Verificación rápida al iniciar el servidor
if (!process.env.JWT_TOKEN) {
  console.warn('⚠️ ADVERTENCIA: Falta definir JWT_TOKEN en backend/.env');
}

// Orígenes permitidos desde .env + mismo puerto 4000 para peticiones POST/PUT/DELETE
const origenesEnv = (
  process.env.CORS_ORIGINS || 'http://localhost:8080,https://44.197.89.200:8080'
).split(',').map((origen) => origen.trim()).filter(Boolean);

const origenesPermitidos = Array.from(new Set([
  ...origenesEnv,
  `https://44.197.89.200:${PORT}`,
  `http://localhost:${PORT}`,
  `https://localhost:${PORT}`
]));

// 2. MIDDLEWARES GENERALES
app.disable('x-powered-by');
app.use(express.json());
app.use(cors({
  origin: (origin, callback) => {
    // Permite peticiones sin origin (Postman, curl, navegación directa) o desde orígenes autorizados
    if (!origin || origenesPermitidos.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origen bloqueado por CORS: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['x-nuevo-token']
}));

// Ruta de verificación de estado (health check)
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    mensaje: 'Servidor Core de ServiAT funcionando con Arquitectura Modular 🚀'
  });
});

// 3. ENRUTAMIENTO PRINCIPAL DE LA API
app.use('/api', authRoutes);
app.use('/api', solicitudRoutes);
app.use('/api', adminRoutes);
app.use('/api/tecnico', tecnicoRoutes);
app.use('/api', notificacionesRoutes);
app.use('/api/cliente', clienteRoutes);
app.use('/api/pagos', pagosRoutes);
app.use('/api/perfil', perfilRoutes);

// 4. RUTA NO ENCONTRADA (404) PARA LA API
app.use('/api', (req, res) => {
  res.status(404).json({
    error: `Ruta no encontrada: ${req.method} ${req.originalUrl}`
  });
});

// 4.5 SERVIR EL FRONTEND COMPILADO EN EL MISMO PUERTO
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.use((req, res, next) => {
    if (req.method === 'GET') {
      return res.sendFile(path.join(frontendDist, 'index.html'));
    }
    next();
  });
}

// 4.6 RUTA NO ENCONTRADA GENERAL
app.use((req, res) => {
  res.status(404).json({
    error: `Ruta no encontrada: ${req.method} ${req.originalUrl}`
  });
});

// 5. MANEJO GLOBAL DE ERRORES (JSON mal formado, CORS, errores no controlados)
app.use((err, req, res, next) => {
  console.error('❌ Error en el servidor:', err.message);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Error interno del servidor'
  });
});

// 6. INICIAR EL SERVIDOR (HTTP en local, HTTPS en EC2 cuando USE_HTTPS=true)
const useHttps = process.env.USE_HTTPS === 'true';

if (useHttps) {
  const opcionesSSL = {
    key: fs.readFileSync(new URL('../certs/server.key', import.meta.url)),
    cert: fs.readFileSync(new URL('../certs/server.crt', import.meta.url))
  };

  https.createServer(opcionesSSL, app).listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor Core corriendo en HTTPS en el puerto ${PORT}`);
    console.log(`🌐 Orígenes CORS permitidos: ${origenesPermitidos.join(', ')}`);
  });
} else {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor Core corriendo en HTTP en el puerto ${PORT}`);
    console.log(`🌐 Orígenes CORS permitidos: ${origenesPermitidos.join(', ')}`);
  });
}