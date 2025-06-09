import { DmThuocTinhDto } from "./DmThuocTinhDto";

export interface DmThuocTinhCategoryInfoDto extends DmThuocTinhDto {
  hasChildren: boolean;
}