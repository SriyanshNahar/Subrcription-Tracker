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
    <div class="min-h-[85vh] flex items-center justify-center p-4 relative overflow-hidden bg-background">
      <!-- Shifting Decorative Ambient Glow Orbs -->
      <div class="absolute -top-40 -left-40 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl pointer-events-none animate-pulse duration-[8000ms]"></div>
      <div class="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-accent/10 rounded-full blur-3xl pointer-events-none animate-pulse duration-[10000ms]"></div>

      <!-- Sci-Fi Grid Background -->
      <div class="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none opacity-60"></div>

      <div class="max-w-6xl w-full grid lg:grid-cols-2 gap-12 items-center relative z-10 py-8">
        
        <!-- Left Side: Login Form -->
        <div class="flex justify-center lg:justify-end">
          <div class="glass-card rounded-3xl p-8 md:p-10 w-full max-w-md border border-white/10 shadow-2xl relative overflow-hidden transition-all duration-300">
            <!-- Glass Overlay Card Inner Glow -->
            <div class="absolute -top-10 -right-10 w-32 h-32 bg-primary/20 rounded-full blur-2xl pointer-events-none"></div>

            <!-- Logo & Greeting -->
            <div class="text-center mb-8">
              <h1 class="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-primary tracking-tight">SubTrackr</h1>
              <p class="text-gray-400 text-sm mt-2 font-medium">Track every subscription. Save every rupee.</p>
            </div>

            <!-- Alerts -->
            <div *ngIf="errorMessage" class="bg-red-950/20 border border-red-500/30 text-red-400 rounded-xl p-3 mb-6 text-sm">
              {{ errorMessage }}
            </div>

            <!-- Success/Info Alert for Forgot Password -->
            <div *ngIf="forgotPasswordSent" class="bg-amber-950/20 border border-amber-500/30 text-amber-300/80 rounded-xl p-3 mb-6 text-xs flex gap-2 items-start text-left">
              <span>⚠️</span>
              <p><strong>Password reset email sent!</strong> If you do not see it in a few minutes, please check your <strong>Spam</strong> or <strong>Junk</strong> folder in the Gmail app.</p>
            </div>

            <!-- GOOGLE LOGIN BUTTON -->
            <button
              (click)="onGoogleLogin()"
              [disabled]="isLoading"
              class="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-900 font-semibold py-3.5 rounded-xl transition duration-300 transform hover:-translate-y-0.5 shadow-lg disabled:opacity-50 disabled:transform-none">
              <svg class="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            <!-- Divider -->
            <div class="flex items-center gap-3 my-6">
              <div class="flex-1 h-px bg-white/5"></div>
              <span class="text-gray-600 text-xs font-semibold uppercase tracking-wider">or</span>
              <div class="flex-1 h-px bg-white/5"></div>
            </div>

            <!-- Email Input -->
            <div class="mb-5">
              <label class="text-gray-400 text-xs font-semibold mb-1.5 block uppercase tracking-wider">Email Address</label>
              <div class="relative">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">📧</span>
                <input
                  [(ngModel)]="email"
                  type="email"
                  placeholder="you@example.com"
                  class="w-full bg-[#080810]/80 border border-white/10 hover:border-white/20 focus:border-primary rounded-xl pl-11 pr-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-300">
              </div>
            </div>

            <!-- Password Input -->
            <div class="mb-6">
              <div class="flex justify-between items-center mb-1.5">
                <label class="text-gray-400 text-xs font-semibold block uppercase tracking-wider">Password</label>
                <button
                  (click)="onForgotPassword()"
                  type="button"
                  class="text-xs text-accent hover:text-white hover:underline focus:outline-none bg-transparent border-0 p-0 cursor-pointer transition">
                  Forgot password?
                </button>
              </div>
              <div class="relative">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">🔑</span>
                <input
                  [(ngModel)]="password"
                  type="password"
                  placeholder="••••••••"
                  class="w-full bg-[#080810]/80 border border-white/10 hover:border-white/20 focus:border-primary rounded-xl pl-11 pr-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-300">
              </div>
            </div>

            <!-- Login Button -->
            <button
              (click)="onEmailLogin()"
              [disabled]="isLoading"
              class="w-full bg-primary hover:bg-opacity-90 text-white font-bold py-4 rounded-xl transition-all duration-300 transform hover:-translate-y-0.5 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:transform-none">
              <span *ngIf="!isLoading">Sign In</span>
              <span *ngIf="isLoading" class="flex items-center justify-center gap-2">
                <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                Verifying...
              </span>
            </button>

            <!-- reCAPTCHA Notice -->
            <p class="text-gray-600 text-[10px] text-center mt-6 leading-relaxed">
              Protected by reCAPTCHA.<br>
              <a href="https://policies.google.com/privacy" class="hover:text-gray-400 underline">Privacy Policy</a> &
              <a href="https://policies.google.com/terms" class="hover:text-gray-400 underline">Terms of Service</a>
            </p>

            <!-- Signup Link -->
            <p class="text-gray-400 text-sm text-center mt-6">
              New to SubTrackr?
              <a routerLink="/register" class="text-accent hover:text-white hover:underline font-bold ml-1 transition">Sign up free</a>
            </p>
          </div>
        </div>

        <!-- Right Side: Beautiful Trendy Tech Interactive Mockup Showcase -->
        <div class="hidden lg:flex flex-col justify-center space-y-8 pl-8">
          <div class="space-y-4">
            <span class="px-3 py-1 text-xs font-semibold rounded-full bg-accent/10 border border-accent/20 text-accent uppercase tracking-wider">Premium Feature Portal</span>
            <h2 class="text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Control Your Subscriptions<br>
              <span class="text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary">Save Money Smarter</span>
            </h2>
            <p class="text-gray-400 text-lg leading-relaxed max-w-md font-medium">
              Join thousands of users tracking software, stream channels, and recurring renewals in one ultra-clean hub.
            </p>
          </div>

          <!-- Simulated Dashboard Interactive Widget -->
          <div class="glass-card rounded-3xl p-6 border border-white/10 relative overflow-hidden max-w-lg shadow-2xl">
            <!-- Simulated Active Spending Bar -->
            <div class="space-y-4">
              <div class="flex items-center justify-between text-xs font-semibold text-gray-400 uppercase tracking-widest">
                <span>Active Spending Insights</span>
                <span class="text-accent">Optimized</span>
              </div>
              <div class="flex items-end gap-3 justify-between">
                <div>
                  <span class="text-3xl font-extrabold text-white">₹3,450</span>
                  <span class="text-gray-500 text-xs font-medium ml-1">/ month</span>
                </div>
                <span class="text-xs px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">-24% Saved</span>
              </div>

              <!-- Animated Chart Bars -->
              <div class="grid grid-cols-6 gap-2 pt-4 items-end h-24">
                <div class="bg-white/5 rounded-t-lg h-12 w-full transition-all duration-500 hover:bg-primary/50 relative group">
                  <span class="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-900 text-[10px] text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition duration-200">Netflix</span>
                </div>
                <div class="bg-white/5 rounded-t-lg h-16 w-full transition-all duration-500 hover:bg-primary/50 relative group">
                  <span class="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-900 text-[10px] text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition duration-200">Spotify</span>
                </div>
                <div class="bg-primary rounded-t-lg h-20 w-full transition-all duration-500 hover:bg-opacity-80 relative group">
                  <span class="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-900 text-[10px] text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition duration-200">Github</span>
                </div>
                <div class="bg-white/5 rounded-t-lg h-8 w-full transition-all duration-500 hover:bg-accent/50 relative group">
                  <span class="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-900 text-[10px] text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition duration-200">Notion</span>
                </div>
                <div class="bg-accent rounded-t-lg h-14 w-full transition-all duration-500 hover:bg-opacity-80 relative group">
                  <span class="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-900 text-[10px] text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition duration-200">Figma</span>
                </div>
                <div class="bg-white/5 rounded-t-lg h-10 w-full transition-all duration-500 hover:bg-primary/50 relative group">
                  <span class="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-900 text-[10px] text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition duration-200">ChatGPT</span>
                </div>
              </div>

              <!-- Miniature Subscription Cards List -->
              <div class="space-y-2 pt-2">
                <div class="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5 duration-300">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">GH</div>
                    <div>
                      <h4 class="text-white text-xs font-semibold">GitHub Copilot</h4>
                      <p class="text-gray-500 text-[10px]">Renews in 3 days</p>
                    </div>
                  </div>
                  <span class="text-white text-xs font-bold">₹820/mo</span>
                </div>

                <div class="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5 duration-300">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center text-accent font-bold text-xs">FG</div>
                    <div>
                      <h4 class="text-white text-xs font-semibold">Figma Pro</h4>
                      <p class="text-gray-500 text-[10px]">Renews in 9 days</p>
                    </div>
                  </div>
                  <span class="text-white text-xs font-bold">₹1,250/mo</span>
                </div>
              </div>
            </div>
          </div>
        </div>

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
