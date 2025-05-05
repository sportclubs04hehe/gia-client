import { Component, ElementRef, Input, Optional, Self } from '@angular/core';
import { ControlValueAccessor, FormsModule, NgControl, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-text-input',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule
  ],
  templateUrl: './text-input.component.html',
  styleUrl: './text-input.component.css'
})
export class TextInputComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() type = 'text';
  @Input() required = false;
  @Input() rows = 1;
  @Input() isValidating = false;
  @Input() preventSpaces = false;

  constructor(
    @Self() @Optional() public controlDir: NgControl,
    private element: ElementRef
  ) {
    if (this.controlDir) {
      this.controlDir.valueAccessor = this;
    }
  }

  onChange = (_: any) => {};
  onTouched = () => {};

  writeValue(value: any): void {
    const input = this.element.nativeElement.querySelector('input, textarea');
    if (input) {
      input.value = value || '';
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    const input = this.element.nativeElement.querySelector('input, textarea');
    if (input) {
      input.disabled = isDisabled;
    }
  }

  onKeyPress(event: KeyboardEvent) {
    if (this.preventSpaces && event.key === ' ') {
      event.preventDefault();
    }
  }
  
  // Helper method to handle input events with proper type casting
  onInputChange(event: Event): void {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    this.onChange(target.value);
  }
}
