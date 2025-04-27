import { Injectable } from '@angular/core';
import { NgbDateParserFormatter, NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';

@Injectable()
export class CustomDateParserFormatter extends NgbDateParserFormatter {
  readonly DELIMITER = '/';

  parse(value: string): NgbDateStruct | null {
    if (!value) {
      return null;
    }
    const parts = value.split(this.DELIMITER);
    if (parts.length !== 3) {
      return null;
    }
    
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    
    if (isNaN(day) || isNaN(month) || isNaN(year)) {
      return null;
    }
    
    return { day, month, year };
  }

  format(date: NgbDateStruct | null): string {
    return date ? 
      `${date.day.toString().padStart(2, '0')}${this.DELIMITER}${date.month.toString().padStart(2, '0')}${this.DELIMITER}${date.year}` : 
      '';
  }
}