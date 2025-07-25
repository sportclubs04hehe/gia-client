import { DanhMucBase } from "../../../danhmuc/models/helpers/dm-base";

export interface ThuThapGiaChiTietUpdateDto extends DanhMucBase{
  thuThapGiaThiTruongId: string;
  hangHoaThiTruongId: string;
  giaPhoBienKyBaoCao?: string;
  giaBinhQuanKyTruoc?: number;
  giaBinhQuanKyNay?: number;
  mucTangGiamGiaBinhQuan?: number;
  tyLeTangGiamGiaBinhQuan?: number;
  nguonThongTin?: string;
  ghiChu?: string;
}