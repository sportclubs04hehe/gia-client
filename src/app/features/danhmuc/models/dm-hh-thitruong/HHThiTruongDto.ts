import { DanhMucBase } from "../dm-base";

export interface HHThiTruongDto extends DanhMucBase {
    ma: string;
    ten: string;
    ghiChu?: string;
    ngayHieuLuc: string;
    ngayHetHieuLuc: string;
    loaiMatHang: LoaiMatHangEnum;
    matHangChaId?: string;
    tenMatHangCha?: string;
    dacTinh?: string;
    donViTinhId?: string;
    tenDonViTinh?: string;
}

export enum LoaiMatHangEnum {
    Nhom = 0,
    HangHoa = 1
}