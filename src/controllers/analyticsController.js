import { getHotspots, getTrends } from '../services/crimeService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const trends = asyncHandler(async (req, res) => {
  res.json(await getTrends(req.query));
});

export const hotspots = asyncHandler(async (req, res) => {
  res.json(await getHotspots(req.query));
});
