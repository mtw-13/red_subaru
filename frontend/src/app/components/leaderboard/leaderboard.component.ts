import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { SightingService, LeaderboardEntry } from '../../services/sighting.service';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatButtonModule
  ],
  template: `
    <mat-card class="dashboard-card">
      <mat-card-header>
        <mat-card-title>
          <mat-icon>leaderboard</mat-icon>
          Leaderboard - Top 10 Spotters
        </mat-card-title>
      </mat-card-header>
      
      <mat-card-content>
        <div *ngIf="isLoading" class="loading-container">
          <mat-spinner diameter="48"></mat-spinner>
          <p>Loading leaderboard...</p>
        </div>

        <div *ngIf="error" class="error-container">
          <mat-icon>error_outline</mat-icon>
          <p>{{ error }}</p>
          <button mat-raised-button color="primary" (click)="loadLeaderboard()">
            Try Again
          </button>
        </div>

        <table mat-table [dataSource]="leaderboard" class="leaderboard-table" *ngIf="!isLoading && !error">
          <!-- Rank Column -->
          <ng-container matColumnDef="rank">
            <th mat-header-cell *matHeaderCellDef class="rank-cell">Rank</th>
            <td mat-cell *matCellDef="let entry" class="rank-cell">
              <span [ngClass]="getRankClass(entry.rank)">
                {{ getRankDisplay(entry.rank) }}
              </span>
            </td>
          </ng-container>

          <!-- User Column -->
          <ng-container matColumnDef="nickname">
            <th mat-header-cell *matHeaderCellDef>Spotter</th>
            <td mat-cell *matCellDef="let entry">
              <div class="user-cell">
                <mat-icon>person</mat-icon>
                <span>{{ entry.nickname }}</span>
              </div>
            </td>
          </ng-container>

          <!-- Total Count Column -->
          <ng-container matColumnDef="totalCount">
            <th mat-header-cell *matHeaderCellDef>Total Sightings</th>
            <td mat-cell *matCellDef="let entry">
              <div class="count-cell">
                <mat-icon>directions_car</mat-icon>
                <strong>{{ entry.totalCount }}</strong>
              </div>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"
              [class.highlight-row]="row.rank <= 3"></tr>
        </table>

        <div *ngIf="!isLoading && !error && leaderboard.length === 0" class="empty-state">
          <mat-icon>emoji_events</mat-icon>
          <h3>No sightings yet!</h3>
          <p>Be the first to spot a red Subaru and claim the top spot!</p>
        </div>

        <div class="leaderboard-footer" *ngIf="lastUpdated">
          <span>Last updated: {{ lastUpdated | date:'medium' }}</span>
          <button mat-icon-button (click)="loadLeaderboard()" [disabled]="isLoading">
            <mat-icon>refresh</mat-icon>
          </button>
        </div>
      </mat-card-content>
    </mat-card>

    <mat-card class="dashboard-card stats-card" *ngIf="totalUsers > 0">
      <mat-card-content>
        <div class="stats-grid">
          <div class="stat-item">
            <mat-icon>groups</mat-icon>
            <div class="stat-value">{{ totalUsers }}</div>
            <div class="stat-label">Total Spotters</div>
          </div>
          <div class="stat-item">
            <mat-icon>directions_car</mat-icon>
            <div class="stat-value">{{ getTotalSightings() }}</div>
            <div class="stat-label">Total Sightings</div>
          </div>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .loading-container, .error-container, .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px;
      text-align: center;
      
      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: #c62828;
        margin-bottom: 16px;
      }
      
      p {
        color: #666;
        margin: 16px 0;
      }
    }

    .leaderboard-table {
      width: 100%;
      table-layout: fixed;
      
      th, td {
        width: 33.33%;
      }
      
      th {
        font-weight: 600;
        color: #333;
      }
    }

    .rank-cell {
      text-align: center;
    }

    .user-cell {
      display: flex;
      align-items: center;
      gap: 8px;
      
      mat-icon {
        color: #666;
        font-size: 20px;
      }
    }

    .count-cell {
      display: flex;
      align-items: center;
      gap: 8px;
      
      mat-icon {
        color: #c62828;
        font-size: 20px;
      }
      
      strong {
        font-size: 1.1rem;
      }
    }

    .highlight-row {
      background-color: rgba(198, 40, 40, 0.05);
    }

    .leaderboard-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #eee;
      font-size: 0.875rem;
      color: #666;
    }

    .stats-card {
      .mat-mdc-card-content {
        padding: 24px;
      }
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 24px;
    }

    .stat-item {
      text-align: center;
      padding: 16px;
      background: #f5f5f5;
      border-radius: 8px;
      
      mat-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
        color: #c62828;
      }
      
      .stat-value {
        font-size: 2rem;
        font-weight: 600;
        color: #333;
        margin: 8px 0 4px;
      }
      
      .stat-label {
        color: #666;
        font-size: 0.875rem;
      }
    }

    /* Mobile responsive styles */
    @media (max-width: 600px) {
      .leaderboard-table {
        font-size: 0.9rem;
      }

      .rank-cell {
        width: 50px;
        font-size: 1rem;
      }

      .user-cell, .count-cell {
        gap: 4px;

        mat-icon {
          font-size: 16px;
          width: 16px;
          height: 16px;
        }
      }

      .stats-grid {
        grid-template-columns: 1fr;
        gap: 12px;
      }

      .stat-item {
        padding: 12px;

        .stat-value {
          font-size: 1.5rem;
        }
      }

      .leaderboard-footer {
        flex-direction: column;
        gap: 8px;
        text-align: center;
      }
    }
  `]
})
export class LeaderboardComponent implements OnInit {
  leaderboard: LeaderboardEntry[] = [];
  displayedColumns = ['rank', 'nickname', 'totalCount'];
  isLoading = false;
  error: string | null = null;
  lastUpdated: Date | null = null;
  totalUsers = 0;

  constructor(private sightingService: SightingService) {}

  ngOnInit(): void {
    this.loadLeaderboard();
  }

  loadLeaderboard(): void {
    this.isLoading = true;
    this.error = null;

    this.sightingService.getLeaderboard().subscribe({
      next: (response) => {
        this.leaderboard = response.leaderboard;
        this.totalUsers = response.totalUsers;
        this.lastUpdated = new Date(response.lastUpdated);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading leaderboard:', err);
        this.error = 'Failed to load leaderboard. Please try again.';
        this.isLoading = false;
      }
    });
  }

  getRankDisplay(rank: number): string {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  }

  getRankClass(rank: number): string {
    if (rank <= 3) return `rank-${rank}`;
    return '';
  }

  getTotalSightings(): number {
    return this.leaderboard.reduce((sum, entry) => sum + entry.totalCount, 0);
  }
}
