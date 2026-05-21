import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="fixed top-0 w-full z-50 bg-card bg-opacity-90 backdrop-blur-md border-b border-white/5 transition-all duration-300">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <div class="flex items-center">
            <a routerLink="/" class="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">SubTrackr</a>
          </div>
          <div class="flex items-center space-x-4">
            <!-- Theme Dropdown Switcher -->
            <div class="relative inline-block text-left mr-2">
              <select [value]="activeTheme" (change)="onThemeChange($event)" class="bg-black/35 border border-white/10 rounded-xl px-2.5 py-1 text-xs text-gray-300 focus:outline-none focus:border-primary cursor-pointer hover:border-white/20 transition-all font-semibold">
                <option value="theme-midnight">🌌 Midnight Cyberpunk</option>
                <option value="theme-volcanic">🌋 Volcanic Amber</option>
                <option value="theme-forest">🌲 Forest Emerald</option>
              </select>
            </div>

            <ng-container *ngIf="auth.currentUser$ | async as user; else guest">
              <!-- Premium Plan Badge -->
              <span *ngIf="auth.userProfile$ | async as profile" class="flex items-center">
                <span *ngIf="profile.plan === 'pro'" class="bg-gradient-to-r from-primary to-accent text-white text-[10px] font-black px-2.5 py-0.5 rounded-full mr-2 tracking-wider shadow shadow-primary/20">PRO</span>
                <span *ngIf="profile.plan === 'family'" class="bg-emerald-500/20 text-emerald-400 text-[10px] font-black px-2.5 py-0.5 rounded-full mr-2 tracking-wider border border-emerald-500/30">FAMILY</span>
              </span>

              <a routerLink="/" class="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Dashboard</a>
              <a routerLink="/pricing" class="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Pricing</a>
              <a routerLink="/graveyard" class="text-gray-300 hover:text-accent px-3 py-2 rounded-md text-sm font-medium flex items-center">
                <span>Graveyard</span>
                <span *ngIf="(auth.userProfile$ | async)?.plan === 'free' || !(auth.userProfile$ | async)" class="ml-1.5 text-[9px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded-md font-bold">🪦 Premium</span>
              </a>
              <button (click)="logout()" class="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Logout</button>
            </ng-container>
            <ng-template #guest>
              <a routerLink="/pricing" class="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Pricing</a>
              <a routerLink="/login" class="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Login</a>
              <a routerLink="/register" class="bg-primary hover:bg-opacity-90 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">Sign Up</a>
            </ng-template>
          </div>
        </div>
      </div>
    </nav>
  `
})
export class NavbarComponent implements OnInit {
  activeTheme = 'theme-midnight';

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

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
