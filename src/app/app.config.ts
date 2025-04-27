import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideClientHydration, withHttpTransferCacheOptions } from '@angular/platform-browser';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { paginationInterceptor } from './core/interceptors/pagination.interceptor';
import { loggingInterceptor } from './core/interceptors/logging.interceptor';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideToastr } from 'ngx-toastr';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideClientHydration(),
    provideHttpClient(
      withFetch(),
      withInterceptors([
        paginationInterceptor,
        loggingInterceptor,
      ])),
    provideClientHydration(
      withHttpTransferCacheOptions({
        includeHeaders: ['Pagination'],
      })
    ),
    provideAnimations(),
    provideToastr(),
  ]
};
