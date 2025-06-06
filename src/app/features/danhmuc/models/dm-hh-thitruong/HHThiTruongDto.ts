import { DanhMucBase } from "../helpers/dm-base";

export interface HHThiTruongDto extends DanhMucBase {
    ma: string;
    ten: string;
    ghiChu?: string;
    ngayHieuLuc: string;
    ngayHetHieuLuc: string;
    loaiMatHang: Loai;
    matHangChaId?: string;
    tenMatHangCha?: string;
    dacTinh?: string;
    donViTinhId?: string;
    tenDonViTinh?: string;
}

export enum Loai {
    Cha = 0, // Nhom
    Con = 1 // HangHoa
}