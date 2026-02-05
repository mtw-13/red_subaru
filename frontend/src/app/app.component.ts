import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AmplifyAuthenticatorModule, AuthenticatorService } from '@aws-amplify/ui-angular';
import { LayoutComponent } from './components/layout/layout.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, AmplifyAuthenticatorModule, LayoutComponent],
  template: `
    <amplify-authenticator 
      [signUpAttributes]="['nickname']" 
      [loginMechanisms]="['email']"
      [hideSignUp]="false">
      <ng-template amplifySlot="header">
        <div class="auth-header">
          <h1>🚗 Red Subaru Tracker</h1>
          <p>Track your red Subaru sightings!</p>
        </div>
      </ng-template>

      <ng-template amplifySlot="sign-up-footer">
        <div class="password-policy">
          <strong>Password Requirements:</strong>
          <ul>
            <li>At least 8 characters</li>
            <li>Uppercase letter (A-Z)</li>
            <li>Lowercase letter (a-z)</li>
            <li>Number (0-9)</li>
            <li>Special character (!&#64;#$%^&*)</li>
          </ul>
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

    .password-policy {
      background: #f5f5f5;
      border-radius: 8px;
      padding: 12px 16px;
      margin: 16px 0;
      font-size: 0.85rem;
      color: #555;

      strong {
        display: block;
        margin-bottom: 8px;
        color: #333;
      }

      ul {
        margin: 0;
        padding-left: 20px;
        
        li {
          margin: 4px 0;
        }
      }
    }
  `]
})
export class AppComponent {
  constructor(public authenticator: AuthenticatorService) {}
}
