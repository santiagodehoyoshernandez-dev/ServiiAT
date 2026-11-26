import { Router } from 'express';
import { crearSolicitud } from '../controllers/solicitudesController.js';
import { obtenerHorariosOcupados } from '../controllers/solicitudesController.js';


const router = Router();


router.post('/solicitud', crearSolicitud);
router.get('/solicitudes/horarios-ocupados', obtenerHorariosOcupados);


export default router;
