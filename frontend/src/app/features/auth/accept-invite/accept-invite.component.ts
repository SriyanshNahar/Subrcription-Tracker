import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../../environments/environment';
import { SeoService } from '../../../core/services/seo.service';

@Component({
  selector: 'app-accept-invite',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-screen bg-background py-16 px-4 md:px-8 relative overflow-hidden flex flex-col items-center justify-center">
      <!-- Background Ambient Glows -->
      <div class="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div class="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div class="w-full max-w-md z-10">
        <div class="glass-card p-8 relative overflow-hidden text-center text-white">
          <div class="absolute -right-24 -top-24 w-48 h-48 bg-primary/10 rounded-full blur-[80px]"></div>

          <div class="w-16 h-16 bg-primary/20 text-primary border border-primary/30 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6 shadow-lg shadow-primary/15 font-bold">
            🤝
          </div>

          <h1 class="text-2xl md:text-3xl font-black mb-3">Corporate Invitation</h1>
          <p class="text-gray-400 text-sm mb-6 leading-relaxed">
            You have been invited to manage subscription expenses and audit licenses on Trackovo Corporate.
          </p>

          <!-- Loader while checking parameters -->
          <div *ngIf="isLoading && !error" class="py-8 flex flex-col items-center justify-center space-y-3">
            <svg class="animate-spin h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            <span class="text-xs text-gray-500 font-semibold uppercase tracking-wider">Processing invite...</span>
          </div>

          <!-- Parameter Errors -->
          <div *ngIf="error" class="bg-red-500/10 border border-red-500/25 rounded-2xl p-5 mb-6 text-left">
            <p class="text-red-400 font-bold text-sm mb-1">⚠️ Invitation Error</p>
            <p class="text-gray-400 text-xs leading-relaxed">{{ error }}</p>
            <a routerLink="/" class="text-primary underline text-xs font-bold mt-3 block">Go to Home Dashboard</a>
          </div>

          <!-- Flow A: Logged In and Ready -->
          <div *ngIf="!isLoading && !error && isLoggedIn" class="space-y-6">
            <div class="bg-white/5 border border-white/5 rounded-2xl p-4 text-left text-xs text-gray-400 leading-relaxed font-sans">
              Logged in as: <strong class="text-white">{{ activeEmail }}</strong>. Accepting this invitation binds your account to this company's expense command center.
            </div>

            <button (click)="acceptInvite()" [disabled]="isLoading"
              class="w-full bg-primary hover:bg-opacity-95 text-white font-bold py-4 rounded-2xl transition shadow-lg shadow-primary/20 transform active:scale-98 flex items-center justify-center gap-2 cursor-pointer">
              <span>Accept & Join Team</span>
            </button>
          </div>

          <!-- Flow B: Guest user needs to login/register first -->
          <div *ngIf="!isLoading && !error && !isLoggedIn" class="space-y-6">
            <div class="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 text-left text-xs text-amber-300 leading-relaxed font-sans">
              ⚠️ You must be logged in to accept team invitations. Please sign in or register a new account to join your company.
            </div>

            <div class="grid grid-cols-2 gap-4">
              <a [routerLink]="['/login']" [queryParams]="{ redirect: currentUrl }"
                class="bg-gray-800 hover:bg-gray-750 text-white font-bold py-3.5 rounded-2xl text-xs transition border border-gray-700 block">
                Sign In
              </a>
              <a [routerLink]="['/register']" [queryParams]="{ redirect: currentUrl }"
                class="bg-primary hover:bg-opacity-95 text-white-force font-bold py-3.5 rounded-2xl text-xs transition shadow-md block">
                Register
              </a>
            </div>
          </div>

        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
  `]
})
export class AcceptInviteComponent implements OnInit {
  isLoading = true;
  error: string | null = null;
  isLoggedIn = false;
  activeEmail = '';
  
  token: string | null = null;
  orgId: string | null = null;
  currentUrl = '';

  constructor(
    private auth: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private toastr: ToastrService,
    private seo: SeoService
  ) {}

  ngOnInit() {
    this.seo.generateTags({
      title: 'Join Your Corporate Team Workspace',
      description: 'Consume secure team invite link token to bind employee account settings to B2B subscription expense dashboards.'
    });

    this.currentUrl = window.location.href;

    // 1. Read query parameters
    this.route.queryParams.subscribe(params => {
      this.token = params['token'];
      this.orgId = params['org'];

      if (!this.token || !this.orgId) {
        this.error = 'Secure invitation parameters are incomplete or corrupt. Please request your corporate admin to send a fresh invitation email.';
        this.isLoading = false;
        return;
      }

      // 2. Check auth state
      this.auth.userProfile$.subscribe({
        next: (profile) => {
          if (profile) {
            this.isLoggedIn = true;
            this.activeEmail = profile.email;
          } else {
            this.isLoggedIn = false;
          }
          this.isLoading = false;
        },
        error: () => {
          this.isLoggedIn = false;
          this.isLoading = false;
        }
      });
    });
  }

  acceptInvite() {
    if (!this.token || !this.orgId) return;

    this.isLoading = true;
    this.toastr.info('Verifying secure corporate invitation token...');

    const payload = {
      token: this.token,
      orgId: this.orgId
    };

    const token = this.auth.getToken();

    this.http.post(`${environment.apiUrl}/api/org/accept-invite`, payload, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res: any) => {
        this.toastr.success('Welcome to the team! Corporate portal loaded.', 'Invite Accepted');
        
        // Refresh User profile so that the client-side routes understand the orgId bindings
        this.auth.fetchUserProfile().subscribe(() => {
          this.isLoading = false;
          this.router.navigate(['/corporate']);
        });
      },
      error: (err: any) => {
        console.error('Accept invite error:', err);
        this.error = err?.error?.error || 'Validation failed. The link might be expired or already used.';
        this.toastr.error(this.error || 'Invitation validation failed.');
        this.isLoading = false;
      }
    });
  }
}
