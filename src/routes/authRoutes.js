import express from 'express';
import { login, logout, refresh, register, session } from '../controllers/authController.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/signup', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', optionalAuthenticate, logout);
router.get('/session', authenticate, session);

export default router;
