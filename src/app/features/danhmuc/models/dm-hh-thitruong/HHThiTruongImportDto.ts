import { Loai } from "../enum/loai";

export interface HHThiTruongImportDto {
    ma: string;
    ten: string;
    ghiChu?: string;
    loaiMatHang: Loai;
    dacTinh?: string;
    ngayHieuLuc: Date | string;
    ngayHetHieuLuc: Date | string;
    donViTinhTen?: string;
}

export interface HHThiTruongBatchImportDto {
    matHangChaId: string;
    items: HHThiTruongImportDto[];
}