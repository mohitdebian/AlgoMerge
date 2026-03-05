import { Router } from 'express';
import { githubLogin, githubCallback, getSession } from '../controllers/auth.controller.js';

const router = Router();

router.get('/github', githubLogin);
router.get('/github/callback', githubCallback);
router.get('/session', getSession);

export default router;