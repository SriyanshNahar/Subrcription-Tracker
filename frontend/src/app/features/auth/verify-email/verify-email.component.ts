import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SeoService } from '../../../core/services/seo.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-[80vh] flex items-center justify-center p-4">
      <div class="glass-card rounded-2xl p-8 w-full max-w-md text-center">

        <div class="text-6xl mb-4">📧</div>
        <h1 class="text-white text-xl font-bold mb-2">Verify Your Email Address</h1>
        <p class="text-gray-400 text-sm mb-6">
          We sent a verification link to your email.<br>
          Click the link to activate your account.
        </p>

        <div class="bg-amber-950/20 border border-amber-500/30 text-amber-300/80 rounded-xl p-3 mb-6 text-xs text-left flex gap-2 items-start">
          <span>⚠️</span>
          <p><strong>Note:</strong> If you don't receive the email within a few minutes, please check your <strong>Spam</strong> or <strong>Junk</strong> folder in the Gmail app or your email client.</p>
        </div>

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
export class VerifyEmailComponent implements OnInit {
  isResending = false;
  resendSuccess = false;

  constructor(
    private authService: AuthService,
    private seo: SeoService
  ) {}

  ngOnInit() {
    this.seo.generateTags({
      title: 'Verify Your Email Address',
      description: 'A verification link has been dispatched to your signup email. Verify your identity to activate your SubTrackr expense tracker dashboard.'
    });
  }

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
