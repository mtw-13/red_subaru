import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AmplifyAuthenticatorModule, AuthenticatorService } from '@aws-amplify/ui-angular';
import { LayoutComponent } from './components/layout/layout.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, AmplifyAuthenticatorModule, LayoutComponent],
  template: `
    <amplify-authenticator [hideSignUp]="false">
      <ng-template amplifySlot="header">
        <div class="auth-header">
          <h1>🚗 Red Subaru Tracker</h1>
          <p>Track your red Subaru sightings!</p>
        </div>
      </ng-template>

      <ng-template amplifySlot="authenticated" let-user="user" let-signOut="signOut">
        <app-layout [user]="user" [signOut]="signOut"></app-layout>
      </ng-template>
    </amplify-authenticator>
  `,
  styles: [`
    .auth-header {
      text-align: center;
      padding: 32px 24px;
      
      h1 {
        color: #c62828;
        font-size: 2rem;
        margin-bottom: 8px;
      }
      
      p {
        color: #666;
        font-size: 1rem;
      }
    }
  `]
})
export class AppComponent {
  constructor(public authenticator: AuthenticatorService) {}
}
