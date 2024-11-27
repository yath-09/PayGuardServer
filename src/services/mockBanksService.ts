export async function mockBankTransaction(
    senderAccountNumber: string,
    receiverAccountNumber: string,
    amount: number,
    senderBank?: string,
    receiverBank?: string,
): Promise<{ success: boolean; hash?: string }> {
    // Simulate success/failure randomly
    const isSuccess = Math.random() > 0.2; // 90% success rate

    if (!isSuccess) {
        return { success: false };
    }

    return {
        success: true,
        hash: generateTransactionToken(),
    };
}

export function generateTransactionToken(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Mock bank API call for demonstration
export const simulateBankApi = async (amount: number, userId: number, provider: String): Promise<{ success: boolean }> => {
    // Simulate a delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return { success: true }; // Simulate a successful response
};

