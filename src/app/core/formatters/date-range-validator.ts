import { AbstractControl, ValidatorFn } from "@angular/forms";
import { NgbDateStruct } from "@ng-bootstrap/ng-bootstrap";

/**
 * Validates that the end date is after the start date
 * @param startKey Form control name for start date
 * @param endKey Form control name for end date
 * @returns ValidatorFn to be used in form group validators
 */
export function dateRangeValidator(startKey: string, endKey: string): ValidatorFn {
    return (group: AbstractControl): { [key: string]: any } | null => {
        const start = group.get(startKey)?.value as NgbDateStruct | null;
        const end = group.get(endKey)?.value as NgbDateStruct | null;

        // Skip validation if either date is missing
        if (!start || !end) {
            return null;
        }

        const startDate = new Date(start.year, start.month - 1, start.day);
        const endDate = new Date(end.year, end.month - 1, end.day);

        if (startDate > endDate) {
            // Set error on end date control
            const endControl = group.get(endKey);
            if (endControl) {
                endControl.setErrors({ ...endControl.errors, beforeStart: true });
            }
            return { beforeStart: true };
        }

        // Clear the beforeStart error if it exists but other errors might remain
        const endControl = group.get(endKey);
        if (endControl && endControl.errors) {
            const { beforeStart, ...otherErrors } = endControl.errors;
            endControl.setErrors(Object.keys(otherErrors).length ? otherErrors : null);
        }

        return null;
    }
}

/**
 * Generates a default date range with start date as today and end date as today + years
 * @param years Number of years to add to today for the end date (default: 5)
 * @returns An object with startDate and endDate as NgbDateStruct
 */
export function generateDefaultDateRange(years: number = 5): { startDate: NgbDateStruct, endDate: NgbDateStruct } {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setFullYear(today.getFullYear() + years);
    
    const startDate: NgbDateStruct = {
        year: today.getFullYear(),
        month: today.getMonth() + 1, 
        day: today.getDate()
    };
    
    const endDate: NgbDateStruct = {
        year: futureDate.getFullYear(),
        month: futureDate.getMonth() + 1,
        day: futureDate.getDate()
    };
    
    return { startDate, endDate };
}

/**
 * Helper function to convert NgbDateStruct to string in YYYY-MM-DD format
 */
export function dateStructToString(date: NgbDateStruct | null): string | null {
    if (!date) return null;
    return `${date.year}-${date.month.toString()
        .padStart(2, '0')}-${date.day.toString().padStart(2, '0')}`;
}

/**
* Helper function to convert string date in YYYY-MM-DD format to NgbDateStruct
*/
export function stringToDateStruct(dateStr: string | null): NgbDateStruct | null {
    if (!dateStr) return null;

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;

    return {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate()
    };
}