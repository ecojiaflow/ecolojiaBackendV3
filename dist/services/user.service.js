"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserById = getUserById;
exports.updateUserById = updateUserById;
// PATH: src/services/user.service.ts
const User_1 = __importDefault(require("../models/User"));
async function getUserById(userId) {
    return await User_1.default.findById(userId);
}
async function updateUserById(userId, updates) {
    return await User_1.default.findByIdAndUpdate(userId, updates, { new: true });
}
// EOF
