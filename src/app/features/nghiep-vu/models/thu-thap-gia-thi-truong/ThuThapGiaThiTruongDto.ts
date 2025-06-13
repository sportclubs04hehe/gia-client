import { DanhMucBase } from "../../../danhmuc/models/helpers/dm-base";
import { LoaiNghiepVu } from "../enums/LoaiNghiepVu";

export interface ThuThapGiaThiTruongDto extends DanhMucBase {
  ngayThuThap: string; 
  hangHoaId: string;
  maHangHoa: string;
  tenHangHoa: string;
  loaiGiaId: string;
  tenLoaiGia: string;
  loaiNghiepVu: LoaiNghiepVu;
}
