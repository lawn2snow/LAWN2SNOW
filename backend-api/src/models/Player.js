const mongoose = require('mongoose');

const PlayerSchema = new mongoose.Schema({
  // Blockchain identity
  walletAddress: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    index: true
  },

  // Player profile
  username: {
    type: String,
    required: true,
    unique: true,
    minlength: 3,
    maxlength: 20,
    trim: true
  },

  email: {
    type: String,
    sparse: true, // Allow nulls but unique if provided
    lowercase: true,
    trim: true
  },

  // Game progression
  level: {
    type: Number,
    default: 1,
    min: 1,
    max: 100
  },

  experience: {
    type: Number,
    default: 0,
    min: 0
  },

  // Skills
  stats: {
    driving: { type: Number, default: 0, min: 0, max: 100 },
    shooting: { type: Number, default: 0, min: 0, max: 100 },
    business: { type: Number, default: 0, min: 0, max: 100 },
    streetSmarts: { type: Number, default: 0, min: 0, max: 100 }
  },

  // Location
  currentIsland: {
    type: String,
    default: 'Jamaica',
    enum: ['Jamaica', 'Bahamas', 'Puerto Rico', 'Trinidad', 'Cayman Islands', 'Barbados', 'Dominican Republic']
  },

  unlockedIslands: {
    type: [String],
    default: ['Jamaica']
  },

  // Reputation
  reputation: {
    type: Number,
    default: 0,
    min: -1000,
    max: 1000
  },

  // Missions
  completedMissions: [{
    missionId: String,
    completedAt: Date,
    reward: Number
  }],

  activeMissions: [{
    missionId: String,
    startedAt: Date,
    progress: Number
  }],

  // Assets (NFT token IDs)
  ownedAssets: [{
    tokenId: Number,
    assetType: {
      type: String,
      enum: ['Vehicle', 'Property', 'Weapon', 'Business', 'Item']
    },
    name: String,
    value: Number,
    acquiredAt: Date,
    island: String
  }],

  // In-game currency (non-withdrawable)
  streetCash: {
    type: Number,
    default: 1000,
    min: 0
  },

  // PvP stats
  pvpStats: {
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    robberies: { type: Number, default: 0 },
    robbedBy: { type: Number, default: 0 },
    bounty: { type: Number, default: 0 }
  },

  // Session data
  lastActive: {
    type: Date,
    default: Date.now
  },

  lastLocation: {
    x: Number,
    y: Number,
    z: Number,
    island: String
  },

  // Security
  isBanned: {
    type: Boolean,
    default: false
  },

  banReason: String,

  antiCheatFlags: [{
    type: {
      type: String,
      enum: ['impossible_movement', 'impossible_combat', 'suspicious_transaction', 'other']
    },
    timestamp: Date,
    details: String,
    resolved: { type: Boolean, default: false }
  }],

  // Settings
  settings: {
    notifications: { type: Boolean, default: true },
    autoSave: { type: Boolean, default: true },
    pvpEnabled: { type: Boolean, default: true }
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

// Indexes for performance
PlayerSchema.index({ level: -1 });
PlayerSchema.index({ reputation: -1 });
PlayerSchema.index({ 'pvpStats.bounty': -1 });
PlayerSchema.index({ lastActive: -1 });

// Virtual for total assets value
PlayerSchema.virtual('totalAssetsValue').get(function() {
  return this.ownedAssets.reduce((sum, asset) => sum + asset.value, 0);
});

// Method to add experience and level up
PlayerSchema.methods.addExperience = function(exp) {
  this.experience += exp;

  // Level up logic (1000 XP per level)
  const requiredXP = this.level * 1000;
  if (this.experience >= requiredXP) {
    this.level += 1;
    this.experience -= requiredXP;
    return { leveledUp: true, newLevel: this.level };
  }

  return { leveledUp: false };
};

// Method to unlock island
PlayerSchema.methods.unlockIsland = function(islandName) {
  if (!this.unlockedIslands.includes(islandName)) {
    this.unlockedIslands.push(islandName);
    return true;
  }
  return false;
};

// Method to add anti-cheat flag
PlayerSchema.methods.flagForCheating = function(type, details) {
  this.antiCheatFlags.push({
    type,
    timestamp: new Date(),
    details,
    resolved: false
  });

  // Auto-ban after 3 unresolved flags
  const unresolvedFlags = this.antiCheatFlags.filter(f => !f.resolved);
  if (unresolvedFlags.length >= 3) {
    this.isBanned = true;
    this.banReason = 'Multiple anti-cheat violations';
  }
};

// Static method to get leaderboard
PlayerSchema.statics.getLeaderboard = async function(type = 'level', limit = 100) {
  const sortField = type === 'level' ? { level: -1, experience: -1 } :
                    type === 'reputation' ? { reputation: -1 } :
                    type === 'pvp' ? { 'pvpStats.wins': -1 } :
                    { level: -1 };

  return this.find({ isBanned: false })
    .sort(sortField)
    .limit(limit)
    .select('username level reputation pvpStats currentIsland');
};

module.exports = mongoose.model('Player', PlayerSchema);
