import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SubscriptionService } from '../../core/services/subscription.service';
import { ToastrService } from 'ngx-toastr';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartConfiguration, ChartData, ChartType, registerables } from 'chart.js';
import { AuthService } from '../../core/services/auth.service';
import { Router, RouterModule } from '@angular/router';
import { SeoService } from '../../core/services/seo.service';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe, DatePipe, BaseChartDirective, RouterModule],
  template: `
    <div class="py-6">
      
      <!-- Premium Upgrade Alert Banner for Free plan users -->
      <div *ngIf="activeUserPlan === 'free'" class="glass-card mb-8 p-6 border-l-4 border-primary flex flex-col md:flex-row items-center justify-between shadow-lg relative overflow-hidden group">
        <div class="absolute -right-10 -top-10 w-24 h-24 bg-primary/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
        <div class="mb-4 md:mb-0 relative z-10">
          <h4 class="text-lg font-extrabold text-white">Upgrade to Premium Pro for Unlimited Tracking!</h4>
          <p class="text-sm text-gray-400">Unlock advanced alerts, shareable graveyard cards, custom currencies, and more.</p>
        </div>
        <a routerLink="/pricing" class="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white px-6 py-2.5 rounded-xl font-bold transition-all text-sm shadow-md shadow-primary/20 relative z-10">
          View Plans
        </a>
      </div>

      <div class="flex justify-between items-center mb-8">
        <div class="flex items-center space-x-3">
          <h1 class="text-3xl font-bold">Dashboard</h1>
          <span *ngIf="activeUserPlan === 'pro'" class="bg-gradient-to-r from-primary to-accent text-white text-xs px-3 py-1 rounded-full font-bold shadow shadow-primary/20">PRO USER</span>
          <span *ngIf="activeUserPlan === 'family'" class="bg-emerald-500/20 text-emerald-400 text-xs px-3 py-1 rounded-full font-bold border border-emerald-500/30">FAMILY MEMBER</span>
        </div>
        <button (click)="openAddModal()" class="bg-primary hover:bg-opacity-90 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-primary/20">
          + Add Subscription
        </button>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="glass-card p-6">
          <p class="text-gray-400 text-sm font-medium mb-1">Total Monthly Spend</p>
          <p class="text-4xl font-bold text-white">{{ summary?.totalMonthly || 0 | currency:'INR' }}</p>
        </div>
        <div class="glass-card p-6">
          <p class="text-gray-400 text-sm font-medium mb-1">Total Yearly Spend</p>
          <p class="text-4xl font-bold text-accent">{{ summary?.totalYearly || 0 | currency:'INR' }}</p>
        </div>
        <div class="glass-card p-6">
          <p class="text-gray-400 text-sm font-medium mb-1">Active Subscriptions</p>
          <p class="text-4xl font-bold text-white">{{ summary?.activeCount || 0 }}</p>
        </div>
      </div>

      <!-- Main Dashboard Grid Layout -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
        
        <!-- Left Section: Subscriptions Table (Col Span 8) -->
        <div class="lg:col-span-8 space-y-6">
          <div class="glass-card overflow-hidden">
            <!-- Header with Search & Filters -->
            <div class="px-6 py-4 border-b border-gray-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div class="flex items-center space-x-3">
                <h2 class="text-xl font-semibold">Your Subscriptions</h2>
                <span class="text-xs text-gray-500">
                  <span *ngIf="activeUserPlan === 'free'">{{ subscriptions.length }} / 3 used</span>
                  <span *ngIf="activeUserPlan === 'pro'">{{ subscriptions.length }} / 15 used</span>
                  <span *ngIf="activeUserPlan === 'family'">{{ subscriptions.length }} used (Unlimited)</span>
                </span>
              </div>
              
              <div class="flex flex-wrap items-center gap-3">
                <!-- Search bar -->
                <div class="relative w-full sm:w-48">
                  <input type="text" (input)="onSearchChange($event)" placeholder="Search..."
                    class="w-full bg-[#0F0F24]/90 border border-gray-700/60 rounded-xl px-3 py-1.5 pl-8 focus:outline-none focus:border-primary text-xs text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-500 absolute left-2.5 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                
                <!-- Category Filter -->
                <select (change)="onCategoryChange($event)" class="bg-[#0F0F24]/90 border border-gray-700/60 rounded-xl px-2.5 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-primary cursor-pointer">
                  <option value="All">All Categories</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Work">Work</option>
                  <option value="Health">Health</option>
                  <option value="Other">Other</option>
                </select>

                <!-- Status Filter -->
                <select (change)="onStatusChange($event)" class="bg-[#0F0F24]/90 border border-gray-700/60 rounded-xl px-2.5 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-primary cursor-pointer">
                  <option value="All">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Want to Cancel">Want to Cancel</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
            
            <div class="divide-y divide-gray-800">
              <div *ngFor="let sub of filteredSubscriptions" class="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/5 transition-colors">
                <div class="flex items-center space-x-4">
                  <div class="w-12 h-12 flex-shrink-0 bg-gray-800 rounded-xl flex items-center justify-center text-xl overflow-hidden">
                    <img *ngIf="sub.logo" [src]="getLogoUrl(sub)" (error)="sub.logo = null" alt="logo" class="w-full h-full object-cover">
                    <span *ngIf="!sub.logo">{{ sub.name.charAt(0) }}</span>
                  </div>
                  <div>
                    <h3 class="text-base sm:text-lg font-medium text-white flex flex-wrap items-center gap-2">
                      <span>{{ sub.name }}</span>
                      <span *ngIf="sub.status === 'Want to Cancel'" class="bg-amber-500/10 text-amber-400 text-[10px] px-2.5 py-0.5 rounded-full font-bold border border-amber-500/25">
                        Want to Cancel
                      </span>
                      <span *ngIf="sub.status === 'Inactive'" class="bg-red-500/10 text-red-400 text-[10px] px-2.5 py-0.5 rounded-full font-bold border border-red-500/25">
                        Inactive 🪦
                      </span>
                    </h3>
                    <p class="text-xs sm:text-sm text-gray-400">{{ sub.category }} • Renews {{ sub.renewalDate | date:'mediumDate' }}</p>
                  </div>
                </div>
                <div class="flex items-center justify-between sm:justify-end space-x-4 border-t border-gray-800/50 sm:border-t-0 pt-3 sm:pt-0">
                  <div class="text-left sm:text-right">
                    <p class="text-base sm:text-lg font-bold text-white">{{ sub.amount | currency:sub.currency || 'INR' }}</p>
                    <p class="text-xs sm:text-sm text-gray-400">/ {{ sub.billingCycle }}</p>
                  </div>
                  <div class="flex items-center space-x-2">
                    <button *ngIf="sub.status !== 'Inactive'" (click)="openCancelAssistant(sub)" class="text-amber-500 hover:text-amber-400 p-2" title="Cancel Assistant">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </button>
                    <button (click)="deleteSub(sub.id)" class="text-red-500 hover:text-red-400 p-2" title="Delete Permanent">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              <div *ngIf="filteredSubscriptions.length === 0" class="p-8 text-center text-gray-500">
                No subscriptions found. Click "Add Subscription" or adjust filters to see results!
              </div>
            </div>
          </div>
        </div>

        <!-- Right Section: Spend Analytics Chart (Col Span 4) -->
        <div class="lg:col-span-4 space-y-6">
          <div class="glass-card p-6 flex flex-col justify-between h-[380px] border border-gray-700/50 shadow-2xl relative overflow-hidden">
            <h3 class="text-lg font-bold text-white mb-4">Spend Breakdown</h3>
            <div class="relative flex-1 flex items-center justify-center min-h-[220px]">
              <canvas *ngIf="chartData && chartData.datasets[0].data.length > 0"
                baseChart
                [data]="chartData"
                [options]="chartOptions"
                [type]="chartType">
              </canvas>
              <div *ngIf="!chartData || chartData.datasets[0].data.length === 0" class="text-center text-sm text-gray-500 flex flex-col items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-gray-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3.055A9.003 9.003 0 1020.945 13H11V3.055z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                </svg>
                <span>No active subscriptions to project category breakdown.</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- Add Modal -->
    <div *ngIf="showAddModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div class="glass-card w-full max-w-md p-6 relative border border-gray-700/60 shadow-2xl">
        <button (click)="showAddModal = false" class="absolute top-4 right-4 text-gray-400 hover:text-white">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h2 class="text-2xl font-bold mb-6">Add Subscription</h2>
        
        <form [formGroup]="subForm" (ngSubmit)="onSubmit()">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1">Name</label>
              <input type="text" formControlName="name" class="w-full bg-[#090915] border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-primary text-white" placeholder="Netflix, Spotify...">
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-1">Amount</label>
                <input type="number" formControlName="amount" class="w-full bg-[#090915] border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-primary text-white" placeholder="0.00">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-1">Currency</label>
                <select formControlName="currency" class="w-full bg-[#090915] border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-primary text-white">
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1">Billing Cycle</label>
              <select formControlName="billingCycle" class="w-full bg-[#090915] border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-primary text-white">
                <option value="Monthly">Monthly</option>
                <option value="Yearly">Yearly</option>
                <option value="Weekly">Weekly</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1">Category</label>
              <select formControlName="category" class="w-full bg-[#090915] border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-primary text-white">
                <option value="Entertainment">Entertainment</option>
                <option value="Work">Work</option>
                <option value="Health">Health</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1">Start Date</label>
              <input type="date" formControlName="startDate" class="w-full bg-[#090915] border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-primary text-white">
            </div>
          </div>
          <button type="submit" [disabled]="subForm.invalid" class="w-full mt-6 bg-primary hover:bg-opacity-90 text-white font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50">
            Save Subscription
          </button>
        </form>
      </div>
    </div>

    <!-- Cancel Assistant Modal -->
    <div *ngIf="showCancelModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div class="glass-card w-full max-w-md p-6 relative border border-amber-500/20 shadow-2xl">
        <button (click)="showCancelModal = false" class="absolute top-4 right-4 text-gray-400 hover:text-white">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <div class="flex items-center space-x-3 mb-4">
          <div class="p-2.5 bg-amber-500/10 rounded-xl text-amber-500">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h2 class="text-xl font-extrabold text-white">Before you cancel {{ selectedSubForCancel?.name }}...</h2>
        </div>
        
        <p class="text-gray-400 text-sm mb-6 leading-relaxed">
          Terminating saves you money, but switching to these alternatives saves you even more with our exclusive commission discount deals!
        </p>

        <div class="space-y-3">
          <div *ngFor="let alt of cancelAlternatives" class="flex items-center justify-between p-4 bg-white/5 border border-gray-800 rounded-2xl hover:border-gray-700 transition duration-300">
            <div>
              <p class="text-white font-bold text-sm">{{ alt.name }}</p>
              <p class="text-emerald-400 text-xs font-bold mt-0.5">Save {{ alt.saving }}</p>
            </div>
            <a [href]="alt.link" target="_blank" (click)="clickAffiliate(alt)"
              class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition shadow-md shadow-emerald-600/20">
              Switch & Save
            </a>
          </div>
        </div>

        <button (click)="confirmCancellation()" class="w-full text-red-500 text-sm mt-6 hover:text-red-400 font-semibold transition text-center block">
          No thanks, cancel anyway & move to Graveyard →
        </button>
      </div>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  subscriptions: any[] = [];
  summary: any = null;
  showAddModal = false;
  subForm: FormGroup;
  activeUserPlan = 'free';

  // Search & Filters state
  searchTerm = '';
  selectedCategory = 'All';
  selectedStatus = 'All';

  // Currency Exchange Rates state
  exchangeRates: any = null;

  // Chart properties
  public chartType: ChartType = 'doughnut';
  public chartData: ChartData<'doughnut'> = {
    labels: [],
    datasets: [{ data: [] }]
  };
  public chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#9CA3AF',
          font: { family: 'Inter', size: 11, weight: 'bold' },
          padding: 10
        }
      },
      tooltip: {
        backgroundColor: '#111827',
        titleColor: '#FFFFFF',
        bodyColor: '#9CA3AF',
        borderColor: '#374151',
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          label: (context: any) => {
            const val = context.raw as number;
            return ` ₹${val.toFixed(2)}/mo`;
          }
        }
      }
    },
    cutout: '70%'
  };

  getLogoUrl(sub: any): string {
    if (!sub.logo) return '';
    if (sub.logo.includes('clearbit.com')) {
      const parts = sub.logo.split('/');
      const domain = parts[parts.length - 1];
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    }
    return sub.logo;
  }

  // Cancel Assistant Properties
  showCancelModal = false;
  selectedSubForCancel: any = null;
  cancelAlternatives: any[] = [];

  constructor(
    private subService: SubscriptionService,
    private fb: FormBuilder,
    private toastr: ToastrService,
    private auth: AuthService,
    private router: Router,
    private seo: SeoService
  ) {
    this.subForm = this.fb.group({
      name: ['', Validators.required],
      amount: ['', Validators.required],
      currency: ['INR'],
      billingCycle: ['Monthly'],
      category: ['Entertainment'],
      startDate: [new Date().toISOString().split('T')[0], Validators.required],
      status: ['Active']
    });
  }

  ngOnInit() {
    this.seo.generateTags({
      title: 'Premium Analytics Dashboard',
      description: 'Optimize your digital spending in one elegant visual hub. Track active subscriptions, renewals, category spend, and reclaim wasted money with SubTrackr.'
    });
    this.loadData();
    this.auth.userProfile$.subscribe(profile => {
      if (profile) {
        this.activeUserPlan = profile.plan || 'free';
      }
    });
    this.requestNotificationPermission();
  }

  loadData() {
    this.subService.getExchangeRates().subscribe({
      next: (rateRes: any) => {
        if (rateRes && rateRes.rates) {
          this.exchangeRates = rateRes.rates;
        }
        this.fetchSubscriptionsAndSum();
      },
      error: () => {
        // Graceful fallback for offline usage
        this.exchangeRates = { INR: 1, USD: 0.012, EUR: 0.011 };
        this.fetchSubscriptionsAndSum();
      }
    });
  }

  private fetchSubscriptionsAndSum() {
    this.subService.getSubscriptions().subscribe({
      next: (res: any) => {
        this.subscriptions = res;
        this.calculateSummary();
        this.checkUpcomingRenewalsAndNotify();
      },
      error: () => this.toastr.error('Failed to load subscriptions')
    });
  }

  calculateSummary() {
    let totalMonthly = 0;
    let activeCount = 0;

    this.subscriptions.forEach(s => {
      if (s.status === 'Active') {
        activeCount++;
        let amount = parseFloat(s.amount);

        if (s.currency && s.currency !== 'INR' && this.exchangeRates && this.exchangeRates[s.currency]) {
          amount = amount / this.exchangeRates[s.currency];
        }

        if (s.billingCycle === 'Yearly') amount /= 12;
        if (s.billingCycle === 'Weekly') amount *= 4;

        totalMonthly += amount;
      }
    });

    this.summary = {
      totalMonthly: totalMonthly,
      totalYearly: totalMonthly * 12,
      activeCount: activeCount
    };
    
    this.updateCategoryChart();
  }

  openAddModal() {
    const limit = this.activeUserPlan === 'free' ? 3 : (this.activeUserPlan === 'pro' ? 15 : Infinity);
    if (this.subscriptions.length >= limit) {
      this.toastr.warning(`Your ${this.activeUserPlan === 'free' ? 'Starter Free' : 'Premium Pro'} plan is limited to ${limit} subscriptions. Please upgrade to a higher tier!`, 'Limit Reached!');
      this.router.navigate(['/pricing']);
      return;
    }
    this.showAddModal = true;
  }

  onSubmit() {
    if (this.subForm.valid) {
      const limit = this.activeUserPlan === 'free' ? 3 : (this.activeUserPlan === 'pro' ? 15 : Infinity);
      if (this.subscriptions.length >= limit) {
        this.toastr.warning(`Your ${this.activeUserPlan === 'free' ? 'Starter Free' : 'Premium Pro'} plan is limited to ${limit} subscriptions. Please upgrade to a higher tier!`, 'Limit Reached!');
        this.router.navigate(['/pricing']);
        return;
      }


      const data = { ...this.subForm.value };
      // auto calc renewal date
      const d = new Date(data.startDate);
      if (data.billingCycle === 'Monthly') d.setMonth(d.getMonth() + 1);
      if (data.billingCycle === 'Yearly') d.setFullYear(d.getFullYear() + 1);
      if (data.billingCycle === 'Weekly') d.setDate(d.getDate() + 7);
      data.renewalDate = d.toISOString();
      const sanitizedName = data.name.toLowerCase().trim().replace(/\s+/g, '');
      data.logo = `https://www.google.com/s2/favicons?domain=${sanitizedName}.com&sz=128`;

      this.subService.addSubscription(data).subscribe({
        next: () => {
          this.toastr.success('Subscription added');
          this.showAddModal = false;
          this.subForm.reset({
            currency: 'INR', billingCycle: 'Monthly', category: 'Entertainment', 
            startDate: new Date().toISOString().split('T')[0], status: 'Active'
          });
          this.loadData();
        },
        error: (err: any) => {
          this.toastr.error(err?.error?.error || 'Failed to add subscription. Are you logged in?');
        }
      });
    }
  }

  deleteSub(id: string) {
    if (confirm('Are you sure you want to completely delete this subscription record?')) {
      this.subService.deleteSubscription(id).subscribe({
        next: () => {
          this.toastr.success('Subscription deleted');
          this.loadData();
        }
      });
    }
  }

  // Cancel Assistant Actions
  openCancelAssistant(sub: any) {
    this.selectedSubForCancel = sub;
    const name = sub.name.toLowerCase().trim();
    
    if (name.includes('netflix')) {
      this.cancelAlternatives = [
        { name: 'Zee5', price: '₹99/month', saving: '₹550/month', link: 'https://zee5.com', commission: '₹300' },
        { name: 'SonyLiv', price: '₹299/month', saving: '₹350/month', link: 'https://sonyliv.com', commission: '₹200' }
      ];
    } else if (name.includes('adobe') || name.includes('photoshop') || name.includes('illustrator') || name.includes('creative')) {
      this.cancelAlternatives = [
        { name: 'Canva Pro', price: '$12.99/month', saving: '$42/month', link: 'https://canva.com', commission: '$36' }
      ];
    } else {
      this.cancelAlternatives = [
        { name: 'NordVPN', price: '$3.29/month', saving: '$8.70/month', link: 'https://nordvpn.com', commission: '$40' },
        { name: 'Notion Pro', price: '$8/month', saving: 'Free Tier Available', link: 'https://notion.so', commission: '$10' }
      ];
    }
    
    this.showCancelModal = true;
  }

  clickAffiliate(alt: any) {
    this.toastr.success(`Redirecting to ${alt.name} secure deal page...`, 'Deal Activated!');
    
    if (this.selectedSubForCancel) {
      const updated = { ...this.selectedSubForCancel, status: 'Want to Cancel' };
      this.subService.updateSubscription(this.selectedSubForCancel.id, updated).subscribe({
        next: () => {
          this.loadData();
          this.showCancelModal = false;
        }
      });
    }
  }

  confirmCancellation() {
    if (this.selectedSubForCancel) {
      const updated = { ...this.selectedSubForCancel, status: 'Inactive' };
      this.subService.updateSubscription(this.selectedSubForCancel.id, updated).subscribe({
        next: () => {
          this.toastr.success(`${this.selectedSubForCancel.name} marked as Inactive. Money wasted moved to Graveyard!`, 'Moved to Graveyard');
          this.loadData();
          this.showCancelModal = false;
        },
        error: () => this.toastr.error('Failed to cancel subscription.')
      });
    }
  }

  // --- FILTERS & SEARCH ACTIONS ---
  onSearchChange(event: any) {
    this.searchTerm = event.target.value || '';
  }

  onCategoryChange(event: any) {
    this.selectedCategory = event.target.value || 'All';
  }

  onStatusChange(event: any) {
    this.selectedStatus = event.target.value || 'All';
  }

  get filteredSubscriptions(): any[] {
    return this.subscriptions.filter(sub => {
      const matchesSearch = sub.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                            (sub.category && sub.category.toLowerCase().includes(this.searchTerm.toLowerCase()));
      const matchesCategory = this.selectedCategory === 'All' || sub.category === this.selectedCategory;
      const matchesStatus = this.selectedStatus === 'All' || sub.status === this.selectedStatus;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }

  // --- WEB NOTIFICATIONS API ---
  requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  checkUpcomingRenewalsAndNotify() {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const now = new Date();
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

    const upcoming = this.subscriptions.filter(sub => {
      if (sub.status !== 'Active') return false;
      const renewal = new Date(sub.renewalDate);
      return renewal > now && renewal <= twoDaysFromNow;
    });

    if (upcoming.length > 0) {
      const lastNotified = localStorage.getItem('last_notified_renewals');
      const todayStr = now.toDateString();

      if (lastNotified !== todayStr) {
        localStorage.setItem('last_notified_renewals', todayStr);
        upcoming.forEach(sub => {
          new Notification(`Subscription Renewal Alert ⏳`, {
            body: `${sub.name} is renewing soon on ${new Date(sub.renewalDate).toLocaleDateString()} (${sub.amount} ${sub.currency || 'INR'})`,
            icon: '/favicon.png'
          });
        });
      }
    }
  }

  // --- CHART GENERATION & UPDATE ---
  updateCategoryChart() {
    const categoryTotals: { [key: string]: number } = {
      Entertainment: 0,
      Work: 0,
      Health: 0,
      Other: 0
    };

    let totalActiveAmount = 0;

    this.subscriptions.forEach(s => {
      if (s.status === 'Active') {
        let amount = parseFloat(s.amount);

        // Convert to INR if different
        if (s.currency && s.currency !== 'INR' && this.exchangeRates && this.exchangeRates[s.currency]) {
          amount = amount / this.exchangeRates[s.currency];
        }

        if (s.billingCycle === 'Yearly') amount /= 12;
        if (s.billingCycle === 'Weekly') amount *= 4;

        const cat = s.category || 'Other';
        if (categoryTotals[cat] !== undefined) {
          categoryTotals[cat] += amount;
        } else {
          categoryTotals[cat] = amount;
        }
        totalActiveAmount += amount;
      }
    });

    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);

    this.chartData = {
      labels: labels,
      datasets: [
        {
          data: totalActiveAmount > 0 ? data : [],
          backgroundColor: [
            '#6C63FF', // Primary (Entertainment)
            '#10B981', // Emerald (Work)
            '#F43F5E', // Rose (Health)
            '#F59E0B'  // Amber (Other)
          ],
          borderColor: '#111827',
          borderWidth: 2,
          hoverOffset: 6
        }
      ]
    };
  }
}
