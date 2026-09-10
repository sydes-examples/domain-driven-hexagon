import {
  FindUsersQuery,
  FindUsersQueryHandler,
} from './find-users.query-handler';

describe(FindUsersQueryHandler, () => {
  it('rejects a limit above the endpoint cap without touching the database', async () => {
    const pool = {
      query: jest
        .fn()
        .mockRejectedValue(new Error('pool should not be called')),
    };
    const handler = new FindUsersQueryHandler(pool as any);

    const result = await handler.execute(new FindUsersQuery({ limit: 500 }));

    expect(result.isErr()).toBe(true);
    expect(result.unwrapErr().message).toContain('limit cannot exceed');
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('allows a limit at or under the endpoint cap through to the query', async () => {
    const pool = {
      query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    };
    const handler = new FindUsersQueryHandler(pool as any);

    const result = await handler.execute(new FindUsersQuery({ limit: 100 }));

    expect(result.isOk()).toBe(true);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });
});
