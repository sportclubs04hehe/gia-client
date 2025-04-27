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
    
    if (typeof input === 'string') {
      const parsedDate = this.parserFormatter.parse(input as string);
      
      if (parsedDate) {
        this.control.setValue(parsedDate);
      } else {
        this.control.setErrors({ngbDate: {invalid: true}});
      }
    }
    
    this.markAsTouched();
  }

  onKeyDown(event: KeyboardEvent): boolean {
    const allowedKeys = [
      'Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      '.', '/', '-'
    ];
    
    if (allowedKeys.includes(event.key)) {
      return true;
    }
    
    if (/^\d$/.test(event.key)) {
      return true;
    }
    
    event.preventDefault();
    return false;
  }

  onChange = (value: any) => { };
  markAsTouched = () => { };
}
