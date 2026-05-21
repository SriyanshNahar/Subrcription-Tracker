import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="fixed top-0 w-full z-50 bg-card bg-opacity-95 backdrop-blur-md border-b border-white/5 transition-all duration-300">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <!-- Brand Logo -->
          <div class="flex items-center">
            <a routerLink="/" (click)="isMobileMenuOpen = false" class="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity">SubTrackr</a>
          </div>

          <!-- Desktop Navigation Options (Visible on large screens) -->
          <div class="hidden lg:flex items-center space-x-6">
            <!-- Theme Dropdown Switcher -->
            <div class="relative inline-block text-left">
              <select [value]="activeTheme" (change)="onThemeChange($event)" class="bg-black/35 border border-white/10 rounded-xl px-2.5 py-1 text-xs text-gray-300 focus:outline-none focus:border-primary cursor-pointer hover:border-white/20 transition-all font-semibold">
                <option value="theme-midnight">🌌 Midnight Cyberpunk</option>
                <option value="theme-volcanic">🌋 Volcanic Amber</option>
                <option value="theme-forest">🌲 Forest Emerald</option>
              </select>
            </div>

            <!-- Logged-in User Links -->
            <ng-container *ngIf="auth.currentUser$ | async as user; else guest">
              <a routerLink="/" routerLinkActive="text-primary" [routerLinkActiveOptions]="{exact: true}" class="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">Dashboard</a>
              <a routerLink="/pricing" routerLinkActive="text-primary" class="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">Pricing</a>
              
              <!-- Graveyard Link & Plan Badge -->
              <div class="flex items-center space-x-2">
                <a routerLink="/graveyard" routerLinkActive="text-accent" class="text-gray-300 hover:text-accent px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center">
                  <span>Graveyard</span>
                </a>
                
                <!-- Dynamic Plan Badge Button (Triggers details modal) -->
                <ng-container *ngIf="auth.userProfile$ | async as profile">
                  <button 
                    (click)="openPlanDetails($event)" 
                    [ngClass]="{
                      'bg-slate-500/10 text-slate-400 border border-slate-500/30 hover:bg-slate-500/20': profile.plan === 'free' || !profile.plan,
                      'bg-gradient-to-r from-primary to-accent text-white shadow shadow-primary/20 hover:opacity-90': profile.plan === 'pro',
                      'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20': profile.plan === 'family'
                    }"
                    class="text-[10px] font-black px-2.5 py-0.5 rounded-md tracking-wider transition-all duration-300 transform active:scale-95 cursor-pointer">
                    {{ profile.plan === 'pro' ? 'PRO' : (profile.plan === 'family' ? 'FAMILY' : 'FREE') }}
                  </button>
                </ng-container>
              </div>

              <!-- User Profile Widget (matches image layout) -->
              <ng-container *ngIf="auth.userProfile$ | async as profile">
                <div class="flex items-center space-x-3 pl-4 border-l border-white/10">
                  <!-- Avatar circle -->
                  <div class="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center text-white font-black text-sm shadow-md border border-white/10">
                    {{ getInitials(profile.name) }}
                  </div>
                  
                  <!-- Two-line info block -->
                  <div class="flex flex-col text-left">
                    <span class="text-white font-bold text-sm leading-tight">{{ profile.name }}</span>
                    <span class="text-gray-400 text-xs font-semibold capitalize">{{ profile.plan === 'pro' ? 'Pro' : (profile.plan === 'family' ? 'Family' : 'Free') }}</span>
                  </div>
                  
                  <!-- Shop/Store front Icon (routes to pricing with transition) -->
                  <a routerLink="/pricing" class="text-gray-400 hover:text-white transition-colors p-1.5 ml-2 hover:bg-white/5 rounded-lg flex items-center justify-center" title="Pricing & Plan Store">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5.5 w-5.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M3 3h18v2H3V3zm1 4v2c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V7H4zm1 6h14v7H5v-7zm4 3h2v4H9v-4z" />
                    </svg>
                  </a>

                  <!-- Logout Icon Button -->
                  <button (click)="logout()" class="text-gray-400 hover:text-red-400 transition-colors p-1.5 hover:bg-white/5 rounded-lg flex items-center justify-center" title="Logout">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </div>
              </ng-container>
            </ng-container>

            <!-- Guest User Links -->
            <ng-template #guest>
              <a routerLink="/pricing" routerLinkActive="text-primary" class="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">Pricing</a>
              <a routerLink="/login" routerLinkActive="text-primary" class="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">Login</a>
              <a routerLink="/register" class="bg-primary hover:bg-opacity-90 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors shadow shadow-primary/20">Sign Up</a>
            </ng-template>
          </div>

          <!-- Mobile Right Section: Theme Selector + Hamburger Toggle (Visible on smaller screens) -->
          <div class="flex items-center space-x-3 lg:hidden">
            <!-- Theme Dropdown Switcher (Visible on mobile/tablet directly for accessibility) -->
            <div class="relative inline-block text-left mr-1">
              <select [value]="activeTheme" (change)="onThemeChange($event)" class="bg-black/35 border border-white/10 rounded-xl px-2 py-0.5 text-[11px] text-gray-300 focus:outline-none focus:border-primary cursor-pointer font-semibold">
                <option value="theme-midnight">🌌 Midnight</option>
                <option value="theme-volcanic">🌋 Volcanic</option>
                <option value="theme-forest">🌲 Forest</option>
              </select>
            </div>

            <!-- Hamburger Button -->
            <button 
              (click)="toggleMobileMenu()" 
              class="text-gray-300 hover:text-white p-2 rounded-xl bg-white/5 border border-white/5 focus:outline-none transition-all active:scale-95">
              <svg *ngIf="!isMobileMenuOpen" class="w-5.5 h-5.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <svg *ngIf="isMobileMenuOpen" class="w-5.5 h-5.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Mobile Dropdown Menu Drawer (Visible when isMobileMenuOpen is true) -->
      <div 
        *ngIf="isMobileMenuOpen" 
        class="lg:hidden absolute top-16 left-0 w-full z-40 bg-card/95 backdrop-blur-xl border-b border-white/5 p-5 flex flex-col space-y-3.5 animate-slide-down">
        
        <ng-container *ngIf="auth.currentUser$ | async as user; else guestMobile">
          <!-- Mobile Profile Widget -->
          <ng-container *ngIf="auth.userProfile$ | async as profile">
            <div class="flex items-center space-x-3 p-3 bg-white/5 rounded-2xl border border-white/5 mb-2">
              <!-- Avatar circle -->
              <div class="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center text-white font-black text-sm shadow-md border border-white/10">
                {{ getInitials(profile.name) }}
              </div>
              
              <!-- Two-line info block -->
              <div class="flex flex-col text-left flex-grow">
                <span class="text-white font-bold text-sm leading-tight">{{ profile.name }}</span>
                <span class="text-gray-400 text-xs font-semibold capitalize">{{ profile.plan === 'pro' ? 'Pro' : (profile.plan === 'family' ? 'Family' : 'Free') }}</span>
              </div>
              
              <!-- Store icon on mobile -->
              <a routerLink="/pricing" (click)="isMobileMenuOpen = false" class="text-gray-400 hover:text-white transition-colors p-1.5 hover:bg-white/5 rounded-lg flex items-center justify-center" title="Pricing Store">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </a>
            </div>
          </ng-container>

          <a routerLink="/" (click)="isMobileMenuOpen = false" routerLinkActive="text-primary font-bold" [routerLinkActiveOptions]="{exact: true}" class="text-gray-300 hover:text-white text-sm py-2 px-3 hover:bg-white/5 rounded-xl transition-all">Dashboard</a>
          <a routerLink="/pricing" (click)="isMobileMenuOpen = false" routerLinkActive="text-primary font-bold" class="text-gray-300 hover:text-white text-sm py-2 px-3 hover:bg-white/5 rounded-xl transition-all">Pricing</a>
          
          <!-- Graveyard & Plan Badge side-by-side in Mobile -->
          <div class="flex items-center justify-between py-1 px-3 hover:bg-white/5 rounded-xl transition-all">
            <a routerLink="/graveyard" (click)="isMobileMenuOpen = false" routerLinkActive="text-accent font-bold" class="text-gray-300 hover:text-accent text-sm flex-grow">
              <span>🪦 Expense Graveyard</span>
            </a>
            <!-- Mobile Badge Button -->
            <ng-container *ngIf="auth.userProfile$ | async as profile">
              <button 
                (click)="openPlanDetails($event)" 
                [ngClass]="{
                  'bg-slate-500/10 text-slate-400 border border-slate-500/30': profile.plan === 'free' || !profile.plan,
                  'bg-gradient-to-r from-primary to-accent text-white shadow shadow-primary/20': profile.plan === 'pro',
                  'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30': profile.plan === 'family'
                }"
                class="text-[9px] font-black px-2 py-0.5 rounded-md tracking-wider cursor-pointer">
                {{ profile.plan === 'pro' ? 'PRO' : (profile.plan === 'family' ? 'FAMILY' : 'FREE') }}
              </button>
            </ng-container>
          </div>
          
          <div class="h-px bg-white/5 my-2"></div>
          
          <button 
            (click)="logout(); isMobileMenuOpen = false" 
            class="text-left text-gray-400 hover:text-white text-sm py-2 px-3 hover:bg-red-500/10 rounded-xl transition-all flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Logout</span>
          </button>
        </ng-container>

        <ng-template #guestMobile>
          <a routerLink="/pricing" (click)="isMobileMenuOpen = false" routerLinkActive="text-primary font-bold" class="text-gray-300 hover:text-white text-sm py-2 px-3 hover:bg-white/5 rounded-xl transition-all">Pricing</a>
          <a routerLink="/login" (click)="isMobileMenuOpen = false" routerLinkActive="text-primary font-bold" class="text-gray-300 hover:text-white text-sm py-2 px-3 hover:bg-white/5 rounded-xl transition-all">Login</a>
          <a routerLink="/register" (click)="isMobileMenuOpen = false" class="bg-primary hover:bg-opacity-90 text-white text-center text-sm py-2.5 px-4 rounded-xl transition-colors font-medium shadow shadow-primary/20">Sign Up</a>
        </ng-template>
      </div>
    </nav>

    <!-- Stunning Premium Plan Details Modal (Universal overlay) -->
    <div 
      *ngIf="showPlanModal" 
      class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      (click)="showPlanModal = false">
      
      <div 
        class="glass-card max-w-md w-full border border-white/10 p-6 shadow-2xl relative overflow-hidden text-white"
        (click)="$event.stopPropagation()">
        
        <!-- Top Glow Gradient decoration -->
        <div class="absolute -top-24 -left-24 w-48 h-48 bg-primary/20 rounded-full blur-[80px] pointer-events-none"></div>
        <div class="absolute -bottom-24 -right-24 w-48 h-48 bg-accent/20 rounded-full blur-[80px] pointer-events-none"></div>

        <!-- Header -->
        <div class="flex items-center justify-between mb-5 pb-3.5 border-b border-white/5">
          <div class="flex items-center space-x-2">
            <span class="text-xl">🛡️</span>
            <h3 class="text-xl font-bold tracking-tight text-white">Your Account Plan</h3>
          </div>
          <button (click)="showPlanModal = false" class="text-gray-400 hover:text-white transition-colors cursor-pointer p-1 rounded-lg hover:bg-white/5">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Content details based on active user plan -->
        <div *ngIf="auth.userProfile$ | async as profile; else loadingProfile">
          
          <!-- Plan capsule banner -->
          <div class="mb-6 bg-[#000000]/40 rounded-2xl p-5 border border-white/5 text-center relative overflow-hidden shadow-inner">
            <div 
              [ngClass]="{
                'from-primary to-accent': profile.plan === 'pro',
                'from-emerald-500 to-teal-500': profile.plan === 'family',
                'from-gray-500 to-slate-600': profile.plan === 'free' || !profile.plan
              }"
              class="absolute inset-0 bg-gradient-to-r opacity-15 blur-xl"></div>
              
            <span class="text-[10px] uppercase tracking-widest text-gray-400 font-extrabold block mb-1">CURRENT PLAN</span>
            <h4 
              [ngClass]="{
                'text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent': profile.plan === 'pro',
                'text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400': profile.plan === 'family',
                'text-gray-300': profile.plan === 'free' || !profile.plan
              }"
              class="text-3xl font-black">
              {{ profile.plan === 'pro' ? 'Premium Pro' : (profile.plan === 'family' ? 'Shared Family' : 'Starter Free') }}
            </h4>
            <div class="mt-2 text-sm text-gray-400 font-medium">
              {{ profile.plan === 'pro' ? '₹199 / month' : (profile.plan === 'family' ? '₹399 / month' : '₹0 / forever') }}
            </div>
          </div>

          <!-- Included Features Section -->
          <h5 class="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Included Benefits</h5>
          <ul class="space-y-3 mb-6 text-sm text-gray-300">
            <!-- Free Plan details -->
            <ng-container *ngIf="profile.plan === 'free' || !profile.plan">
              <li class="flex items-start space-x-2.5">
                <span class="text-primary font-bold text-base leading-none">✓</span>
                <span>Track up to <strong>3 subscriptions</strong></span>
              </li>
              <li class="flex items-start space-x-2.5">
                <span class="text-primary font-bold text-base leading-none">✓</span>
                <span>Basic dashboard analytics</span>
              </li>
              <li class="flex items-start space-x-2.5">
                <span class="text-primary font-bold text-base leading-none">✓</span>
                <span>Browser alerts (2 days prior)</span>
              </li>
              <li class="flex items-start space-x-2.5 text-gray-500/80 line-through">
                <span class="text-gray-600 font-bold text-base leading-none">✗</span>
                <span>Expense Graveyard Shareable Card</span>
              </li>
              <li class="flex items-start space-x-2.5 text-gray-500/80 line-through">
                <span class="text-gray-600 font-bold text-base leading-none">✗</span>
                <span>Multi-currency & PDF/CSV export</span>
              </li>
            </ng-container>

            <!-- Pro Plan details -->
            <ng-container *ngIf="profile.plan === 'pro'">
              <li class="flex items-start space-x-2.5">
                <span class="text-accent font-bold text-base leading-none">✓</span>
                <span>Track up to <strong>15 subscriptions</strong></span>
              </li>
              <li class="flex items-start space-x-2.5">
                <span class="text-accent font-bold text-base leading-none">✓</span>
                <span>Custom alerts (7d, 3d, 1d, and renew day)</span>
              </li>
              <li class="flex items-start space-x-2.5">
                <span class="text-accent font-bold text-base leading-none">✓</span>
                <span>Shareable Expense Graveyard card</span>
              </li>
              <li class="flex items-start space-x-2.5">
                <span class="text-accent font-bold text-base leading-none">✓</span>
                <span>Watermark-free PDF + CSV Export</span>
              </li>
              <li class="flex items-start space-x-2.5">
                <span class="text-accent font-bold text-base leading-none">✓</span>
                <span>Multi-currency support</span>
              </li>
            </ng-container>

            <!-- Family Plan details -->
            <ng-container *ngIf="profile.plan === 'family'">
              <li class="flex items-start space-x-2.5">
                <span class="text-emerald-400 font-bold text-base leading-none">✓</span>
                <span><strong>Unlimited</strong> subscriptions tracking</span>
              </li>
              <li class="flex items-start space-x-2.5">
                <span class="text-emerald-400 font-bold text-base leading-none">✓</span>
                <span>Up to <strong>5 family members</strong> accounts</span>
              </li>
              <li class="flex items-start space-x-2.5">
                <span class="text-emerald-400 font-bold text-base leading-none">✓</span>
                <span>Shared family dashboard metrics</span>
              </li>
              <li class="flex items-start space-x-2.5">
                <span class="text-emerald-400 font-bold text-base leading-none">✓</span>
                <span>Duplicate subscription auto-detector</span>
              </li>
              <li class="flex items-start space-x-2.5">
                <span class="text-emerald-400 font-bold text-base leading-none">✓</span>
                <span>Priority 24/7 dedicated support</span>
              </li>
            </ng-container>
          </ul>

          <!-- Upgrade button if free -->
          <div *ngIf="profile.plan === 'free' || !profile.plan" class="mt-4">
            <a 
              routerLink="/pricing" 
              (click)="showPlanModal = false" 
              class="w-full text-center block bg-gradient-to-r from-primary to-accent hover:opacity-95 text-white py-3 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all cursor-pointer transform active:scale-98">
              Upgrade to Premium
            </a>
          </div>

          <!-- Active premium info -->
          <div 
            *ngIf="profile.plan === 'pro' || profile.plan === 'family'" 
            class="mt-4 flex items-center justify-between text-xs text-gray-400 bg-white/5 border border-white/5 px-4 py-3 rounded-xl">
            <span class="flex items-center space-x-1"><span class="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span><span>Plan Status: <strong class="text-emerald-400">Active</strong></span></span>
            <span>Billing: <strong class="text-white">Auto-renew</strong></span>
          </div>

        </div>

        <ng-template #loadingProfile>
          <div class="py-12 flex flex-col items-center justify-center space-y-3">
            <svg class="animate-spin h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            <span class="text-sm text-gray-400">Fetching plan profile...</span>
          </div>
        </ng-template>

      </div>
    </div>
  `
})
export class NavbarComponent implements OnInit {
  activeTheme = 'theme-midnight';
  showPlanModal = false;
  isMobileMenuOpen = false;

  constructor(public auth: AuthService, private router: Router) {}

  ngOnInit() {
    this.activeTheme = localStorage.getItem('subtrackr_theme') || 'theme-midnight';
  }

  onThemeChange(event: any) {
    const theme = event.target.value;
    this.activeTheme = theme;
    localStorage.setItem('subtrackr_theme', theme);
    this.applyTheme(theme);
  }

  applyTheme(theme: string) {
    const body = document.body;
    body.classList.remove('theme-midnight', 'theme-volcanic', 'theme-forest');
    body.classList.add(theme);
  }

  openPlanDetails(event: Event) {
    event.stopPropagation();
    event.preventDefault();
    this.showPlanModal = true;
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  getInitials(name: string): string {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  }
}
