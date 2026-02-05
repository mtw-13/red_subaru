import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { fetchAuthSession } from 'aws-amplify/auth';
import { SightingService } from '../../services/sighting.service';

@Component({
  selector: 'app-track-sighting',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule
  ],
  template: `
    <mat-card class="dashboard-card">
      <mat-card-header>
        <mat-card-title>
          <mat-icon>add_location</mat-icon>
          Track a Sighting
        </mat-card-title>
      </mat-card-header>
      
      <mat-card-content>
        <form [formGroup]="sightingForm" (ngSubmit)="onSubmit()">
          <mat-form-field appearance="outline" class="form-field-full">
            <mat-label>Date of Sighting</mat-label>
            <input matInput [matDatepicker]="picker" formControlName="date" [max]="today">
            <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
            <mat-datepicker #picker></mat-datepicker>
            <mat-error *ngIf="sightingForm.get('date')?.hasError('required')">
              Date is required
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="form-field-full">
            <mat-label>Number of Red Subarus Seen</mat-label>
            <input matInput type="number" formControlName="count" min="1" max="100">
            <mat-icon matPrefix>directions_car</mat-icon>
            <mat-error *ngIf="sightingForm.get('count')?.hasError('required')">
              Count is required
            </mat-error>
            <mat-error *ngIf="sightingForm.get('count')?.hasError('min')">
              Must be at least 1
            </mat-error>
            <mat-error *ngIf="sightingForm.get('count')?.hasError('max')">
              Maximum is 100
            </mat-error>
          </mat-form-field>

          <button 
            mat-raised-button 
            color="primary" 
            type="submit" 
            [disabled]="sightingForm.invalid || isSubmitting"
            class="submit-button">
            <mat-spinner *ngIf="isSubmitting" diameter="20"></mat-spinner>
            <span *ngIf="!isSubmitting">
              <mat-icon>save</mat-icon>
              Record Sighting
            </span>
          </button>
        </form>

        <div class="recent-sightings" *ngIf="recentSighting">
          <h3>✅ Last Recorded Sighting</h3>
          <p>
            <strong>{{ recentSighting.count }}</strong> Red Subaru(s) on 
            <strong>{{ recentSighting.date | date:'mediumDate' }}</strong>
          </p>
        </div>
      </mat-card-content>
    </mat-card>

    <mat-card class="dashboard-card tips-card">
      <mat-card-header>
        <mat-card-title>
          <mat-icon>tips_and_updates</mat-icon>
          Spotting Tips
        </mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <ul class="tips-list">
          <li>🔴 Look for the distinctive red color - any shade counts!</li>
          <li>🚗 All Subaru models qualify: Impreza, WRX, Outback, Forester, etc.</li>
          <li>📍 Parks, highways, and shopping centers are hotspots</li>
          <li>🏆 Track daily to climb the leaderboard!</li>
        </ul>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .submit-button {
      width: 100%;
      padding: 12px;
      font-size: 1rem;
      
      mat-icon {
        margin-right: 8px;
      }
      
      mat-spinner {
        display: inline-block;
      }
    }

    .recent-sightings {
      margin-top: 24px;
      padding: 16px;
      background: #e8f5e9;
      border-radius: 8px;
      border-left: 4px solid #4caf50;
      
      h3 {
        margin: 0 0 8px 0;
        color: #2e7d32;
        font-size: 1rem;
      }
      
      p {
        margin: 0;
        color: #1b5e20;
      }
    }

    .tips-card {
      .mat-mdc-card-header {
        background: linear-gradient(135deg, #424242 0%, #212121 100%);
      }
    }

    .tips-list {
      list-style: none;
      padding: 0;
      margin: 0;
      
      li {
        padding: 12px 0;
        border-bottom: 1px solid #eee;
        
        &:last-child {
          border-bottom: none;
        }
      }
    }
  `]
})
export class TrackSightingComponent implements OnInit {
  sightingForm!: FormGroup;
  today = new Date();
  isSubmitting = false;
  recentSighting: { date: string; count: number } | null = null;

  constructor(
    private fb: FormBuilder,
    private sightingService: SightingService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.sightingForm = this.fb.group({
      date: [new Date(), Validators.required],
      count: [1, [Validators.required, Validators.min(1), Validators.max(100)]]
    });
  }

  async onSubmit(): Promise<void> {
    if (this.sightingForm.invalid) return;

    this.isSubmitting = true;

    try {
      // Get user ID from Cognito session
      const session = await fetchAuthSession();
      const userId = session.tokens?.idToken?.payload?.sub as string;

      if (!userId) {
        throw new Error('Unable to get user ID');
      }

      const formValue = this.sightingForm.value;
      const dateStr = this.formatDate(formValue.date);

      await this.sightingService.recordSighting({
        userId,
        date: dateStr,
        count: formValue.count
      }).toPromise();

      this.recentSighting = {
        date: dateStr,
        count: formValue.count
      };

      this.snackBar.open('🚗 Sighting recorded successfully!', 'Close', {
        duration: 3000,
        panelClass: ['success-snackbar']
      });

      // Reset form but keep today's date
      this.sightingForm.patchValue({ count: 1 });

    } catch (error: any) {
      console.error('Error recording sighting:', error);
      this.snackBar.open(
        error.message || 'Failed to record sighting. Please try again.',
        'Close',
        { duration: 5000, panelClass: ['error-snackbar'] }
      );
    } finally {
      this.isSubmitting = false;
    }
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
