export interface ThuThapGiaChiTietCreateDto {
  thuThapGiaThiTruongId?: string; // Thêm dấu ? để làm trường này trở thành tùy chọn
  hangHoaThiTruongId: string;
  giaPhoBienKyBaoCao?: number;
  giaBinhQuanKyTruoc?: number;
  giaBinhQuanKyNay?: number;
  mucTangGiamGiaBinhQuan?: number;
  tyLeTangGiamGiaBinhQuan?: number;
  nguonThongTin?: string;
  ghiChu?: string;
}