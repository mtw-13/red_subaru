import { Component, Input, ViewChild, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
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
        <span class="app-title">🚗 <span class="title-text">Red Subaru Tracker</span></span>
        <span class="spacer"></span>
        <span class="user-nickname">{{ getUserNickname() }}</span>
        <button mat-icon-button (click)="signOut()" class="logout-btn-mobile">
          <mat-icon>logout</mat-icon>
        </button>
        <button mat-button (click)="signOut()" class="logout-btn-desktop">
          <mat-icon>logout</mat-icon>
          Logout
        </button>
      </mat-toolbar>

      <div class="content-wrapper">
        <!-- Side Navigation -->
        <mat-sidenav-container class="sidenav-container">
          <mat-sidenav #sidenav [mode]="isMobile ? 'over' : 'side'" [opened]="!isMobile" class="app-sidenav">
            <mat-nav-list>
              <a mat-list-item routerLink="/track" routerLinkActive="active-link" (click)="onNavClick()">
                <mat-icon matListItemIcon>add_location</mat-icon>
                <span matListItemTitle>Track Sighting</span>
              </a>
              <a mat-list-item routerLink="/leaderboard" routerLinkActive="active-link" (click)="onNavClick()">
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
    .dashboard-container {
      height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .app-toolbar {
      position: sticky;
      top: 0;
      z-index: 1000;
    }

    .menu-button {
      margin-right: 8px;
    }

    .app-title {
      font-size: 1.25rem;
      font-weight: 500;
    }

    .spacer {
      flex: 1;
    }

    .user-nickname {
      margin-right: 8px;
      font-size: 0.875rem;
      opacity: 0.9;
      font-weight: 500;
    }

    .logout-btn-mobile {
      display: none;
    }

    .logout-btn-desktop {
      display: inline-flex;
    }

    .content-wrapper {
      flex: 1;
      display: flex;
      overflow: hidden;
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

    .main-content {
      padding: 16px;
      overflow-y: auto;
    }

    @media (max-width: 768px) {
      .app-title .title-text {
        display: none;
      }

      .user-nickname {
        max-width: 80px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .logout-btn-mobile {
        display: inline-flex;
      }

      .logout-btn-desktop {
        display: none;
      }
      
      .app-sidenav {
        width: 200px;
      }

      .main-content {
        padding: 12px;
      }
    }

    @media (max-width: 480px) {
      .menu-button {
        margin-right: 4px;
      }

      .user-nickname {
        display: none;
      }

      .main-content {
        padding: 8px;
      }
    }
  `]
})
export class LayoutComponent implements OnInit {
  @Input() user: any;
  @Input() signOut!: () => void;
  @ViewChild('sidenav') sidenav!: MatSidenav;
  
  isMobile = false;

  ngOnInit(): void {
    this.checkScreenSize();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.checkScreenSize();
  }

  checkScreenSize(): void {
    this.isMobile = window.innerWidth < 768;
  }

  onNavClick(): void {
    if (this.isMobile) {
      this.sidenav.close();
    }
  }

  getUserNickname(): string {
    // Try to get nickname from user attributes
    const attrs = this.user?.attributes || {};
    if (attrs.nickname) {
      return attrs.nickname;
    }
    // Fallback to email prefix
    const email = this.user?.signInDetails?.loginId || attrs.email;
    if (email) {
      return email.split('@')[0];
    }
    return 'Spotter';
  }
}
