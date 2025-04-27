import { HttpParams } from '@angular/common/http';

/**
 * Chuyển object thành HttpParams để gọi API
 * Bỏ qua những giá trị null, undefined hoặc chuỗi rỗng
 */
export function buildHttpParams(paramsObject: Record<string, any>): HttpParams {
  let params = new HttpParams();

  Object.keys(paramsObject).forEach((key) => {
    const value = paramsObject[key];

    if (
      value !== null &&
      value !== undefined &&
      value !== '' &&
      !(typeof value === 'string' && value.trim() === '')
    ) {
      params = params.set(key, value.toString());
    }
  });

  return params;
}
