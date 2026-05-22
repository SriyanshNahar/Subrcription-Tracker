import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ReCaptchaV3Service } from 'ng-recaptcha';
import { AuthService } from '../../../core/services/auth.service';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { SeoService } from '../../../core/services/seo.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="min-h-[85vh] flex items-center justify-center p-4 relative overflow-hidden bg-background">
      <!-- Shifting Decorative Ambient Glow Orbs -->
      <div class="absolute -top-40 -right-40 w-[600px] h-[600px] bg-accent/10 rounded-full blur-3xl pointer-events-none animate-pulse duration-[8000ms]"></div>
      <div class="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl pointer-events-none animate-pulse duration-[10000ms]"></div>

      <!-- Sci-Fi Grid Background -->
      <div class="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none opacity-60"></div>

      <div class="max-w-6xl w-full grid lg:grid-cols-2 gap-12 items-center relative z-10 py-8">
        
        <!-- Left Side: Signup Form -->
        <div class="flex justify-center lg:justify-end">
          <div class="glass-card rounded-3xl p-8 md:p-10 w-full max-w-md border border-white/10 shadow-2xl relative overflow-hidden transition-all duration-300">
            <!-- Glass Overlay Card Inner Glow -->
            <div class="absolute -top-10 -left-10 w-32 h-32 bg-accent/20 rounded-full blur-2xl pointer-events-none"></div>

            <!-- Logo & Greeting -->
            <div class="text-center mb-8">
              <h1 class="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-accent via-primary to-accent tracking-tight">Get Started</h1>
              <p class="text-gray-400 text-sm mt-2 font-medium">Join SubTrackr today & stay optimized.</p>
            </div>

            <!-- Alerts -->
            <div *ngIf="errorMessage" class="bg-red-950/20 border border-red-500/30 text-red-400 rounded-xl p-3 mb-6 text-sm">
              {{ errorMessage }}
            </div>

            <!-- Email Verification Spam Folder Disclaimer Alert -->
            <div *ngIf="verificationSent" class="bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs rounded-2xl p-4.5 mb-6 flex flex-col gap-2 shadow-lg backdrop-blur-md">
              <div class="flex items-center gap-2 text-amber-400 font-bold">
                <span>✉️</span>
                <span>Check your inbox & spam folder!</span>
              </div>
              <p class="leading-relaxed text-gray-300">
                We have sent an email verification link to <strong class="text-white">{{ email }}</strong>. 
                <span class="font-extrabold text-amber-400">Important:</span> If you do not see it in your Inbox, please check your Gmail/Email <strong class="text-white">Spam or Junk folder</strong> and mark it as "Not Spam".
              </p>
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

            <!-- Name Input -->
            <div class="mb-4">
              <label class="text-gray-400 text-xs font-semibold mb-1.5 block uppercase tracking-wider">Full Name</label>
              <div class="relative">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">👤</span>
                <input
                  [(ngModel)]="name"
                  type="text"
                  placeholder="John Doe"
                  class="w-full bg-[#080810]/80 border border-white/10 hover:border-white/20 focus:border-primary rounded-xl pl-11 pr-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-300">
              </div>
            </div>

            <!-- Email Input -->
            <div class="mb-4">
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
              <label class="text-gray-400 text-xs font-semibold mb-1.5 block uppercase tracking-wider">Password</label>
              <div class="relative">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">🔑</span>
                <input
                  [(ngModel)]="password"
                  type="password"
                  placeholder="••••••••"
                  class="w-full bg-[#080810]/80 border border-white/10 hover:border-white/20 focus:border-primary rounded-xl pl-11 pr-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-300">
              </div>
            </div>

            <!-- Signup Button -->
            <button
              (click)="onEmailSignup()"
              [disabled]="isLoading"
              class="w-full bg-primary hover:bg-opacity-90 text-white font-bold py-4 rounded-xl transition-all duration-300 transform hover:-translate-y-0.5 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:transform-none">
              <span *ngIf="!isLoading">Create Account</span>
              <span *ngIf="isLoading" class="flex items-center justify-center gap-2">
                <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                Creating...
              </span>
            </button>

            <!-- reCAPTCHA Notice -->
            <p class="text-gray-600 text-[10px] text-center mt-6 leading-relaxed">
              Protected by reCAPTCHA.<br>
              <a href="https://policies.google.com/privacy" class="hover:text-gray-400 underline">Privacy Policy</a> &
              <a href="https://policies.google.com/terms" class="hover:text-gray-400 underline">Terms of Service</a>
            </p>

            <!-- Login Link -->
            <p class="text-gray-400 text-sm text-center mt-6">
              Already have an account?
              <a routerLink="/login" class="text-accent hover:text-white hover:underline font-bold ml-1 transition">Login</a>
            </p>
          </div>
        </div>

        <!-- Right Side: Beautiful Graveyard / Saving Showcase Mockup -->
        <div class="hidden lg:flex flex-col justify-center space-y-8 pl-8">
          <div class="space-y-4">
            <span class="px-3 py-1 text-xs font-semibold rounded-full bg-primary/10 border border-primary/20 text-primary uppercase tracking-wider">Graveyard Feature Spotlight</span>
            <h2 class="text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Bury Unused Subscriptions<br>
              <span class="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">In the SubTrackr Graveyard</span>
            </h2>
            <p class="text-gray-400 text-lg leading-relaxed max-w-md font-medium">
              Easily catalog canceled subscriptions inside the SubTrackr Graveyard to visualize your reclaimed yearly waste and celebrate savings.
            </p>
          </div>

          <!-- Simulated Graveyard Card Widget -->
          <div class="glass-card rounded-3xl p-6 border border-white/10 relative overflow-hidden max-w-lg shadow-2xl">
            <!-- Simulated Active Spending Bar -->
            <div class="space-y-4">
              <div class="flex items-center justify-between text-xs font-semibold text-gray-400 uppercase tracking-widest">
                <span>🪦 Canceled Subscriptions</span>
                <span class="text-primary font-bold">Total Reclaimed</span>
              </div>
              <div class="flex items-end gap-3 justify-between">
                <div>
                  <span class="text-3xl font-extrabold text-white">₹14,200</span>
                  <span class="text-gray-500 text-xs font-medium ml-1">/ year saved</span>
                </div>
                <span class="text-xs px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">Active Shield</span>
              </div>

              <!-- Miniature Graveyard Card Items List -->
              <div class="space-y-3 pt-2">
                <div class="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-dashed border-white/10 opacity-75 relative overflow-hidden group hover:opacity-100 transition-opacity duration-300">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-gray-500 font-bold text-xs grayscale">N</div>
                    <div>
                      <h4 class="text-gray-300 text-xs font-semibold line-through">Netflix Premium</h4>
                      <p class="text-red-500/80 text-[10px] font-semibold flex items-center gap-1">
                        <span>🪦 Buried</span>
                        <span>•</span>
                        <span>Saved ₹7,800/yr</span>
                      </p>
                    </div>
                  </div>
                  <span class="text-gray-500 text-xs font-bold line-through">₹650/mo</span>
                </div>

                <div class="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-dashed border-white/10 opacity-75 relative overflow-hidden group hover:opacity-100 transition-opacity duration-300">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-gray-500 font-bold text-xs grayscale">YT</div>
                    <div>
                      <h4 class="text-gray-300 text-xs font-semibold line-through">YouTube Premium</h4>
                      <p class="text-red-500/80 text-[10px] font-semibold flex items-center gap-1">
                        <span>🪦 Buried</span>
                        <span>•</span>
                        <span>Saved ₹2,260/yr</span>
                      </p>
                    </div>
                  </div>
                  <span class="text-gray-500 text-xs font-bold line-through">₹189/mo</span>
                </div>

                <div class="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-dashed border-white/10 opacity-75 relative overflow-hidden group hover:opacity-100 transition-opacity duration-300">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-gray-500 font-bold text-xs grayscale">C1</div>
                    <div>
                      <h4 class="text-gray-300 text-xs font-semibold line-through">Canva Pro</h4>
                      <p class="text-red-500/80 text-[10px] font-semibold flex items-center gap-1">
                        <span>🪦 Buried</span>
                        <span>•</span>
                        <span>Saved ₹4,140/yr</span>
                      </p>
                    </div>
                  </div>
                  <span class="text-gray-500 text-xs font-bold line-through">₹345/mo</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  `
})
export class RegisterComponent implements OnInit {
  name = '';
  email = '';
  password = '';
  isLoading = false;
  errorMessage = '';
  verificationSent = false;

  constructor(
    private recaptchaV3Service: ReCaptchaV3Service,
    private authService: AuthService,
    private http: HttpClient,
    private toastr: ToastrService,
    private seo: SeoService
  ) {}

  ngOnInit() {
    this.seo.generateTags({
      title: 'Create Free Account',
      description: 'Join SubTrackr today. Reclaim control of your digital subscriptions, get push alerts for upcoming renewals, and prevent hidden price hikes.'
    });
  }

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
    this.verificationSent = false;

    try {
      const token = await this.recaptchaV3Service.execute('signup').toPromise();
      const captchaResult: any = await this.http.post(`${environment.apiUrl}/api/auth/verify-captcha`, { token }).toPromise();

      if (captchaResult.score < 0.5) {
        this.errorMessage = 'Bot activity detected. Please try again.';
        this.isLoading = false;
        return;
      }

      await this.authService.signupWithEmail(this.email, this.password, this.name);
      this.toastr.success('Verification email sent!');
      this.verificationSent = true;
    } catch (error: any) {
      this.errorMessage = error.message;
      this.toastr.error(error.message);
    } finally {
      this.isLoading = false;
    }
  }
}
