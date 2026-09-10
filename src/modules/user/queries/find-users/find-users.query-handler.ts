import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { PaginatedParams, PaginatedQueryBase } from '@libs/ddd/query.base';
import { Paginated } from '@src/libs/ddd';
import { ArgumentOutOfRangeException } from '@libs/exceptions';
import { InjectPool } from 'nestjs-slonik';
import { DatabasePool, sql } from 'slonik';
import { UserModel, userSchema } from '../../database/user.repository';

/**
 * The shared PaginatedQueryRequestDto only bounds `limit` to 99999 (a
 * generic, cross-endpoint sanity limit). This query additionally caps it
 * much lower: a single unindexed OFFSET/LIMIT scan over `users` at a
 * five-digit page size is a real performance risk this endpoint alone
 * should reject, rather than execute.
 */
const MAX_FIND_USERS_LIMIT = 100;

export class FindUsersQuery extends PaginatedQueryBase {
  readonly country?: string;

  readonly postalCode?: string;

  readonly street?: string;

  constructor(props: PaginatedParams<FindUsersQuery>) {
    super(props);
    this.country = props.country;
    this.postalCode = props.postalCode;
    this.street = props.street;
  }
}

@QueryHandler(FindUsersQuery)
export class FindUsersQueryHandler implements IQueryHandler {
  constructor(
    @InjectPool()
    private readonly pool: DatabasePool,
  ) {}

  /**
   * In read model we don't need to execute
   * any business logic, so we can bypass
   * domain and repository layers completely
   * and execute query directly
   */
  async execute(
    query: FindUsersQuery,
  ): Promise<Result<Paginated<UserModel>, Error>> {
    if (query.limit && query.limit > MAX_FIND_USERS_LIMIT) {
      return Err(
        new ArgumentOutOfRangeException(
          `limit cannot exceed ${MAX_FIND_USERS_LIMIT}`,
        ),
      );
    }

    /**
     * Constructing a query with Slonik.
     * More info: https://contra.com/p/AqZWWoUB-writing-composable-sql-using-java-script
     */
    const statement = sql.type(userSchema)`
         SELECT *
         FROM users
         WHERE
           ${query.country ? sql`country = ${query.country}` : true} AND
           ${query.street ? sql`street = ${query.street}` : true} AND
           ${query.postalCode ? sql`"postalCode" = ${query.postalCode}` : true}
         LIMIT ${query.limit}
         OFFSET ${query.offset}`;

    const records = await this.pool.query(statement);

    return Ok(
      new Paginated({
        data: records.rows,
        count: records.rowCount,
        limit: query.limit,
        page: query.page,
      }),
    );
  }
}
