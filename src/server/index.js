//import express from 'express';
const express = require('express');
const router = express.Router();

const app = express();
app.use(express.json());
app.use(router);

/*
app.listen(3000, () => {
  console.log('Devvit app server running on port 3000');
});

*/
// Handle the onPostSubmit trigger
router.post('/internal/on-post-submit', async (req, res) => {
  console.log('Handle event for on-post-submit!');
  const post = req.body.post;
  const author = req.body.author;
  // Your custom logic here, e.g., moderation, logging, etc.
  console.log('Post:', JSON.stringify(post, null, 2));
  console.log('Author:', JSON.stringify(author, null, 2));
  res.status(200).json({ status: 'ok' });
});

export default router;