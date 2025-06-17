export interface LoaiGiaCreateDto {
  id: string;
  ma: string;
  ten: string;
}

export interface LoaiGiaUpdateDto extends LoaiGiaCreateDto {
  id: string;
}