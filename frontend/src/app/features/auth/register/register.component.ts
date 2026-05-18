import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ReCaptchaV3Service } from 'ng-recaptcha';
import { AuthService } from '../../../core/services/auth.service';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="min-h-[80vh] flex items-center justify-center p-4">
      <div class="glass-card rounded-2xl p-8 w-full max-w-md">

        <h1 class="text-3xl font-bold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Create Account</h1>
        <p class="text-gray-400 text-center mb-8 text-sm">Join SubTrackr today.</p>

        <div *ngIf="errorMessage" class="bg-red-900/30 border border-red-500 text-red-400 rounded-lg p-3 mb-4 text-sm">
          {{ errorMessage }}
        </div>

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

        <div class="flex items-center gap-3 mb-6">
          <div class="flex-1 h-px bg-gray-800"></div>
          <span class="text-gray-600 text-sm">or</span>
          <div class="flex-1 h-px bg-gray-800"></div>
        </div>

        <div class="mb-4">
          <label class="text-gray-400 text-sm mb-1 block">Name</label>
          <input
            [(ngModel)]="name"
            type="text"
            placeholder="John Doe"
            class="w-full bg-[#0F0F0F] border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-primary transition">
        </div>

        <div class="mb-4">
          <label class="text-gray-400 text-sm mb-1 block">Email</label>
          <input
            [(ngModel)]="email"
            type="email"
            placeholder="you@example.com"
            class="w-full bg-[#0F0F0F] border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-primary transition">
        </div>

        <div class="mb-6">
          <label class="text-gray-400 text-sm mb-1 block">Password</label>
          <input
            [(ngModel)]="password"
            type="password"
            placeholder="••••••••"
            class="w-full bg-[#0F0F0F] border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-primary transition">
        </div>

        <button
          (click)="onEmailSignup()"
          [disabled]="isLoading"
          class="w-full bg-primary hover:bg-opacity-90 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50">
          <span *ngIf="!isLoading">Sign Up</span>
          <span *ngIf="isLoading">Verifying...</span>
        </button>

        <p class="text-gray-600 text-xs text-center mt-4">
          Protected by reCAPTCHA.
        </p>

        <p class="text-gray-500 text-sm text-center mt-4">
          Already have an account?
          <a routerLink="/login" class="text-accent hover:underline">Login</a>
        </p>
      </div>
    </div>
  `
})
export class RegisterComponent {
  name = '';
  email = '';
  password = '';
  isLoading = false;
  errorMessage = '';

  constructor(
    private recaptchaV3Service: ReCaptchaV3Service,
    private authService: AuthService,
    private http: HttpClient,
    private toastr: ToastrService
  ) {}

  async onGoogleLogin(): Promise<void> {
    this.isLoading = true;
    try {
      await this.authService.loginWithGoogle();
      this.toastr.success('Account created successfully');
    } catch (error: any) {
      this.errorMessage = error.message;
      this.toastr.error(error.message);
    } finally {
      this.isLoading = false;
    }
  }

  async onEmailSignup(): Promise<void> {
    if (!this.name || !this.email || !this.password) {
      this.errorMessage = 'Please fill all fields';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      const token = await this.recaptchaV3Service.execute('signup').toPromise();
      const captchaResult: any = await this.http.post('http://127.0.0.1:5000/api/auth/verify-captcha', { token }).toPromise();

      if (captchaResult.score < 0.5) {
        this.errorMessage = 'Bot activity detected. Please try again.';
        this.isLoading = false;
        return;
      }

      await this.authService.signupWithEmail(this.email, this.password, this.name);
      this.toastr.success('Verification email sent!');
    } catch (error: any) {
      this.errorMessage = error.message;
      this.toastr.error(error.message);
    } finally {
      this.isLoading = false;
    }
  }
}
