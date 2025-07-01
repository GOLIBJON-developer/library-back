// Test setup file
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.MONGO_URI = 'mongodb://localhost:27017/sambhram-library-test';

// Increase timeout for tests
jest.setTimeout(10000); 