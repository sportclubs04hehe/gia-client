import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { DmHangHoaThiTruongComponent } from './dm-hang-hoa-thi-truong/dm-hang-hoa-thi-truong.component';

const routes: Routes = [
  {
    path: 'dm-hhthitruong',
    component: DmHangHoaThiTruongComponent,
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DanhmucRoutingModule {}
