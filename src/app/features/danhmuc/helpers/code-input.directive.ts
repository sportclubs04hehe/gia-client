import { Directive, ElementRef, HostListener } from '@angular/core';

@Directive({
  selector: '[appCodeInput]',
  standalone: true
})
export class CodeInputDirective {
  constructor(private el: ElementRef) {}

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    // Loại bỏ khoảng trắng và ký tự đặc biệt (cho phép dấu chấm)
    const filteredValue = input.value.replace(/[^a-zA-Z0-9_\.-]/g, '');
    
    // Cập nhật lại giá trị nếu có thay đổi
    if (filteredValue !== input.value) {
      input.value = filteredValue;
      // Kích hoạt sự kiện để Angular biết về thay đổi
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent): void {
    // Không preventDefault - để paste hoạt động tự nhiên
    // Sử dụng setTimeout để xử lý sau khi paste hoàn thành
    setTimeout(() => {
      const input = this.el.nativeElement as HTMLInputElement;
      const currentValue = input.value;
      
      // Lọc ký tự không hợp lệ
      const filteredValue = currentValue.replace(/[^a-zA-Z0-9_\.-]/g, '');
      
      // Giới hạn độ dài
      const finalValue = filteredValue.substring(0, 25);
      
      if (finalValue !== currentValue) {
        input.value = finalValue;
        // Thông báo cho Angular
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, 0);
  }

  // Thêm xử lý cho keydown để ngăn chặn ký tự không hợp lệ từ bàn phím
  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    // Cho phép các phím điều hướng và chức năng
    const allowedKeys = [
      'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
      'Home', 'End', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'
    ];
    
    if (event.ctrlKey || event.metaKey) {
      return;
    }

    // Cho phép các phím điều hướng
    if (allowedKeys.includes(event.key)) {
      return;
    }

    // Kiểm tra ký tự được nhập có hợp lệ không
    if (!/[a-zA-Z0-9_\.-]/.test(event.key)) {
      event.preventDefault();
    }
  }
}