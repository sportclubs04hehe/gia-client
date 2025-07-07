import { Directive, inject, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { FormComponentBase } from '../../../../shared/components/forms/forms-base/forms-base.component';
@Directive()
export abstract class BaseItemFormComponent extends FormComponentBase {
  @Input() title: string = '';
  
  protected toastr = inject(ToastrService);
  
  // Common fields for both form types
  protected commonFields = {
    ma: ['', [Validators.required, Validators.maxLength(50)]],
    ten: ['', [Validators.required, Validators.maxLength(200)]],
    ghiChu: [''],
    ngayHieuLuc: ['', [Validators.required]],
    ngayHetHieuLuc: ['', [Validators.required]]
  };
  
  abstract save(): void;
  abstract cancel(): void;
  
  constructor(protected override fb: FormBuilder) {
    super(fb);
  }
}