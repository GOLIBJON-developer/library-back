const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

describe('User Management Endpoints', () => {
  let adminToken;
  let userToken;
  let testUser;
  let adminUser;

  beforeAll(async () => {
    // Create test users
    adminUser = new User({
      name: 'Admin User',
      email: 'admin@test.com',
      password: 'password123',
      role: 'admin'
    });
    await adminUser.save();

    testUser = new User({
      name: 'Test User',
      email: 'user@test.com',
      password: 'password123',
      role: 'user'
    });
    await testUser.save();

    // Generate tokens
    adminToken = jwt.sign({ userId: adminUser._id }, process.env.JWT_SECRET);
    userToken = jwt.sign({ userId: testUser._id }, process.env.JWT_SECRET);
  });

  afterAll(async () => {
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  describe('GET /api/users', () => {
    it('should return all users for admin', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should deny access to non-admin users', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
    });

    it('should deny access without token', async () => {
      const response = await request(app)
        .get('/api/users');

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should update user for admin', async () => {
      const updateData = {
        name: 'Updated User Name',
        email: 'updated@test.com',
        role: 'admin'
      };

      const response = await request(app)
        .put(`/api/users/${testUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe(updateData.name);
      expect(response.body.email).toBe(updateData.email);
      expect(response.body.role).toBe(updateData.role);
    });

    it('should validate required fields', async () => {
      const updateData = {
        name: '',
        email: 'invalid-email'
      };

      const response = await request(app)
        .put(`/api/users/${testUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(400);
    });

    it('should deny access to non-admin users', async () => {
      const updateData = {
        name: 'Updated Name'
      };

      const response = await request(app)
        .put(`/api/users/${testUser._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData);

      expect(response.status).toBe(403);
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const updateData = {
        name: 'Updated Name'
      };

      const response = await request(app)
        .put(`/api/users/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should delete user for admin', async () => {
      const userToDelete = new User({
        name: 'User to Delete',
        email: 'delete@test.com',
        password: 'password123',
        role: 'user'
      });
      await userToDelete.save();

      const response = await request(app)
        .delete(`/api/users/${userToDelete._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);

      // Verify user is deleted
      const deletedUser = await User.findById(userToDelete._id);
      expect(deletedUser).toBeNull();
    });

    it('should deny access to non-admin users', async () => {
      const response = await request(app)
        .delete(`/api/users/${testUser._id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .delete(`/api/users/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/users/me/history', () => {
    it('should return user history for authenticated user', async () => {
      const response = await request(app)
        .get('/api/users/me/history')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should deny access without token', async () => {
      const response = await request(app)
        .get('/api/users/me/history');

      expect(response.status).toBe(401);
    });
  });
}); 