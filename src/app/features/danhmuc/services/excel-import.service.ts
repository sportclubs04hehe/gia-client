import { Injectable } from '@angular/core';
import { HangHoaCreateDto } from '../models/hanghoathitruong/hh-thitruong-create';
import * as XLSX from 'xlsx';

export interface ExcelImportResult {
  items: HangHoaCreateDto[];
  duplicates: { code: string; rows: number[] }[];
}

@Injectable({
  providedIn: 'root'
})
export class ExcelImportService {
  importHangHoaFromExcel(file: File): Promise<ExcelImportResult> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e: any) => {
        try {
          const data = e.target.result;
          const wb: XLSX.WorkBook = XLSX.read(data, { type: 'array' });

          const wsname: string = wb.SheetNames[0];
          const ws: XLSX.WorkSheet = wb.Sheets[wsname];

          const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 });

          const headers = jsonData[0] as string[];

          this.validateHeaders(headers);

          const hangHoas: HangHoaCreateDto[] = [];
          const codeMap = new Map<string, number[]>();
          const duplicates: { code: string; rows: number[] }[] = [];

          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i] as any[];
            if (row.length === 0 || row.every(cell => cell === null || cell === undefined)) {
              continue;
            }

            const hangHoa = this.mapRowToHangHoaDto(row, headers);
            
            if (hangHoa.maMatHang) {
              const code = hangHoa.maMatHang;
              const rowNum = i + 1; 
              
              if (!codeMap.has(code)) {
                codeMap.set(code, [rowNum]);
              } else {
                const rows = codeMap.get(code)!;
                rows.push(rowNum);
                
                // If this is the first duplicate we've found for this code
                if (rows.length === 2) {
                  duplicates.push({ code, rows: [...rows] });
                } else {
                  // Update the existing duplicate entry
                  const existingDup = duplicates.find(d => d.code === code);
                  if (existingDup) {
                    existingDup.rows = [...rows];
                  }
                }
              }
            }
            
            hangHoas.push(hangHoa);
          }

          resolve({
            items: hangHoas,
            duplicates
          });
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = (error) => {
        reject(error);
      };

      reader.readAsArrayBuffer(file);
    });
  }

  generateTemplate(): void {
    const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet([
      ['maMatHang', 'tenMatHang', 'ghiChu', 'ngayHieuLuc', 'ngayHetHieuLuc'],
      ['MH001', 'Áo thun nam', 'Hàng nhập khẩu', '01/01/2025', '31/12/2025']
    ]);

    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');

    XLSX.writeFile(wb, 'mau-hang-hoa-tt29.xlsx');
  }

  private validateHeaders(headers: string[]): void {
    const requiredHeaders = ['maMatHang', 'tenMatHang', 'ngayHieuLuc'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

    if (missingHeaders.length > 0) {
      throw new Error(`Thiếu các cột bắt buộc: ${missingHeaders.join(', ')}`);
    }
  }

  private mapRowToHangHoaDto(row: any[], headers: string[]): HangHoaCreateDto {
    const dto: HangHoaCreateDto = {} as HangHoaCreateDto;

    for (let j = 0; j < headers.length; j++) {
      const header = headers[j];
      const value = row[j];

      if (value !== undefined && value !== null) {
        switch (header) {
          case 'maMatHang':
            dto.maMatHang = String(value).trim();
            break;
          case 'tenMatHang':
            dto.tenMatHang = String(value).trim();
            break;
          case 'ghiChu':
            dto.ghiChu = String(value).trim();
            break;
          case 'ngayHieuLuc':
            dto.ngayHieuLuc = this.parseExcelDate(value);
            break;
          case 'ngayHetHieuLuc':
            dto.ngayHetHieuLuc = this.parseExcelDate(value);
            break;
        }
      }
    }

    return dto;
  }

  private parseExcelDate(value: any): string {
    if (!value) return new Date().toISOString();

    let date: Date;

    if (typeof value === 'number') {
      date = new Date(Math.round((value - 25569) * 86400 * 1000));
    }
    else if (typeof value === 'string') {
      const parts = value.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        date = new Date(year, month, day);
      } else {
        try {
          date = new Date(value);
        } catch (error) {
          return new Date().toISOString();
        }
      }
    } else {
      try {
        date = new Date(value);
      } catch (error) {
        return new Date().toISOString();
      }
    }

    if (isNaN(date.getTime())) {
      return new Date().toISOString();
    }

    return date.toISOString();
  }
}
