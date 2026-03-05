import { Router } from 'express';
import { getMyPRs, getDashboardStats, getMyIssues } from '../controllers/user.controller';

const router = Router();

router.get('/prs', getMyPRs);
router.get('/issues', getMyIssues);
router.get('/dashboard', getDashboardStats);

export default router;