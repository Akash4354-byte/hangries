// Suggested code may be subject to a license. Learn more: ~LicenseLog:2858814622.
// Suggested code may be subject to a license. Learn more: ~LicenseLog:2393206431.
// Suggested code may be subject to a license. Learn more: ~LicenseLog:2276826347.
// Suggested code may be subject to a license. Learn more: ~LicenseLog:335127093.
// Suggested code may be subject to a license. Learn more: ~LicenseLog:2386077346.
 import express from 'express';
import { MongoClient } from 'mongodb';
import nodemailer from 'nodemailer';
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
  const passwordResetSessions = db.collection('passwordResetSessions');


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

  // Create a Nodemailer transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  app.post('/forgot-password', async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).send('Email is required');
      }

      const user = await users.findOne({ email });
      if (!user) {
        return res.status(404).send('User not found');
      }

      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes from now
      await passwordResetSessions.insertOne({ email, otp, expiresAt });

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Password Reset OTP',
        text: `Your OTP for password reset is: ${otp}`,
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('Error sending email:', error);
          res.status(500).send('Error sending email');
        } else {
          console.log('Email sent:', info.response);
          res.status(200).send('OTP sent to email');
        }
      });
    } catch (err) {
      console.error('Error initiating password reset:', err);
      res.status(500).send('Error initiating password reset');
    }
  });

  app.post('/verify-otp', async (req, res) => {
    try {
      const { email, otp } = req.body;
      if (!email || !otp) {
        return res.status(400).send('Email and OTP are required');
      }

      const session = await passwordResetSessions.findOne({ email, otp });
      if (!session) {
        return res.status(401).send('Invalid OTP');
      }

      if (session.expiresAt < new Date()) {
        await passwordResetSessions.deleteOne({ _id: session._id });
        return res.status(400).send('OTP has expired');
      }

      await passwordResetSessions.deleteOne({ _id: session._id });
      res.status(200).send('OTP verified successfully');
    } catch (err) {
      console.error('Error verifying OTP:', err);
      res.status(500).send('Error verifying OTP');
    }
  });

  app.post('/reset-password', async (req, res) => {
    try {
      const { email, newPassword } = req.body;
      if (!email || !newPassword) {
        return res.status(400).send('Email and new password are required');
      }

      // Check if the user exists
      const user = await users.findOne({ email });
      if (!user) {
        return res.status(404).send('User not found');
      }

      // Ensure there is no active reset session, if so, the user hasn't completed the full flow
      const activeSession = await passwordResetSessions.findOne({ email });
      if (activeSession) {
        return res.status(400).send('OTP verification is required before resetting password');
      }

      // Update the user's password
      const result = await users.updateOne(
        { email },
        { $set: { password: newPassword } }
      );

      if (result.modifiedCount === 0) {
        return res.status(500).send('Failed to update password');
      }

      res.status(200).send('Password updated successfully');
    } catch (err) {
      console.error('Error resetting password:', err);
      res.status(500).send('Error resetting password');
    }
  });

const port = parseInt(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`listening on port ${port}`);
});
}

main().catch(console.error);