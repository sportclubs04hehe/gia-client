import { HttpInterceptorFn } from '@angular/common/http';
import { tap } from 'rxjs';

export const loggingInterceptor: HttpInterceptorFn = (req, next) => {
  console.log(`[API REQUEST] ${req.method} ${req.urlWithParams}`);

  return next(req).pipe(
    tap({
      next: (event) => {

      },
      error: (err) => {
        console.error(`[API ERROR] ${req.method} ${req.urlWithParams}`, err);
      }
    })
  );
  
};
