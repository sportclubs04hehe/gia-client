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
    event.preventDefault();
    const pastedText = event.clipboardData?.getData('text/plain');
    if (pastedText) {
      // Lọc khoảng trắng và ký tự đặc biệt (cho phép dấu chấm)
      const filteredText = pastedText.replace(/[^a-zA-Z0-9_\.-]/g, '');
      const input = this.el.nativeElement as HTMLInputElement;
      
      // Chèn nội dung đã lọc vào vị trí hiện tại
      const selectionStart = input.selectionStart || 0;
      const selectionEnd = input.selectionEnd || 0;
      const currentValue = input.value;
      const beforeText = currentValue.substring(0, selectionStart);
      const afterText = currentValue.substring(selectionEnd);
      
      // Tạo giá trị mới và giới hạn độ dài
      const newValue = beforeText + filteredText + afterText;
      input.value = newValue.substring(0, 25);
      
      // Cập nhật vị trí con trỏ
      const newCursorPos = selectionStart + filteredText.length;
      input.setSelectionRange(newCursorPos, newCursorPos);
      
      // Thông báo cho Angular
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
}