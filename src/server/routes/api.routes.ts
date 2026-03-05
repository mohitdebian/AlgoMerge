import { Router } from 'express';
import { getIssues, analyzeIssue, getTrending, getRepoInfo } from '../controllers/api.controller';

const router = Router();

router.get('/issues/:owner/:repo', getIssues);
router.post('/issues/analyze', analyzeIssue);
router.get('/trending', getTrending);
router.get('/repos/:owner/:repo', getRepoInfo);

export default router;