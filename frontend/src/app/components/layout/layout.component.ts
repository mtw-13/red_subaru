import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule
  ],
  template: `
    <div class="dashboard-container">
      <!-- Header Toolbar -->
      <mat-toolbar color="primary" class="app-toolbar">
        <button mat-icon-button (click)="sidenav.toggle()" class="menu-button">
          <mat-icon>menu</mat-icon>
        </button>
        <span class="app-title">🚗 Red Subaru Tracker</span>
        <span class="spacer"></span>
        <span class="user-email">{{ user?.signInDetails?.loginId }}</span>
        <button mat-button (click)="signOut()">
          <mat-icon>logout</mat-icon>
          Logout
        </button>
      </mat-toolbar>

      <div class="content-wrapper">
        <!-- Side Navigation -->
        <mat-sidenav-container class="sidenav-container">
          <mat-sidenav #sidenav mode="side" [opened]="true" class="app-sidenav">
            <mat-nav-list>
              <a mat-list-item routerLink="/track" routerLinkActive="active-link">
                <mat-icon matListItemIcon>add_location</mat-icon>
                <span matListItemTitle>Track Sighting</span>
              </a>
              <a mat-list-item routerLink="/leaderboard" routerLinkActive="active-link">
                <mat-icon matListItemIcon>leaderboard</mat-icon>
                <span matListItemTitle>Leaderboard</span>
              </a>
            </mat-nav-list>

            <div class="sidenav-footer">
              <mat-divider></mat-divider>
              <div class="stats-info">
                <mat-icon>directions_car</mat-icon>
                <span>Keep tracking!</span>
              </div>
            </div>
          </mat-sidenav>

          <mat-sidenav-content class="main-content">
            <router-outlet></router-outlet>
          </mat-sidenav-content>
        </mat-sidenav-container>
      </div>
    </div>
  `,
  styles: [`
    .app-toolbar {
      position: sticky;
      top: 0;
      z-index: 1000;
    }

    .menu-button {
      margin-right: 16px;
    }

    .app-title {
      font-size: 1.25rem;
      font-weight: 500;
    }

    .spacer {
      flex: 1;
    }

    .user-email {
      margin-right: 16px;
      font-size: 0.875rem;
      opacity: 0.9;
    }

    .sidenav-container {
      flex: 1;
    }

    .app-sidenav {
      width: 240px;
      background: white;
      display: flex;
      flex-direction: column;
    }

    .active-link {
      background-color: rgba(198, 40, 40, 0.1) !important;
      
      mat-icon {
        color: #c62828;
      }
    }

    .sidenav-footer {
      margin-top: auto;
      padding: 16px;
    }

    .stats-info {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 16px 0;
      color: #666;
      font-size: 0.875rem;
      
      mat-icon {
        color: #c62828;
      }
    }

    @media (max-width: 768px) {
      .user-email {
        display: none;
      }
      
      .app-sidenav {
        width: 200px;
      }
    }
  `]
})
export class LayoutComponent {
  @Input() user: any;
  @Input() signOut!: () => void;
}
