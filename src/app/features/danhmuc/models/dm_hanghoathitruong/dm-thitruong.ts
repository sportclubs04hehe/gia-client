import { DanhMucBase } from "../dm-base";
import { DonViTinhSelectDto } from "../dm_donvitinh/don-vi-tinh-select.dto";

export class HangHoa extends DanhMucBase {
    maMatHang!: string;
    tenMatHang!: string;
    ghiChu?: string;
    ngayHieuLuc!: Date;
    ngayHetHieuLuc!: Date;
    nhomHangHoaId?: string;
    donViTinhId?: string;
    donViTinhSelectDto?: DonViTinhSelectDto;
}