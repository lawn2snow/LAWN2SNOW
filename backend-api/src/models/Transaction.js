const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  // Blockchain transaction
  txHash: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  blockNumber: {
    type: Number,
    index: true
  },

  // Parties involved
  from: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },

  to: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },

  // Transaction type
  type: {
    type: String,
    required: true,
    enum: [
      'mission_reward',
      'pvp_robbery',
      'marketplace_purchase',
      'marketplace_sale',
      'asset_transfer',
      'token_transfer',
      'business_income',
      'insurance_claim',
      'deposit',
      'withdrawal',
      'other'
    ],
    index: true
  },

  // Amount (for token transfers)
  amount: {
    type: String, // Store as string for big numbers
    default: '0'
  },

  // Asset involved (for NFT transactions)
  assetId: {
    type: Number,
    sparse: true, // Allow null but index if present
    index: true
  },

  assetDetails: {
    name: String,
    assetType: String,
    value: Number
  },

  // Transaction details
  details: {
    missionId: String,
    playerId: String,
    reason: String,
    metadata: mongoose.Schema.Types.Mixed
  },

  // Gas fees
  gasUsed: String,
  gasPrice: String,
  gasFee: String, // Total gas cost

  // Status
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'failed', 'reverted'],
    default: 'pending',
    index: true
  },

  confirmations: {
    type: Number,
    default: 0
  },

  // Timing
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },

  confirmedAt: Date,

  // Error tracking
  error: String,

  // Anti-fraud
  flaggedForReview: {
    type: Boolean,
    default: false,
    index: true
  },

  reviewReason: String,

  reviewed: {
    type: Boolean,
    default: false
  },

  reviewedBy: String,
  reviewedAt: Date,
  reviewNotes: String
}, {
  timestamps: true
});

// Compound indexes for common queries
TransactionSchema.index({ from: 1, type: 1, timestamp: -1 });
TransactionSchema.index({ to: 1, type: 1, timestamp: -1 });
TransactionSchema.index({ type: 1, status: 1, timestamp: -1 });
TransactionSchema.index({ assetId: 1, timestamp: -1 });

// Virtual for total cost
TransactionSchema.virtual('totalCost').get(function() {
  return (BigInt(this.amount) + BigInt(this.gasFee || '0')).toString();
});

// Method to mark as confirmed
TransactionSchema.methods.markConfirmed = function(blockNumber, confirmations = 1) {
  this.status = 'confirmed';
  this.blockNumber = blockNumber;
  this.confirmations = confirmations;
  this.confirmedAt = new Date();
  return this.save();
};

// Method to flag for review
TransactionSchema.methods.flagForReview = function(reason) {
  this.flaggedForReview = true;
  this.reviewReason = reason;
  return this.save();
};

// Static method to get player transaction history
TransactionSchema.statics.getPlayerHistory = async function(walletAddress, limit = 50) {
  return this.find({
    $or: [
      { from: walletAddress.toLowerCase() },
      { to: walletAddress.toLowerCase() }
    ]
  })
  .sort({ timestamp: -1 })
  .limit(limit);
};

// Static method to get pending transactions
TransactionSchema.statics.getPending = async function() {
  return this.find({ status: 'pending' }).sort({ timestamp: 1 });
};

// Static method to get asset transfer history
TransactionSchema.statics.getAssetHistory = async function(assetId) {
  return this.find({ assetId })
    .sort({ timestamp: -1 });
};

// Static method for fraud detection
TransactionSchema.statics.detectSuspiciousActivity = async function(walletAddress) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  // Check for high frequency trading
  const recentTransactions = await this.countDocuments({
    $or: [{ from: walletAddress }, { to: walletAddress }],
    timestamp: { $gte: oneHourAgo }
  });

  if (recentTransactions > 50) {
    return {
      suspicious: true,
      reason: 'High frequency trading',
      count: recentTransactions
    };
  }

  // Check for large value transfers
  const largeTransfers = await this.find({
    from: walletAddress,
    timestamp: { $gte: oneHourAgo },
    amount: { $gt: '1000000000000000000000' } // > 1000 CARIB
  });

  if (largeTransfers.length > 0) {
    return {
      suspicious: true,
      reason: 'Large value transfers',
      count: largeTransfers.length
    };
  }

  return { suspicious: false };
};

// Static method for analytics
TransactionSchema.statics.getStats = async function(startDate, endDate) {
  const match = {
    status: 'confirmed',
    timestamp: {
      $gte: startDate,
      $lte: endDate
    }
  };

  const stats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        totalAmount: { $sum: { $toLong: '$amount' } },
        avgGasFee: { $avg: { $toLong: '$gasFee' } }
      }
    },
    { $sort: { count: -1 } }
  ]);

  const totalTransactions = await this.countDocuments(match);

  return {
    totalTransactions,
    byType: stats
  };
};

module.exports = mongoose.model('Transaction', TransactionSchema);
