import {Directive, OnDestroy } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';
import { Subject } from 'rxjs';
import { dateStructToString } from '../../../../core/formatters/date-range-validator';

@Directive()
export abstract class FormComponentBase implements OnDestroy {
  form!: FormGroup;
  isSaving = false;
  protected destroy$ = new Subject<void>();
  
  constructor(protected fb: FormBuilder) {}
  
  /**
   * Initialize the form with appropriate controls
   */
  protected abstract buildForm(): void;
  
  /**
   * Mark all form controls as touched to trigger validation
   */
  protected markFormTouched(): void {
    Object.keys(this.form.controls).forEach(key => {
      const control = this.form.get(key);
      control?.markAsTouched();
      control?.markAsDirty(); // Add this line to the base class
    });
  }
  
  /**
   * Prepare form data for submission by handling date conversions
   */
  protected prepareFormData(dateFields: string[] = []): any {
    const formValue = { ...this.form.value };
    
    // Convert NgbDateStruct to ISO string format for each date field
    dateFields.forEach(field => {
      if (formValue[field]) {
        formValue[field] = dateStructToString(formValue[field]);
      }
    });
    
    return formValue;
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
