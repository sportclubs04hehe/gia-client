import { DanhMucBase } from "../dm-base";

export class HangHoa extends DanhMucBase {
    maMatHang!: string;
    tenMatHang!: string;
    ghiChu?: string;
    ngayHieuLuc!: Date;
    ngayHetHieuLuc!: Date;
    nhomHangHoaId?: string;
    nhomHangHoa?: DanhMucBase;
}