import { AbstractControl, AsyncValidatorFn, ValidationErrors } from '@angular/forms';
import { Observable, of, map, catchError } from 'rxjs';
import { DmDonViTinhService } from '../services/api/dm-don-vi-tinh.service';

/**
 * Validator to check if a mã đơn vị tính already exists in the system
 * 
 * @param service The DonViTinh service for API checks
 * @param originalCode The original code (for edit scenarios to avoid self-validation errors)
 * @param excludeId The ID to exclude from uniqueness check (for edit scenarios)
 * @returns AsyncValidatorFn that resolves to ValidationErrors if code exists
 */
export function uniqueDonViTinhCodeValidator(
  service: DmDonViTinhService,
  originalCode: string | null,
  excludeId?: string
): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    const value = control.value;
    
    // Skip validation if empty or unchanged
    if (!value || value === originalCode) {
      return of(null);
    }

    // Check if code exists - only pass excludeId if it's a valid GUID
    const isValidGuid = excludeId && 
                        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(excludeId);
    
    return service.existsByMa(value, isValidGuid ? excludeId : undefined).pipe(
      map(result => {
        // If we got a result with data.true, then code already exists
        return result.data === true ? { duplicate: true } : null;
      }),
      catchError(() => {
        return of(null);
      })
    );
  };
}