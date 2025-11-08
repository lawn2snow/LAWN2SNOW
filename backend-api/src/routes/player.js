const express = require('express');
const router = express.Router();
const Player = require('../models/Player');
const { body, param, validationResult } = require('express-validator');

// Middleware to validate request
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

/**
 * @route   POST /api/player/register
 * @desc    Register new player
 * @access  Public
 */
router.post('/register', [
  body('walletAddress').isEthereumAddress().withMessage('Invalid wallet address'),
  body('username').isLength({ min: 3, max: 20 }).withMessage('Username must be 3-20 characters'),
  body('email').optional().isEmail().withMessage('Invalid email')
], validate, async (req, res) => {
  try {
    const { walletAddress, username, email } = req.body;

    // Check if player exists
    const existing = await Player.findOne({
      $or: [
        { walletAddress: walletAddress.toLowerCase() },
        { username }
      ]
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Wallet address or username already registered'
      });
    }

    // Create new player
    const player = new Player({
      walletAddress: walletAddress.toLowerCase(),
      username,
      email,
      currentIsland: 'Jamaica',
      unlockedIslands: ['Jamaica']
    });

    await player.save();

    res.status(201).json({
      success: true,
      message: 'Player registered successfully',
      player: {
        id: player._id,
        walletAddress: player.walletAddress,
        username: player.username,
        level: player.level,
        currentIsland: player.currentIsland
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/player/:walletAddress
 * @desc    Get player profile
 * @access  Public
 */
router.get('/:walletAddress', [
  param('walletAddress').isEthereumAddress()
], validate, async (req, res) => {
  try {
    const player = await Player.findOne({
      walletAddress: req.params.walletAddress.toLowerCase()
    });

    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    res.json({
      success: true,
      player: {
        id: player._id,
        walletAddress: player.walletAddress,
        username: player.username,
        level: player.level,
        experience: player.experience,
        stats: player.stats,
        currentIsland: player.currentIsland,
        unlockedIslands: player.unlockedIslands,
        reputation: player.reputation,
        streetCash: player.streetCash,
        pvpStats: player.pvpStats,
        ownedAssets: player.ownedAssets,
        totalAssetsValue: player.totalAssetsValue,
        completedMissions: player.completedMissions.length
      }
    });
  } catch (error) {
    console.error('Get player error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/player/:walletAddress/location
 * @desc    Update player location
 * @access  Public
 */
router.put('/:walletAddress/location', [
  param('walletAddress').isEthereumAddress(),
  body('x').isNumeric(),
  body('y').isNumeric(),
  body('z').isNumeric(),
  body('island').isString()
], validate, async (req, res) => {
  try {
    const { x, y, z, island } = req.body;

    const player = await Player.findOne({
      walletAddress: req.params.walletAddress.toLowerCase()
    });

    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    player.lastLocation = { x, y, z, island };
    player.currentIsland = island;
    player.lastActive = new Date();

    await player.save();

    res.json({
      success: true,
      message: 'Location updated',
      location: player.lastLocation
    });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/player/:walletAddress/experience
 * @desc    Add experience to player
 * @access  Public (should be protected in production)
 */
router.post('/:walletAddress/experience', [
  param('walletAddress').isEthereumAddress(),
  body('amount').isInt({ min: 1 }).withMessage('Experience must be positive')
], validate, async (req, res) => {
  try {
    const player = await Player.findOne({
      walletAddress: req.params.walletAddress.toLowerCase()
    });

    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    const result = player.addExperience(req.body.amount);
    await player.save();

    res.json({
      success: true,
      ...result,
      currentLevel: player.level,
      currentExperience: player.experience
    });
  } catch (error) {
    console.error('Add experience error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/player/:walletAddress/unlock-island
 * @desc    Unlock new island
 * @access  Public (should be protected in production)
 */
router.post('/:walletAddress/unlock-island', [
  param('walletAddress').isEthereumAddress(),
  body('island').isString().notEmpty()
], validate, async (req, res) => {
  try {
    const player = await Player.findOne({
      walletAddress: req.params.walletAddress.toLowerCase()
    });

    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    const unlocked = player.unlockIsland(req.body.island);
    await player.save();

    res.json({
      success: true,
      unlocked,
      unlockedIslands: player.unlockedIslands,
      message: unlocked ? `${req.body.island} unlocked!` : 'Island already unlocked'
    });
  } catch (error) {
    console.error('Unlock island error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/player/leaderboard/:type
 * @desc    Get leaderboard
 * @access  Public
 */
router.get('/leaderboard/:type', [
  param('type').isIn(['level', 'reputation', 'pvp'])
], validate, async (req, res) => {
  try {
    const { type } = req.params;
    const limit = parseInt(req.query.limit) || 100;

    const leaderboard = await Player.getLeaderboard(type, limit);

    res.json({
      success: true,
      type,
      leaderboard: leaderboard.map((p, index) => ({
        rank: index + 1,
        username: p.username,
        level: p.level,
        reputation: p.reputation,
        pvpWins: p.pvpStats.wins,
        currentIsland: p.currentIsland
      }))
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/player/:walletAddress/assets
 * @desc    Get player's owned assets
 * @access  Public
 */
router.get('/:walletAddress/assets', [
  param('walletAddress').isEthereumAddress()
], validate, async (req, res) => {
  try {
    const player = await Player.findOne({
      walletAddress: req.params.walletAddress.toLowerCase()
    });

    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    res.json({
      success: true,
      assets: player.ownedAssets,
      totalValue: player.totalAssetsValue,
      count: player.ownedAssets.length
    });
  } catch (error) {
    console.error('Get assets error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
