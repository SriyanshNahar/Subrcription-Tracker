import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../environments/environment';

declare var Razorpay: any;

@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-screen bg-background py-16 px-4 md:px-8 relative overflow-hidden flex flex-col items-center">
      
      <!-- Top Decorative Glows -->
      <div class="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div class="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px] pointer-events-none"></div>
 
      <!-- Warning Banner if redirected for upgrade -->
      <div *ngIf="upgradeRequired" class="w-full max-w-4xl mb-8 bg-amber-500/10 border border-amber-500/30 text-amber-200 px-6 py-4 rounded-2xl flex items-center justify-between animate-pulse shadow-lg shadow-amber-500/5 backdrop-blur-md">
        <div class="flex items-center space-x-3">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span class="font-semibold text-sm">Upgrade required: Please select a premium plan to unlock graveyard sharing, multi-currencies, and unlimited subscription tracking!</span>
        </div>
      </div>
 
      <div class="text-center max-w-2xl mx-auto mb-16 relative">
        <h1 class="text-4xl md:text-6xl font-black tracking-tight text-white mb-4">
          Choose Your <span class="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">SubTrackr</span> Plan
        </h1>
        <p class="text-gray-400 text-lg">
          Take control of your expenses. Save hundreds of rupees monthly by terminating the expense graveyard.
        </p>
      </div>
 
      <!-- Billing Switcher Toggle -->
      <div class="flex items-center justify-center space-x-4 mb-16 bg-[#000000]/40 border border-white/5 p-1.5 rounded-full z-10 backdrop-blur-md shadow-lg">
        <button 
          (click)="selectedBilling = 'monthly'"
          [class.bg-primary]="selectedBilling === 'monthly'"
          [class.text-white]="selectedBilling === 'monthly'"
          [class.text-gray-400]="selectedBilling !== 'monthly'"
          [class.shadow-md]="selectedBilling === 'monthly'"
          class="px-6 py-2 rounded-full font-semibold transition-all duration-300 text-sm">
          Monthly Billing
        </button>
        <button 
          (click)="selectedBilling = 'yearly'"
          [class.bg-primary]="selectedBilling === 'yearly'"
          [class.text-white]="selectedBilling === 'yearly'"
          [class.text-gray-400]="selectedBilling !== 'yearly'"
          [class.shadow-md]="selectedBilling === 'yearly'"
          class="px-6 py-2 rounded-full font-semibold transition-all duration-300 text-sm flex items-center">
          Yearly Billing
          <span class="ml-2 bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded-full font-bold">
            Save up to 33%
          </span>
        </button>
      </div>
 
      <!-- Plans grid -->
      <div class="max-w-6xl w-full grid grid-cols-1 md:grid-cols-3 gap-8 z-10 px-2">
 
        <!-- FREE PLAN CARD -->
        <div class="glass-card p-8 flex flex-col justify-between border border-white/5 hover:border-white/10 hover:scale-[1.02] hover:shadow-[0_10px_35px_rgba(255,255,255,0.03)] transition-all duration-300 group">
          <div>
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-2xl font-bold text-white group-hover:text-primary transition-colors">Starter Free</h3>
            </div>
            <p class="text-gray-400 text-sm mb-6 leading-relaxed">Test the waters and manage your absolute essentials.</p>
            <div class="text-5xl font-extrabold text-white mb-6">
              ₹0<span class="text-sm font-normal text-gray-500">/ forever</span>
            </div>
            <div class="h-px bg-white/5 w-full mb-6"></div>
            <ul class="space-y-4 text-sm text-gray-300 mb-8">
              <li class="flex items-center space-x-3">
                <span class="text-primary font-bold">✓</span> <span>Track up to 3 subscriptions</span>
              </li>
              <li class="flex items-center space-x-3">
                <span class="text-primary font-bold">✓</span> <span>Basic dashboard spend analysis</span>
              </li>
              <li class="flex items-center space-x-3">
                <span class="text-primary font-bold">✓</span> <span>Browser push alerts (2 days prior)</span>
              </li>
              <li class="flex items-center space-x-3 text-gray-600 line-through">
                <span>✗</span> <span>Expense Graveyard Shareable Card</span>
              </li>
              <li class="flex items-center space-x-3 text-gray-600 line-through">
                <span>✗</span> <span>PDF + CSV Export (Watermark-free)</span>
              </li>
              <li class="flex items-center space-x-3 text-gray-600 line-through">
                <span>✗</span> <span>Family Dashboard & Duplicate subscription detector</span>
              </li>
            </ul>
          </div>
          <button 
            [disabled]="true"
            class="w-full bg-white/5 border border-white/5 text-gray-500 py-3.5 rounded-xl font-bold cursor-not-allowed">
            Active Free Tier
          </button>
        </div>
 
        <!-- PRO PLAN CARD (MOST POPULAR) -->
        <div class="glass-card p-8 border-2 border-primary/50 flex flex-col justify-between relative hover:scale-[1.05] shadow-[0_0_30px_rgba(108,99,255,0.15)] hover:shadow-[0_0_45px_rgba(108,99,255,0.35)] transition-all duration-350 ease-out group">
          <div class="absolute top-0 right-1/2 translate-x-1/2 translate-y-[-50%] bg-gradient-to-r from-primary to-accent text-white font-extrabold text-[10px] tracking-wider px-4 py-1.5 rounded-full shadow-lg shadow-primary/30 border border-white/10 animate-pulse">
            MOST POPULAR
          </div>
          <div>
            <div class="flex items-center justify-between mb-4 mt-2">
              <h3 class="text-2xl font-bold text-white group-hover:text-primary transition-colors">Premium Pro</h3>
            </div>
            <p class="text-gray-400 text-sm mb-6 leading-relaxed">Full feature suite for serious spenders and savers.</p>
            <div class="text-5xl font-extrabold text-white mb-2 flex items-baseline">
              ₹{{ getPrice('pro') }}
              <span class="text-sm font-normal text-gray-500 ml-1">/ {{ selectedBilling === 'monthly' ? 'month' : 'year' }}</span>
            </div>
            <p *ngIf="selectedBilling === 'yearly'" class="text-emerald-400 text-xs font-bold mb-6">
              You save ₹{{ getSaving('pro') }} per year!
            </p>
            <div *ngIf="selectedBilling === 'monthly'" class="h-6 mb-6"></div>
            <div class="h-px bg-white/5 w-full mb-6"></div>
            <ul class="space-y-4 text-sm text-gray-300 mb-8">
              <li class="flex items-center space-x-3">
                <span class="text-accent font-bold">✓</span> <span>Track up to <strong>15 subscriptions</strong></span>
              </li>
              <li class="flex items-center space-x-3">
                <span class="text-accent font-bold">✓</span> <span>Custom Alerts (7d, 3d, 1d, and renew day)</span>
              </li>
              <li class="flex items-center space-x-3">
                <span class="text-accent font-bold">✓</span> <span>Shareable Expense Graveyard card</span>
              </li>
              <li class="flex items-center space-x-3">
                <span class="text-accent font-bold">✓</span> <span>Watermark-free PDF + CSV Export</span>
              </li>
              <li class="flex items-center space-x-3">
                <span class="text-accent font-bold">✓</span> <span>Multi-currency support</span>
              </li>
              <li class="flex items-center space-x-3">
                <span class="text-accent font-bold">✓</span> <span>Cancel Assistant with alternative discounts</span>
              </li>
            </ul>
          </div>
          <button 
            (click)="subscribe('pro')" 
            [disabled]="isLoading || isPlanActive('pro')"
            [class.bg-white]="isPlanActive('pro')"
            [class.bg-opacity-10]="isPlanActive('pro')"
            [class.text-gray-400]="isPlanActive('pro')"
            [class.bg-gradient-to-r]="!isPlanActive('pro')"
            class="w-full from-primary to-accent hover:opacity-95 hover:scale-[1.02] text-white py-3.5 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all duration-300 flex items-center justify-center space-x-2 cursor-pointer">
            <span *ngIf="isLoading"><svg class="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg></span>
            <span>{{ isPlanActive('pro') ? 'Your Current Plan' : 'Upgrade to Pro' }}</span>
          </button>
        </div>
 
        <!-- FAMILY PLAN CARD -->
        <div class="glass-card p-8 flex flex-col justify-between border border-white/5 hover:border-emerald-500/40 hover:scale-[1.02] hover:shadow-[0_0_35px_rgba(16,185,129,0.15)] transition-all duration-300 group">
          <div>
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-2xl font-bold text-white group-hover:text-emerald-400 transition-colors">Shared Family</h3>
            </div>
            <p class="text-gray-400 text-sm mb-6 leading-relaxed">Complete household optimization, secure sharing.</p>
            <div class="text-5xl font-extrabold text-white mb-2 flex items-baseline">
              ₹{{ getPrice('family') }}
              <span class="text-sm font-normal text-gray-500 ml-1">/ {{ selectedBilling === 'monthly' ? 'month' : 'year' }}</span>
            </div>
            <p *ngIf="selectedBilling === 'yearly'" class="text-emerald-400 text-xs font-bold mb-6">
              You save ₹{{ getSaving('family') }} per year!
            </p>
            <div *ngIf="selectedBilling === 'monthly'" class="h-6 mb-6"></div>
            <div class="h-px bg-white/5 w-full mb-6"></div>
            <ul class="space-y-4 text-sm text-gray-300 mb-8">
              <li class="flex items-center space-x-3">
                <span class="text-emerald-400 font-bold">✓</span> <span><strong>Unlimited</strong> subscriptions tracking</span>
              </li>
              <li class="flex items-center space-x-3">
                <span class="text-emerald-400 font-bold">✓</span> <span><strong>Everything</strong> in Pro included</span>
              </li>
              <li class="flex items-center space-x-3">
                <span class="text-emerald-400 font-bold">✓</span> <span>Up to <strong>5 family members</strong></span>
              </li>
              <li class="flex items-center space-x-3">
                <span class="text-emerald-400 font-bold">✓</span> <span>Shared family dashboard view</span>
              </li>
              <li class="flex items-center space-x-3">
                <span class="text-emerald-400 font-bold">✓</span> <span>Duplicate subscription detector</span>
              </li>
              <li class="flex items-center space-x-3">
                <span class="text-emerald-400 font-bold">✓</span> <span>Per-member spend tracking metrics</span>
              </li>
              <li class="flex items-center space-x-3">
                <span class="text-emerald-400 font-bold">✓</span> <span>Priority 24/7 support line</span>
              </li>
            </ul>
          </div>
          <button 
            (click)="subscribe('family')" 
            [disabled]="isLoading || isPlanActive('family')"
            [class.bg-white]="isPlanActive('family')"
            [class.bg-opacity-10]="isPlanActive('family')"
            [class.text-gray-400]="isPlanActive('family')"
            class="w-full bg-transparent border border-emerald-500/60 hover:bg-emerald-500/10 text-emerald-400 py-3.5 rounded-xl font-bold transition-all duration-300 flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-emerald-500/5">
            <span *ngIf="isLoading"><svg class="animate-spin h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg></span>
            <span>{{ isPlanActive('family') ? 'Your Current Plan' : 'Get Family Plan' }}</span>
          </button>
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
export class PricingComponent implements OnInit {
  selectedBilling: 'monthly' | 'yearly' = 'monthly';
  isLoading = false;
  upgradeRequired = false;
  activeUserPlan = 'free';

