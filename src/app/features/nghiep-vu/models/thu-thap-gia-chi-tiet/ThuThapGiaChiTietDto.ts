import { DanhMucBase } from "../../../danhmuc/models/helpers/dm-base";

export interface ThuThapGiaChiTietDto extends DanhMucBase{
  thuThapGiaThiTruongId: string;
  hangHoaThiTruongId: string;
  tenHangHoa: string;
  maHangHoa: string;
  donViTinh: string;
  giaPhoBienKyBaoCao?: string;
  giaBinhQuanKyTruoc?: number;
  giaBinhQuanKyNay?: number;
  mucTangGiamGiaBinhQuan?: number;
  tyLeTangGiamGiaBinhQuan?: number;
  nguonThongTin?: string;
  ghiChu?: string;
}