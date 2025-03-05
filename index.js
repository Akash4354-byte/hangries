// Suggested code may be subject to a license. Learn more: ~LicenseLog:2386077346.
 import express from 'express';
import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config();
const app = express();
app.use(express.json());

async function main() {
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  console.log('Connected successfully to server');
  const db = client.db('hangries');
  const users = db.collection('users');
  const chats = db.collection('chats');

app.get('/', (req, res) => {
  const name = process.env.NAME || 'World';
  res.send(`Hello ${name}!`);
});

  app.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).send('Email and password are required');
      }
      const user = await users.findOne({ email, password });
      if (!user) {
        return res.status(401).send('Invalid email or password');
      }
      res.status(200).json({
        message: 'Login successful',
        userId: user._id,
      });
    } catch (err) {
      console.error('Error logging in user:', err);
      res.status(500).send('Error logging in');
    }
  });


  app.post('/signup', async (req, res) => {
    try {
      const { name, email, password } = req.body;
      if (!name || !email || !password) {
        return res.status(400).send('Name, email, and password are required');
      }

      const existingUser = await users.findOne({ email });
      if (existingUser) {
        return res.status(409).send('User with this email already exists');
      }
      const user = { name, email, password };
      const result = await users.insertOne(user);
      console.log(`New user created with the following id: ${result.insertedId}`);
      res.status(201).json({
        message: 'User created successfully',
        userId: result.insertedId,
      });
    } catch (err) {
      console.error('Error creating user:', err);
      res.status(500).send('Error creating user');
    }
  });

  app.get('/chats/user/:userId', async (req, res) => {
    try {
      const userId = req.params.userId;
      const chatSessions = await chats.aggregate([
        { $match: { userId } },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: "$chatSessionId",
            chatName: { $first: "$chatName" }
           
          }
        },
        { $project: { _id: 0, chatSessionId: "$_id", chatName: 1} }
      ]).toArray();
      res.status(200).json(chatSessions);
    } catch (err) {
      console.error('Error retrieving chat sessions:', err);
      res.status(500).send('Error retrieving chat sessions');
    }
  });


  app.post('/chats', async (req, res) => {
    try {
      const { chatSessionId, chatName, userId, message, role } = req.body;
      if (!message || !chatSessionId) {
        return res.status(400).send('Message and chatSessionId are required');
      }
      const chat = { chatSessionId, chatName, userId, message, role, createdAt: new Date() };
      const result = await chats.insertOne(chat);
      console.log(`New chat message created with the following id: ${result.insertedId}`);
      res.status(201).json({
        message: 'Chat message created successfully',
        chatId: result.insertedId,
      });
    } catch (err) {
      console.error('Error creating chat message:', err);
      res.status(500).send('Error creating chat message');
    }
  });

  app.get('/chats/:chatSessionId', async (req, res) => {
    try {
      const chatSessionId = req.params.chatSessionId;
      const chatMessages = await chats.find({ chatSessionId }).toArray();
      res.status(200).json(chatMessages);
    } catch (err) {
      console.error('Error retrieving chat messages:', err);
      res.status(500).send('Error retrieving chat messages');
    }
  });

  app.delete('/chats/:chatSessionId', async (req, res) => {
    try {
      const chatSessionId = req.params.chatSessionId;
      const result = await chats.deleteMany({ chatSessionId });
      if (result.deletedCount === 0) {
        return res.status(404).send('No chat messages found with this chatSessionId');
      }
      console.log(`${result.deletedCount} chat messages deleted`);
      res.status(200).json({
        message: `${result.deletedCount} chat messages deleted successfully`,
      });
    } catch (err) {
      console.error('Error deleting chat messages:', err);
      res.status(500).send('Error deleting chat messages');
    }
  });


const port = parseInt(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`listening on port ${port}`);
});
}

main().catch(console.error);