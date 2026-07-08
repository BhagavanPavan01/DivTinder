const mongoose = require("mongoose");
const Chat = require("../models/chat");

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000
        });

        console.log("✅ Database connection is established...");

        // Drop existing indexes and recreate them (fixes duplicate key issues)
        try {
            // Get the Chat model
            const ChatModel = mongoose.model('Chat');

            // Drop all indexes
            await ChatModel.collection.dropIndexes();
            console.log("✅ Dropped existing indexes");

            // Recreate indexes
            await Chat.syncIndexes();
            console.log("✅ Chat indexes recreated successfully");
        } catch (indexError) {
            // If dropping indexes fails, just sync
            if (indexError.code === 26) { // NamespaceNotFound
                console.log("⚠️ No existing indexes to drop");
            } else {
                console.error("⚠️ Error handling indexes:", indexError.message);
            }

            // Try to sync indexes anyway
            try {
                await Chat.syncIndexes();
                console.log("✅ Chat indexes synced successfully");
            } catch (syncError) {
                console.error("⚠️ Error syncing indexes:", syncError.message);
            }
        }

        // Handle connection events
        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('⚠️ MongoDB disconnected');
        });

        mongoose.connection.on('reconnected', () => {
            console.log('✅ MongoDB reconnected');
        });

    } catch (err) {
        console.error("❌ Database cannot be connected!!", err.message);
        throw err;
    }
};

// Graceful shutdown
process.on('SIGINT', async () => {
    try {
        await mongoose.connection.close();
        console.log('✅ MongoDB connection closed through app termination');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error closing MongoDB connection:', err);
        process.exit(1);
    }
});

module.exports = connectDB;