/**
 * Seed Database with Test Data
 * Run with: node src/seedData.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Mission = require('./models/Mission');

dotenv.config();

// Sample missions
const missions = [
  {
    missionId: 'JAM001',
    title: 'Welcome to Paradise',
    description: 'Get familiar with the streets of Kingston. Drive around and explore the city.',
    type: 'story',
    island: 'Jamaica',
    location: { x: 100, y: 50, z: 10, marker: 'start' },
    difficulty: 1,
    recommendedLevel: 1,
    requirements: { level: 1 },
    objectives: [
      {
        description: 'Drive to the beach',
        type: 'reach',
        location: { x: 200, y: 100, z: 5 }
      },
      {
        description: 'Meet your contact',
        type: 'reach',
        location: { x: 150, y: 80, z: 8 }
      }
    ],
    rewards: {
      carib: '100000000000000000000', // 100 CARIB (in wei)
      streetCash: 500,
      experience: 200,
      reputation: 10
    },
    timeLimit: 0,
    isActive: true,
    storySequence: { chapter: 1, sequence: 1 }
  },

  {
    missionId: 'JAM002',
    title: 'First Score',
    description: 'Steal a car from the docks and deliver it to the chop shop.',
    type: 'side',
    island: 'Jamaica',
    location: { x: 120, y: 60, z: 12, marker: 'theft' },
    difficulty: 2,
    recommendedLevel: 2,
    requirements: { level: 1, previousMissions: ['JAM001'] },
    objectives: [
      {
        description: 'Steal the car at the docks',
        type: 'steal',
        target: 'Mercedes',
        location: { x: 180, y: 90, z: 5 }
      },
      {
        description: 'Deliver to chop shop',
        type: 'deliver',
        location: { x: 100, y: 50, z: 10 }
      }
    ],
    rewards: {
      carib: '250000000000000000000', // 250 CARIB
      streetCash: 1000,
      experience: 500,
      reputation: 25,
      items: [{ type: 'Lockpick Set', quantity: 1 }]
    },
    timeLimit: 300, // 5 minutes
    isActive: true
  },

  {
    missionId: 'JAM003',
    title: 'Street Race',
    description: 'Beat the local racers in a street race through Kingston.',
    type: 'race',
    island: 'Jamaica',
    location: { x: 140, y: 70, z: 8, marker: 'race' },
    difficulty: 3,
    recommendedLevel: 3,
    requirements: { level: 2 },
    objectives: [
      {
        description: 'Finish in first place',
        type: 'race',
        target: '1st Place'
      }
    ],
    rewards: {
      carib: '500000000000000000000', // 500 CARIB
      streetCash: 2000,
      experience: 800,
      reputation: 50,
      unlocks: [{ type: 'vehicle', name: 'Sports Car' }]
    },
    timeLimit: 180, // 3 minutes
    isActive: true
  },

  {
    missionId: 'JAM004',
    title: 'Gunrunner',
    description: 'Transport illegal weapons across town without getting caught.',
    type: 'story',
    island: 'Jamaica',
    location: { x: 160, y: 85, z: 15, marker: 'guns' },
    difficulty: 4,
    recommendedLevel: 4,
    requirements: { level: 3, previousMissions: ['JAM001', 'JAM002'] },
    objectives: [
      {
        description: 'Pick up the weapons',
        type: 'collect',
        target: 'Weapon Crate',
        quantity: 3
      },
      {
        description: 'Deliver without detection',
        type: 'deliver',
        location: { x: 220, y: 110, z: 8 }
      }
    ],
    rewards: {
      carib: '750000000000000000000', // 750 CARIB
      streetCash: 3000,
      experience: 1200,
      reputation: 75,
      items: [{ type: 'Pistol', quantity: 1 }]
    },
    failureConditions: [
      { type: 'detection', description: 'Police spotted you' }
    ],
    isActive: true,
    storySequence: { chapter: 1, sequence: 2 }
  },

  {
    missionId: 'JAM005',
    title: 'Bahamas Beckons',
    description: 'Complete the final mission in Jamaica to unlock travel to the Bahamas.',
    type: 'story',
    island: 'Jamaica',
    location: { x: 180, y: 95, z: 20, marker: 'finale' },
    difficulty: 5,
    recommendedLevel: 5,
    requirements: { level: 5, previousMissions: ['JAM004'], minReputation: 100 },
    objectives: [
      {
        description: 'Defend the hideout',
        type: 'defend',
        location: { x: 100, y: 50, z: 10 },
        quantity: 3 // waves
      },
      {
        description: 'Defeat the boss',
        type: 'kill',
        target: 'Gang Boss',
        quantity: 1
      }
    ],
    rewards: {
      carib: '2000000000000000000000', // 2000 CARIB
      streetCash: 10000,
      experience: 3000,
      reputation: 200,
      unlocks: [
        { type: 'island', name: 'Bahamas' },
        { type: 'vehicle', name: 'Helicopter' }
      ]
    },
    timeLimit: 600, // 10 minutes
    isActive: true,
    storySequence: { chapter: 1, sequence: 3 }
  },

  {
    missionId: 'BAH001',
    title: 'Paradise Lost',
    description: 'Arrive in the Bahamas and establish your presence.',
    type: 'story',
    island: 'Bahamas',
    location: { x: 300, y: 150, z: 10, marker: 'start' },
    difficulty: 6,
    recommendedLevel: 6,
    requirements: { level: 5, unlockedIslands: ['Bahamas'] },
    objectives: [
      {
        description: 'Take over a beachfront property',
        type: 'reach',
        location: { x: 320, y: 160, z: 5 }
      }
    ],
    rewards: {
      carib: '1000000000000000000000', // 1000 CARIB
      streetCash: 5000,
      experience: 2000,
      reputation: 100,
      items: [{ type: 'Beach House', quantity: 1 }]
    },
    isActive: true,
    storySequence: { chapter: 2, sequence: 1 }
  },

  {
    missionId: 'DAILY001',
    title: 'Daily Drug Run',
    description: 'Transport contraband for daily rewards.',
    type: 'daily',
    island: 'Jamaica',
    location: { x: 110, y: 55, z: 8, marker: 'daily' },
    difficulty: 3,
    recommendedLevel: 3,
    requirements: { level: 3 },
    objectives: [
      {
        description: 'Deliver the package',
        type: 'deliver',
        location: { x: 190, y: 95, z: 10 }
      }
    ],
    rewards: {
      carib: '300000000000000000000', // 300 CARIB
      streetCash: 1500,
      experience: 400
    },
    cooldown: 86400, // 24 hours
    isActive: true
  },

  {
    missionId: 'HEIST001',
    title: 'Bank Heist',
    description: 'Team up with other players to rob the biggest bank in Kingston.',
    type: 'heist',
    island: 'Jamaica',
    location: { x: 170, y: 88, z: 25, marker: 'heist' },
    difficulty: 10,
    recommendedLevel: 10,
    requirements: { level: 8, minReputation: 300 },
    isMultiplayer: true,
    minPlayers: 2,
    maxPlayers: 4,
    objectives: [
      {
        description: 'Break into the vault',
        type: 'custom',
        target: 'Vault'
      },
      {
        description: 'Steal the money',
        type: 'collect',
        target: 'Cash Bags',
        quantity: 5
      },
      {
        description: 'Escape',
        type: 'reach',
        location: { x: 250, y: 120, z: 10 }
      }
    ],
    rewards: {
      carib: '10000000000000000000000', // 10,000 CARIB (split among players)
      streetCash: 50000,
      experience: 10000,
      reputation: 500
    },
    timeLimit: 900, // 15 minutes
    failureConditions: [
      { type: 'death', description: 'All players died' },
      { type: 'time', description: 'Ran out of time' }
    ],
    isActive: true
  }
];

// Connect and seed
async function seed() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/caribbean-game');

    console.log('✅ Connected to MongoDB');

    // Clear existing missions
    await Mission.deleteMany({});
    console.log('🗑️  Cleared existing missions');

    // Insert missions
    await Mission.insertMany(missions);
    console.log(`✅ Inserted ${missions.length} missions`);

    console.log('\n📋 Mission Summary:');
    console.log('  - Jamaica Story Missions: 4');
    console.log('  - Jamaica Side Missions: 1');
    console.log('  - Jamaica Race: 1');
    console.log('  - Bahamas Story: 1');
    console.log('  - Daily Mission: 1');
    console.log('  - Heist Mission: 1');
    console.log('  - Total: 9 missions');

    console.log('\n🎮 Database seeded successfully!');
    console.log('You can now test the API with these missions.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run
seed();
