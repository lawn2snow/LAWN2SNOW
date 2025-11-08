const mongoose = require('mongoose');

const MissionSchema = new mongoose.Schema({
  // Mission identification
  missionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Basic info
  title: {
    type: String,
    required: true,
    trim: true
  },

  description: {
    type: String,
    required: true
  },

  // Mission type
  type: {
    type: String,
    required: true,
    enum: ['story', 'heist', 'side', 'daily', 'pvp', 'race']
  },

  // Location
  island: {
    type: String,
    required: true,
    enum: ['Jamaica', 'Bahamas', 'Puerto Rico', 'Trinidad', 'Cayman Islands', 'Barbados', 'Dominican Republic']
  },

  location: {
    x: Number,
    y: Number,
    z: Number,
    marker: String // Marker type for UI
  },

  // Difficulty
  difficulty: {
    type: Number,
    required: true,
    min: 1,
    max: 10
  },

  recommendedLevel: {
    type: Number,
    default: 1,
    min: 1
  },

  // Requirements
  requirements: {
    level: { type: Number, default: 1 },
    previousMissions: [String],
    requiredItems: [{
      name: String,
      quantity: Number
    }],
    minReputation: Number,
    unlockedIslands: [String]
  },

  // Objectives
  objectives: [{
    description: String,
    type: {
      type: String,
      enum: ['kill', 'collect', 'deliver', 'reach', 'steal', 'defend', 'race', 'custom']
    },
    target: String,
    quantity: Number,
    location: {
      x: Number,
      y: Number,
      z: Number
    },
    completed: { type: Boolean, default: false }
  }],

  // Rewards
  rewards: {
    // Crypto reward (in CARIB tokens, stored as wei)
    carib: {
      type: String, // Store as string to handle big numbers
      default: '0'
    },

    // Non-withdrawable in-game currency
    streetCash: {
      type: Number,
      default: 0
    },

    // Experience
    experience: {
      type: Number,
      required: true
    },

    // Reputation change
    reputation: {
      type: Number,
      default: 0
    },

    // Item/Asset rewards
    items: [{
      type: String, // Item/NFT name
      quantity: Number
    }],

    // Unlocks
    unlocks: [{
      type: {
        type: String,
        enum: ['island', 'vehicle', 'weapon', 'mission', 'feature']
      },
      name: String
    }]
  },

  // Time constraints
  timeLimit: {
    type: Number, // in seconds, 0 = no limit
    default: 0
  },

  cooldown: {
    type: Number, // in seconds, for daily missions
    default: 0
  },

  // Availability
  isActive: {
    type: Boolean,
    default: true
  },

  startDate: Date,
  endDate: Date, // For time-limited events

  // Multiplayer
  isMultiplayer: {
    type: Boolean,
    default: false
  },

  minPlayers: {
    type: Number,
    default: 1
  },

  maxPlayers: {
    type: Number,
    default: 1
  },

  // Story progression
  storySequence: {
    chapter: Number,
    sequence: Number
  },

  // Failure conditions
  failureConditions: [{
    type: {
      type: String,
      enum: ['death', 'time', 'detection', 'vehicle_destroyed', 'custom']
    },
    description: String
  }],

  // Statistics
  stats: {
    completions: { type: Number, default: 0 },
    failures: { type: Number, default: 0 },
    averageTime: { type: Number, default: 0 }, // in seconds
    successRate: { type: Number, default: 0 } // percentage
  },

  // Mission parameters (for dynamic missions)
  parameters: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes
MissionSchema.index({ type: 1, island: 1 });
MissionSchema.index({ difficulty: 1 });
MissionSchema.index({ 'requirements.level': 1 });
MissionSchema.index({ isActive: 1 });

// Virtual for reward value
MissionSchema.virtual('totalRewardValue').get(function() {
  return parseInt(this.rewards.carib) + this.rewards.streetCash + (this.rewards.experience * 10);
});

// Method to check if player meets requirements
MissionSchema.methods.canPlayerStart = function(player) {
  const req = this.requirements;

  // Check level
  if (player.level < req.level) {
    return { canStart: false, reason: 'Level too low' };
  }

  // Check previous missions
  if (req.previousMissions && req.previousMissions.length > 0) {
    const completedIds = player.completedMissions.map(m => m.missionId);
    const hasAllPrevious = req.previousMissions.every(id => completedIds.includes(id));
    if (!hasAllPrevious) {
      return { canStart: false, reason: 'Prerequisites not completed' };
    }
  }

  // Check reputation
  if (req.minReputation && player.reputation < req.minReputation) {
    return { canStart: false, reason: 'Reputation too low' };
  }

  // Check unlocked islands
  if (req.unlockedIslands && req.unlockedIslands.length > 0) {
    const hasAllIslands = req.unlockedIslands.every(island =>
      player.unlockedIslands.includes(island)
    );
    if (!hasAllIslands) {
      return { canStart: false, reason: 'Required islands not unlocked' };
    }
  }

  return { canStart: true };
};

// Static method to get available missions for player
MissionSchema.statics.getAvailableForPlayer = async function(player) {
  const allMissions = await this.find({ isActive: true });

  return allMissions.filter(mission => {
    const check = mission.canPlayerStart(player);
    return check.canStart;
  });
};

// Static method to get missions by island
MissionSchema.statics.getByIsland = async function(island, type = null) {
  const query = { island, isActive: true };
  if (type) {
    query.type = type;
  }
  return this.find(query).sort({ difficulty: 1, recommendedLevel: 1 });
};

// Update stats after completion
MissionSchema.methods.recordCompletion = function(timeTaken, success) {
  if (success) {
    this.stats.completions += 1;

    // Update average time
    if (timeTaken) {
      const totalTime = this.stats.averageTime * (this.stats.completions - 1) + timeTaken;
      this.stats.averageTime = totalTime / this.stats.completions;
    }
  } else {
    this.stats.failures += 1;
  }

  // Update success rate
  const total = this.stats.completions + this.stats.failures;
  this.stats.successRate = (this.stats.completions / total) * 100;

  return this.save();
};

module.exports = mongoose.model('Mission', MissionSchema);
