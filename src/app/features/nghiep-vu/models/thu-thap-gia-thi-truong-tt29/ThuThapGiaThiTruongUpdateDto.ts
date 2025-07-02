import { DanhMucBase } from "../../../danhmuc/models/helpers/dm-base";

export interface ThuThapGiaThiTruongUpdateDto extends DanhMucBase {
    tuan?: number;
    nam: number;
    ngayNhap?: Date;
    loaiGiaId: string;
    nhomHangHoaId?: string;
    loaiNghiepVu: number;
}