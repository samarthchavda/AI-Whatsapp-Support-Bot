const express = require('express');
const router = express.Router();
const PageVisit = require('../models/PageVisit');

// Public route to track page visit
router.post('/track', async (req, res) => {
  try {
    const { pagePath, referrer } = req.body;
    if (!pagePath) {
      return res.status(400).json({ success: false, error: 'Page path is required' });
    }

    const ipAddress = req.ip || req.connection?.remoteAddress || null;
    const userAgent = req.get('user-agent') || null;

    const visit = new PageVisit({
      pagePath,
      ipAddress,
      userAgent,
      referrer
    });

    await visit.save();

    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Error tracking page visit:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

module.exports = router;
