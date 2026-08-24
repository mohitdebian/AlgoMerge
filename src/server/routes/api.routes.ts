import { Router } from 'express';
import multer from 'multer';
import {
  getIssues,
  analyzeIssue,
  getTrending,
  getRepoInfo,
  getPublicScorecard,
  getPublicScorecardImage,
  uploadScorecardAsset,
  getWatchlistWithJoin
} from '../controllers/api.controller.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

const router = Router();

router.get('/issues/:owner/:repo', getIssues);
router.post('/issues/analyze', analyzeIssue);
router.get('/trending', getTrending);
router.get('/repos/:owner/:repo', getRepoInfo);
router.get('/public/:username', getPublicScorecard);
router.get('/public/:username/share-card.svg', getPublicScorecardImage);
router.post('/upload/asset', upload.single('file'), uploadScorecardAsset);
router.get('/watchlist-join', getWatchlistWithJoin);

export default router;