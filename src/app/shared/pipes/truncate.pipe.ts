import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'truncate',
  standalone: true
})
export class TruncatePipe implements PipeTransform {

  transform(value: string | undefined | null, limit = 20, trail = '…'): string {
    if (!value) return '';
    return value.length > limit
      ? value.slice(0, limit) + trail
      : value;
  }

}
