import { ConflictException, NotFoundException } from '@libs/exceptions';
import { UserRepositoryPort } from '@modules/user/database/user.repository.port';
import { UserEntity } from '@modules/user/domain/user.entity';
import { Address } from '@modules/user/domain/value-objects/address.value-object';
import { RequestContext } from 'nestjs-request-context';
import { None, Some } from 'oxide.ts';
import { DeleteUserCommand, DeleteUserService } from './delete-user.service';

function createTestUser(): UserEntity {
  return UserEntity.create({
    email: 'test@example.com',
    address: new Address({
      country: 'France',
      postalCode: '75000',
      street: 'Rue de Paris',
    }),
  });
}

describe('DeleteUserService', () => {
  let userRepo: jest.Mocked<UserRepositoryPort>;
  let service: DeleteUserService;

  beforeEach(() => {
    // Domain events read a request id from the ambient request context that
    // RequestContextMiddleware normally binds per-request; outside an HTTP
    // request (as here) that context must be entered manually.
    RequestContext.cls.enterWith(new RequestContext({}, {}));

    userRepo = {
      findOneById: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<UserRepositoryPort>;
    service = new DeleteUserService(userRepo);
  });

  it('rejects deleting an admin user without touching the repository', async () => {
    const admin = createTestUser();
    admin.makeAdmin();
    userRepo.findOneById.mockResolvedValue(Some(admin));

    const result = await service.execute(
      new DeleteUserCommand({ userId: admin.id }),
    );

    expect(result.isErr()).toBe(true);
    expect(result.unwrapErr()).toBeInstanceOf(ConflictException);
    expect(userRepo.delete).not.toHaveBeenCalled();
  });

  it('still deletes a non-admin user', async () => {
    const guest = createTestUser();
    userRepo.findOneById.mockResolvedValue(Some(guest));
    userRepo.delete.mockResolvedValue(true);

    const result = await service.execute(
      new DeleteUserCommand({ userId: guest.id }),
    );

    expect(result.unwrap()).toBe(true);
    expect(userRepo.delete).toHaveBeenCalledWith(guest);
  });

  it('still reports a missing user as not found', async () => {
    userRepo.findOneById.mockResolvedValue(None);

    const result = await service.execute(
      new DeleteUserCommand({ userId: 'missing-id' }),
    );

    expect(result.unwrapErr()).toBeInstanceOf(NotFoundException);
    expect(userRepo.delete).not.toHaveBeenCalled();
  });
});
