"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPin = void 0;
const client_1 = require("@prisma/client");
const bcryptjs = __importStar(require("bcryptjs"));
const faker_1 = require("@faker-js/faker");
const prisma = new client_1.PrismaClient();
const numberOfUsersToBeAdded = 10;
// Generate PIN based on phone number
const generatePin = (phoneNumber) => {
    const pin = phoneNumber.slice(0, 4); // First 4 digits
    return `${pin}`;
};
// Generate MPIN based on phone number
const generateMpin = (phoneNumber) => {
    const mpin = phoneNumber.slice(0, 6); // First 6 digits
    return `${mpin}`;
};
const generatePhoneNumber = () => {
    return Math.floor(7000000000 + Math.random() * 3000000000).toString();
};
// Function to generate a 16-digit account number
const generateAccountNumber = (j) => {
    const fixedPart = `${(j + 1) * 1000000000}`; // Fixed 10 digits based on `j`
    const randomPart = Math.floor(100000 + Math.random() * 900000).toString(); // Random 6 digits
    return fixedPart + randomPart; // Combine fixed and random parts
};
const generateIifcCode = (j) => {
    const bankerIifc = ["UTIB", "HDFC", "ICIC"];
    const fixedPart = bankerIifc[j];
    const randomPart = Math.floor(1000 + Math.random() * 9000).toString(); // Random 6 digits
    return fixedPart + "000" + randomPart; // Combine fixed and random parts
};
const generateRandomAmount = () => {
    return Math.floor(10000 + Math.random() * 90000); // Ensures a 5-digit number
};
// Utility to hash PIN
const hashPin = (pin) => {
    const salt = bcryptjs.genSaltSync(10);
    return bcryptjs.hashSync(pin, salt);
};
exports.hashPin = hashPin;
const seedDatabase = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("Starting seeding...");
        const banks = ["axis", "hdfc", "icici"];
        const users = [];
        for (let i = 0; i < numberOfUsersToBeAdded; i++) {
            const user = {
                userName: faker_1.faker.name.fullName(),
                phoneNumber: generatePhoneNumber(), // 10-digit Indian phone number
            };
            users.push(user);
        }
        for (const user of users) {
            // Hash the PIN before saving
            const pin = generatePin(user.phoneNumber);
            const hashedPin = (0, exports.hashPin)(pin);
            // Create User
            const createdUser = yield prisma.user.create({
                data: {
                    userName: user.userName,
                    phoneNumber: user.phoneNumber,
                    pin: hashedPin,
                },
            });
            // Assign Balance
            yield prisma.balance.create({
                data: {
                    userId: createdUser.id,
                    amount: generateRandomAmount(), // Initial balance
                    locked: 0,
                },
            });
            // Assign Bank Accounts
            for (let j = 0; j < Math.floor(Math.random() * 3) + 1; j++) {
                const bankName = banks[j];
                const mpin = generateMpin(user.phoneNumber);
                const hashedMpin = (0, exports.hashPin)(mpin);
                const bank = yield prisma.bank.upsert({
                    where: { name: bankName },
                    update: {},
                    create: { name: bankName },
                });
                const upiId = `${user.phoneNumber}@${bankName}.payguard`;
                const accountNumber = generateAccountNumber(j);
                yield prisma.bankAccount.create({
                    data: {
                        accountNumber,
                        ifscCode: generateIifcCode(j),
                        bankName,
                        upiId,
                        mpin: hashedMpin,
                        userId: createdUser.id,
                        bankId: bank.id,
                    },
                });
            }
        }
        console.log("Seeding complete.");
    }
    catch (error) {
        console.error("Error during seeding:", error);
    }
    finally {
        yield prisma.$disconnect();
    }
});
seedDatabase();
