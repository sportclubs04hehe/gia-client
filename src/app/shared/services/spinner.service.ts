import { Injectable } from '@angular/core';
import { NgxSpinnerService } from 'ngx-spinner';

export enum SpinnerType {
  Table = 'tableSpinner',
  Save = 'savingSpinner',
  Load = 'loadingSpinner',
  FullScreen = 'fullScreenSpinner'
}

@Injectable({
  providedIn: 'root'
})
export class SpinnerService {
  
  constructor(private spinnerService: NgxSpinnerService) { }

  /**
   * Shows a spinner with the specified name
   */
  show(name: SpinnerType): void {
    this.spinnerService.show(name);
  }

  /**
   * Hides a spinner with the specified name
   */
  hide(name: SpinnerType): void {
    this.spinnerService.hide(name);
  }

  /**
   * Shows the table loading spinner
   */
  showTableSpinner(): void {
    this.show(SpinnerType.Table);
  }

  /**
   * Hides the table loading spinner
   */
  hideTableSpinner(): void {
    this.hide(SpinnerType.Table);
  }

  /**
   * Shows the saving operation spinner
   */
  showSavingSpinner(): void {
    this.show(SpinnerType.Save);
  }

  /**
   * Hides the saving operation spinner
   */
  hideSavingSpinner(): void {
    this.hide(SpinnerType.Save);
  }
}
