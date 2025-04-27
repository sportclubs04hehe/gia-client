import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { map } from 'rxjs';

export const paginationInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    map(event => {
      if (event instanceof HttpResponse && event.headers.has('Pagination')) {
        const pagination = JSON.parse(event.headers.get('Pagination')!);
        return event.clone({
          body: {
            data: event.body,
            pagination
          }
        });
      }
      return event;
    })
  );
};
