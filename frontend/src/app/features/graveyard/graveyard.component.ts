import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { SubscriptionService } from '../../core/services/subscription.service';
import { ToastrService } from 'ngx-toastr';
import { SeoService } from '../../core/services/seo.service';

@Component({
  selector: 'app-graveyard',
  standalone: true,
  imports: [CommonModule, CurrencyPipe],
  template: `
    <div class="py-6 flex flex-col items-center justify-center min-h-[80vh]">
      <div class="glass-card p-6 sm:p-10 max-w-2xl w-full text-center relative overflow-hidden">
        <!-- Decoration -->
        <div class="absolute -top-20 -right-20 w-40 h-40 bg-accent rounded-full blur-3xl opacity-20"></div>
        <div class="absolute -bottom-20 -left-20 w-40 h-40 bg-primary rounded-full blur-3xl opacity-20"></div>

        <h1 class="text-4xl font-black text-white mb-2 tracking-tight">Expense Graveyard 🪦</h1>
        <p class="text-gray-400 mb-8 text-lg">Money you could have saved.</p>
        
        <div class="bg-black/40 rounded-2xl p-8 mb-8 border border-gray-800">
          <p class="text-sm font-semibold tracking-widest text-accent uppercase mb-2">Total Wasted</p>
          <h2 class="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500 mb-4">
            {{ (data?.wasted || 0) | currency:'INR' }}
          </h2>
          <p class="text-xl text-gray-300 font-medium leading-relaxed max-w-md mx-auto">
            {{ data?.message || "You haven't wasted any money yet! Great job." }}
          </p>
        </div>

        <div class="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
          <button class="w-full sm:w-auto bg-primary hover:bg-opacity-90 text-white font-medium py-3 px-8 rounded-full transition-colors flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
            Download Card
          </button>
          <button class="w-full sm:w-auto bg-[#1DA1F2] hover:bg-opacity-90 text-white font-medium py-3 px-8 rounded-full transition-colors flex items-center justify-center">
            Share on Twitter
          </button>
        </div>
      </div>
    </div>
  `
})
export class GraveyardComponent implements OnInit {
  data: any = null;

  constructor(
    private subService: SubscriptionService,
    private toastr: ToastrService,
    private seo: SeoService
  ) {}

  ngOnInit() {
    this.seo.generateTags({
      title: 'Expense Graveyard',
      description: 'Audit your cancelled digital plans and celebrate your monthly/yearly savings. Turn digital wastage into financial victory with the SubTrackr Graveyard.'
    });

    this.subService.getGraveyard().subscribe({
      next: (res: any) => this.data = res,
      error: () => this.toastr.error('Failed to load graveyard data')
    });
  }
}
