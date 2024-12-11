import { PrismaClient } from "@prisma/client";
import * as bcryptjs from "bcryptjs";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();
const numberOfUsersToBeAdded=6;

// Generate PIN based on phone number
const generatePin = (phoneNumber: string): string => {
    const pin = phoneNumber.slice(0, 4); // First 4 digits
    return `${pin}`;
};

// Generate MPIN based on phone number
const generateMpin = (phoneNumber: string): string => {
    const mpin = phoneNumber.slice(0, 6); // First 6 digits
    return `${mpin}`;
};
const generatePhoneNumber=():string=>{
    return Math.floor(7000000000+Math.random()*3000000000).toString();
}

// Function to generate a 16-digit account number
const generateAccountNumber = (j: number): string => {
    const fixedPart = `${(j + 1) * 1000000000}`; // Fixed 10 digits based on `j`
    const randomPart = Math.floor(100000 + Math.random() * 900000).toString(); // Random 6 digits
    return fixedPart + randomPart; // Combine fixed and random parts
};

const generateIifcCode = (j: number): string => {
    const bankerIifc=["UTIB","HDFC","ICIC"]
    const fixedPart =bankerIifc[j];
    const randomPart = Math.floor(1000 + Math.random() * 9000).toString(); // Random 6 digits
    return fixedPart + "000"+randomPart; // Combine fixed and random parts
};
const generateRandomAmount = (): number => {
    return Math.floor(10000 + Math.random() * 90000); // Ensures a 5-digit number
};

// Utility to hash PIN
export const hashPin = (pin: string): string => {
    const salt = bcryptjs.genSaltSync(10);
    return bcryptjs.hashSync(pin, salt);
};


const seedDatabase = async () => {
    try {
        console.log("Starting seeding...");
        const banks = ["axis", "hdfc", "icici"];
        const users = [];
        for (let i = 0; i < numberOfUsersToBeAdded; i++) {
            const user = {
                userName: faker.name.fullName(),
                phoneNumber: generatePhoneNumber(), // 10-digit Indian phone number
            };
            users.push(user);
        }

        for (const user of users) {
            // Hash the PIN before saving
            const pin = generatePin(user.phoneNumber);
            const hashedPin = hashPin(pin);

            // Create User
            const createdUser = await prisma.user.create({
                data: {
                    userName: user.userName,
                    phoneNumber: user.phoneNumber,
                    pin: hashedPin,
                },
            });

            // Assign Balance
            await prisma.balance.create({
                data: {
                    userId: createdUser.id,
                    amount: generateRandomAmount(), // Initial balance
                    locked: 0,
                },
            });
            
            // Assign Bank Accounts
            for (let j = 0; j < Math.floor(Math.random() * 3) + 1; j++) {
                const bankName =banks[j];
                const mpin = generateMpin(user.phoneNumber);
                const hashedMpin = hashPin(mpin);

                const bank = await prisma.bank.upsert({
                    where: { name: bankName },
                    update: {},
                    create: { name: bankName },
                });

                const upiId = `${user.phoneNumber}@${bankName}.payguard`;
                const accountNumber = generateAccountNumber(j);
                await prisma.bankAccount.create({
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
    } catch (error) {
        console.error("Error during seeding:", error);
    } finally {
        await prisma.$disconnect();
    }
};

seedDatabase();
