import { Router } from 'express';
import { getWatchlist, addToWatchlist, removeFromWatchlist, fetchRepoInsights, fetchBatchRepoInsights } from '../controllers/watchlist.controller';

const router = Router();

router.get('/', getWatchlist);
router.post('/', addToWatchlist);
router.delete('/', removeFromWatchlist);
router.get('/insights/:owner/:repo', fetchRepoInsights);
router.post('/insights/batch', fetchBatchRepoInsights);

export default router;