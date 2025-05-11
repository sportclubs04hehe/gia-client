import { HangHoaImportDto } from "./hanghoa-import.dto";

export interface ExcelImportResult {
  items: HangHoaImportDto[];
  duplicates: { code: string; rows: number[] }[];
  uniqueDonViTinhNames: string[];
  invalidRows: {
    rowIndex: number;
    errors: {
      field: string;
      message: string;
    }[];
  }[];
}