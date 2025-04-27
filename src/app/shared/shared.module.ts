import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { NgbDatepickerModule } from '@ng-bootstrap/ng-bootstrap';
import { InfiniteScrollDirective } from 'ngx-infinite-scroll';
import { HttpClientModule } from '@angular/common/http';



@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgbDatepickerModule,
    InfiniteScrollDirective,
    HttpClientModule,
  ],
  exports: [
    CommonModule,
    ReactiveFormsModule,
    NgbDatepickerModule,
    InfiniteScrollDirective,
    HttpClientModule,
  ],
})
export class SharedModule {

}
