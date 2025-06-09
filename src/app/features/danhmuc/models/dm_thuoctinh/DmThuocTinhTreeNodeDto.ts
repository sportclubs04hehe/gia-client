import { Loai } from '../enum/loai';

export interface DmThuocTinhTreeNodeDto {
  id: string;
  stt: string;
  ma: string;
  ten: string;
  loai: Loai;
  ghiChu?: string;
  dinhDang?: string;
  width?: string;
  congThuc?: string;
  canChinhCot?: string;
  ngayHieuLuc: string;
  ngayHetHieuLuc: string;
  thuocTinhChaId?: string;
  thuocTinhCon: DmThuocTinhTreeNodeDto[];
  hangHoas: HangHoaInfoDto[];
}

export interface HangHoaInfoDto {
  id: string;
  ma: string;
  ten: string;
}