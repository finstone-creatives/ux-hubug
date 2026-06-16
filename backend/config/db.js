const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    global.USE_DEMO = false;
  } catch (error) {
    console.warn(`⚠️  MongoDB not available (${error.message}). Running in DEMO MODE with in-memory data.`);
    console.warn('   All features will work with seeded demo accounts. For production use a real MongoDB.');
    global.USE_DEMO = true;
    // Do NOT exit — demo mode will power the platform
  }
};

module.exports = connectDB;
