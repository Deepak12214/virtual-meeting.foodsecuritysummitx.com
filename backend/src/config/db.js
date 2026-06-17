const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
      return;
    } catch (error) {
      console.error(`Failed to connect to MongoDB: ${error.message}`);
    }
};

module.exports = connectDB;
