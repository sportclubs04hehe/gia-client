import { Loai } from '../enum/loai';

export interface DmThuocTinhCreateDto {
  stt: string;
  ma: string;
  ten: string;
  loai: Loai;
  ghiChu?: string;
  dinhDang?: string;
  width?: string;
  congThuc?: string;
  canChinhCot?: string;
  ngayHieuLuc?: string;
  ngayHetHieuLuc?: string;
  thuocTinhChaId?: string;
}

export interface DmThuocTinhUpdateDto extends DmThuocTinhCreateDto {
  id: string;
}