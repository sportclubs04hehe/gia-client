import { Loai } from "./HHThiTruongDto";

export interface CreateHHThiTruongDto {
    ma: string;
    ten: string;
    ghiChu?: string;
    ngayHieuLuc: string;
    ngayHetHieuLuc: string;
    loaiMatHang: Loai;
    matHangChaId?: string;
    dacTinh?: string;
    donViTinhId?: string;
}

export interface CreateManyHHThiTruongDto {
    items: CreateHHThiTruongDto[];
}

export interface UpdateHHThiTruongDto extends CreateHHThiTruongDto {
    id: string;
}