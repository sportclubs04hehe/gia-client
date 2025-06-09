import { Loai } from "../enum/loai";
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

