import { DanhMucBase } from "../../../danhmuc/models/helpers/dm-base";

export interface ThuThapGiaThiTruongDto extends DanhMucBase {
    tuan?: number;
    nam: number;
    ngayNhap?: Date;
    loaiGiaId: string;
    tenLoaiGia: string;
    nhomHangHoaId?: string;
    tenNhomHangHoa: string;
    loaiNghiepVu: number;
}