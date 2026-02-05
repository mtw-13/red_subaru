import { Routes } from '@angular/router';
import { TrackSightingComponent } from './components/track-sighting/track-sighting.component';
import { LeaderboardComponent } from './components/leaderboard/leaderboard.component';

export const routes: Routes = [
  { path: '', redirectTo: '/track', pathMatch: 'full' },
  { path: 'track', component: TrackSightingComponent },
  { path: 'leaderboard', component: LeaderboardComponent },
  { path: '**', redirectTo: '/track' }
];
