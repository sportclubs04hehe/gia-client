import { DanhMucBase } from "../dm-base";

export interface HangHoaUpdateDto extends DanhMucBase {
    maMatHang: string;
    tenMatHang: string;
    ghiChu: string | null;
    dacTinh: string | null;
    ngayHieuLuc: string;
    ngayHetHieuLuc: string;
    nhomHangHoaId: string | null;
    donViTinhId: string | null;
}