import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { fetchAuthSession } from 'aws-amplify/auth';
import { from, switchMap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SightingRequest {
  userId: string;
  date: string;
  count: number;
}

export interface SightingResponse {
  message: string;
  sighting: {
    sightingId: string;
    userId: string;
    date: string;
    count: number;
    createdAt: string;
  };
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  nickname: string;
  totalCount: number;
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  totalUsers: number;
  lastUpdated: string;
}

@Injectable({
  providedIn: 'root'
})
export class SightingService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): Observable<HttpHeaders> {
    return from(fetchAuthSession()).pipe(
      switchMap(async (session) => {
        const token = session.tokens?.idToken?.toString();
        return new HttpHeaders({
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        });
      })
    );
  }

  recordSighting(sighting: SightingRequest): Observable<SightingResponse> {
    return this.getAuthHeaders().pipe(
      switchMap(headers => 
        this.http.post<SightingResponse>(`${this.apiUrl}/sightings`, sighting, { headers })
      )
    );
  }

  getLeaderboard(): Observable<LeaderboardResponse> {
    return this.getAuthHeaders().pipe(
      switchMap(headers => 
        this.http.get<LeaderboardResponse>(`${this.apiUrl}/leaderboard`, { headers })
      )
    );
  }
}
