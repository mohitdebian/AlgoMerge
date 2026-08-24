import { Router } from 'express';
import { githubLogin, githubCallback, getSession, logout, registerWithPassword } from '../controllers/auth.controller.js';

const router = Router();

router.get('/github', githubLogin);
router.get('/github/callback', githubCallback);
router.post('/register', registerWithPassword);
router.get('/session', getSession);
router.get('/logout', logout);

export default router;