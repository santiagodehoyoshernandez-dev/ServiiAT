import dotenv from 'dotenv';
// CAMBIO 1: Lo dejamos vacío para que detecte automáticamente el archivo ".env" que creamos en AWS
dotenv.config();

import express from 'express';
import cors from 'cors';

// 1. IMPORTAMOS TODAS LAS RUTAS 
import authRoutes from './routes/authRoutes.js';
import solicitudRoutes from './routes/solicitudRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import notificacionesRoutes from './routes/notificacionesRoutes.js';
import tecnicoRoutes from './routes/tecnicoRoutes.js';
import clienteRoutes from './routes/clienteRoutes.js';

const app = express();
const PORT = process.env.PORT || 3001; 

// 2. MIDDLEWARES GENERALES
app.use(express.json());
app.use(cors({
  // CAMBIO 2: El asterisco permite que tu frontend en la nube se conecte sin ser bloqueado
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.get('/', (req, res) => {
  res.send('Servidor Core de ServiAT funcionando con Arquitectura 100% Modular 🚀');
});

// 3. ENRUTAMIENTO PRINCIPAL (Conectando los endpoints)
app.use('/api', authRoutes);
app.use('/api', solicitudRoutes);
app.use('/api', adminRoutes); 
app.use('/api/tecnico', tecnicoRoutes); 
app.use('/api', notificacionesRoutes);
app.use('/api/cliente', clienteRoutes);

// 4. INICIAR EL SERVIDOR
app.listen(PORT, () => {
  console.log(`🚀 Servidor Core corriendo en el puerto: ${PORT}`);
  console.log(`✅ Arquitectura Modular 100% Completada`);
});