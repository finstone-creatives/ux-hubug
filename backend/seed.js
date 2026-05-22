require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const Video = require('./models/Video');

const sampleUsers = [
  {
    username: 'Amara_Official',
    email: 'amara@example.com',
    password: 'Test1234!',
    dateOfBirth: new Date('1995-05-10'),
    ageVerified: true,
    avatar: null,
    role: 'user',
    isPremium: true,
    uploadCount: 4,
  },
  {
    username: 'ZaraLux',
    email: 'zara@example.com',
    password: 'Test1234!',
    dateOfBirth: new Date('1996-08-17'),
    ageVerified: true,
    avatar: null,
    role: 'user',
    isPremium: false,
    uploadCount: 3,
  },
  {
    username: 'uxhub_admin',
    email: 'admin@uxhub.local',
    password: 'Admin123!',
    dateOfBirth: new Date('1990-01-01'),
    ageVerified: true,
    role: 'admin',
    isPremium: false,
    uploadCount: 0,
  },
];

const sampleVideos = [
  {
    title: 'Evening Chat with Amara',
    description: 'Join Amara for an intimate evening conversation and live Q&A.',
    filename: 'amara-evening-chat.mp4',
    filePath: './uploads/amara-evening-chat.mp4',
    uploaderEmail: 'amara@example.com',
    status: 'approved',
    isPremium: false,
    views: 234,
    duration: 720,
    tags: ['Live', 'Chat', 'Creator'],
    category: 'Live',
  },
  {
    title: 'Private Show with Zara',
    description: 'A private live experience featuring Zara.',
    filename: 'zara-private-show.mp4',
    filePath: './uploads/zara-private-show.mp4',
    uploaderEmail: 'zara@example.com',
    status: 'approved',
    isPremium: true,
    views: 189,
    duration: 860,
    tags: ['Premium', 'Private', 'Live'],
    category: 'Live',
  },
  {
    title: 'Jasmine Live Q&A',
    description: 'Jasmine answers fan questions live with exclusive updates.',
    filename: 'jasmine-live-qa.mp4',
    filePath: './uploads/jasmine-live-qa.mp4',
    uploaderEmail: 'amara@example.com',
    status: 'approved',
    isPremium: false,
    views: 412,
    duration: 950,
    tags: ['Q&A', 'Live', 'Exclusive'],
    category: 'Live',
  },
  {
    title: 'Rose Chill Stream',
    description: 'Relax with Rose for a cozy chill stream session.',
    filename: 'rose-chill-stream.mp4',
    filePath: './uploads/rose-chill-stream.mp4',
    uploaderEmail: 'zara@example.com',
    status: 'approved',
    isPremium: false,
    views: 88,
    duration: 620,
    tags: ['Chill', 'Live', 'Content'],
    category: 'Live',
  },
];

const seed = async () => {
  await connectDB();

  try {
    for (const userData of sampleUsers) {
      await User.findOneAndUpdate(
        { email: userData.email },
        userData,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    const users = await User.find({ email: { $in: sampleUsers.map(u => u.email) } });
    const userMap = users.reduce((acc, user) => {
      acc[user.email] = user;
      return acc;
    }, {});

    for (const videoData of sampleVideos) {
      const uploader = userMap[videoData.uploaderEmail];
      if (!uploader) continue;
      const existing = await Video.findOne({ title: videoData.title, uploader: uploader._id });
      if (existing) continue;
      await Video.create({
        title: videoData.title,
        description: videoData.description,
        filename: videoData.filename,
        filePath: videoData.filePath,
        uploader: uploader._id,
        status: videoData.status,
        isPremium: videoData.isPremium,
        views: videoData.views,
        duration: videoData.duration,
        tags: videoData.tags,
        category: videoData.category,
      });
    }

    console.log('✅ Seed complete. Sample users and videos are available.');
    console.log('Test creator accounts:');
    console.log('  Amara  — amara@example.com / Test1234!');
    console.log('  Zara   — zara@example.com / Test1234!');
    console.log('Admin account:');
    console.log('  admin  — admin@uxhub.local / Admin123!');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
};

seed();
