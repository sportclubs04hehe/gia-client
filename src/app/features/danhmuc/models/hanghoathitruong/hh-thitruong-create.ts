export interface HangHoaCreateDto {
  maMatHang: string;
  tenMatHang: string;
  ghiChu?: string;
  ngayHieuLuc: string | Date; // Allow both string and Date
  ngayHetHieuLuc: string | Date; // Allow both string and Date
  nhomHangHoaId?: string;
}