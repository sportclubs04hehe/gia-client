import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: 'danhmuc',
        children: [
            {
                path: 'dm-hhthitruong',
                loadComponent: () => import('./features/danhmuc/dm-hang-hoa-thi-truong/dm-hang-hoa-thi-truong.component')
                    .then(m => m.DmHangHoaThiTruongComponent)
            },
            {
                path: 'dm-don-vi-tinh',
                loadComponent: () => import('./features/danhmuc/dm-don-vi-tinh/dm-don-vi-tinh.component')
                    .then(m => m.DmDonViTinhComponent)
            },
        ]
    },
];
