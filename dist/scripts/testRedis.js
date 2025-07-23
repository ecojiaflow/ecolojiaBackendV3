"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/scripts/testRedis.ts
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const CacheService_1 = require("../services/CacheService");
async function testRedisConnection() {
    console.log('🧪 Testing Redis Frankfurt connection...');
    console.log('📡 Redis URL:', process.env.REDIS_URL?.replace(/:[^:@]+@/, ':****@'));
    try {
        // Test 1: Ping
        console.log('\n1️⃣ Testing basic connection...');
        const testKey = `test:${Date.now()}`;
        await CacheService_1.cacheService.cacheSession(testKey, { test: true }, 60);
        console.log('✅ Write successful');
        // Test 2: Read
        const result = await CacheService_1.cacheService.getSession(testKey);
        console.log('✅ Read successful:', result);
        // Test 3: Delete
        await CacheService_1.cacheService.deleteSession(testKey);
        console.log('✅ Delete successful');
        // Test 4: Stats
        console.log('\n2️⃣ Getting cache stats...');
        const stats = await CacheService_1.cacheService.getCacheStats();
        console.log('✅ Stats:', JSON.stringify(stats, null, 2));
        console.log('\n🎉 All tests passed! Redis Frankfurt is working!');
        process.exit(0);
    }
    catch (error) {
        console.error('\n❌ Test failed:', error);
        process.exit(1);
    }
}
// Run test
testRedisConnection();
