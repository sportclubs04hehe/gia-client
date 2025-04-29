import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { ApiError } from '../error/api-errors';

@Injectable({
  providedIn: 'root'
})
export class ErrorHandleService {
  constructor(private toastr: ToastrService) {}

  handleError(error: ApiError): void {
    switch (error.statusCode) {
      case 400:
        this.handleBadRequest(error);
        break;
      case 401:
        this.toastr.error('Bạn không có quyền truy cập', 'Lỗi xác thực');
        break;
      case 403:
        this.toastr.error('Bạn không có quyền thực hiện thao tác này', 'Lỗi phân quyền');
        break;
      case 404:
        this.toastr.error('Không tìm thấy dữ liệu', 'Lỗi');
        break;
      case 500:
        this.toastr.error('Đã xảy ra lỗi, vui lòng thử lại sau', 'Lỗi hệ thống');
        break;
      default:
        this.toastr.error('Đã xảy ra lỗi không xác định', 'Lỗi');
    }
  }

  private handleBadRequest(error: ApiError): void {
    if (error.message) {
      // Check if message contains specific keywords for custom handling
      if (error.message.includes('đã tồn tại')) {
        this.toastr.error(error.message, error.title);
      } else {
        this.toastr.error(error.message, error.title);
      }
    }
  }
}
