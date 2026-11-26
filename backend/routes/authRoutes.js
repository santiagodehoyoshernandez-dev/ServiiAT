import { Router,  } from "express";
import { registro, login , recuperarcontrasena} from '../controllers/authController.js';

const router = Router();

router.post('/registro',registro);
router.post('/login',login);
router.post('/recuperar-contrasena',recuperarcontrasena);


export default router;