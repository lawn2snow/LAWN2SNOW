const express = require('express');
const router = express.Router();
const Mission = require('../models/Mission');
const Player = require('../models/Player');
const { body, param, query, validationResult } = require('express-validator');

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

/**
 * @route   GET /api/missions
 * @desc    Get all active missions
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const { island, type, difficulty } = req.query;

    const query = { isActive: true };
    if (island) query.island = island;
    if (type) query.type = type;
    if (difficulty) query.difficulty = parseInt(difficulty);

    const missions = await Mission.find(query)
      .sort({ difficulty: 1, recommendedLevel: 1 })
      .select('-stats -__v');

    res.json({
      success: true,
      count: missions.length,
      missions
    });
  } catch (error) {
    console.error('Get missions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/missions/available/:walletAddress
 * @desc    Get missions available for specific player
 * @access  Public
 */
router.get('/available/:walletAddress', [
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

    const availableMissions = await Mission.getAvailableForPlayer(player);

    res.json({
      success: true,
      count: availableMissions.length,
      missions: availableMissions
    });
  } catch (error) {
    console.error('Get available missions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/missions/island/:island
 * @desc    Get missions by island
 * @access  Public
 */
router.get('/island/:island', async (req, res) => {
  try {
    const { island } = req.params;
    const { type } = req.query;

    const missions = await Mission.getByIsland(island, type);

    res.json({
      success: true,
      island,
      count: missions.length,
      missions
    });
  } catch (error) {
    console.error('Get island missions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/missions/:missionId
 * @desc    Get mission details
 * @access  Public
 */
router.get('/:missionId', async (req, res) => {
  try {
    const mission = await Mission.findOne({ missionId: req.params.missionId });

    if (!mission) {
      return res.status(404).json({
        success: false,
        message: 'Mission not found'
      });
    }

    res.json({
      success: true,
      mission
    });
  } catch (error) {
    console.error('Get mission error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/missions/:missionId/start
 * @desc    Start a mission
 * @access  Public
 */
router.post('/:missionId/start', [
  body('walletAddress').isEthereumAddress()
], validate, async (req, res) => {
  try {
    const { missionId } = req.params;
    const { walletAddress } = req.body;

    // Get player
    const player = await Player.findOne({
      walletAddress: walletAddress.toLowerCase()
    });

    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    // Get mission
    const mission = await Mission.findOne({ missionId });

    if (!mission) {
      return res.status(404).json({
        success: false,
        message: 'Mission not found'
      });
    }

    // Check if player can start
    const eligibility = mission.canPlayerStart(player);

    if (!eligibility.canStart) {
      return res.status(403).json({
        success: false,
        message: eligibility.reason
      });
    }

    // Check if already active
    const alreadyActive = player.activeMissions.find(m => m.missionId === missionId);

    if (alreadyActive) {
      return res.status(400).json({
        success: false,
        message: 'Mission already active'
      });
    }

    // Add to active missions
    player.activeMissions.push({
      missionId,
      startedAt: new Date(),
      progress: 0
    });

    await player.save();

    res.json({
      success: true,
      message: 'Mission started',
      mission: {
        missionId: mission.missionId,
        title: mission.title,
        objectives: mission.objectives,
        timeLimit: mission.timeLimit
      }
    });
  } catch (error) {
    console.error('Start mission error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/missions/:missionId/complete
 * @desc    Complete a mission
 * @access  Public (should be validated server-side in production)
 */
router.post('/:missionId/complete', [
  body('walletAddress').isEthereumAddress(),
  body('timeTaken').optional().isInt({ min: 0 })
], validate, async (req, res) => {
  try {
    const { missionId } = req.params;
    const { walletAddress, timeTaken } = req.body;

    // Get player
    const player = await Player.findOne({
      walletAddress: walletAddress.toLowerCase()
    });

    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    // Get mission
    const mission = await Mission.findOne({ missionId });

    if (!mission) {
      return res.status(404).json({
        success: false,
        message: 'Mission not found'
      });
    }

    // Check if mission is active
    const activeMissionIndex = player.activeMissions.findIndex(m => m.missionId === missionId);

    if (activeMissionIndex === -1) {
      return res.status(400).json({
        success: false,
        message: 'Mission not active for this player'
      });
    }

    // Remove from active missions
    player.activeMissions.splice(activeMissionIndex, 1);

    // Add to completed missions
    player.completedMissions.push({
      missionId,
      completedAt: new Date(),
      reward: parseInt(mission.rewards.carib) + mission.rewards.streetCash
    });

    // Apply rewards
    const expResult = player.addExperience(mission.rewards.experience);
    player.streetCash += mission.rewards.streetCash;
    player.reputation += mission.rewards.reputation;

    // Process unlocks
    if (mission.rewards.unlocks) {
      for (const unlock of mission.rewards.unlocks) {
        if (unlock.type === 'island') {
          player.unlockIsland(unlock.name);
        }
      }
    }

    await player.save();

    // Update mission stats
    await mission.recordCompletion(timeTaken, true);

    res.json({
      success: true,
      message: 'Mission completed!',
      rewards: {
        carib: mission.rewards.carib,
        streetCash: mission.rewards.streetCash,
        experience: mission.rewards.experience,
        reputation: mission.rewards.reputation,
        unlocks: mission.rewards.unlocks
      },
      player: {
        level: player.level,
        leveledUp: expResult.leveledUp,
        newLevel: expResult.newLevel,
        experience: player.experience,
        streetCash: player.streetCash,
        reputation: player.reputation
      }
    });
  } catch (error) {
    console.error('Complete mission error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/missions/:missionId/fail
 * @desc    Fail a mission
 * @access  Public
 */
router.post('/:missionId/fail', [
  body('walletAddress').isEthereumAddress(),
  body('timeTaken').optional().isInt({ min: 0 })
], validate, async (req, res) => {
  try {
    const { missionId } = req.params;
    const { walletAddress, timeTaken } = req.body;

    const player = await Player.findOne({
      walletAddress: walletAddress.toLowerCase()
    });

    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    const mission = await Mission.findOne({ missionId });

    if (!mission) {
      return res.status(404).json({
        success: false,
        message: 'Mission not found'
      });
    }

    // Remove from active missions
    const activeMissionIndex = player.activeMissions.findIndex(m => m.missionId === missionId);

    if (activeMissionIndex !== -1) {
      player.activeMissions.splice(activeMissionIndex, 1);
      await player.save();
    }

    // Update mission stats
    await mission.recordCompletion(timeTaken, false);

    res.json({
      success: true,
      message: 'Mission failed',
      canRetry: true
    });
  } catch (error) {
    console.error('Fail mission error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
