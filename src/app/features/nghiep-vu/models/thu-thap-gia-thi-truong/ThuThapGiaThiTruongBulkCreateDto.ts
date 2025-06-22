export interface ThuThapGiaThiTruongBulkCreateDto {
  ngayThuThap: Date;
  loaiGiaId: string;
  nguonThongTin?: string;
  danhSachGiaHangHoa: HangHoaGiaCreateDto[];
}

export interface HangHoaGiaCreateDto {
  hangHoaId: string;
  giaPhoBienKyBaoCao?: number;
  giaBinhQuanKyNay?: number;
  ghiChu?: string;
}