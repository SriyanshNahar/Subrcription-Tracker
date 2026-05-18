import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="fixed top-0 w-full z-50 bg-[#1A1A2E] bg-opacity-90 backdrop-blur-md border-b border-gray-800">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <div class="flex items-center">
            <a routerLink="/" class="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">SubTrackr</a>
          </div>
          <div class="flex items-center space-x-4">
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
export class NavbarComponent {
  constructor(public auth: AuthService, private router: Router) {}

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
