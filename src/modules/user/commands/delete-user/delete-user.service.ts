import { ForbiddenException, NotFoundException } from '@libs/exceptions';
import { UserRepositoryPort } from '@modules/user/database/user.repository.port';
import { UserRoles } from '@modules/user/domain/user.types';
import { Inject } from '@nestjs/common';
import { CommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { USER_REPOSITORY } from '../../user.di-tokens';

export class DeleteUserCommand {
  readonly userId: string;

  constructor(props: DeleteUserCommand) {
    this.userId = props.userId;
  }
}

@CommandHandler(DeleteUserCommand)
export class DeleteUserService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepositoryPort,
  ) {}

  async execute(
    command: DeleteUserCommand,
  ): Promise<Result<boolean, NotFoundException | ForbiddenException>> {
    const found = await this.userRepo.findOneById(command.userId);
    if (found.isNone()) return Err(new NotFoundException());
    const user = found.unwrap();

    /* Admin users are protected from deletion since they are relied
    upon to administer the system. */
    if (user.role === UserRoles.admin) {
      return Err(new ForbiddenException('Cannot delete a protected user'));
    }

    user.delete();
    const result = await this.userRepo.delete(user);
    return Ok(result);
  }
}
