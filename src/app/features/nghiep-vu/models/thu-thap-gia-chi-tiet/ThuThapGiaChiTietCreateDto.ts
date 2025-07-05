export interface ThuThapGiaChiTietCreateDto {
  thuThapGiaThiTruongId?: string; 
  hangHoaThiTruongId: string;
  giaPhoBienKyBaoCao?: string;
  giaBinhQuanKyTruoc?: number;
  giaBinhQuanKyNay?: number;
  mucTangGiamGiaBinhQuan?: number;
  tyLeTangGiamGiaBinhQuan?: number;
  nguonThongTin?: string;
  ghiChu?: string;
}