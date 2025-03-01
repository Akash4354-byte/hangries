// Suggested code may be subject to a license. Learn more: ~LicenseLog:1073013651.
// Suggested code may be subject to a license. Learn more: ~LicenseLog:856099459.
// Suggested code may be subject to a license. Learn more: ~LicenseLog:1168440382.
// Suggested code may be subject to a license. Learn more: ~LicenseLog:2424337707.
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

app.get('/', (req, res) => {
  const name = process.env.NAME || 'World';
  res.send(`Hello ${name}!`);
});

  app.post('/signup', async (req, res) => {
    try {
      const { name, email, password } = req.body;
      if (!name || !email || !password) {
        return res.status(400).send('Name, email, and password are required');
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

const port = parseInt(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`listening on port ${port}`);
});
}

main().catch(console.error);