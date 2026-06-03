import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { SubscriptionService } from '../../core/services/subscription.service';
import { ToastrService } from 'ngx-toastr';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartConfiguration, ChartData, ChartType, registerables } from 'chart.js';
import { AuthService } from '../../core/services/auth.service';
import { Router, RouterModule } from '@angular/router';
import { SeoService } from '../../core/services/seo.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, CurrencyPipe, DatePipe, BaseChartDirective, RouterModule],
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
        <div class="flex items-center space-x-3">
          <!-- Connect Gmail / Scan Inbox Header Action -->
          <button (click)="openGmailModal()" class="bg-white/10 hover:bg-white/15 text-gray-200 border border-white/10 px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center space-x-2">
            <span>🔍 Scan Gmail Receipts</span>
          </button>
          
          <button (click)="openAddModal()" class="bg-primary hover:bg-opacity-90 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-primary/20">
            + Add Subscription
          </button>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="glass-card p-6">
          <p class="text-gray-400 text-sm font-medium mb-1">Total Monthly Spend</p>
          <p class="text-4xl font-bold text-white">{{ summary?.totalMonthly || 0 | currency:userProfileCurrency }}</p>
        </div>
        <div class="glass-card p-6">
          <p class="text-gray-400 text-sm font-medium mb-1">Total Yearly Spend</p>
          <p class="text-4xl font-bold text-accent">{{ summary?.totalYearly || 0 | currency:userProfileCurrency }}</p>
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
              <div *ngFor="let sub of filteredSubscriptions" 
                   (click)="pingSubscription(sub.id)"
                   class="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/5 transition-colors cursor-pointer">
                <div class="flex items-center space-x-4">
                  <div class="w-12 h-12 flex-shrink-0 bg-gray-800 rounded-xl flex items-center justify-center text-xl overflow-hidden">
                    <img *ngIf="sub.logo" [src]="getLogoUrl(sub)" (error)="sub.logo = null" alt="logo" class="w-full h-full object-cover">
                    <span *ngIf="!sub.logo">{{ sub.name.charAt(0) }}</span>
                  </div>
                  <div>
                    <h3 class="text-base sm:text-lg font-medium text-white flex flex-wrap items-center gap-2">
                      <span>{{ sub.name }}</span>
                      
                      <!-- AI ROI Score Badge -->
                      <ng-container *ngIf="getRoiScoreForSub(sub.id) as r">
                        <span *ngIf="r.score >= 8" class="bg-emerald-500/10 text-emerald-400 text-[10px] px-2.5 py-0.5 rounded-full font-bold border border-emerald-500/25">
                          ⭐ {{ r.score }}/10 Great Value
                        </span>
                        <span *ngIf="r.score >= 4 && r.score <= 7" class="bg-amber-500/10 text-amber-400 text-[10px] px-2.5 py-0.5 rounded-full font-bold border border-amber-500/25">
                          ⚠️ {{ r.score }}/10 Review This
                        </span>
                        <span *ngIf="r.score <= 3" class="bg-red-500/10 text-red-400 text-[10px] px-2.5 py-0.5 rounded-full font-bold border border-red-500/25">
                          🔴 {{ r.score }}/10 Cancel This
                        </span>
                      </ng-container>

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
                    <button *ngIf="sub.status !== 'Inactive'" (click)="openCancelAssistant(sub); $event.stopPropagation()" class="text-amber-500 hover:text-amber-400 p-2" title="Cancel Assistant">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </button>
                    <button (click)="deleteSub(sub.id); $event.stopPropagation()" class="text-red-500 hover:text-red-400 p-2" title="Delete Permanent">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              <div *ngIf="filteredSubscriptions.length === 0" class="p-8 text-center text-gray-500">
                No subscriptions found. Click "+ Add Subscription" or adjust filters to see results!
              </div>
            </div>
          </div>
        </div>

        <!-- Right Section: Spend Analytics Chart & ROI Report (Col Span 4) -->
        <div class="lg:col-span-4 space-y-6">
          
          <!-- Category breakdown chart card -->
          <div class="glass-card p-6 flex flex-col justify-between h-[360px] border border-gray-700/50 shadow-2xl relative overflow-hidden">
            <h3 class="text-lg font-bold text-white mb-4">Spend Breakdown</h3>
            <div class="relative flex-1 flex items-center justify-center min-h-[200px]">
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

          <!-- AI ROI Report Summary Panel -->
          <div class="glass-card p-6 border border-gray-700/50 shadow-2xl relative overflow-hidden">
            <div class="absolute -top-10 -right-10 w-24 h-24 bg-primary/10 rounded-full blur-2xl pointer-events-none"></div>
            <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-1.5">
              <span>📊</span>
              <span>AI Subscription ROI Report</span>
            </h3>

            <!-- Premium Loading Spinner -->
            <div *ngIf="isLoadingRoiScores || roiScores.length === 0" class="py-8 text-center text-gray-400 flex flex-col items-center justify-center space-y-3">
              <svg class="animate-spin h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              <span class="text-xs font-bold font-sans">Analyzing ROI scores...</span>
            </div>

            <!-- ROI Panels Content -->
            <ng-container *ngIf="!isLoadingRoiScores && roiScores.length > 0">
              <!-- Monthly Savings Capsule -->
              <div class="p-3 bg-white/5 border border-white/5 rounded-2xl mb-5 flex items-center justify-between">
                <div>
                  <p class="text-[10px] text-gray-400 font-extrabold tracking-wider uppercase">Potential Monthly Savings</p>
                  <p class="text-2xl font-black text-emerald-400">{{ potentialSavings | currency:userProfileCurrency }}</p>
                </div>
                <span class="text-2xl">💸</span>
              </div>

              <!-- Top Value Subs -->
              <div class="mb-4">
                <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">⭐ Great Value Subscriptions</h4>
                <div class="space-y-2">
                  <div *ngFor="let item of topValueSubs" class="flex items-center justify-between text-xs p-2 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                    <span class="text-white font-semibold">{{ item.name }}</span>
                    <span class="text-emerald-400 font-extrabold">{{ item.score }}/10</span>
                  </div>
                  <div *ngIf="topValueSubs.length === 0" class="text-xs text-gray-500 italic p-1">No great value subscriptions found. Log usage by clicking cards!</div>
                </div>
              </div>

              <!-- Suggested Cancellations -->
              <div>
                <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">🔴 Suggested Cancellations</h4>
                <div class="space-y-2">
                  <div *ngFor="let item of suggestedCancellations" class="flex items-center justify-between text-xs p-2 bg-red-500/5 border border-red-500/10 rounded-xl">
                    <span class="text-white font-semibold text-left truncate max-w-[120px]">{{ item.name }}</span>
                    <span class="text-red-400 font-extrabold text-right shrink-0">{{ item.score }}/10</span>
                  </div>
                  <div *ngIf="suggestedCancellations.length === 0" class="text-xs text-gray-500 italic p-1">No wasted subscriptions found. Great budget discipline!</div>
                </div>
              </div>
            </ng-container>

          </div>

        </div>

      </div>
    </div>

    <!-- Onboarding Country Selector Modal (Mandatory UI pop-up driving Tax + Stripe payments) -->
    <div *ngIf="showCountryModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div class="glass-card w-full max-w-md p-6 relative border border-primary/20 shadow-2xl text-center">
        <!-- Close/Dismiss button -->
        <button (click)="showCountryModal = false" class="absolute top-4 right-4 text-gray-400 hover:text-white bg-transparent border-0 cursor-pointer text-lg font-black transition-colors focus:outline-none" title="Close">✕</button>

        <!-- Top decorative glow -->
        <div class="absolute -top-12 -left-12 w-28 h-28 bg-primary/25 rounded-full blur-2xl pointer-events-none"></div>

        <h2 class="text-2xl font-black text-white mb-2">Configure Regional Profile 🌍</h2>
        <p class="text-xs text-gray-400 leading-relaxed mb-6">
          Please select your default country before managing subscriptions. This allows us to apply precise tax brackets and direct you to the most optimized payment gateway checkout.
        </p>

        <div class="space-y-4 text-left">
          <label class="block text-xs font-black text-gray-400 uppercase tracking-widest">Select Your Country</label>
          <select [(ngModel)]="selectedOnboardingCountry" class="w-full bg-[#090915] border border-gray-700/60 rounded-xl px-4 py-3 focus:outline-none focus:border-primary text-white text-sm cursor-pointer">
            <option value="IN">🇮🇳 India (INR - ₹)</option>
            <option value="US">🇺🇸 United States (USD - $)</option>
            <option value="GB">🇬🇧 United Kingdom (GBP - £)</option>
            <option value="DE">🇩🇪 Germany (EUR - €)</option>
            <option value="FR">🇫🇷 France (EUR - €)</option>
            <option value="AU">🇦🇺 Australia (AUD - A$)</option>
            <option value="CA">🇨🇦 Canada (CAD - C$)</option>
            <option value="SG">🇸🇬 Singapore (SGD - S$)</option>
            <option value="AE">🇦🇪 United Arab Emirates (AED - د.إ)</option>
            <option value="JP">🇯🇵 Japan (JPY - ¥)</option>
            <option value="CH">🇨🇭 Switzerland (CHF - Fr)</option>
            <option value="SE">🇸🇪 Sweden (SEK - kr)</option>
            <option value="NO">🇳🇴 Norway (NOK - kr)</option>
            <option value="DK">🇩🇰 Denmark (DKK - kr)</option>
            <option value="NZ">🇳🇿 New Zealand (NZD - NZ$)</option>
            <option value="BR">🇧🇷 Brazil (BRL - R$)</option>
          </select>
        </div>

        <button (click)="saveOnboardingCountry()" class="w-full mt-8 bg-gradient-to-r from-primary to-accent hover:opacity-95 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg active:scale-95 cursor-pointer">
          Confirm and Unlock Dashboard
        </button>
      </div>
    </div>

    <!-- Add Subscription Modal -->
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
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="AUD">AUD (A$)</option>
                  <option value="CAD">CAD (C$)</option>
                  <option value="SGD">SGD (S$)</option>
                  <option value="AED">AED (د.إ)</option>
                  <option value="JPY">JPY (¥)</option>
                  <option value="CHF">CHF (Fr)</option>
                  <option value="SEK">SEK (kr)</option>
                  <option value="NOK">NOK (kr)</option>
                  <option value="DKK">DKK (kr)</option>
                  <option value="NZD">NZD (NZ$)</option>
                  <option value="BRL">BRL (R$)</option>
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

    <!-- Gmail Ghost Subscription Detector Modal -->
    <div *ngIf="showGmailModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div class="glass-card w-full max-w-2xl p-6 relative border border-white/10 shadow-2xl">
        <button (click)="showGmailModal = false" class="absolute top-4 right-4 text-gray-400 hover:text-white">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div class="flex items-center space-x-3 mb-4">
          <span class="text-3xl">🔍</span>
          <h2 class="text-2xl font-black text-white">Gmail Ghost Subscription Detector</h2>
        </div>

        <p class="text-sm text-gray-400 mb-6 leading-relaxed">
          Connect your Gmail inbox to securely scan receipt email subjects from the last 90 days. We never store or read full email content, and your messages never leave the device.
          <strong class="text-emerald-400 block mt-2">🔒 Privacy Notice: We only read receipt subjects, never body text or storage contents.</strong>
        </p>

        <!-- Scanning Actions -->
        <div class="flex flex-wrap items-center gap-4 mb-6">
          <button (click)="connectGmail()" class="bg-gradient-to-r from-red-600 to-amber-600 hover:opacity-95 text-white font-bold px-4 py-2 rounded-xl text-sm transition-all flex items-center space-x-2">
            <span>🔴 Connect Gmail Inbox</span>
          </button>

          <button (click)="scanGmail()" [disabled]="isScanningGmail" class="bg-primary hover:bg-opacity-95 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all flex items-center space-x-2 shadow-lg shadow-primary/10">
            <span *ngIf="isScanningGmail" class="animate-spin mr-1">🔄</span>
            <span>Scan Receipt Emails</span>
          </button>
        </div>

        <!-- Scan results progress spinner -->
        <div *ngIf="isScanningGmail" class="py-12 text-center text-gray-400 flex flex-col items-center justify-center space-y-3">
          <svg class="animate-spin h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          <span class="font-bold text-sm">Parsing receipt email subject metadata... Please wait</span>
        </div>

        <!-- Discovered ghost subscriptions cards list -->
        <div *ngIf="!isScanningGmail && gmailScanResults.length > 0" class="space-y-4 max-h-[300px] overflow-y-auto pr-1">
          <h3 class="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">We found {{ gmailScanResults.length }} untracked subscriptions:</h3>
          <div *ngFor="let ghost of gmailScanResults" class="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl gap-3">
            <div class="text-left shrink-1 truncate">
              <h4 class="text-white font-bold text-sm">{{ ghost.companyName }}</h4>
              <p class="text-xs text-gray-500 font-semibold mt-0.5">Last Receipt Date: {{ ghost.lastSeen | date:'mediumDate' }}</p>
            </div>
            <div class="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
              <!-- Inline Amount Field so the user can fill price manually -->
              <input type="number" #amtInput placeholder="Price" class="w-20 bg-black/40 border border-gray-700/60 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 text-xs text-white placeholder-gray-600">
              <button (click)="addDetectedSub(ghost, amtInput.value)" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition-all shrink-0">
                + Add Dashboard
              </button>
            </div>
          </div>
        </div>

        <div *ngIf="!isScanningGmail && gmailScanResults.length === 0" class="py-12 text-center text-gray-500 italic text-sm">
          No untracked receipts found. Complete scan to audit receipts.
        </div>

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

        <button (click)="confirmCancellation()" class="w-full text-red-500 text-sm mt-6 hover:text-red-400 font-semibold transition text-center block bg-transparent border-0">
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
  userProfileCurrency = 'INR';

  // Search & Filters state
  searchTerm = '';
  selectedCategory = 'All';
  selectedStatus = 'All';

  // Currency Exchange Rates state
  exchangeRates: any = null;

  // AI ROI Scoring state
  roiScores: any[] = [];
  potentialSavings = 0;
  isLoadingRoiScores = false;

  // Onboarding country selector state
  showCountryModal = false;
  selectedOnboardingCountry = 'US';

  // Gmail scanning state
  showGmailModal = false;
  isScanningGmail = false;
  gmailScanResults: any[] = [];

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
            return ` ${this.userProfileCurrency} ${val.toFixed(2)}/mo`;
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
    private seo: SeoService,
    private http: HttpClient
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
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    if (sessionId) {
      console.log('Stripe redirect detected:', sessionId);
      // Show success toast
      this.showSuccessToast('Payment successful! Plan activated.');
      // Clean URL
      window.history.replaceState({}, '', '/dashboard');
    }
    // Then load dashboard normally - wrap in try/catch:
    try {
      this.loadDashboardData();
    } catch(err) {
      console.error('Dashboard load error:', err);
    }

    this.seo.generateTags({
      title: 'Premium Analytics Dashboard',
      description: 'Optimize your digital spending in one elegant visual hub. Track active subscriptions, renewals, category spend, and reclaim wasted money with Vaultly.'
    });
    this.fetchRoiScores();

    // --- CHROME EXTENSION ADDSUB PARAMETER INTERCEPTOR ---
    const addSub = params.get('addSub');
    if (addSub) {
      this.showAddModal = true;
      this.subForm.patchValue({
        name: addSub,
        currency: this.userProfileCurrency || 'INR',
        billingCycle: 'Monthly',
        category: 'Entertainment',
        startDate: new Date().toISOString().split('T')[0],
        status: 'Active'
      });
      // Clean query parameter from browser address bar to prevent reopening on reload
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
    
    this.auth.userProfile$.subscribe(profile => {
      if (profile) {
        this.activeUserPlan = profile.plan || 'free';
        this.userProfileCurrency = profile.currency || 'INR';
        this.subForm.patchValue({ currency: this.userProfileCurrency });
        
        // --- MANDATORY ONBOARDING SELECTOR ---
        if (!profile.country && !sessionStorage.getItem('onboardingCountryModalShown')) {
          this.showCountryModal = true;
          sessionStorage.setItem('onboardingCountryModalShown', 'true');
        }
      }
    });

    this.requestNotificationPermission();
  }

  showSuccessToast(msg: string) {
    this.toastr.success(msg, 'Payment Successful');
  }

  loadDashboardData() {
    this.loadData();
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
        // Dynamic full 15 currencies fallback rates
        this.exchangeRates = {
          INR: 1, USD: 0.012, EUR: 0.011, GBP: 0.0094, AUD: 0.018,
          CAD: 0.016, SGD: 0.016, AED: 0.044, JPY: 1.88, CHF: 0.011,
          SEK: 0.13, NOK: 0.13, DKK: 0.083, NZD: 0.020, BRL: 0.062
        };
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
        
        // Fetch AI ROI Scores reactively
        this.fetchRoiScores();
      },
      error: () => this.toastr.error('Failed to load subscriptions')
    });
  }

  // AI ROI Score Fetch
  fetchRoiScores() {
    this.isLoadingRoiScores = true;
    this.http.get(`${environment.apiUrl}/api/analytics/roi-scores`).subscribe({
      next: (res: any) => {
        console.log('ROI Scores returned from API:', res);
        this.roiScores = res || [];
        this.calculateSavings();
        this.isLoadingRoiScores = false;
      },
      error: (err) => {
        console.error('Failed to load dynamic ROI scores:', err);
        this.isLoadingRoiScores = false;
      }
    });
  }

  // Calculate potential savings (sum of score <= 3 subs)
  calculateSavings() {
    let savings = 0;
    this.roiScores.forEach(s => {
      if (s.score <= 3) {
        let amount = parseFloat(s.amount) || 0;
        // Convert to INR first to sum correctly, then convert to user default currency
        const fromCurr = s.currency || 'INR';
        const toCurr = this.userProfileCurrency;
        
        if (fromCurr !== toCurr && this.exchangeRates) {
          const rateFrom = this.exchangeRates[fromCurr] || 1;
          const rateTo = this.exchangeRates[toCurr] || 1;
          const amountInINR = amount / rateFrom;
          amount = amountInINR * rateTo;
        }
        savings += amount;
      }
    });
    this.potentialSavings = savings;
  }

  getRoiScoreForSub(subId: string) {
    return this.roiScores.find(r => r.subscriptionId === subId);
  }

  get topValueSubs(): any[] {
    return [...this.roiScores].sort((a, b) => b.score - a.score).filter(s => s.score >= 8).slice(0, 3);
  }

  get suggestedCancellations(): any[] {
    return [...this.roiScores].sort((a, b) => a.score - b.score).filter(s => s.score <= 3).slice(0, 3);
  }

  // Onboarding Country Selection Save
  saveOnboardingCountry() {
    this.toastr.info('Updating profile regions...');
    this.auth.updateUserProfile({ country: this.selectedOnboardingCountry }).subscribe({
      next: () => {
        this.toastr.success('Profile region successfully updated!', 'Region Saved');
        this.showCountryModal = false;
        this.loadData();
      },
      error: () => this.toastr.error('Failed to update country settings.')
    });
  }

  // Card row silent ping listener to track subscription activity
  pingSubscription(subId: string) {
    this.http.get(`${environment.apiUrl}/api/subscriptions/${subId}/ping`).subscribe({
      next: () => {
        // Silently refresh scores reactively
        this.fetchRoiScores();
      }
    });
  }

  // Gmail scanner trigger modals
  openGmailModal() {
    this.showGmailModal = true;
    this.gmailScanResults = [];
  }

  connectGmail() {
    const profile = this.auth.userProfile$.value;
    const userId = profile ? (profile.id || profile.uid) : 'state';
    this.http.get(`${environment.apiUrl}/api/gmail/auth?userId=${userId}`).subscribe({
      next: (res: any) => {
        if (res && res.url) {
          window.open(res.url, '_blank');
          this.toastr.info('OAuth page opened. Complete authorization in the new tab!');
        }
      },
      error: () => this.toastr.error('Failed to start Google authentication workflow.')
    });
  }

  scanGmail() {
    this.isScanningGmail = true;
    this.gmailScanResults = [];
    this.http.post(`${environment.apiUrl}/api/gmail/scan`, {}).subscribe({
      next: (res: any) => {
        this.gmailScanResults = res.ghosts || [];
        this.isScanningGmail = false;
        this.toastr.success(`Audited! Found ${this.gmailScanResults.length} unregistered digital subscriptions.`, 'Scan Completed');
      },
      error: (err: any) => {
        this.isScanningGmail = false;
        this.toastr.error(err?.error?.error || 'Gmail scanner check failed. Make sure your account is connected.');
      }
    });
  }

  addDetectedSub(ghost: any, amountValue: string) {
    const amt = parseFloat(amountValue);
    if (isNaN(amt) || amt <= 0) {
      this.toastr.warning('Please enter a valid monthly price amount.');
      return;
    }

    const payload = {
      name: ghost.companyName,
      amount: amt,
      currency: this.userProfileCurrency,
      billingCycle: 'Monthly',
      category: 'Entertainment',
      startDate: ghost.lastSeen ? ghost.lastSeen.split('T')[0] : new Date().toISOString().split('T')[0]
    };

    this.toastr.info(`Saving ${ghost.companyName}...`);
    this.http.post(`${environment.apiUrl}/api/gmail/add-detected`, payload).subscribe({
      next: () => {
        this.toastr.success(`Success! Added ${ghost.companyName} to dashboard tracking.`, 'Receipt Synced');
        this.gmailScanResults = this.gmailScanResults.filter(g => g.companyName !== ghost.companyName);
        this.loadData();
      },
      error: (err: any) => {
        this.toastr.error(err?.error?.error || 'Failed to register receipt subscription.');
      }
    });
  }

  calculateSummary() {
    let totalMonthly = 0;
    let activeCount = 0;

    this.subscriptions.forEach(s => {
      if (s.status === 'Active' || s.status === 'active') {
        activeCount++;
        let amount = parseFloat(s.amount);

        // Convert dynamically to profile default currency
        const fromCurr = s.currency || 'INR';
        const toCurr = this.userProfileCurrency;
        
        if (fromCurr !== toCurr && this.exchangeRates) {
          const rateFrom = this.exchangeRates[fromCurr] || 1;
          const rateTo = this.exchangeRates[toCurr] || 1;
          const amountInINR = amount / rateFrom;
          amount = amountInINR * rateTo;
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

  getPlanLimit(plan: string): number {
    if (plan === 'free') return 3;
    if (plan === 'student') return 6;
    if (plan === 'pro') return 20;
    return Infinity;
  }

  getPlanDisplayName(plan: string): string {
    if (plan === 'free') return 'Starter Free';
    if (plan === 'student') return 'Student Saver';
    if (plan === 'pro') return 'Premium Pro';
    if (plan === 'family') return 'Shared Family';
    if (plan === 'corporate') return 'Corporate Plan';
    return 'Premium';
  }

  openAddModal() {
    const limit = this.getPlanLimit(this.activeUserPlan);
    if (this.subscriptions.length >= limit) {
      this.toastr.warning(`Your ${this.getPlanDisplayName(this.activeUserPlan)} plan is limited to ${limit} subscriptions. Please upgrade to a higher tier!`, 'Limit Reached!');
      this.router.navigate(['/pricing']);
      return;
    }
    this.showAddModal = true;
  }

  onSubmit() {
    if (this.subForm.valid) {
      const limit = this.getPlanLimit(this.activeUserPlan);
      if (this.subscriptions.length >= limit) {
        this.toastr.warning(`Your ${this.getPlanDisplayName(this.activeUserPlan)} plan is limited to ${limit} subscriptions. Please upgrade to a higher tier!`, 'Limit Reached!');
        this.router.navigate(['/pricing']);
        return;
      }

      const data = { ...this.subForm.value };
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
            currency: this.userProfileCurrency, billingCycle: 'Monthly', category: 'Entertainment', 
            startDate: new Date().toISOString().split('T')[0], status: 'Active'
          });
          this.loadData();
        },
        error: (err: any) => {
          this.toastr.error(err?.error?.error || 'Failed to add subscription.');
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
      if (sub.status !== 'Active' && sub.status !== 'active') return false;
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
      if (s.status === 'Active' || s.status === 'active') {
        let amount = parseFloat(s.amount);

        // Convert dynamically to profile default currency
        const fromCurr = s.currency || 'INR';
        const toCurr = this.userProfileCurrency;
        
        if (fromCurr !== toCurr && this.exchangeRates) {
          const rateFrom = this.exchangeRates[fromCurr] || 1;
          const rateTo = this.exchangeRates[toCurr] || 1;
          const amountInINR = amount / rateFrom;
          amount = amountInINR * rateTo;
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
