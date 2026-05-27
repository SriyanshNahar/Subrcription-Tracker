import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../environments/environment';
import { SeoService } from '../../core/services/seo.service';

@Component({
  selector: 'app-whatsapp-alerts',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="min-h-screen bg-background py-16 px-4 md:px-8 relative overflow-hidden flex flex-col items-center">
      <!-- Decorative Background Glows -->
      <div class="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div class="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div class="text-center max-w-2xl mx-auto mb-12 relative z-10">
        <h1 class="text-4xl md:text-5xl font-black tracking-tight text-white mb-4">
          WhatsApp <span class="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-accent">Smart Alerts</span>
        </h1>
        <p class="text-gray-400 text-lg">
          Receive instant renewal reminders, wasted license alerts, and monthly summaries directly on your WhatsApp chat.
        </p>
      </div>

      <div class="w-full max-w-lg z-10">
        <div class="glass-card p-6 md:p-8 relative overflow-hidden">
          
          <div class="flex items-center gap-4 mb-8">
            <div class="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-emerald-500/20">💬</div>
            <div>
              <h3 class="text-white font-bold text-lg">Alert Configuration</h3>
              <p class="text-gray-400 text-sm">Synchronize notifications with your mobile chat</p>
            </div>
          </div>

          <!-- Phone Input -->
          <div class="mb-6">
            <label class="text-gray-400 text-sm mb-2 block font-medium">WhatsApp Number</label>
            <div class="flex gap-3">
              <div class="bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3.5 text-white w-20 text-center font-bold text-sm flex items-center justify-center">+91</div>
              <input [(ngModel)]="phone" type="tel" maxlength="10" placeholder="9876543210"
                class="flex-1 bg-gray-800 border border-gray-700 rounded-2xl px-5 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 text-sm transition font-medium">
            </div>
            <p class="text-gray-500 text-[11px] mt-1.5 pl-1">Enter your 10-digit Indian mobile number without country code.</p>
          </div>

          <!-- Alert Preferences -->
          <div class="space-y-4 mb-8">
            <p class="text-gray-400 text-sm font-bold tracking-wide uppercase text-[11px]">Send me alerts for:</p>
            
            <label class="flex items-center gap-3.5 cursor-pointer group p-3 bg-white/5 border border-white/5 hover:border-gray-800 rounded-2xl transition duration-200">
              <input type="checkbox" [(ngModel)]="alerts.sevenDays" class="w-4 h-4 accent-emerald-500 rounded">
              <div class="flex flex-col text-left">
                <span class="text-gray-200 text-sm font-semibold group-hover:text-white">7 days before renewal</span>
                <span class="text-gray-500 text-xs">First early warning reminder</span>
              </div>
            </label>

            <label class="flex items-center gap-3.5 cursor-pointer group p-3 bg-white/5 border border-white/5 hover:border-gray-800 rounded-2xl transition duration-200">
              <input type="checkbox" [(ngModel)]="alerts.threeDays" class="w-4 h-4 accent-emerald-500 rounded">
              <div class="flex flex-col text-left">
                <span class="text-gray-200 text-sm font-semibold group-hover:text-white">3 days before renewal</span>
                <span class="text-gray-500 text-xs">Second notice to cancel or keep</span>
              </div>
            </label>

            <label class="flex items-center gap-3.5 cursor-pointer group p-3 bg-white/5 border border-white/5 hover:border-gray-800 rounded-2xl transition duration-200">
              <input type="checkbox" [(ngModel)]="alerts.oneDay" class="w-4 h-4 accent-emerald-500 rounded">
              <div class="flex flex-col text-left">
                <span class="text-gray-200 text-sm font-semibold group-hover:text-white">1 day before renewal</span>
                <span class="text-gray-500 text-xs">Final urgent warning check</span>
              </div>
            </label>

            <label class="flex items-center gap-3.5 cursor-pointer group p-3 bg-white/5 border border-white/5 hover:border-gray-800 rounded-2xl transition duration-200">
              <input type="checkbox" [(ngModel)]="alerts.monthlySummary" class="w-4 h-4 accent-emerald-500 rounded">
              <div class="flex flex-col text-left">
                <span class="text-gray-200 text-sm font-semibold group-hover:text-white">Monthly savings summary</span>
                <span class="text-gray-500 text-xs">Stats digest delivered on the 1st</span>
              </div>
            </label>

            <label class="flex items-center gap-3.5 cursor-pointer group p-3 bg-white/5 border border-white/5 hover:border-gray-800 rounded-2xl transition duration-200">
              <input type="checkbox" [(ngModel)]="alerts.wastedAlert" class="w-4 h-4 accent-emerald-500 rounded">
              <div class="flex flex-col text-left">
                <span class="text-gray-200 text-sm font-semibold group-hover:text-white">Unused subscription warnings</span>
                <span class="text-gray-500 text-xs">Alert if seat inactivity is audited</span>
              </div>
            </label>
          </div>

          <!-- PRO BADGE if not subscribed -->
          <div *ngIf="!isPro" class="bg-purple-950/40 border border-purple-500/35 rounded-2xl p-5 mb-6 relative overflow-hidden group">
            <div class="absolute -right-6 -bottom-6 w-16 h-16 bg-purple-500/10 rounded-full blur-xl group-hover:scale-150 transition duration-300"></div>
            <p class="text-purple-300 text-sm font-medium leading-relaxed relative z-10">
              ⭐ WhatsApp alerts are a <strong class="text-white">Premium Pro / B2B feature</strong>.
              <a routerLink="/pricing" class="text-accent underline ml-1 font-bold">Upgrade for ₹99/month</a>
            </p>
          </div>

          <!-- Save Button -->
          <button (click)="saveSettings()" [disabled]="!isPro || isLoading"
            class="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white py-4 rounded-2xl font-bold transition shadow-lg shadow-emerald-600/10 transform active:scale-98 flex items-center justify-center gap-2">
            <span *ngIf="isLoading"><svg class="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg></span>
            <span>💬 Enable WhatsApp Alerts</span>
          </button>

          <!-- Test Button -->
          <button *ngIf="isPro" (click)="sendTest()" [disabled]="isLoading"
            class="w-full mt-4 border-2 border-emerald-600 text-emerald-400 hover:text-white py-3.5 rounded-2xl text-sm font-bold hover:bg-emerald-950/20 transition cursor-pointer flex items-center justify-center gap-2">
            <span *ngIf="isLoading"><svg class="animate-spin h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg></span>
            <span>Send Test Message</span>
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
export class WhatsappAlertsComponent implements OnInit {
  phone: string = '';
  alerts = {
    sevenDays: true,
    threeDays: true,
    oneDay: true,
    monthlySummary: true,
    wastedAlert: true
  };
  isPro: boolean = false;
  isLoading: boolean = false;
  private userProfile: any = null;

  constructor(
    private auth: AuthService,
    private http: HttpClient,
    private toastr: ToastrService,
    private seo: SeoService,
    private router: Router
  ) {}

  ngOnInit() {
    this.seo.generateTags({
      title: 'WhatsApp Smart Alerts Configuration',
      description: 'Receive real-time renewal reminders and wasted SaaS seat alerts on your phone. Synchronize subscription expense tracking directly with mobile WhatsApp alerts.'
    });

    this.isLoading = true;
    this.auth.userProfile$.subscribe({
      next: (profile) => {
        if (profile) {
          this.userProfile = profile;
          const plan = profile.plan || 'free';
          // WhatsApp alerts are unlocked on Pro, Family, or Corporate accounts
          this.isPro = plan === 'pro' || plan === 'family' || plan === 'corporate';
          
          if (profile.phone) {
            this.phone = profile.phone;
          }
          if (profile.whatsappPreferences) {
            this.alerts = { ...this.alerts, ...profile.whatsappPreferences };
          }
        }
        this.isLoading = false;
      },
      error: () => {
        this.toastr.error('Failed to load profile data.');
        this.isLoading = false;
      }
    });
  }

  saveSettings() {
    if (!this.phone || this.phone.trim().length !== 10 || isNaN(Number(this.phone))) {
      this.toastr.warning('Please enter a valid 10-digit mobile number.', 'Invalid Number');
      return;
    }

    this.isLoading = true;
    const updatePayload = {
      phone: this.phone.trim(),
      whatsappEnabled: true,
      whatsappPreferences: this.alerts
    };

    this.auth.updateUserProfile(updatePayload).subscribe({
      next: () => {
        this.toastr.success('WhatsApp alert configurations saved successfully!', 'Settings Synced');
        this.isLoading = false;
      },
      error: (err) => {
        console.error('WhatsApp save settings error:', err);
        this.toastr.error('Failed to save alert settings to backend.');
        this.isLoading = false;
      }
    });
  }

  sendTest() {
    if (!this.phone || this.phone.trim().length !== 10 || isNaN(Number(this.phone))) {
      this.toastr.warning('Please save a valid 10-digit mobile number before testing.', 'Save Number First');
      return;
    }

    this.isLoading = true;
    this.toastr.info('Sending manual test WhatsApp renewal alert...');

    const payload = {
      phone: this.phone.trim(),
      userName: this.userProfile?.name || 'Subscriber',
      subName: 'Netflix Premium Test',
      amount: 649,
      currency: 'INR',
      daysLeft: 3
    };

    const token = this.auth.getToken();

    this.http.post(`${environment.apiUrl}/api/whatsapp/test`, payload, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res: any) => {
        this.toastr.success(res.message || 'Test renewal notification triggered!', 'Test Dispatched');
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('WhatsApp test dispatch error:', err);
        this.toastr.error(err?.error?.error || 'Manual test alert trigger failed.');
        this.isLoading = false;
      }
    });
  }
}
