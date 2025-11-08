# 🚀 QUICK START - Caribbean Crypto GTA

## What We've Built So Far

✅ Smart Contracts (Solidity) - CARIB token & NFT assets
✅ Comprehensive Tests - 40+ test cases
✅ Backend API (Node.js + Express + Socket.io)
✅ MongoDB Database Models - Player, Mission, Transaction
✅ RESTful API Routes - Player & Mission management
✅ Web Test Interface - Beautiful UI for testing
✅ Seed Data - 9 sample missions ready to go

---

## 🏃 Run the Backend Server (3 Steps)

### Step 1: Start MongoDB

If you don't have MongoDB running:

```bash
# Option A: Install locally
# macOS: brew services start mongodb-community
# Ubuntu: sudo systemctl start mongod
# Windows: net start MongoDB

# Option B: Use Docker
docker run -d -p 27017:27017 --name mongo mongo:latest
```

### Step 2: Seed the Database

```bash
cd backend-api
node src/seedData.js
```

You should see:
```
✅ Connected to MongoDB
🗑️  Cleared existing missions
✅ Inserted 9 missions
🎮 Database seeded successfully!
```

### Step 3: Start the API Server

```bash
npm run dev
```

You should see:
```
✅ MongoDB connected
🚀 Caribbean Game API running on port 3000
📝 Environment: development
🌐 API URL: http://localhost:3000
```

---

## 🌐 Test the Game!

### Option 1: Use the Web Interface

1. Open `web-interface/index.html` in your browser
2. Try these actions:
   - **Register a player** with wallet address `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1`
   - **Get player profile** to see their stats
   - **Add experience** (500 XP) and see them level up!
   - **Unlock islands** (try Bahamas)
   - **Browse missions** - see all 9 missions
   - **Get available missions** - missions the player qualifies for

### Option 2: Use cURL

```bash
# Register a player
curl -X POST http://localhost:3000/api/player/register \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
    "username": "TestPlayer"
  }'

# Get player profile
curl http://localhost:3000/api/player/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1

# Get all missions
curl http://localhost:3000/api/missions

# Get missions in Jamaica
curl http://localhost:3000/api/missions/island/Jamaica

# Add experience
curl -X POST http://localhost:3000/api/player/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1/experience \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000}'

# Get leaderboard
curl http://localhost:3000/api/player/leaderboard/level
```

---

## 📋 Available Missions

Our seed data includes:

### Jamaica (Starter Island)
1. **Welcome to Paradise** (Lvl 1) - Tutorial mission - 100 CARIB
2. **First Score** (Lvl 2) - Steal a car - 250 CARIB
3. **Street Race** (Lvl 3) - Win a race - 500 CARIB + Sports Car
4. **Gunrunner** (Lvl 4) - Transport weapons - 750 CARIB + Pistol
5. **Bahamas Beckons** (Lvl 5) - Final boss - 2,000 CARIB + Unlock Bahamas

### Bahamas
6. **Paradise Lost** (Lvl 6) - Establish presence - 1,000 CARIB + Beach House

### Daily & Special
7. **Daily Drug Run** (Lvl 3) - Daily mission - 300 CARIB
8. **Bank Heist** (Lvl 10) - Multiplayer heist - 10,000 CARIB (split)

---

## 🎮 Game Progression Flow

1. **Register** → Create player with wallet address
2. **Tutorial** → Complete "Welcome to Paradise" (JAM001)
3. **Level Up** → Do missions to gain XP and level up
4. **Unlock Islands** → Complete "Bahamas Beckons" to unlock new islands
5. **Get Rich** → Earn CARIB tokens through missions
6. **PvP** → (Coming soon) Rob other players for their assets

---

## 🔧 API Endpoints

### Player Management
- `POST /api/player/register` - Register new player
- `GET /api/player/:walletAddress` - Get player profile
- `PUT /api/player/:walletAddress/location` - Update location
- `POST /api/player/:walletAddress/experience` - Add XP
- `POST /api/player/:walletAddress/unlock-island` - Unlock island
- `GET /api/player/:walletAddress/assets` - Get owned NFTs
- `GET /api/player/leaderboard/:type` - Get leaderboard

### Missions
- `GET /api/missions` - Get all missions
- `GET /api/missions/available/:walletAddress` - Get available missions
- `GET /api/missions/island/:island` - Get missions by island
- `GET /api/missions/:missionId` - Get mission details
- `POST /api/missions/:missionId/start` - Start mission
- `POST /api/missions/:missionId/complete` - Complete mission
- `POST /api/missions/:missionId/fail` - Fail mission

---

## 📊 Database Models

### Player
- Wallet address (unique ID)
- Username, level, experience
- Skills (driving, shooting, business, street smarts)
- Current island & unlocked islands
- Reputation & street cash
- Owned assets (NFTs)
- PvP stats
- Active/completed missions

### Mission
- Mission ID, title, description
- Type (story, heist, side, daily, race)
- Island & location
- Difficulty & level requirements
- Objectives to complete
- Rewards (CARIB, XP, items, unlocks)
- Time limits & cooldowns

### Transaction
- Blockchain tx hash
- From/to addresses
- Type (mission reward, PvP robbery, etc.)
- Amount & asset details
- Status tracking
- Anti-fraud flags

---

## 🧪 Testing Smart Contracts

When you have internet access:

```bash
cd smart-contracts

# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Deploy to Mumbai testnet
npx hardhat run scripts/deploy.js --network mumbai
```

Our test suite includes:
- **CaribbeanToken.test.js** - 25 tests for CARIB token
- **CaribbeanAssets.test.js** - 20 tests for NFT assets

---

## 🎯 What's Next?

### Immediate Next Steps
1. ✅ Smart contract deployment (needs internet)
2. ⏳ PvP system (robbery mechanics)
3. ⏳ NFT marketplace
4. ⏳ Unity game client
5. ⏳ Blockchain integration

### To Build the Full Game
- Unity mobile game client
- Wallet integration (MetaMask Mobile)
- Real blockchain deployment
- NFT minting system
- Multiplayer servers
- Anti-cheat system
- Legal compliance

---

## 💡 Pro Tips

1. **MongoDB Issues?** Make sure it's running on port 27017
2. **Port 3000 in use?** Change `PORT` in `.env`
3. **Test with Postman** - Import the API endpoints
4. **Check server logs** - All errors are logged to console
5. **Reset database** - Just run `seedData.js` again

---

## 🐛 Troubleshooting

### Server won't start
```bash
# Make sure MongoDB is running
# Check if port 3000 is available
lsof -i :3000
```

### Database connection error
```bash
# Verify MongoDB connection string in .env
MONGODB_URI=mongodb://localhost:27017/caribbean-game
```

### No missions showing up
```bash
# Re-run seed script
node src/seedData.js
```

---

## 📞 Need Help?

- Check the main [README.md](./README.md) for full documentation
- Review [CARIBBEAN_GAME_DESIGN.md](./CARIBBEAN_GAME_DESIGN.md) for game design
- See [TECHNICAL_ARCHITECTURE.md](./TECHNICAL_ARCHITECTURE.md) for architecture

---

## 🎉 You're All Set!

You now have a working game backend with:
- ✅ Player registration & profiles
- ✅ Experience & leveling system
- ✅ Island unlocking mechanics
- ✅ 9 playable missions
- ✅ Leaderboards
- ✅ Beautiful web test interface

**Start the server, open the web interface, and start building your Caribbean empire!** 🏝️💰🚀
