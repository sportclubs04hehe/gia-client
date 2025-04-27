import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: 'danhmuc',
        children: [
            {
                path: 'dm-hhthitruong',
                loadComponent: () => import('./features/danhmuc/dm-hang-hoa-thi-truong/dm-hang-hoa-thi-truong.component')
                    .then(m => m.DmHangHoaThiTruongComponent)
            }
        ]
    },
];
