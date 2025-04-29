import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { ErrorHandleService } from '../services/error-handle.service';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ApiError } from '../error/api-errors';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const errorHandler = inject(ErrorHandleService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let apiError: ApiError;

      if (error.error instanceof ErrorEvent) {
        // Client-side error
        apiError = {
          statusCode: error.status,
          title: 'Lỗi kết nối',
          message: 'Lỗi kết nối, vui lòng kiểm tra đường truyền',
          timestamp: new Date().toISOString()
        };
      } else {
        // Server-side error
        apiError = error.error as ApiError;
        if (!apiError.statusCode) {
          apiError = {
            statusCode: error.status,
            title: 'Lỗi hệ thống',
            message: error.message,
            timestamp: new Date().toISOString()
          };
        }
      }

      errorHandler.handleError(apiError);
      return throwError(() => apiError);
    })
  );
};
