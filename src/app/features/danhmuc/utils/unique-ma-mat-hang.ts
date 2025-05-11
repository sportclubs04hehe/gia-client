import { AsyncValidatorFn, AbstractControl, ValidationErrors } from "@angular/forms";
import { Observable, of, timer, switchMap, map, catchError } from "rxjs";
import { DmThitruongService } from "../services/api/dm-thitruong.service";

export function uniqueItemCodeValidator(
    service: DmThitruongService, 
    originalCode?: string | null
  ): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      const value = control.value;
      
      // Không xác thực nếu trường trống hoặc không thay đổi so với bản gốc
      if (!value || value === originalCode) {
        return of(null);
      }
      
      // Thêm debounce để tránh quá nhiều lệnh gọi API
      return timer(400).pipe(
        switchMap(() => 
          service.existsByMaMatHang(value).pipe(
            map(exists => exists ? { duplicate: true } : null),
            catchError(() => of(null))
          )
        )
      );
    };
  }