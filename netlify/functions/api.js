const serverless = require('serverless-http');
const { app } = require('../../app');
const { connectDb } = require('../../db');

const handler = serverless(app);

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  await connectDb();
  return handler(event, context);
};
