import { LoaiMatHangEnum } from './HHThiTruongDto';

export interface HHThiTruongImportDto {
    ma: string;
    ten: string;
    ghiChu?: string;
    loaiMatHang: LoaiMatHangEnum;
    dacTinh?: string;
    ngayHieuLuc: Date | string;
    ngayHetHieuLuc: Date | string;
    donViTinhTen?: string;
}

export interface HHThiTruongBatchImportDto {
    matHangChaId: string;
    items: HHThiTruongImportDto[];
}