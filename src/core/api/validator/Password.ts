import * as t from 'io-ts';
import { FormattedString, FormattedStringFactory, FormattedStringBrand } from './FormattedString';

export function isValidPassword(s: string): boolean {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(s);
}

export const Password = FormattedString(isValidPassword);

export class PasswordFactory {
  public static create(s: string): t.Branded<string, FormattedStringBrand> {
    return FormattedStringFactory.create(s, isValidPassword);
  }
}
