import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <footer class="bg-card bg-opacity-95 backdrop-blur-md border-t border-white/5 py-12 mt-16 text-gray-400 relative overflow-hidden transition-all duration-300">
      <!-- Background Ambient Glows -->
      <div class="absolute -bottom-16 -left-16 w-36 h-36 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute -top-16 -right-16 w-36 h-36 bg-accent/5 rounded-full blur-3xl pointer-events-none"></div>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
          <!-- Brand and Mission -->
          <div class="md:col-span-2 space-y-4">
            <h3 class="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">SubTrackr</h3>
            <p class="text-sm max-w-sm leading-relaxed text-gray-400 font-medium">
              Take back control of your subscriptions. Monitor expenses, visualize yearly waste inside the Graveyard, and customize renewal alerts seamlessly.
            </p>
          </div>

          <!-- Navigation Links -->
          <div>
            <h4 class="text-white text-xs font-extrabold uppercase tracking-widest mb-4">Navigation</h4>
            <ul class="space-y-2.5 text-sm font-medium">
              <li>
                <a routerLink="/" class="hover:text-primary transition-colors duration-200">Dashboard</a>
              </li>
              <li>
                <a routerLink="/pricing" class="hover:text-primary transition-colors duration-200">Pricing Store</a>
              </li>
              <li>
                <a routerLink="/graveyard" class="hover:text-accent transition-colors duration-200 font-semibold text-gray-300">🪦 Graveyard</a>
              </li>
            </ul>
          </div>

          <!-- Membership & Access -->
          <div>
            <h4 class="text-white text-xs font-extrabold uppercase tracking-widest mb-4">Account</h4>
            <ul class="space-y-2.5 text-sm font-medium">
              <li>
                <a routerLink="/login" class="hover:text-primary transition-colors duration-200">Login Account</a>
              </li>
              <li>
                <a routerLink="/register" class="hover:text-primary transition-colors duration-200">Sign Up Free</a>
              </li>
              <li>
                <span class="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/5 text-gray-300 font-semibold capitalize tracking-wide">Multi-Theme Enabled</span>
              </li>
            </ul>
          </div>
        </div>

        <div class="h-px bg-white/5 my-8"></div>

        <!-- Copyright and Bottom Info -->
        <div class="flex flex-col sm:flex-row items-center justify-between text-xs font-semibold text-gray-500 space-y-4 sm:space-y-0">
          <p>© 2026 SubTrackr. All rights reserved.</p>
          <div class="flex space-x-4">
            <a routerLink="/privacy" class="hover:text-white cursor-pointer transition-colors">Privacy Policy</a>
            <span>•</span>
            <a routerLink="/terms" class="hover:text-white cursor-pointer transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  `
})
export class FooterComponent {}
