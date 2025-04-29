import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideClientHydration, withHttpTransferCacheOptions } from '@angular/platform-browser';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { paginationInterceptor } from './core/interceptors/pagination.interceptor';
import { loggingInterceptor } from './core/interceptors/logging.interceptor';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideToastr } from 'ngx-toastr';
import { errorInterceptor } from './core/interceptors/error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideClientHydration(),
    provideHttpClient(
      withFetch(),
      withInterceptors([
        errorInterceptor,
        paginationInterceptor,
        loggingInterceptor,
      ])),
    provideClientHydration(
      withHttpTransferCacheOptions({
        includeHeaders: ['Pagination'],
      })
    ),
    provideAnimations(),
    provideToastr({
      positionClass: 'toast-top-right',
      timeOut: 3000,
      closeButton: true,
      progressBar: true,
      maxOpened: 1,
      autoDismiss: true,
      preventDuplicates: true
    }),
  ]
};
