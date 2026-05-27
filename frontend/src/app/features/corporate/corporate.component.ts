import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../environments/environment';
import { SeoService } from '../../core/services/seo.service';

declare var Razorpay: any;

@Component({
  selector: 'app-corporate',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="min-h-screen bg-background py-12 px-4 md:px-8 relative overflow-hidden flex flex-col items-center">
      <!-- Decorative Background Ambient Lights -->
      <div class="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[130px] pointer-events-none"></div>
      <div class="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] bg-accent/10 rounded-full blur-[130px] pointer-events-none"></div>

      <!-- ========================================== -->
      <!-- STATE 1: B2B PITCH PAGE FOR NON-CORPORATE USERS -->
      <!-- ========================================== -->
      <ng-container *ngIf="userProfile && userProfile.plan !== 'corporate' && !org">
        <div class="max-w-5xl w-full z-10 space-y-12">
          
          <div class="text-center space-y-4">
            <span class="bg-primary/20 text-primary border border-primary/30 text-xs px-4 py-1.5 rounded-full font-black uppercase tracking-wider">SubTrackr for Enterprises</span>
            <h1 class="text-4xl md:text-6xl font-black text-white tracking-tight">
              Stop Wasting Money on <span class="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Unused SaaS Licenses</span>
            </h1>
            <p class="text-gray-400 text-lg md:text-xl max-w-3xl mx-auto leading-relaxed">
              Track multi-user software seats (Slack, Figma, Zoom, GitHub), flag seats assigned to ex-employees, and generate instant GST-ready invoice reports for your finance team.
            </p>
          </div>

          <!-- Feature Cards Grid -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div class="glass-card p-6 border border-white/5 hover:border-primary/40 hover:scale-[1.03] transition duration-300">
              <div class="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center text-2xl text-primary mb-4 font-bold">🔍</div>
              <h3 class="text-white font-bold text-lg mb-2">Employee Seat Auditing</h3>
              <p class="text-gray-400 text-sm leading-relaxed">
                Scan all registered subscriptions and immediately identify seats allocated to ex-employees who have left the company database.
              </p>
            </div>

            <div class="glass-card p-6 border border-white/5 hover:border-primary/40 hover:scale-[1.03] transition duration-300">
              <div class="w-12 h-12 bg-accent/20 rounded-2xl flex items-center justify-center text-2xl text-accent mb-4 font-bold">📄</div>
              <h3 class="text-white font-bold text-lg mb-2">GST-Ready Expense Summaries</h3>
              <p class="text-gray-400 text-sm leading-relaxed">
                Instantly export itemized, watermark-free PDF statement reports with automated 18% GST computations to feed your CA filings.
              </p>
            </div>

            <div class="glass-card p-6 border border-white/5 hover:border-primary/40 hover:scale-[1.03] transition duration-300">
              <div class="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-2xl text-emerald-400 mb-4 font-bold">👥</div>
              <h3 class="text-white font-bold text-lg mb-2">Up to 50 Team Members</h3>
              <p class="text-gray-400 text-sm leading-relaxed">
                Invite managers and viewers with strict role-based permission locks to keep subscription expenses securely structured.
              </p>
            </div>
          </div>

          <!-- Price & Buy Box -->
          <div class="glass-card p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group max-w-3xl mx-auto">
            <div class="absolute -right-24 -top-24 w-48 h-48 bg-primary/25 rounded-full blur-[80px] group-hover:scale-110 transition duration-300"></div>
            
            <div class="space-y-2 text-left relative z-10">
              <h3 class="text-white font-black text-2xl">B2B Corporate Tier</h3>
              <p class="text-gray-400 text-sm max-w-md">Unlimited subscription logging, shared company dashboard, employee audits, priority CA support.</p>
              <div class="flex items-baseline gap-2 pt-2">
                <span class="text-4xl font-black text-white">₹999</span>
                <span class="text-gray-500 text-sm font-medium">/ month per company</span>
              </div>
            </div>

            <button (click)="buyCorporateTier()" [disabled]="isLoading"
              class="w-full md:w-auto bg-gradient-to-r from-primary to-accent hover:opacity-95 hover:scale-[1.03] text-white font-extrabold px-8 py-4 rounded-2xl shadow-lg shadow-primary/25 transition duration-300 cursor-pointer shrink-0 relative z-10 flex items-center justify-center gap-2">
              <span *ngIf="isLoading"><svg class="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg></span>
              <span>🏢 Upgrade to Corporate</span>
            </button>
          </div>
        </div>
      </ng-container>

      <!-- ========================================== -->
      <!-- STATE 2: WIZARD SETUP FOR WARM CORPORATE PLAN USERS -->
      <!-- ========================================== -->
      <ng-container *ngIf="userProfile && userProfile.plan === 'corporate' && !org">
        <div class="max-w-xl w-full z-10">
          <div class="glass-card p-8 relative overflow-hidden text-white">
            <div class="absolute -right-24 -top-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-[80px]"></div>
            
            <div class="flex items-center gap-4 mb-6">
              <div class="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-emerald-500/20">🏢</div>
              <div>
                <h3 class="text-white font-black text-xl">Create B2B Company</h3>
                <p class="text-gray-400 text-xs">Set up your shared organization profile</p>
              </div>
            </div>

            <form (ngSubmit)="createCompany()" class="space-y-4 font-sans text-xs">
              <div>
                <label class="block text-gray-400 text-sm mb-1.5 font-bold">Company Legal Name</label>
                <input [(ngModel)]="newOrgName" name="name" type="text" placeholder="Acme Private Limited" required
                  class="w-full bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3.5 text-white focus:outline-none focus:border-emerald-500 text-sm transition">
              </div>

              <div>
                <label class="block text-gray-400 text-sm mb-1.5 font-bold">Company GSTIN (15-digit)</label>
                <input [(ngModel)]="newOrgGST" name="gst" type="text" placeholder="27AAPFU0939F1ZV" maxlength="15" required
                  class="w-full bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3.5 text-white focus:outline-none focus:border-emerald-500 text-sm transition uppercase font-mono">
              </div>

              <div>
                <label class="block text-gray-400 text-sm mb-1.5 font-bold">Primary Business Currency</label>
                <select [(ngModel)]="newOrgCurrency" name="currency"
                  class="w-full bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3.5 text-white focus:outline-none focus:border-emerald-500 text-sm transition cursor-pointer">
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>

              <div class="bg-white/5 border border-white/5 rounded-2xl p-4 text-[11px] text-gray-400 leading-relaxed">
                ℹ️ You will be registered as the administrative lead (<strong>Admin</strong>). You can immediately invite up to 50 employees using their corporate emails.
              </div>

              <button type="submit" [disabled]="isLoading || !newOrgName || !newOrgGST"
                class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl transition shadow-lg shadow-emerald-600/10 transform active:scale-98 flex items-center justify-center gap-2 cursor-pointer mt-4">
                <span *ngIf="isLoading"><svg class="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg></span>
                <span>Setup Company Dashboard</span>
              </button>
            </form>
          </div>
        </div>
      </ng-container>

      <!-- ========================================== -->
      <!-- STATE 3: ACTIVE B2B PORTAL COMPONENT -->
      <!-- ========================================== -->
      <ng-container *ngIf="org">
        <div class="max-w-6xl w-full z-10 space-y-8">
          
          <!-- Portal Header -->
          <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div class="text-left space-y-1">
              <span class="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-wider">Corporate Command Center</span>
              <h1 class="text-3xl md:text-4xl font-black text-white">{{ org.name }}</h1>
              <p class="text-gray-500 text-xs font-mono pl-0.5">GSTIN: {{ org.gstNumber }} • Role: <span class="capitalize text-emerald-400 font-bold">{{ member?.role }}</span></p>
            </div>
            
            <button *ngIf="member?.role !== 'viewer'" (click)="openAddModal()"
              class="bg-primary hover:bg-opacity-90 text-white font-bold px-5 py-3 rounded-2xl text-sm transition shadow-lg shadow-primary/20 cursor-pointer flex items-center gap-2">
              <span>+ Add SaaS Subscription</span>
            </button>
          </div>

          <!-- Corporate Statistics Cards Grid -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div class="glass-card p-6">
              <p class="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Company Monthly Spend</p>
              <p class="text-3xl font-black text-white">₹{{ dashboardData?.totalMonthly || 0 | number:'1.2-2' }}</p>
            </div>
            <div class="glass-card p-6">
              <p class="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Company Projected Yearly</p>
              <p class="text-3xl font-black text-accent">₹{{ dashboardData?.totalYearly || 0 | number:'1.2-2' }}</p>
            </div>
            <div class="glass-card p-6">
              <p class="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Total Subscriptions</p>
              <p class="text-3xl font-black text-white">{{ dashboardData?.subCount || 0 }}</p>
            </div>
            <div class="glass-card p-6 border border-red-500/15 relative overflow-hidden group">
              <div *ngIf="dashboardData?.wastedAmount > 0" class="absolute inset-0 bg-red-500/5 animate-pulse"></div>
              <p class="text-red-400 text-xs font-bold uppercase tracking-wider mb-1">Wasted License Expenses</p>
              <p class="text-3xl font-black text-red-500">₹{{ dashboardData?.wastedAmount || 0 | number:'1.2-2' }}</p>
              <span class="text-[10px] text-gray-500 mt-1 block">{{ dashboardData?.wastedCount || 0 }} seat(s) flagged wasted</span>
            </div>
          </div>

          <!-- Navigation Tabs -->
          <div class="flex items-center space-x-1.5 border-b border-gray-800/80 pb-0.5 max-w-full overflow-x-auto">
            <button (click)="activeTab = 'overview'" [class.border-primary]="activeTab === 'overview'" [class.text-white]="activeTab === 'overview'"
              class="border-b-2 border-transparent px-5 py-3 text-xs font-bold text-gray-400 hover:text-white transition duration-200 uppercase tracking-wider cursor-pointer">
              Overview
            </button>
            <button (click)="activeTab = 'audit'" [class.border-primary]="activeTab === 'audit'" [class.text-white]="activeTab === 'audit'"
              class="border-b-2 border-transparent px-5 py-3 text-xs font-bold text-gray-400 hover:text-white transition duration-200 uppercase tracking-wider cursor-pointer flex items-center gap-1.5">
              <span>Seat Auditor</span>
              <span *ngIf="wastedSeatsCount > 0" class="bg-red-500 text-white-force text-[9px] px-1.5 py-0.5 rounded-full font-black">{{ wastedSeatsCount }}</span>
            </button>
            <button (click)="activeTab = 'team'" [class.border-primary]="activeTab === 'team'" [class.text-white]="activeTab === 'team'"
              class="border-b-2 border-transparent px-5 py-3 text-xs font-bold text-gray-400 hover:text-white transition duration-200 uppercase tracking-wider cursor-pointer">
              Team members
            </button>
            <button (click)="activeTab = 'gst'" [class.border-primary]="activeTab === 'gst'" [class.text-white]="activeTab === 'gst'"
              class="border-b-2 border-transparent px-5 py-3 text-xs font-bold text-gray-400 hover:text-white transition duration-200 uppercase tracking-wider cursor-pointer">
              GST Invoicing
            </button>
          </div>

          <!-- ========================================== -->
          <!-- TAB CONTENT 1: OVERVIEW -->
          <!-- ========================================== -->
          <div *ngIf="activeTab === 'overview'" class="glass-card overflow-hidden">
            <div class="px-6 py-5 border-b border-gray-800 flex justify-between items-center bg-black/10">
              <h3 class="text-white font-bold text-base">Corporate Subscription Board</h3>
              <span class="text-xs text-gray-400">{{ dashboardData?.subscriptions?.length || 0 }} logged tools</span>
            </div>

            <div class="divide-y divide-gray-800/80">
              <div *ngFor="let sub of dashboardData?.subscriptions" class="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-white/5 transition duration-200">
                <div class="flex items-center gap-4">
                  <div class="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center text-white font-black text-lg shrink-0">
                    {{ sub.name?.charAt(0) }}
                  </div>
                  <div class="text-left">
                    <h4 class="text-white font-bold text-base flex flex-wrap items-center gap-2">
                      <span>{{ sub.name }}</span>
                      <span *ngIf="sub.status === 'inactive'" class="bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] px-2 py-0.5 rounded-full font-black">Inactive 🪦</span>
                    </h4>
                    <p class="text-gray-400 text-xs">{{ sub.category }} • Assigned: <strong>{{ sub.assignedTo?.length || 0 }} seat(s)</strong></p>
                  </div>
                </div>

                <div class="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto border-t border-gray-800 sm:border-0 pt-3 sm:pt-0">
                  <div class="text-left sm:text-right">
                    <p class="text-white font-bold text-base">₹{{ sub.amount | number:'1.2-2' }}</p>
                    <p class="text-gray-500 text-xs">/ {{ sub.billingCycle }}</p>
                  </div>

                  <div *ngIf="member?.role !== 'viewer'" class="flex items-center gap-2">
                    <button (click)="openEditModal(sub)" class="text-amber-500 hover:text-amber-400 p-1.5 rounded hover:bg-white/5">✏️</button>
                    <button (click)="deleteSubscription(sub.id)" class="text-red-500 hover:text-red-400 p-1.5 rounded hover:bg-white/5">🗑️</button>
                  </div>
                </div>
              </div>

              <div *ngIf="!dashboardData || dashboardData.subscriptions?.length === 0" class="p-12 text-center text-gray-500">
                No subscription licenses logged yet. Click "+ Add SaaS Subscription" to begin auditing!
              </div>
            </div>
          </div>

          <!-- ========================================== -->
          <!-- TAB CONTENT 2: SEAT AUDITOR (INACTIVITY CHECKS) -->
          <!-- ========================================== -->
          <div *ngIf="activeTab === 'audit'" class="space-y-6">
            
            <div class="glass-card p-6 text-left">
              <h3 class="text-white font-bold text-lg mb-2">How SaaS seat auditing works:</h3>
              <p class="text-gray-400 text-sm leading-relaxed">
                When employee contracts terminate or accounts are suspended, software seat bindings inside Figma, Slack, or GitHub often remain active and continue billing silently. SubTrackr compares active company member emails against assigned subscription seats, immediately flagging ex-employee seats to save you money.
              </p>
            </div>

            <div class="glass-card overflow-hidden">
              <div class="px-6 py-5 border-b border-gray-800 flex justify-between items-center bg-black/10">
                <h3 class="text-white font-bold text-base">Wasted License Allocations</h3>
                <span class="bg-red-500/10 text-red-400 border border-red-500/30 text-[10px] px-3 py-1 rounded-full font-black">{{ wastedSeatsCount }} alerts</span>
              </div>

              <div class="divide-y divide-gray-800/80">
                <div *ngFor="let audit of auditData" class="p-6 hover:bg-white/5 transition duration-200">
                  <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    
                    <div class="text-left space-y-1">
                      <h4 class="text-white font-bold text-base flex flex-wrap items-center gap-2.5">
                        <span>{{ audit.name }}</span>
                        
                        <!-- Visual Badges based on status -->
                        <span *ngIf="audit.auditStatus === 'wasted_seats'" class="bg-red-500/10 text-red-400 border border-red-500/35 text-[9px] px-2 py-0.5 rounded-full font-black">
                          ⚠️ WASTED SEATS DETECTED
                        </span>
                        <span *ngIf="audit.auditStatus === 'unassigned'" class="bg-amber-500/10 text-amber-400 border border-amber-500/35 text-[9px] px-2 py-0.5 rounded-full font-black">
                          ⚠️ NO SEATS ASSIGNED
                        </span>
                        <span *ngIf="audit.auditStatus === 'ok'" class="bg-emerald-500/10 text-emerald-400 border border-emerald-500/35 text-[9px] px-2 py-0.5 rounded-full font-black">
                          ✓ HEALTHY ALLOCATION
                        </span>
                      </h4>
                      <p class="text-gray-400 text-xs">Total Seats: <strong>{{ audit.assignedTo?.length || 0 }}</strong> • Vendor GST: {{ audit.vendorGST || 'NOT INCLUDED' }}</p>
                    </div>

                    <div class="text-left sm:text-right border-l-2 border-gray-800 sm:border-0 pl-3 sm:pl-0 shrink-0">
                      <p class="text-gray-500 text-xs">Wasted monthly cost</p>
                      <p [class.text-red-500]="audit.wastedAmount > 0" [class.text-gray-400]="audit.wastedAmount === 0" class="text-lg font-black">
                        ₹{{ audit.wastedAmount || 0 | number:'1.2-2' }}
                      </p>
                    </div>
                  </div>

                  <!-- Recommendation banner -->
                  <div *ngIf="audit.recommendation" class="mt-4 p-3 bg-black/30 border rounded-2xl text-xs text-left"
                    [ngClass]="{
                      'border-red-500/10 text-red-300': audit.auditStatus === 'wasted_seats',
                      'border-amber-500/10 text-amber-300': audit.auditStatus === 'unassigned',
                      'text-gray-400': audit.auditStatus === 'ok'
                    }">
                    💡 <strong>Recommendation:</strong> {{ audit.recommendation }}
                  </div>
                </div>

                <div *ngIf="auditData.length === 0" class="p-12 text-center text-gray-500">
                  No subscription audits found. Log active licenses to initiate scans!
                </div>
              </div>
            </div>
          </div>

          <!-- ========================================== -->
          <!-- TAB CONTENT 3: TEAM MEMBERS -->
          <!-- ========================================== -->
          <div *ngIf="activeTab === 'team'" class="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            <!-- Left Side: Member List (Col Span 8) -->
            <div class="lg:col-span-8 glass-card overflow-hidden">
              <div class="px-6 py-5 border-b border-gray-800 flex justify-between items-center bg-black/10">
                <h3 class="text-white font-bold text-base">Active Employees Whitelist</h3>
                <span class="text-xs text-gray-400">{{ dashboardData?.members?.length || 0 }} total</span>
              </div>

              <div class="divide-y divide-gray-800/80">
                <div *ngFor="let mem of dashboardData?.members" class="p-5 flex items-center justify-between gap-4">
                  <div class="text-left">
                    <p class="text-white font-bold text-sm flex items-center gap-2">
                      <span>{{ mem.email }}</span>
                      <span *ngIf="mem.status === 'pending'" class="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] px-2 py-0.5 rounded-full font-black uppercase">Pending</span>
                      <span *ngIf="mem.status === 'active'" class="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] px-2 py-0.5 rounded-full font-black uppercase">Active</span>
                    </p>
                    <p class="text-gray-500 text-xs">Role: <span class="capitalize font-bold">{{ mem.role }}</span> • Joined: {{ mem.joinedAt | date:'mediumDate' }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Right Side: Invite Panel (Col Span 4) -->
            <div class="lg:col-span-4 space-y-4">
              <div class="glass-card p-6 text-left relative overflow-hidden">
                <div class="absolute -right-16 -top-16 w-32 h-32 bg-primary/10 rounded-full blur-xl"></div>
                
                <h3 class="text-white font-bold text-base mb-4 relative z-10">Invite Employee</h3>
                
                <form (ngSubmit)="sendInvite()" class="space-y-4 font-sans text-xs relative z-10">
                  <div>
                    <label class="block text-gray-400 text-xs mb-1.5 font-bold uppercase tracking-wider">Corporate Email</label>
                    <input [(ngModel)]="invitedEmail" name="invite_email" type="email" placeholder="john@company.com" required
                      class="w-full bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary text-xs transition">
                  </div>

                  <div>
                    <label class="block text-gray-400 text-xs mb-1.5 font-bold uppercase tracking-wider">Assign Role</label>
                    <select [(ngModel)]="invitedRole" name="invite_role"
                      class="w-full bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary text-xs transition cursor-pointer">
                      <option value="viewer">Viewer (View dashboards & audits)</option>
                      <option value="manager">Manager (Manage logged subscriptions)</option>
                      <option value="admin">Admin (Full administrative power)</option>
                    </select>
                  </div>

                  <button type="submit" [disabled]="isLoading || !invitedEmail || member?.role === 'viewer'"
                    class="w-full bg-primary hover:bg-opacity-95 text-white font-bold py-3 rounded-2xl transition shadow-lg shadow-primary/15 transform active:scale-98 flex items-center justify-center gap-2 cursor-pointer mt-4">
                    <span *ngIf="isLoading"><svg class="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg></span>
                    <span>Send Invite Link</span>
                  </button>
                </form>
              </div>
            </div>
          </div>

          <!-- ========================================== -->
          <!-- TAB CONTENT 4: GST INVOICING -->
          <!-- ========================================== -->
          <div *ngIf="activeTab === 'gst'" class="max-w-2xl mx-auto">
            <div class="glass-card p-6 md:p-8 text-left relative overflow-hidden">
              <div class="absolute -right-24 -top-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-[80px]"></div>

              <div class="flex items-center gap-4 mb-6">
                <div class="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-emerald-500/20">📄</div>
                <div>
                  <h3 class="text-white font-black text-lg">GST statement Export</h3>
                  <p class="text-gray-400 text-xs">Generate instant, CA-ready expense statements</p>
                </div>
              </div>

              <div class="space-y-6">
                <div>
                  <label class="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Statement Period</label>
                  <select [(ngModel)]="gstPeriod"
                    class="w-full bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3.5 text-white focus:outline-none focus:border-emerald-500 text-xs transition cursor-pointer">
                    <option value="This Month">This Month ({{ currentMonthYear }})</option>
                    <option value="Last Month">Last Month</option>
                    <option value="Quarter 1 (Q1)">Quarter 1 (Q1-2026)</option>
                    <option value="All Time">All Active Logs Statement</option>
                  </select>
                </div>

                <div class="bg-white/5 border border-white/5 rounded-2xl p-4 text-[11px] text-gray-400 leading-relaxed font-sans space-y-1">
                  <p>✓ Flat 18% GST expense projection.</p>
                  <p>✓ Auto-collates all logged company software licenses.</p>
                  <p class="text-red-400 font-bold">⚠️ Notice: Summary statement features legal disclaimers. Consult your CA for state CGST/SGST/IGST tax splits.</p>
                </div>

                <button (click)="downloadGSTReport()" [disabled]="isLoading"
                  class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl transition shadow-lg shadow-emerald-600/10 transform active:scale-98 flex items-center justify-center gap-2 cursor-pointer">
                  <span *ngIf="isLoading"><svg class="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg></span>
                  <span>Download Statement PDF 📥</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </ng-container>

      <!-- ========================================== -->
      <!-- ADD/EDIT SUBSCRIPTION MODAL -->
      <!-- ========================================== -->
      <div *ngIf="showAddSubModal || showEditSubModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
        <div class="glass-card w-full max-w-lg p-6 relative border border-white/10 shadow-2xl text-left text-white max-h-[90vh] overflow-y-auto">
          
          <button (click)="closeModal()" class="absolute top-4 right-4 text-gray-400 hover:text-white border-0 bg-transparent cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <h2 class="text-xl font-black mb-6 text-white">{{ showEditSubModal ? 'Edit Subscription' : 'Add Corporate Subscription' }}</h2>

          <form (ngSubmit)="saveSubscription()" class="space-y-4 font-sans text-xs">
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-gray-400 text-xs mb-1.5 font-bold uppercase">SaaS Product Name</label>
                <input [(ngModel)]="newSubName" name="sub_name" type="text" placeholder="Figma, Zoom..." required
                  class="w-full bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary text-xs transition">
              </div>
              <div>
                <label class="block text-gray-400 text-xs mb-1.5 font-bold uppercase">Product Category</label>
                <select [(ngModel)]="newSubCategory" name="sub_cat"
                  class="w-full bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary text-xs transition cursor-pointer">
                  <option value="Design">Design</option>
                  <option value="Work">Work</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Health">Health</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-3 gap-4">
              <div class="col-span-2">
                <label class="block text-gray-400 text-xs mb-1.5 font-bold uppercase">Total License Price</label>
                <input [(ngModel)]="newSubAmount" name="sub_amt" type="number" placeholder="15000" required
                  class="w-full bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary text-xs transition">
              </div>
              <div>
                <label class="block text-gray-400 text-xs mb-1.5 font-bold uppercase">Currency</label>
                <select [(ngModel)]="newSubCurrency" name="sub_curr"
                  class="w-full bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary text-xs transition cursor-pointer">
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-gray-400 text-xs mb-1.5 font-bold uppercase">Billing Cycle</label>
                <select [(ngModel)]="newSubBillingCycle" name="sub_cycle"
                  class="w-full bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary text-xs transition cursor-pointer">
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
              <div>
                <label class="block text-gray-400 text-xs mb-1.5 font-bold uppercase">Next Renewal Date</label>
                <input [(ngModel)]="newSubRenewalDate" name="sub_renew" type="date" required
                  class="w-full bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary text-xs transition font-mono">
              </div>
            </div>

            <div>
              <label class="block text-gray-400 text-xs mb-1.5 font-bold uppercase">Assigned Employees (Emails, comma-separated)</label>
              <textarea [(ngModel)]="newSubAssignedTo" name="sub_assigned" rows="2" placeholder="employee1@company.com, employee2@company.com"
                class="w-full bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary text-xs transition font-mono"></textarea>
              <p class="text-gray-500 text-[10px] mt-1">SaaS seat auditor scans will cross-check this whitelist.</p>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-gray-400 text-xs mb-1.5 font-bold uppercase">Vendor GST Number</label>
                <input [(ngModel)]="newSubVendorGST" name="sub_vendor_gst" type="text" placeholder="VENDOR_GST_123"
                  class="w-full bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary text-xs transition font-mono uppercase">
              </div>
              <div>
                <label class="block text-gray-400 text-xs mb-1.5 font-bold uppercase">Invoice Number</label>
                <input [(ngModel)]="newSubInvoiceNumber" name="sub_inv_num" type="text" placeholder="INV-2026-001"
                  class="w-full bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary text-xs transition font-mono">
              </div>
            </div>

            <div>
              <label class="block text-gray-400 text-xs mb-1.5 font-bold uppercase">Notes / description</label>
              <input [(ngModel)]="newSubNotes" name="sub_notes" type="text" placeholder="Team Figma UX workspace licenses"
                class="w-full bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary text-xs transition">
            </div>

            <button type="submit" [disabled]="isLoading || !newSubName || !newSubAmount || !newSubRenewalDate"
              class="w-full bg-primary hover:bg-opacity-95 text-white font-bold py-3.5 rounded-2xl transition shadow-lg shadow-primary/15 transform active:scale-98 flex items-center justify-center gap-2 cursor-pointer mt-4">
              <span *ngIf="isLoading"><svg class="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg></span>
              <span>{{ showEditSubModal ? 'Save subscription Changes' : 'Log Corporate Subscription' }}</span>
            </button>
          </form>
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
export class CorporateComponent implements OnInit {
  userProfile: any = null;
  org: any = null;
  member: any = null;
  dashboardData: any = null;
  auditData: any[] = [];
  isLoading = false;
  activeTab: 'overview' | 'audit' | 'team' | 'gst' = 'overview';
  gstPeriod = 'This Month';
  currentMonthYear = '';

  // Wizard state
  newOrgName = '';
  newOrgGST = '';
  newOrgCurrency = 'INR';

  // Team Invite state
  invitedEmail = '';
  invitedRole: 'admin' | 'manager' | 'viewer' = 'viewer';

  // Add/Edit Sub Modal states
  showAddSubModal = false;
  showEditSubModal = false;
  selectedSub: any = null;

  // Add/Edit Sub Fields
  newSubName = '';
  newSubAmount: number | null = null;
  newSubCurrency = 'INR';
  newSubBillingCycle = 'monthly';
  newSubCategory = 'Work';
  newSubRenewalDate = '';
  newSubAssignedTo = '';
  newSubVendorGST = '';
  newSubInvoiceNumber = '';
  newSubNotes = '';

  wastedSeatsCount = 0;

  constructor(
    private auth: AuthService,
    private http: HttpClient,
    private toastr: ToastrService,
    private seo: SeoService,
    private router: Router
  ) {}

  ngOnInit() {
    this.currentMonthYear = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    this.seo.generateTags({
      title: 'Enterprise Corporate Command Center',
      description: 'Audit company software license seat usage, invite finance managers, download GST-ready PDF statement statements, and eliminate subscription waste.'
    });

    this.isLoading = true;
    this.auth.userProfile$.subscribe({
      next: (profile) => {
        if (profile) {
          this.userProfile = profile;
          this.loadCompanyDetails();
        } else {
          this.isLoading = false;
        }
      },
      error: () => {
        this.toastr.error('Failed to sync profile data.');
        this.isLoading = false;
      }
    });
  }

  loadCompanyDetails() {
    const token = this.auth.getToken();
    if (!token) return;

    this.http.get(`${environment.apiUrl}/api/org/my-organization`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res: any) => {
        if (res.success && res.organization) {
          this.org = res.organization;
          this.member = res.member;
          this.fetchDashboardAndAudits();
        } else {
          this.org = null;
          this.member = null;
          this.isLoading = false;
        }
      },
      error: (err) => {
        console.error('Failed to check active organization:', err);
        this.isLoading = false;
      }
    });
  }

  fetchDashboardAndAudits() {
    const org = this.org;
    if (!org || !org.id) return;
    const orgId = org.id;
    const token = this.auth.getToken();

    this.isLoading = true;
    this.http.get(`${environment.apiUrl}/api/org/${orgId}/dashboard`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (dashRes: any) => {
        if (dashRes.success) {
          this.dashboardData = dashRes;
        }
        
        // Fetch seat auditing list next
        this.http.get(`${environment.apiUrl}/api/org/${orgId}/audit`, {
          headers: { Authorization: `Bearer ${token}` }
        }).subscribe({
          next: (auditRes: any) => {
            if (auditRes.success) {
              this.auditData = auditRes.audit;
              this.wastedSeatsCount = this.auditData.filter(a => a.auditStatus === 'wasted_seats' || a.auditStatus === 'unassigned').length;
            }
            this.isLoading = false;
          },
          error: () => {
            this.toastr.error('Failed to calculate SaaS seat recommendations.');
            this.isLoading = false;
          }
        });
      },
      error: () => {
        this.toastr.error('Failed to load corporate summary stat blocks.');
        this.isLoading = false;
      }
    });
  }

  // ==========================================
  // ORG SIGNUP & Razorpay WIZARDS
  // ==========================================
  buyCorporateTier() {
    this.isLoading = true;
    const token = this.auth.getToken();
    const email = this.userProfile?.email;

    this.toastr.info('Initializing secure corporate checkout...');

    this.http.post(`${environment.apiUrl}/api/payment/subscribe`, {
      planKey: 'corporate_monthly'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res: any) => {
        if (!res || !res.subscriptionId) {
          throw new Error('Failed to create subscription order.');
        }

        // ✅ MOCK CHECKOUT OVERRIDE FOR DEVELOPMENT SANDBOX (Bypasses real script crashes)
        if (res.keyId === 'dummy' || res.subscriptionId.startsWith('sub_mock_')) {
          this.toastr.info('Entering Sandbox Payment Emulator...', 'Sandbox Sandbox Activated');
          
          const mockPaymentResponse = {
            razorpay_subscription_id: res.subscriptionId,
            razorpay_payment_id: 'pay_mock_' + Math.random().toString(36).substr(2, 9),
            razorpay_signature: 'sig_mock_' + Math.random().toString(36).substr(2, 9)
          };

          setTimeout(() => {
            this.toastr.info('Verifying secure B2B transaction...');
            this.http.post(`${environment.apiUrl}/api/payment/verify`, {
              ...mockPaymentResponse,
              plan: 'corporate_monthly'
            }, {
              headers: { Authorization: `Bearer ${token}` }
            }).subscribe({
              next: () => {
                this.toastr.success('Corporate billing unlocked successfully! Set up your company next.', 'Plan Activated!');
                this.auth.fetchUserProfile().subscribe();
              },
              error: (err) => {
                this.toastr.error(err?.error?.error || 'Verification failed.');
                this.isLoading = false;
              }
            });
          }, 1500);
          return;
        }

        const options = {
          key: res.keyId || 'rzp_test_dummy',
          subscription_id: res.subscriptionId,
          name: 'SubTrackr B2B Corporate',
          description: 'Access B2B Company Dashboards & Audits',
          image: '/favicon.png',
          prefill: { email },
          theme: { color: '#6C63FF' },
          handler: (payRes: any) => {
            this.toastr.info('Verifying secure B2B transaction...');
            this.http.post(`${environment.apiUrl}/api/payment/verify`, {
              ...payRes,
              plan: 'corporate_monthly'
            }, {
              headers: { Authorization: `Bearer ${token}` }
            }).subscribe({
              next: () => {
                this.toastr.success('Corporate billing unlocked successfully! Set up your company next.', 'Plan Activated!');
                this.auth.fetchUserProfile().subscribe();
              },
              error: (err) => {
                this.toastr.error(err?.error?.error || 'Verification failed.');
                this.isLoading = false;
              }
            });
          },
          modal: {
            ondismiss: () => {
              this.isLoading = false;
              this.toastr.warning('Corporate upgrade checkout dismissed.');
            }
          }
        };

        const rzp = new Razorpay(options);
        rzp.open();
      },
      error: (err) => {
        this.toastr.error(err?.error?.error || 'Checkout setup failed.');
        this.isLoading = false;
      }
    });
  }

  createCompany() {
    if (!this.newOrgName || this.newOrgGST.trim().length !== 15) {
      this.toastr.warning('Please enter a valid 15-character Indian business GST Number.', 'Invalid Form');
      return;
    }

    this.isLoading = true;
    const token = this.auth.getToken();

    const payload = {
      name: this.newOrgName.trim(),
      gstNumber: this.newOrgGST.trim().toUpperCase(),
      currency: this.newOrgCurrency
    };

    this.http.post(`${environment.apiUrl}/api/org/create`, payload, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res: any) => {
        this.toastr.success('Corporate company dashboard generated successfully!', 'Company Created');
        
        // Refresh User profile so client knows org bindings
        this.auth.fetchUserProfile().subscribe();
      },
      error: (err) => {
        this.toastr.error(err?.error?.error || 'Failed to setup organization.');
        this.isLoading = false;
      }
    });
  }

  // ==========================================
  // EMPLOYEE TEAM INVITES
  // ==========================================
  sendInvite() {
    if (!this.invitedEmail || !this.org) return;
    this.isLoading = true;
    const token = this.auth.getToken();

    const payload = {
      orgId: this.org.id,
      email: this.invitedEmail.trim().toLowerCase(),
      role: this.invitedRole
    };

    this.http.post(`${environment.apiUrl}/api/org/invite`, payload, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res: any) => {
        this.toastr.success(res.message || 'Team invite link sent via SendGrid.', 'Invite Sent!');
        this.invitedEmail = '';
        this.fetchDashboardAndAudits(); // Refresh list to show pending
      },
      error: (err) => {
        this.toastr.error(err?.error?.error || 'Invite dispatch failed.');
        this.isLoading = false;
      }
    });
  }

  // ==========================================
  // STREAM DOWNLOAD GST REPORT
  // ==========================================
  downloadGSTReport() {
    if (!this.org) return;
    this.isLoading = true;
    const token = this.auth.getToken();

    this.toastr.info('Generating simplified GST Invoice summary Statement...');

    this.http.get(`${environment.apiUrl}/api/org/${this.org.id}/gst-report`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { period: this.gstPeriod },
      responseType: 'blob'
    }).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SubTrackr-GST-Report-${this.org.name.replace(/\\s+/g, '-')}-${this.gstPeriod.replace(/\\s+/g, '-')}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        this.toastr.success('GST statement statement downloaded successfully!', 'File Saved');
        this.isLoading = false;
      },
      error: (err) => {
        console.error('GST PDF download error:', err);
        this.toastr.error('Could not compile report PDF. Verify you have active logged subscriptions.');
        this.isLoading = false;
      }
    });
  }

  // ==========================================
  // LOG SUBSCRIPTION DIALOG MANAGERS
  // ==========================================
  openAddModal() {
    this.showAddSubModal = true;
    this.newSubName = '';
    this.newSubAmount = null;
    this.newSubCurrency = this.org?.settings?.currency || 'INR';
    this.newSubBillingCycle = 'monthly';
    this.newSubCategory = 'Work';
    this.newSubRenewalDate = new Date().toISOString().split('T')[0];
    this.newSubAssignedTo = '';
    this.newSubVendorGST = '';
    this.newSubInvoiceNumber = '';
    this.newSubNotes = 'SaaS Subscription Seat License';
  }

  openEditModal(sub: any) {
    this.selectedSub = sub;
    this.showEditSubModal = true;

    this.newSubName = sub.name;
    this.newSubAmount = sub.amount;
    this.newSubCurrency = sub.currency;
    this.newSubBillingCycle = sub.billingCycle;
    this.newSubCategory = sub.category;
    this.newSubRenewalDate = sub.renewalDate ? new Date(sub.renewalDate).toISOString().split('T')[0] : '';
    this.newSubAssignedTo = sub.assignedTo ? sub.assignedTo.join(', ') : '';
    this.newSubVendorGST = sub.vendorGST || '';
    this.newSubInvoiceNumber = sub.invoiceNumber || '';
    this.newSubNotes = sub.notes || '';
  }

  closeModal() {
    this.showAddSubModal = false;
    this.showEditSubModal = false;
    this.selectedSub = null;
  }

  saveSubscription() {
    if (!this.org) return;

    this.isLoading = true;
    const token = this.auth.getToken();

    const emails = this.newSubAssignedTo
      .split(',')
      .map(e => e.trim())
      .filter(e => e.length > 0);

    const payload = {
      name: this.newSubName.trim(),
      amount: this.newSubAmount,
      currency: this.newSubCurrency,
      billingCycle: this.newSubBillingCycle,
      category: this.newSubCategory,
      renewalDate: new Date(this.newSubRenewalDate).toISOString(),
      assignedTo: emails,
      vendorGST: this.newSubVendorGST.trim().toUpperCase(),
      invoiceNumber: this.newSubInvoiceNumber.trim(),
      notes: this.newSubNotes.trim()
    };

    if (this.showEditSubModal && this.selectedSub) {
      // Edit
      this.http.put(`${environment.apiUrl}/api/org/${this.org.id}/subscription/${this.selectedSub.id}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      }).subscribe({
        next: () => {
          this.toastr.success('Corporate subscription changes saved successfully!', 'License Saved');
          this.closeModal();
          this.fetchDashboardAndAudits();
        },
        error: (err) => {
          this.toastr.error(err?.error?.error || 'Failed to modify subscription.');
          this.isLoading = false;
        }
      });
    } else {
      // Add
      this.http.post(`${environment.apiUrl}/api/org/${this.org.id}/subscription`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      }).subscribe({
        next: () => {
          this.toastr.success('New corporate license added to shared audits list!', 'License Logged');
          this.closeModal();
          this.fetchDashboardAndAudits();
        },
        error: (err) => {
          this.toastr.error(err?.error?.error || 'Failed to log license.');
          this.isLoading = false;
        }
      });
    }
  }

  deleteSubscription(subId: string) {
    if (!this.org) return;

    if (confirm('Are you sure you want to delete this B2B corporate subscription log?')) {
      this.isLoading = true;
      const token = this.auth.getToken();

      this.http.delete(`${environment.apiUrl}/api/org/${this.org.id}/subscription/${subId}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).subscribe({
        next: () => {
          this.toastr.success('Corporate subscription log deleted successfully.', 'SaaS Log Removed');
          this.fetchDashboardAndAudits();
        },
        error: (err) => {
          this.toastr.error(err?.error?.error || 'Failed to remove log.');
          this.isLoading = false;
        }
      });
    }
  }
}
