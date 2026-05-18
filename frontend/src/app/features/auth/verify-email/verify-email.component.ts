import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-[80vh] flex items-center justify-center p-4">
      <div class="glass-card rounded-2xl p-8 w-full max-w-md text-center">

        <div class="text-6xl mb-4">📧</div>
        <h2 class="text-white text-xl font-bold mb-2">Check your inbox!</h2>
        <p class="text-gray-400 text-sm mb-6">
          We sent a verification link to your email.<br>
          Click the link to activate your account.
        </p>

        <div *ngIf="resendSuccess" class="bg-green-900/30 border border-green-500 text-green-400 rounded-lg p-3 mb-4 text-sm">
          Email sent! Check your inbox again.
        </div>

        <button
          (click)="resendEmail()"
          [disabled]="isResending"
          class="w-full border border-primary text-primary py-3 rounded-xl hover:bg-primary/10 transition mb-4 disabled:opacity-50">
          {{ isResending ? 'Sending...' : 'Resend verification email' }}
        </button>

        <a routerLink="/login" class="text-gray-500 text-sm hover:text-gray-300">
          Back to login
        </a>
      </div>
    </div>
  `
})
export class VerifyEmailComponent {
  isResending = false;
  resendSuccess = false;

  constructor(private authService: AuthService) {}

  async resendEmail(): Promise<void> {
    this.isResending = true;
    try {
      await this.authService.resendVerificationEmail();
      this.resendSuccess = true;
    } catch (error) {
      console.error(error);
    } finally {
      this.isResending = false;
    }
  }
}
