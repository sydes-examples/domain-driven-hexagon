import { ValueObject } from '@libs/ddd';
import { Guard } from '@libs/guard';
import { ArgumentOutOfRangeException } from '@libs/exceptions';

/** Note:
 * Value Objects with multiple properties can contain
 * other Value Objects inside if needed.
 * */

export interface AddressProps {
  country: string;
  postalCode: string;
  street: string;
}

export class Address extends ValueObject<AddressProps> {
  get country(): string {
    return this.props.country;
  }

  get postalCode(): string {
    return this.props.postalCode;
  }

  get street(): string {
    return this.props.street;
  }

  /**
   * Note: This is a very simplified example of validation,
   * real world projects will have stricter rules.
   * You can avoid this type of validation here and validate
   * only on the edge of the application (in controllers when receiving
   * a request) sacrificing some security for performance and convenience.
   */
  protected validate(props: AddressProps): void {
    if (!Guard.lengthIsBetween(props.country, 2, 50)) {
      throw new ArgumentOutOfRangeException('country is out of range');
    }
    if (!Guard.lengthIsBetween(props.street, 2, 50)) {
      throw new ArgumentOutOfRangeException('street is out of range');
    }
    if (!Guard.lengthIsBetween(props.postalCode, 2, 10)) {
      throw new ArgumentOutOfRangeException('postalCode is out of range');
    }
    /* US postal codes must be a 5-digit ZIP code (e.g. "10001").
     * Country-specific postal code formats vary widely; this is a
     * deliberately narrow, deterministic example rule for the US only. */
    if (props.country === 'US' && !/^\d{5}$/.test(props.postalCode)) {
      throw new ArgumentOutOfRangeException(
        'postalCode is out of range: US postal code must match ^\\d{5}$',
      );
    }
  }
}
