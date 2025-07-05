import { Injectable } from "@angular/core";

@Injectable({
  providedIn: 'root'
})
export class NumberFormatterService {
  formatWithComma(value: string | number): string {
    if (!value) return '';
    const parts = value.toString().split('.');
    const formattedInteger = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts[1] !== undefined ? `${formattedInteger}.${parts[1]}` : formattedInteger;
  }

  parseFormattedNumber(value: string | number | null | undefined): number | undefined {
    if (value === null || value === undefined || value === '') return undefined;
    const stringValue = value.toString().replace(/,/g, '');
    const numericValue = parseFloat(stringValue);
    return isNaN(numericValue) ? undefined : numericValue;
  }

  formatPriceRange(rawValue: string): string {
    const parts = rawValue.split('-').map(part => part.replace(/[^\d]/g, ''));
    return parts.map(part => part ? this.formatWithComma(part) : '').join('-');
  }
}