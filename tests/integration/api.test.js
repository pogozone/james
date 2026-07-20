const request = require('supertest');
const { app } = require('./setup');

describe('James API integration tests', () => {
  const createTodo = (overrides = {}) =>
    request(app)
      .post('/james-todos/api/todos')
      .send({
        title: 'Test todo',
        dueDate: '2026-07-20',
        status: 'Neu',
        priority: 'Hat Zeit',
        sprintBucket: 'none',
        scrumStatus: 'Ready',
        ...overrides
      });

  describe('POST /todos', () => {
    it('creates a todo with valid input and returns 201', async () => {
      const res = await createTodo().expect(201);
      expect(res.body.title).toBe('Test todo');
      expect(res.body.id).toBeDefined();
    });

    it('rejects invalid date with 400', async () => {
      await createTodo({ dueDate: '2026-02-30' }).expect(400);
    });

    it('rejects invalid story points with 400', async () => {
      await createTodo({ points: 13 }).expect(400);
    });

    it('rejects invalid status with 400', async () => {
      await createTodo({ status: 'Offen' }).expect(400);
    });

    it('rejects invalid scrumStatus with 400', async () => {
      await createTodo({ scrumStatus: 'Backlog' }).expect(400);
    });

    it('rejects invalid sprintBucket with 400', async () => {
      await createTodo({ sprintBucket: 'later' }).expect(400);
    });
  });

  describe('GET /todos', () => {
    it('lists created todos', async () => {
      await createTodo({ title: 'First' });
      const res = await request(app).get('/james-todos/api/todos').expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].title).toBe('First');
    });
  });

  describe('PUT /todos/:id', () => {
    it('updates a todo and keeps the id stable', async () => {
      const created = await createTodo();
      const id = created.body.id;
      const res = await request(app)
        .put(`/james-todos/api/todos/${id}`)
        .send({ title: 'Updated todo', priority: 'Super wichtig' })
        .expect(200);
      expect(res.body.id).toBe(id);
      expect(res.body.title).toBe('Updated todo');
      expect(res.body.priority).toBe('Super wichtig');
    });

    it('changes sprint and scrum status', async () => {
      const created = await createTodo({ sprintBucket: 'none' });
      const id = created.body.id;
      const res = await request(app)
        .put(`/james-todos/api/todos/${id}`)
        .send({ sprintBucket: 'current', scrumStatus: 'In Progress' })
        .expect(200);
      expect(res.body.sprintBucket).toBe('current');
      expect(res.body.scrumStatus).toBe('In Progress');
    });

    it('returns 400 for malformed id', async () => {
      await request(app)
        .put('/james-todos/api/todos/not-an-id')
        .send({ title: 'x' })
        .expect(400);
    });

    it('returns 404 for non-existent valid id', async () => {
      await request(app)
        .put('/james-todos/api/todos/507f1f77bcf86cd799439011')
        .send({ title: 'x' })
        .expect(404);
    });
  });

  describe('DELETE /todos/:id', () => {
    it('deletes an existing todo', async () => {
      const created = await createTodo();
      const id = created.body.id;
      await request(app).delete(`/james-todos/api/todos/${id}`).expect(200);
      await request(app).get(`/james-todos/api/todos/${id}`).expect(404);
    });

    it('returns 400 for malformed id', async () => {
      await request(app).delete('/james-todos/api/todos/bad-id').expect(400);
    });
  });

  describe('POST /todos/:id/complete', () => {
    it('marks a todo as Done and returns updated + followUp for repeatWeekly', async () => {
      const created = await createTodo({ repeatWeekly: true });
      const id = created.body.id;
      const res = await request(app)
        .post(`/james-todos/api/todos/${id}/complete`)
        .expect(200);
      expect(res.body.updated.scrumStatus).toBe('Done');
      expect(res.body.updated.status).toBe('Erledigt');
      expect(res.body.followUp).toBeDefined();
      expect(res.body.followUp.repeatWeekly).toBe(true);
      expect(res.body.followUp.dueDate).toBe('2026-07-27');
    });

    it('creates one-month follow-up for repeatMonthly', async () => {
      const created = await createTodo({ repeatMonthly: true, dueDate: '2026-01-31' });
      const id = created.body.id;
      const res = await request(app)
        .post(`/james-todos/api/todos/${id}/complete`)
        .expect(200);
      expect(res.body.followUp).toBeDefined();
      expect(res.body.followUp.dueDate).toBe('2026-02-28');
    });

    it('is idempotent: second completion returns existing followUp', async () => {
      const created = await createTodo({ repeatWeekly: true });
      const id = created.body.id;
      const first = await request(app)
        .post(`/james-todos/api/todos/${id}/complete`)
        .expect(200);
      const second = await request(app)
        .post(`/james-todos/api/todos/${id}/complete`)
        .expect(200);
      expect(second.body.followUp.id).toBe(first.body.followUp.id);
      // Verify only one follow-up exists in the database
      const list = await request(app).get('/james-todos/api/todos').expect(200);
      const followUps = list.body.filter(t => t.title === 'Test todo' && t.sprintBucket === 'next');
      expect(followUps.length).toBe(1);
    });

    it('does not create a follow-up when neither repeat flag is set', async () => {
      const created = await createTodo();
      const id = created.body.id;
      const res = await request(app)
        .post(`/james-todos/api/todos/${id}/complete`)
        .expect(200);
      expect(res.body.followUp).toBeNull();
    });
  });
});
