import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ReCaptchaV3Service } from 'ng-recaptcha';
import { AuthService } from '../../../core/services/auth.service';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="min-h-[80vh] flex items-center justify-center p-4">
      <div class="glass-card rounded-2xl p-8 w-full max-w-md">

        <!-- Logo -->
        <h1 class="text-3xl font-bold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">SubTrackr</h1>
        <p class="text-gray-400 text-center mb-8 text-sm">Track every subscription. Save every rupee.</p>

        <!-- Error Message -->
        <div *ngIf="errorMessage" class="bg-red-900/30 border border-red-500 text-red-400 rounded-lg p-3 mb-4 text-sm">
          {{ errorMessage }}
        </div>

        <!-- Success/Info Alert for Forgot Password -->
        <div *ngIf="forgotPasswordSent" class="bg-amber-950/20 border border-amber-500/30 text-amber-300/80 rounded-xl p-3 mb-4 text-xs flex gap-2 items-start text-left">
          <span>⚠️</span>
          <p><strong>Password reset email sent!</strong> If you do not see it in a few minutes, please check your <strong>Spam</strong> or <strong>Junk</strong> folder in the Gmail app.</p>
        </div>

        <!-- GOOGLE LOGIN BUTTON -->
        <button
          (click)="onGoogleLogin()"
          [disabled]="isLoading"
          class="w-full flex items-center justify-center gap-3 bg-white text-gray-900 font-medium py-3 rounded-xl hover:bg-gray-100 transition mb-6 disabled:opacity-50">
          <svg class="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <!-- Divider -->
        <div class="flex items-center gap-3 mb-6">
          <div class="flex-1 h-px bg-gray-800"></div>
          <span class="text-gray-600 text-sm">or</span>
          <div class="flex-1 h-px bg-gray-800"></div>
        </div>

        <!-- Email Input -->
        <div class="mb-4">
          <label class="text-gray-400 text-sm mb-1 block">Email</label>
          <input
            [(ngModel)]="email"
            type="email"
            placeholder="you@example.com"
            class="w-full bg-[#0F0F0F] border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-primary transition">
        </div>

        <!-- Password Input -->
        <div class="mb-6">
          <div class="flex justify-between items-center mb-1">
            <label class="text-gray-400 text-sm block">Password</label>
            <button
              (click)="onForgotPassword()"
              type="button"
              class="text-xs text-accent hover:underline focus:outline-none bg-transparent border-0 p-0 cursor-pointer">
              Forgot password?
            </button>
          </div>
          <input
            [(ngModel)]="password"
            type="password"
            placeholder="••••••••"
            class="w-full bg-[#0F0F0F] border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-primary transition">
        </div>

        <!-- Login Button -->
        <button
          (click)="onEmailLogin()"
          [disabled]="isLoading"
          class="w-full bg-primary hover:bg-opacity-90 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50">
          <span *ngIf="!isLoading">Login</span>
          <span *ngIf="isLoading">Verifying...</span>
        </button>

        <!-- reCAPTCHA Notice -->
        <p class="text-gray-600 text-xs text-center mt-4">
          Protected by reCAPTCHA.
          <a href="https://policies.google.com/privacy" class="underline hover:text-gray-400">Privacy</a> &
          <a href="https://policies.google.com/terms" class="underline hover:text-gray-400">Terms</a>
        </p>

        <!-- Signup Link -->
        <p class="text-gray-500 text-sm text-center mt-4">
          No account?
          <a routerLink="/register" class="text-accent hover:underline">Sign up free</a>
        </p>
      </div>
    </div>
  `
})
export class LoginComponent {
  email = '';
  password = '';
  isLoading = false;
  errorMessage = '';
  forgotPasswordSent = false;

  constructor(
    private recaptchaV3Service: ReCaptchaV3Service,
    private authService: AuthService,
    private http: HttpClient,
    private toastr: ToastrService
  ) {}

  async onGoogleLogin(): Promise<void> {
    this.isLoading = true;
    this.forgotPasswordSent = false;
    try {
      await this.authService.loginWithGoogle();
      this.toastr.success('Logged in successfully');
    } catch (error: any) {
      this.errorMessage = error.message;
      this.toastr.error(error.message);
    } finally {
      this.isLoading = false;
    }
  }

  async onEmailLogin(): Promise<void> {
    if (!this.email || !this.password) {
      this.errorMessage = 'Please enter email and password';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.forgotPasswordSent = false;

    try {
      // 1. Get reCAPTCHA token
      const token = await this.recaptchaV3Service.execute('login').toPromise();

      // 2. Verify token on backend
      const captchaResult: any = await this.http.post('http://127.0.0.1:5000/api/auth/verify-captcha', { token }).toPromise();

      // 3. Check score (0.5+ = human, below = bot)
      if (captchaResult.score < 0.5) {
        this.errorMessage = 'Bot activity detected. Please try again.';
        this.isLoading = false;
        return;
      }

      // 4. Proceed with login
      await this.authService.loginWithEmail(this.email, this.password);
      this.toastr.success('Logged in successfully');
    } catch (error: any) {
      this.errorMessage = error.message;
      this.toastr.error(error.message);
    } finally {
      this.isLoading = false;
    }
  }

  async onForgotPassword(): Promise<void> {
    if (!this.email) {
      this.errorMessage = 'Please enter your email address in the Email field above.';
      this.toastr.warning('Please enter your email first.');
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.forgotPasswordSent = false;

    try {
      await this.authService.sendPasswordReset(this.email);
      this.forgotPasswordSent = true;
      this.toastr.success('Password reset email sent! Please check your inbox.');
    } catch (error: any) {
      this.errorMessage = error.message;
      this.toastr.error(error.message);
    } finally {
      this.isLoading = false;
    }
  }
}
