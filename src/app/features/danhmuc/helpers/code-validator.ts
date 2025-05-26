import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Validator kiểm tra mã không chứa khoảng trắng, ký tự đặc biệt và không quá độ dài quy định
 * @param maxLength Độ dài tối đa cho trường mã (mặc định là 25)
 * @returns Validator function kiểm tra định dạng mã
 */
export function codeValidator(maxLength: number = 25): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null; // Để Validators.required xử lý trường hợp trống
    }

    const value = control.value as string;
    const errors: ValidationErrors = {};
    let hasError = false;

    // Kiểm tra khoảng trắng
    if (value.includes(' ')) {
      errors['hasWhitespace'] = true;
      hasError = true;
    }

    // Kiểm tra ký tự đặc biệt (chỉ cho phép chữ cái, số, gạch dưới và gạch ngang)
    if (!/^[a-zA-Z0-9_-]*$/.test(value)) {
      errors['hasSpecialChar'] = true;
      hasError = true;
    }

    // Kiểm tra độ dài
    if (value.length > maxLength) {
      errors['maxLengthExceeded'] = { maxLength, actualLength: value.length };
      hasError = true;
    }

    return hasError ? errors : null;
  };
}