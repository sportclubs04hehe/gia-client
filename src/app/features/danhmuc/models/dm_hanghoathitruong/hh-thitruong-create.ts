export interface HangHoaCreateDto {
  maMatHang: string;
  tenMatHang: string;
  ghiChu?: string;
  dacTinh?: string;
  ngayHieuLuc: string | Date; 
  ngayHetHieuLuc: string | Date; 
  nhomHangHoaId?: string;
  donViTinhId?: string;
}