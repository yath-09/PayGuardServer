import { PrismaClient } from '@prisma/client';
import amqp from 'amqplib';
import { mockBankTransaction } from './mockBanksService';


const prisma = new PrismaClient();
const processTransactions = async () => {
    const QUEUE_NAME = "transactionQueue";
    const rabbitMQURL = process.env.RABBITMQ_URL || "amqp://localhost";
    console.log(`Connecting to RabbitMQ server`);
    const connection = await amqp.connect(rabbitMQURL);
    const channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });

    console.log(`Waiting for messages in ${QUEUE_NAME}...`);

    channel.consume(
        QUEUE_NAME,
        async (msg) => {
            if (msg) {
                const transactionData = JSON.parse(msg.content.toString());
                console.log("Processing transaction:", transactionData);

                try {
                    //again hitting the bank api for the same transaction 
                    const startTime = Date.now();
                    //using the transaction id bank will return the payment is still processing that will prevent the prevent multiple payments to adhoc
                    //here more checks to be added fot the same reason of checking in th ebalance suppose it takes but bank can take care of the same
                    const result = await mockBankTransaction(
                        transactionData.senderAccountNumber,
                        transactionData.receiverAccountNumber,
                        transactionData.amount,
                        transactionData.transactionToken,
                    );
                    transactionData.retryNumbers++;
                    await new Promise((resolve) => setTimeout(resolve, 2000));
                    const processingTime = Date.now() - startTime;
                    if (processingTime > 2000 && transactionData.retryNumbers > 3) {
                        console.log(`Transaction failed after ${transactionData.retryNumbers} tries`);
                        await prisma.p2pTransfer.update({
                            where: { id: transactionData.transactionId },
                            data: {
                                status: "Failure",
                                timestamp: new Date()
                            },
                        });
                        // Acknowledge the message after handling failure
                        channel.ack(msg);
                    }
                    else if (processingTime > 2000) {
                        
                         // Acknowledge the current message before requeuing the updated one
                         channel.ack(msg);
                        channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(transactionData)), {
                            persistent: true,
                        });
                        
                    }
                    else if (result.success) {
                        console.log("Transaction successful");
                        await prisma.p2pTransfer.update({
                            where: { id: transactionData.transactionId },
                            data: {
                                status: "Success",
                                timestamp: new Date()
                            },
                        });
                        // Acknowledge the message after successful processing
                        channel.ack(msg);

                    } else {
                        console.log("Transaction failed");
                        await prisma.p2pTransfer.update({
                            where: { id: transactionData.transactionId },
                            data: {
                                status: "Failure",
                                timestamp: new Date()
                            },
                        });
                        //acknoledge the message after handling failure
                        channel.ack(msg);
                    }
                } catch (error) {
                    console.error("Error processing transaction:", error);
                    channel.ack(msg); // Acknowledge the message
                }
            }
        },
        { noAck: false }//only acckonwddger to the queue when everhtihn is done
    );
};

processTransactions().catch(console.error);