  plans = {
    pro: { monthly: 99, yearly: 799 },
    family: { monthly: 199, yearly: 1499 }
  };

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    // Check if query parameters show an upgrade requirement
    this.route.queryParams.subscribe(params => {
      this.upgradeRequired = params['reason'] === 'upgrade_required';
    });

    // Fetch user's active plan state
    this.auth.userProfile$.subscribe(profile => {
      if (profile) {
        this.activeUserPlan = profile.plan || 'free';
      }
    });
  }

  getPrice(plan: 'pro' | 'family'): number {
    return this.selectedBilling === 'monthly'
      ? this.plans[plan].monthly
      : this.plans[plan].yearly;
  }

  getSaving(plan: 'pro' | 'family'): number {
    const monthlyTotal = this.plans[plan].monthly * 12;
    const yearlyTotal = this.plans[plan].yearly;
    return monthlyTotal - yearlyTotal;
  }

  isPlanActive(plan: string): boolean {
    return this.activeUserPlan === plan;
  }

  async subscribe(plan: 'pro' | 'family'): Promise<void> {
    const profile = this.auth.userProfile$.value;
    if (!profile) {
      this.toastr.warning('Please log in to upgrade your subscription plan.');
      this.router.navigate(['/login']);
      return;
    }

    this.isLoading = true;
    const userId = profile.id || profile.uid;
    const email = profile.email;
    const planKey = `${plan}_${this.selectedBilling}`;

    try {
      this.toastr.info('Preparing secure checkout...');
      
      // Step 1: Create Razorpay subscription session on backend
      const response: any = await this.http.post(`${environment.apiUrl}/api/payment/subscribe`, {
        planKey
      }).toPromise();

      if (!response || !response.subscriptionId) {
        throw new Error('Failed to create payment subscription transaction ID.');
      }

      this.toastr.success('Checkout initialized!');

      // Step 2: Open Razorpay checkout modal
      const options = {
        key: response.keyId || 'rzp_test_dummyKeyId', // Dynamically loaded from backend
        subscription_id: response.subscriptionId,
        name: 'SubTrackr',
        description: `Upgrade to SubTrackr ${plan.toUpperCase()} Plan (${this.selectedBilling})`,
        image: '/favicon.png', // Premium custom favicon!
        prefill: { email },
        theme: { color: '#6C63FF' },
        handler: async (paymentResponse: any) => {
          try {
            this.isLoading = true;
            this.toastr.info('Verifying secure transaction signatures...');
            
            // Step 3: Verify & Activate plan on backend
            await this.http.post(`${environment.apiUrl}/api/payment/verify`, {
              ...paymentResponse,
              plan: planKey
            }).toPromise();

            this.toastr.success(`Congratulations! You are now subscribed to SubTrackr ${plan.toUpperCase()}!`, 'Plan Activated!');
            
            // Refresh user profile
            this.auth.fetchUserProfile().subscribe();
            
            this.router.navigate(['/']);
          } catch (verifyError: any) {
            console.error('Payment verification failed:', verifyError);
            this.toastr.error(verifyError?.error?.error || 'Verification failed. Contact support.');
          } finally {
            this.isLoading = false;
          }
        },
        modal: {
          ondismiss: () => {
            this.isLoading = false;
            this.toastr.warning('Checkout cancelled by user.');
          }
        }
      };

      const rzp = new Razorpay(options);
      rzp.open();

    } catch (error: any) {
      console.error('Subscription setup failed:', error);
      this.toastr.error(error?.error?.error || 'Failed to start payment gateway checkout.');
      this.isLoading = false;
    }
  }
}
