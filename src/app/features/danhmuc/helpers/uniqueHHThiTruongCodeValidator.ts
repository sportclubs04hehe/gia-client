import { AbstractControl, AsyncValidatorFn, ValidationErrors } from '@angular/forms';
import { Observable, of, map, catchError, switchMap, debounceTime } from 'rxjs';
import { DmHangHoaThiTruongService } from '../services/api/dm-hang-hoa-thi-truong.service';

/**
 * Validator để kiểm tra mã mặt hàng đã tồn tại trong cùng nhóm hay chưa
 * 
 * @param service Service hàng hóa thị trường để gọi API kiểm tra mã
 * @param getParentIdFn Hàm lấy parentId từ form hiện tại (do parentId có thể thay đổi)
 * @param originalCode Mã ban đầu (cho trường hợp chỉnh sửa để tránh lỗi tự kiểm tra)
 * @param excludeId ID để loại trừ khỏi việc kiểm tra (cho trường hợp chỉnh sửa)
 * @returns AsyncValidatorFn trả về ValidationErrors nếu mã đã tồn tại
 */
export function uniqueHHThiTruongCodeValidator(
  service: DmHangHoaThiTruongService,
  getParentIdFn: () => string | null | undefined,
  originalCode: string | null = null,
  excludeId?: string
): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    const value = control.value;
    
    // Bỏ qua validation nếu giá trị rỗng hoặc không thay đổi
    if (!value || value === originalCode) {
      return of(null);
    }

    // Thêm debounceTime để tránh gọi API quá nhiều lần khi user đang gõ
    return of(value).pipe(
      debounceTime(300),
      switchMap(() => {
        // Lấy parentId hiện tại từ form
        const rawParentId = getParentIdFn();
        const parentId = rawParentId === null ? undefined : rawParentId;
        
        return service.validateCode(value, parentId, excludeId).pipe(
          map(response => {
            // Nếu response.data.isValid = false, mã đã tồn tại
            if (response.data && !response.data.isValid) {
              return { 
                duplicateCode: response.data.message || 'Mã đã tồn tại trong cùng nhóm hàng hóa'
              };
            }
            return null;
          }),
          catchError(() => {
            // Nếu có lỗi, cho phép đi tiếp để tránh chặn form
            return of(null);
          })
        );
      })
    );
  };
}