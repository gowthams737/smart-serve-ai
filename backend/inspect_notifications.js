import mongoose from 'mongoose';

async function main() {
  await mongoose.connect('mongodb://localhost:27017/smartserve');
  const notifs = await mongoose.connection.db.collection('notifications').find().toArray();
  console.log('Total notifications in MongoDB:', notifs.length);
  notifs.forEach(n => {
    console.log({
      _id: n._id.toString(),
      title: n.title,
      type: n.type,
      recipientRole: n.recipientRole,
      recipientEmail: n.recipientEmail,
      bookingId: n.bookingId,
      read: n.read,
      createdAt: n.createdAt
    });
  });
  await mongoose.disconnect();
}

main().catch(console.error);
