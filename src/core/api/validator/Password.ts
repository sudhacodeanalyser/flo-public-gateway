import * as t from 'io-ts';
import { FormattedString, FormattedStringFactory, FormattedStringBrand } from './FormattedString';

export function isValidPassword(s: string): boolean {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(s);
}

export function isValidAdminPassword(s: string): boolean {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{40,}$/.test(s);
}

export const Password = FormattedString(isValidPassword);

export const AdminPassword = FormattedString(isValidAdminPassword);

export class PasswordFactory {
  public static create(s: string): t.Branded<string, FormattedStringBrand> {
    return FormattedStringFactory.create(s, isValidPassword);
  }
}
