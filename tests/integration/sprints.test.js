const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server-mongo');

describe('Sprint management integration tests', () => {
  async function createSprint(overrides = {}) {
    const highest = await mongoose.connection.db.collection('sprints').findOne({}, { sort: { number: -1 } });
    const number = (highest?.number || 0) + 1;
    const doc = {
      number,
      startDate: '2026-07-12',
      endDate: '2026-07-18',
      status: 'current',
      ...overrides
    };
    const res = await mongoose.connection.db.collection('sprints').insertOne(doc);
    return { ...doc, _id: res.insertedId };
  }

  async function createTodo(overrides = {}) {
    const doc = {
      title: 'Test task',
      description: '',
      dueDate: '2026-07-20',
      status: 'Neu',
      priority: 'Hat Zeit',
      sprintId: null,
      scrumStatus: 'Ready',
      ...overrides
    };
    const res = await mongoose.connection.db.collection('todos').insertOne(doc);
    return { ...doc, _id: res.insertedId };
  }

  it('ends a regular sprint and moves open todos to the next sprint', async () => {
    const current = await createSprint();
    const todo = await createTodo({ sprintId: current._id, scrumStatus: 'Ready' });

    const res = await request(app)
      .post(`/james-todos/api/sprints/${current._id}/close`)
      .expect(200);

    expect(res.body.closedSprint.status).toBe('closed');
    expect(res.body.newCurrentSprint.status).toBe('current');
    expect(res.body.movedTodoCount).toBe(1);

    const moved = await mongoose.connection.db.collection('todos').findOne({ _id: todo._id });
    expect(moved.sprintId.toString()).toBe(res.body.newCurrentSprint.id);
    expect(moved.scrumStatus).toBe('Ready');
    expect(moved.status).toBe('Neu');
  });

  it('is idempotent: ending the same sprint twice does not move todos twice', async () => {
    const current = await createSprint();
    await createTodo({ sprintId: current._id, scrumStatus: 'In Progress' });

    const first = await request(app).post(`/james-todos/api/sprints/${current._id}/close`).expect(200);
    const second = await request(app).post(`/james-todos/api/sprints/${current._id}/close`).expect(200);

    expect(second.body.newCurrentSprint.id).toBe(first.body.newCurrentSprint.id);

    const sprints = await mongoose.connection.db.collection('sprints').find({ status: 'current' }).toArray();
    expect(sprints.length).toBe(1);
  });

  it('keeps done todos in the closed sprint', async () => {
    const current = await createSprint();
    const doneTodo = await createTodo({ sprintId: current._id, scrumStatus: 'Done', status: 'Erledigt' });
    const openTodo = await createTodo({ sprintId: current._id, scrumStatus: 'Ready' });

    const res = await request(app).post(`/james-todos/api/sprints/${current._id}/close`).expect(200);

    expect(res.body.movedTodoCount).toBe(1);

    const done = await mongoose.connection.db.collection('todos').findOne({ _id: doneTodo._id });
    expect(done.sprintId.toString()).toBe(current._id.toString());
    expect(done.scrumStatus).toBe('Done');

    const moved = await mongoose.connection.db.collection('todos').findOne({ _id: openTodo._id });
    expect(moved.sprintId.toString()).not.toBe(current._id.toString());
  });

  it('uses an already existing next sprint', async () => {
    const current = await createSprint();
    const nextSprint = await createSprint({ number: 2, startDate: '2026-07-19', endDate: '2026-07-25', status: 'next' });
    await createTodo({ sprintId: current._id, scrumStatus: 'Review' });

    const res = await request(app).post(`/james-todos/api/sprints/${current._id}/close`).expect(200);

    expect(res.body.newCurrentSprint.id).toBe(nextSprint._id.toString());
    expect(res.body.newCurrentSprint.status).toBe('current');
  });

  it('falls back to an already existing future sprint', async () => {
    const current = await createSprint();
    const future = await createSprint({ number: 2, startDate: '2026-07-19', endDate: '2026-07-25', status: 'future' });
    await createTodo({ sprintId: current._id, scrumStatus: 'Review' });

    const res = await request(app).post(`/james-todos/api/sprints/${current._id}/close`).expect(200);

    expect(res.body.newCurrentSprint.id).toBe(future._id.toString());
    expect(res.body.newCurrentSprint.status).toBe('current');
  });

  it('creates a next sprint when none exists', async () => {
    const current = await createSprint();
    await createTodo({ sprintId: current._id, scrumStatus: 'Ready' });

    const res = await request(app).post(`/james-todos/api/sprints/${current._id}/close`).expect(200);

    expect(res.body.newCurrentSprint).toBeDefined();
    expect(res.body.newCurrentSprint.status).toBe('current');
  });

  it('does not affect backlog todos without sprintId', async () => {
    const current = await createSprint();
    const backlog = await createTodo({ scrumStatus: 'Ready', sprintId: null });
    await createTodo({ sprintId: current._id, scrumStatus: 'Ready' });

    const res = await request(app).post(`/james-todos/api/sprints/${current._id}/close`).expect(200);
    expect(res.body.movedTodoCount).toBe(1);

    const stillBacklog = await mongoose.connection.db.collection('todos').findOne({ _id: backlog._id });
    expect(stillBacklog.sprintId).toBeNull();
  });

  it('returns 400 for malformed sprint id', async () => {
    await request(app).post('/james-todos/api/sprints/not-an-id/close').expect(400);
  });
});
