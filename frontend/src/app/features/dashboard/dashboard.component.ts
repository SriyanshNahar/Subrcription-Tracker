import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SubscriptionService } from '../../core/services/subscription.service';
import { ToastrService } from 'ngx-toastr';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe, DatePipe, BaseChartDirective],
  template: `
    <div class="py-6">
      <div class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-bold">Dashboard</h1>
        <button (click)="showAddModal = true" class="bg-primary hover:bg-opacity-90 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-primary/20">
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

      <!-- Subscriptions List -->
      <div class="glass-card overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-800">
          <h2 class="text-xl font-semibold">Your Subscriptions</h2>
        </div>
        <div class="divide-y divide-gray-800">
          <div *ngFor="let sub of subscriptions" class="p-6 flex items-center justify-between hover:bg-white/5 transition-colors">
            <div class="flex items-center space-x-4">
              <div class="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center text-xl overflow-hidden">
                <img *ngIf="sub.logo" [src]="sub.logo" alt="logo" class="w-full h-full object-cover">
                <span *ngIf="!sub.logo">{{ sub.name.charAt(0) }}</span>
              </div>
              <div>
                <h3 class="text-lg font-medium text-white">{{ sub.name }}</h3>
                <p class="text-sm text-gray-400">{{ sub.category }} • Renews {{ sub.renewalDate | date:'mediumDate' }}</p>
              </div>
            </div>
            <div class="text-right flex items-center space-x-4">
              <div>
                <p class="text-lg font-bold text-white">{{ sub.amount | currency:sub.currency || 'INR' }}</p>
                <p class="text-sm text-gray-400">/ {{ sub.billingCycle }}</p>
              </div>
              <button (click)="deleteSub(sub.id)" class="text-red-500 hover:text-red-400 p-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
          <div *ngIf="subscriptions.length === 0" class="p-8 text-center text-gray-500">
            No subscriptions found. Click "Add Subscription" to get started!
          </div>
        </div>
      </div>
    </div>

    <!-- Add Modal -->
    <div *ngIf="showAddModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div class="glass-card w-full max-w-md p-6 relative">
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
              <input type="text" formControlName="name" class="w-full bg-[#0F0F0F] border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-primary text-white" placeholder="Netflix, Spotify...">
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-1">Amount</label>
                <input type="number" formControlName="amount" class="w-full bg-[#0F0F0F] border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-primary text-white" placeholder="0.00">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-1">Currency</label>
                <select formControlName="currency" class="w-full bg-[#0F0F0F] border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-primary text-white">
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1">Billing Cycle</label>
              <select formControlName="billingCycle" class="w-full bg-[#0F0F0F] border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-primary text-white">
                <option value="Monthly">Monthly</option>
                <option value="Yearly">Yearly</option>
                <option value="Weekly">Weekly</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1">Category</label>
              <select formControlName="category" class="w-full bg-[#0F0F0F] border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-primary text-white">
                <option value="Entertainment">Entertainment</option>
                <option value="Work">Work</option>
                <option value="Health">Health</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1">Start Date</label>
              <input type="date" formControlName="startDate" class="w-full bg-[#0F0F0F] border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-primary text-white">
            </div>
          </div>
          <button type="submit" [disabled]="subForm.invalid" class="w-full mt-6 bg-primary hover:bg-opacity-90 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50">
            Save Subscription
          </button>
        </form>
      </div>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  subscriptions: any[] = [];
  summary: any = null;
  showAddModal = false;
  subForm: FormGroup;

  constructor(
    private subService: SubscriptionService,
    private fb: FormBuilder,
    private toastr: ToastrService
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
    this.loadData();
  }

  loadData() {
    this.subService.getSubscriptions().subscribe({
      next: (res: any) => this.subscriptions = res,
      error: () => this.toastr.error('Failed to load subscriptions')
    });
    this.subService.getAnalyticsSummary().subscribe({
      next: (res: any) => this.summary = res
    });
  }

  onSubmit() {
    if (this.subForm.valid) {
      const data = { ...this.subForm.value };
      // auto calc renewal date
      const d = new Date(data.startDate);
      if (data.billingCycle === 'Monthly') d.setMonth(d.getMonth() + 1);
      if (data.billingCycle === 'Yearly') d.setFullYear(d.getFullYear() + 1);
      if (data.billingCycle === 'Weekly') d.setDate(d.getDate() + 7);
      data.renewalDate = d.toISOString();
      data.logo = `https://logo.clearbit.com/${data.name.toLowerCase().replace(/s/g, '')}.com`;

      this.subService.addSubscription(data).subscribe({
        next: () => {
          this.toastr.success('Subscription added');
          this.showAddModal = false;
          this.subForm.reset({
            currency: 'INR', billingCycle: 'Monthly', category: 'Entertainment', 
            startDate: new Date().toISOString().split('T')[0], status: 'Active'
          });
          this.loadData();
        }
      });
    }
  }

  deleteSub(id: string) {
    if (confirm('Are you sure?')) {
      this.subService.deleteSubscription(id).subscribe({
        next: () => {
          this.toastr.success('Subscription deleted');
          this.loadData();
        }
      });
    }
  }
}
