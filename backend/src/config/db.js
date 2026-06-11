const mongoose = require('mongoose');

const connectDB = async () => {
  const uris = [
    process.env.MONGODB_URI,
    'mongodb://127.0.0.1:27017/virtual_event_db'
  ];

  for (const uri of uris) {
    if (!uri) continue;
    try {
      // Hide password in console logs
      const safeUri = uri.replace(/:([^:@]+)@/, ':****@');
      console.log(`Connecting to MongoDB at: ${safeUri}`);
      
      const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      return;
    } catch (error) {
      console.error(`❌ Failed to connect to MongoDB: ${error.message}`);
    }
  }

  console.error('❌ All MongoDB connection attempts failed. Exiting...');
  process.exit(1);
};

module.exports = connectDB;
