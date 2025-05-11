import { Component, Input, OnInit, Optional, Self, ViewChild, ViewEncapsulation } from '@angular/core';
import { ControlValueAccessor, FormControl, NgControl } from '@angular/forms';
import { NgbCalendar, NgbDateParserFormatter, NgbDateStruct, NgbInputDatepicker } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '../../../shared.module';
import { CustomDateParserFormatter } from '../../../../core/formatters/custom-date-parser-formatter';

@Component({
  selector: 'app-date-input',
  standalone: true,
  imports: [
    SharedModule
  ],
  providers: [
    { provide: NgbDateParserFormatter, useClass: CustomDateParserFormatter }
  ],
  templateUrl: './date-input.component.html',
  styleUrl: './date-input.component.css',
  encapsulation: ViewEncapsulation.None
})
export class DateInputComponent implements OnInit, ControlValueAccessor {
  @Input() label: string = '';
  @Input() required: boolean = false;
  @Input() placeholder: string = 'dd/MM/yyyy';
  @Input() showTodayButton: boolean = true;
  @Input() showFooter: boolean = true;
  @ViewChild('datepicker') datepicker!: NgbInputDatepicker;

  control = new FormControl<NgbDateStruct | null>(null);
  touched = false;
  disabled = false;
  today!: NgbDateStruct;

  constructor(
    @Optional() @Self() public ngControl: NgControl,
    private calendar: NgbCalendar,
    private parserFormatter: NgbDateParserFormatter
  ) {
    // Explicitly set the value accessor
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
    this.today = this.calendar.getToday();
  }

  ngOnInit(): void {
    this.control.valueChanges.subscribe((value) => {
      this.onChange(value);
      this.markAsTouched();
    });
  }

  writeValue(value: NgbDateStruct | null): void {
    this.control.setValue(value, { emitEvent: false });
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.markAsTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    if (isDisabled) {
      this.control.disable();
    } else {
      this.control.enable();
    }
  }

  setToToday(): void {
    this.control.setValue(this.calendar.getToday());
    this.datepicker.close();
  }

  onInputBlur(): void {
    const input = this.control.value;

    // Kiểm tra nếu input là một chuỗi
    if (typeof input === 'string') {
      this.validateDateFormat(input);
    }

    this.markAsTouched();
  }

  onKeyDown(event: KeyboardEvent): boolean {
    const allowedKeys = [
      'Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'
    ];
    
    // Always allow control keys
    if (allowedKeys.includes(event.key)) {
      return true;
    }
    
    // Get current value and cursor position
    const input = event.target as HTMLInputElement;
    const value = input.value;
    const selectionStart = input.selectionStart || 0;
    
    // If user is trying to edit by selecting text, allow it
    if (input.selectionStart !== input.selectionEnd) {
      if (/^\d$/.test(event.key) || ['.', '/', '-'].includes(event.key)) {
        return true;
      }
    }
    
    // Handle separators (/, -, .)
    if (['.', '/', '-'].includes(event.key)) {
      // Only allow separators at positions 2 and 5
      if (selectionStart === 2 || selectionStart === 5) {
        // If there's already a separator at this position, allow overwriting it
        if (value[selectionStart] === '/' || value[selectionStart] === '.' || value[selectionStart] === '-') {
          return true;
        }
        return true;
      }
      event.preventDefault();
      return false;
    }
    
    // Handle digits
    if (/^\d$/.test(event.key)) {
      // Prevent entry if would make the input too long (10 chars for DD/MM/YYYY)
      if (value.length >= 10 && selectionStart >= 10) {
        event.preventDefault();
        return false;
      }
      
      // Validate days (first 2 digits)
      if (selectionStart === 0) {
        // First digit of day can only be 0-3
        if (parseInt(event.key) > 3) {
          event.preventDefault();
          return false;
        }
        return true;
      } else if (selectionStart === 1) {
        // Second digit of day depends on first digit
        const firstDigit = parseInt(value[0]);
        if (firstDigit === 3 && parseInt(event.key) > 1) { // Max 31 days
          event.preventDefault();
          return false;
        }
        return true;
      }
      
      // Validate months (digits at positions 3-4)
      if (selectionStart === 3) {
        // First digit of month can only be 0-1
        if (parseInt(event.key) > 1) {
          event.preventDefault();
          return false;
        }
        return true;
      } else if (selectionStart === 4) {
        // Second digit of month depends on first digit
        const firstDigit = parseInt(value[3]);
        if (firstDigit === 1 && parseInt(event.key) > 2) { // Max 12 months
          event.preventDefault();
          return false;
        }
        return true;
      }
      
      // Allow other digits (for the year)
      return true;
    }
    
    // Block any other keys
    event.preventDefault();
    return false;
  }

  onKeyUp(event: KeyboardEvent): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    
    // Auto-add separators
    if (value.length === 2 && !['/', '.', '-'].includes(value[2]) && 
        ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(event.key)) {
      input.value = value + '/';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (value.length === 5 && !['/', '.', '-'].includes(value[5]) && 
               ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(event.key)) {
      input.value = value + '/';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    // Kiểm tra định dạng hợp lệ khi nhập đủ 10 ký tự hoặc khi người dùng đã nhập ít nhất 1 ký tự
    if (value.length === 10) {
      this.validateDateFormat(value);
    } else if (value.length > 0) {
      // Xóa lỗi nếu người dùng đang nhập
      this.control.setErrors(null);
      
      // Đồng bộ lỗi với parent control
      if (this.ngControl && this.ngControl.control) {
        const currentErrors = this.ngControl.control.errors;
        if (currentErrors && currentErrors['ngbDate']) {
          const { ngbDate, ...otherErrors } = currentErrors;
          this.ngControl.control.setErrors(Object.keys(otherErrors).length ? otherErrors : null);
        }
      }
    }
  }

  private validateDateFormat(value: string): void {
    // Regex kiểm tra định dạng ngày dd/MM/yyyy
    const datePattern = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;
    
    if (!datePattern.test(value)) {
      this.control.setErrors({ ngbDate: { invalid: true } });
      
      // Đồng bộ lỗi với parent control
      if (this.ngControl && this.ngControl.control) {
        const currentErrors = this.ngControl.control.errors || {};
        this.ngControl.control.setErrors({ 
          ...currentErrors, 
          ngbDate: { invalid: true } 
        });
      }
      return;
    }
    
    // Kiểm tra ngày hợp lệ (vd: 31/04 không hợp lệ)
    const parsedDate = this.parserFormatter.parse(value);
    if (!parsedDate) {
      this.control.setErrors({ ngbDate: { invalid: true } });
      
      // Đồng bộ lỗi với parent control
      if (this.ngControl && this.ngControl.control) {
        const currentErrors = this.ngControl.control.errors || {};
        this.ngControl.control.setErrors({ 
          ...currentErrors, 
          ngbDate: { invalid: true } 
        });
      }
    }
  }

  onChange = (value: any) => { };
  markAsTouched = () => { };
}
