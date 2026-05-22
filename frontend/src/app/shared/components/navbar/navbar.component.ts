import { Component, OnInit, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="fixed top-0 w-full z-50 bg-card bg-opacity-95 backdrop-blur-md border-b border-white/5 transition-all duration-300">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <!-- Brand Logo & Diagnostic Badge -->
          <div class="flex items-center space-x-3">
            <a routerLink="/" (click)="isMobileMenuOpen = false; isProfileDropdownOpen = false" class="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity">SubTrackr</a>
            <span *ngIf="dbStatus && dbStatus.dbType === 'memory'" (click)="showFixModal = true" class="cursor-pointer bg-red-500/10 hover:bg-red-500/25 border border-red-500/30 text-red-400 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1.5 transition-all shadow-sm active:scale-95">
              <span class="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
              <span>Ephemeral Mode</span>
            </span>
            <span *ngIf="dbStatus && dbStatus.dbType === 'firestore'" class="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1.5 transition-all shadow-sm">
              <span class="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
              <span>Firestore Active</span>
            </span>
          </div>

          <!-- Desktop Navigation Options (Visible on large screens) -->
          <div class="hidden lg:flex items-center space-x-6">
            <!-- Theme Dropdown Switcher -->
            <div class="relative inline-block text-left">
              <select [value]="activeTheme" (change)="onThemeChange($event)" class="bg-black/35 border border-white/10 rounded-xl px-2.5 py-1 text-xs text-gray-300 focus:outline-none focus:border-primary cursor-pointer hover:border-white/20 transition-all font-semibold">
                <option value="theme-light">☀️ Light Oasis (White Theme) (Recommended)</option>
                <option value="theme-midnight">🌌 Midnight Cyberpunk</option>
                <option value="theme-volcanic">🌋 Volcanic Amber</option>
                <option value="theme-forest">🌲 Forest Emerald</option>
              </select>
            </div>

            <!-- Logged-in User Links -->
            <ng-container *ngIf="auth.userProfile$ | async as profile; else guest">
              <a routerLink="/" routerLinkActive="text-primary" [routerLinkActiveOptions]="{exact: true}" class="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">Dashboard</a>
              <a routerLink="/pricing" routerLinkActive="text-primary" class="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">Pricing</a>
              
              <!-- Graveyard Link -->
              <a routerLink="/graveyard" routerLinkActive="text-accent" class="text-gray-300 hover:text-accent px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center mr-2">
                <span>Graveyard</span>
              </a>

              <!-- User Profile Dropdown Button and Menu -->
              <div class="relative inline-block text-left pl-4 border-l border-white/10">
                <button 
                  (click)="toggleProfileDropdown($event)" 
                  class="flex items-center space-x-3 text-left focus:outline-none hover:bg-white/5 px-3 py-1.5 rounded-xl border border-transparent hover:border-white/5 transition-all duration-200 active:scale-[0.98]">
                  <!-- Avatar circle -->
                  <div class="w-9 h-9 rounded-full bg-slate-600 flex items-center justify-center text-white font-black text-sm shadow-md border border-white/10">
                    {{ getInitials(profile.name) }}
                  </div>
                  
                  <!-- Display Name & Chevron -->
                  <div class="flex flex-col text-left">
                    <span class="text-white font-bold text-sm leading-tight inline-block max-w-[120px] truncate">{{ profile.name }}</span>
                    <span class="text-gray-400 text-[10px] font-semibold uppercase tracking-wider capitalize">{{ profile.plan === 'pro' ? 'Pro' : (profile.plan === 'family' ? 'Family' : 'Free') }}</span>
                  </div>
                  
                  <!-- Chevron icon -->
                  <svg 
                    [ngClass]="{'rotate-180': isProfileDropdownOpen}"
                    class="w-4 h-4 text-gray-400 transition-transform duration-300" 
                    fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                <!-- Sleek Glassmorphic Dropdown Box -->
                <div 
                  *ngIf="isProfileDropdownOpen" 
                  class="absolute right-0 mt-3 w-64 rounded-2xl bg-card border border-white/10 shadow-2xl backdrop-blur-xl p-5 z-50 animate-slide-down text-white overflow-hidden">
                  <!-- Ambient Glow decoration inside dropdown -->
                  <div class="absolute -top-12 -left-12 w-24 h-24 bg-primary/10 rounded-full blur-2xl pointer-events-none"></div>
                  <div class="absolute -bottom-12 -right-12 w-24 h-24 bg-accent/10 rounded-full blur-2xl pointer-events-none"></div>

                  <!-- User Header -->
                  <div class="pb-3 border-b border-white/5 mb-3 relative z-10">
                    <p class="text-[9px] uppercase font-black text-gray-400 tracking-widest">Signed In As</p>
                    <h4 class="text-white font-black text-sm truncate mt-0.5" [title]="profile.name">{{ profile.name }}</h4>
                    <p class="text-gray-400 text-xs truncate font-medium" [title]="profile.email">{{ profile.email }}</p>
                  </div>

                  <!-- Active Plan Info widget with Badge Button -->
                  <div class="p-3 bg-white/5 border border-white/5 rounded-xl mb-3 flex items-center justify-between relative z-10">
                    <div class="flex flex-col text-left">
                      <span class="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Account Plan</span>
                      <span 
                        [ngClass]="{
                          'text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent font-black': profile.plan === 'pro',
                          'text-emerald-400 font-black': profile.plan === 'family',
                          'text-gray-300 font-bold': profile.plan === 'free' || !profile.plan
                        }"
                        class="text-xs capitalize">
                        {{ profile.plan === 'pro' ? 'Premium Pro' : (profile.plan === 'family' ? 'Shared Family' : 'Starter Free') }}
                      </span>
                    </div>
                    
                    <!-- Badge Clickable Button -->
                    <button 
                      (click)="isProfileDropdownOpen = false; openPlanDetails($event)"
                      [ngClass]="{
                        'bg-slate-500/10 text-slate-400 border border-slate-500/30 hover:bg-slate-500/20': profile.plan === 'free' || !profile.plan,
                        'bg-gradient-to-r from-primary to-accent text-white shadow shadow-primary/20 hover:opacity-90': profile.plan === 'pro',
                        'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20': profile.plan === 'family'
                      }"
                      class="text-[9px] font-black px-2 py-0.5 rounded-md tracking-wider transition-all duration-300 transform active:scale-95 cursor-pointer">
                      {{ profile.plan === 'pro' ? 'PRO' : (profile.plan === 'family' ? 'FAMILY' : 'FREE') }}
                    </button>
                  </div>

                  <!-- Quick Navigation Links inside Dropdown -->
                  <div class="space-y-1 relative z-10">
                    <!-- Trigger Plan Details Modal -->
                    <button 
                      (click)="isProfileDropdownOpen = false; openPlanDetails($event)" 
                      class="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-all text-xs font-semibold text-left">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <span>My Plan Benefits</span>
                    </button>

                    <!-- Upgrade Pricing Store -->
                    <a 
                      routerLink="/pricing" 
                      (click)="isProfileDropdownOpen = false" 
                      class="flex items-center space-x-2.5 px-3 py-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-all text-xs font-semibold">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                      <span>Upgrade Store</span>
                    </a>
                  </div>

                  <div class="h-px bg-white/5 my-2 relative z-10"></div>

                  <!-- Red Logout Button inside Dropdown -->
                  <button 
                    (click)="isProfileDropdownOpen = false; logout()" 
                    class="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all text-xs font-bold text-left relative z-10">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Logout Account</span>
                  </button>
                </div>
              </div>
            </ng-container>

            <!-- Guest User Links -->
            <ng-template #guest>
              <a routerLink="/pricing" routerLinkActive="text-primary" class="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">Pricing</a>
              <a routerLink="/login" routerLinkActive="text-primary" class="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">Login</a>
              <a routerLink="/register" class="bg-primary hover:bg-opacity-90 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors shadow shadow-primary/20">Sign Up</a>
            </ng-template>
          </div>

          <!-- Mobile Right Section: Theme Selector + Hamburger Toggle -->
          <div class="flex items-center space-x-3 lg:hidden">
            <!-- Theme Dropdown Switcher -->
            <div class="relative inline-block text-left mr-1 max-w-[105px] sm:max-w-none">
              <select [value]="activeTheme" (change)="onThemeChange($event)" class="w-full bg-black/35 border border-white/10 rounded-xl px-2 py-0.5 text-[11px] text-gray-300 focus:outline-none focus:border-primary cursor-pointer font-semibold">
                <option value="theme-light">☀️ Light</option>
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

      <!-- Mobile Dropdown Menu Drawer -->
      <div 
        *ngIf="isMobileMenuOpen" 
        class="lg:hidden absolute top-16 left-0 w-full z-40 bg-card/95 backdrop-blur-xl border-b border-white/5 p-5 flex flex-col space-y-3.5 animate-slide-down">
        
        <ng-container *ngIf="auth.userProfile$ | async as profile; else guestMobile">
          <!-- Mobile Profile Widget Card -->
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
            
            <!-- Mobile badge details button -->
            <button 
              (click)="isMobileMenuOpen = false; openPlanDetails($event)" 
              [ngClass]="{
                'bg-slate-500/10 text-slate-400 border border-slate-500/30': profile.plan === 'free' || !profile.plan,
                'bg-gradient-to-r from-primary to-accent text-white shadow shadow-primary/20': profile.plan === 'pro',
                'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30': profile.plan === 'family'
              }"
              class="text-[9px] font-black px-2 py-0.5 rounded-md tracking-wider cursor-pointer">
              {{ profile.plan === 'pro' ? 'PRO' : (profile.plan === 'family' ? 'FAMILY' : 'FREE') }}
            </button>
          </div>

          <a routerLink="/" (click)="isMobileMenuOpen = false" routerLinkActive="text-primary font-bold" [routerLinkActiveOptions]="{exact: true}" class="text-gray-300 hover:text-white text-sm py-2 px-3 hover:bg-white/5 rounded-xl transition-all">Dashboard</a>
          <a routerLink="/pricing" (click)="isMobileMenuOpen = false" routerLinkActive="text-primary font-bold" class="text-gray-300 hover:text-white text-sm py-2 px-3 hover:bg-white/5 rounded-xl transition-all">Pricing</a>
          
          <!-- Expense Graveyard Mobile link -->
          <a routerLink="/graveyard" (click)="isMobileMenuOpen = false" routerLinkActive="text-accent font-bold" class="text-gray-300 hover:text-accent text-sm py-2 px-3 hover:bg-white/5 rounded-xl transition-all flex items-center">
            <span>🪦 Expense Graveyard</span>
          </a>
          
          <div class="h-px bg-white/5 my-2"></div>
          
          <!-- Mobile Logout option -->
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

    <!-- Beautiful How to Fix Ephemeral Mode Modal -->
    <div 
      *ngIf="showFixModal" 
      class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      (click)="showFixModal = false">
      
      <div 
        class="glass-card max-w-lg w-full border border-white/10 p-6 shadow-2xl relative overflow-hidden text-white rounded-3xl bg-[#11111e]/95"
        (click)="$event.stopPropagation()">
        
        <!-- Top Glow Gradient decoration -->
        <div class="absolute -top-24 -left-24 w-48 h-48 bg-red-500/20 rounded-full blur-[80px] pointer-events-none"></div>
        <div class="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-[80px] pointer-events-none"></div>

        <!-- Header -->
        <div class="flex items-center justify-between mb-5 pb-3.5 border-b border-white/5">
          <div class="flex items-center space-x-2">
            <span class="text-xl">⚠️</span>
            <h3 class="text-xl font-bold tracking-tight text-white">Database Ephemeral Warning</h3>
          </div>
          <button (click)="showFixModal = false" class="text-gray-400 hover:text-white transition-colors cursor-pointer p-1 rounded-lg hover:bg-white/5 border-0 bg-transparent">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Body -->
        <div class="space-y-4">
          <div class="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-sm text-red-200 leading-relaxed">
            <p class="font-extrabold mb-1">Why is this warning showing?</p>
            <p class="text-xs text-gray-300">
              The application is currently running in <strong>temporary in-memory fallback mode</strong> because the Google Firestore cloud database credentials are not configured or failed to parse.
            </p>
            <p class="text-xs text-gray-300 mt-2 font-semibold text-amber-300">
              🚨 CRITICAL: Render deletes all local files (including 'database.json') every time the server restarts, redeploys, or goes to sleep. To keep your user accounts and data permanently, you must connect Firestore.
            </p>
          </div>

          <div *ngIf="dbStatus?.dbInitError" class="bg-black/40 border border-white/5 rounded-xl p-3 text-[11px] font-mono text-amber-300 max-h-24 overflow-y-auto">
            <p class="font-bold text-red-400 mb-1">Initialization Error Trace:</p>
            {{ dbStatus.dbInitError }}
          </div>

          <!-- Step by Step Setup Guide -->
          <h4 class="text-xs font-bold uppercase tracking-wider text-gray-400">1-Minute Permanent Fix Guide</h4>
          
          <div class="space-y-3 max-h-[220px] overflow-y-auto pr-1 text-xs text-gray-300 leading-relaxed font-medium font-sans">
            <div class="flex items-start gap-2.5">
              <span class="bg-primary/20 text-primary w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 font-sans">1</span>
              <div>
                <p class="text-white font-bold">Generate Firebase Key JSON</p>
                <p class="text-gray-400">Go to <strong>Firebase Console</strong> -> Project Settings -> Service Accounts -> Click <strong>Generate New Private Key</strong>. This downloads a JSON file.</p>
              </div>
            </div>

            <div class="flex items-start gap-2.5">
              <span class="bg-primary/20 text-primary w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 font-sans">2</span>
              <div>
                <p class="text-white font-bold">Encode Key as Base64 (Recommended)</p>
                <p class="text-gray-400">To avoid any quote/newline escaping issues on Render, base64 encode your JSON file content. You can run this command in terminal:</p>
                <code class="block bg-black/40 p-2 rounded border border-white/5 font-mono text-[9px] mt-1 select-all text-accent">powershell [Convert]::ToBase64String([IO.File]::ReadAllBytes('service-account.json'))</code>
              </div>
            </div>

            <div class="flex items-start gap-2.5">
              <span class="bg-primary/20 text-primary w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 font-sans">3</span>
              <div>
                <p class="text-white font-bold">Add Environment Variable on Render</p>
                <p class="text-gray-400">Go to your **Render Dashboard**, find your Web Service, go to **Environment** tab, click **Add Environment Variable**:</p>
                <div class="grid grid-cols-3 gap-2 mt-1.5 font-sans">
                  <div class="bg-white/5 p-1.5 rounded text-[10px] font-mono text-center font-bold border border-white/5">Key</div>
                  <div class="bg-white/5 p-1.5 rounded text-[10px] font-mono text-center font-bold border border-white/5 col-span-2">Value</div>
                  <div class="bg-white/5 p-1.5 rounded text-[10px] font-mono text-center select-all border border-white/5 font-black text-accent shrink-0">FIREBASE_SERVICE_ACCOUNT_KEY</div>
                  <div class="bg-white/5 p-1.5 rounded text-[10px] font-mono text-center col-span-2 truncate text-gray-400 border border-white/5">Paste the Base64 String (or raw JSON)</div>
                </div>
              </div>
            </div>

            <div class="flex items-start gap-2.5">
              <span class="bg-primary/20 text-primary w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 font-sans">4</span>
              <div>
                <p class="text-white font-bold">Save and Deploy!</p>
                <p class="text-gray-400">Save changes on Render. Render will automatically redeploy. Once done, the badge next to your logo will change to a green <strong>Firestore Active</strong> badge!</p>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-6 pt-3.5 border-t border-white/5 flex justify-end">
          <button (click)="showFixModal = false" class="bg-primary hover:bg-opacity-90 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-all shadow-md active:scale-[0.98] cursor-pointer border-0">
            Got it!
          </button>
        </div>
      </div>
    </div>
  `
})
export class NavbarComponent implements OnInit {
  activeTheme = 'theme-light';
  showPlanModal = false;
  isMobileMenuOpen = false;
  isProfileDropdownOpen = false;
  dbStatus: any = null;
  showFixModal = false;

  constructor(
    public auth: AuthService,
    private router: Router,
    private elementRef: ElementRef,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.activeTheme = localStorage.getItem('subtrackr_theme') || 'theme-light';
    this.checkDatabaseStatus();
  }

  checkDatabaseStatus() {
    this.http.get(`${environment.apiUrl}/api/system/status`).subscribe({
      next: (status: any) => {
        this.dbStatus = status;
      },
      error: (err) => {
        console.error('Failed to query system status:', err);
      }
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    // If click is outside the navbar component, close the profile dropdown
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isProfileDropdownOpen = false;
    }
  }

  onThemeChange(event: any) {
    const theme = event.target.value;
    this.activeTheme = theme;
    localStorage.setItem('subtrackr_theme', theme);
    this.applyTheme(theme);
  }

  applyTheme(theme: string) {
    const body = document.body;
    body.classList.remove('theme-midnight', 'theme-volcanic', 'theme-forest', 'theme-light');
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

  toggleProfileDropdown(event: Event) {
    event.stopPropagation();
    event.preventDefault();
    this.isProfileDropdownOpen = !this.isProfileDropdownOpen;
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

