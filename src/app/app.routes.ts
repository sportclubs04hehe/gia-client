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
                path: 'dm-hhthitruongs',
                loadComponent: () => import('./features/danhmuc/dm-hang-hoa-thi-truongs/dm-hang-hoa-thi-truongs.component')
                    .then(m => m.DmHangHoaThiTruongsComponent)
            },
            {
                path: 'dm-thuoc-tinh',
                loadComponent: () => import('./features/danhmuc/dm-thuoc-tinh/dm-thuoc-tinh.component')
                    .then(m => m.DmThuocTinhComponent)
            },
            {
                path: 'dm-don-vi-tinh',
                loadComponent: () => import('./features/danhmuc/dm-don-vi-tinh/dm-don-vi-tinh.component')
                    .then(m => m.DmDonViTinhComponent)
            },
        ]
    }
];
