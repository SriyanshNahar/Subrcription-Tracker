import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SeoService } from '../../core/services/seo.service';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-screen py-16 px-4 relative overflow-hidden bg-background">
      <!-- Background Decorative Orbs -->
      <div class="absolute top-1/4 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none animate-pulse duration-[6000ms]"></div>
      <div class="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent/10 rounded-full blur-3xl pointer-events-none animate-pulse duration-[8000ms]"></div>

      <div class="max-w-4xl mx-auto relative z-10">
        <!-- Back Navigation -->
        <a routerLink="/" class="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors duration-200 mb-8 font-medium text-sm">
          <span>←</span> Back to Dashboard
        </a>

        <!-- Header -->
        <div class="text-center md:text-left mb-12">
          <span class="px-3 py-1 text-xs font-semibold rounded-full bg-primary/10 border border-primary/20 text-primary uppercase tracking-wider">Legal Center</span>
          <h1 class="text-4xl md:text-5xl font-extrabold mt-4 mb-2 text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-primary">Privacy Policy</h1>
          <p class="text-gray-400 text-sm">Last Updated: May 2026</p>
        </div>

        <!-- Main Glass Card Content -->
        <div class="glass-card rounded-2xl p-8 md:p-12 space-y-8 text-gray-300 leading-relaxed text-sm md:text-base">
          <section class="space-y-4">
            <h2 class="text-2xl font-bold text-white flex items-center gap-3">
              <span class="text-primary">01.</span> Introduction
            </h2>
            <p>
              At <strong>SubTrackr</strong>, we take your privacy extremely seriously. We believe that your subscription and financial details belong to you alone. This Privacy Policy details how we collect, process, and protect your information when you use our services.
            </p>
          </section>

          <div class="h-px bg-white/5"></div>

          <section class="space-y-4">
            <h2 class="text-2xl font-bold text-white flex items-center gap-3">
              <span class="text-primary">02.</span> Information We Collect
            </h2>
            <p>
              We collect and process only the minimum amount of data required to provide a rich, responsive experience:
            </p>
            <ul class="list-disc pl-6 space-y-2 text-gray-400">
              <li><strong class="text-gray-300">Authentication Details:</strong> Email, password, and display name provided during signup, secured via Google Firebase Authentication.</li>
              <li><strong class="text-gray-300">Subscription Metadata:</strong> Names, prices, renewal dates, and billing frequencies of the subscriptions you manually register.</li>
              <li><strong class="text-gray-300">Analytics Data:</strong> Anonymized usage data to help us identify dashboard performance bottlenecks and enhance the Graveyard feature.</li>
            </ul>
          </section>

          <div class="h-px bg-white/5"></div>

          <section class="space-y-4">
            <h2 class="text-2xl font-bold text-white flex items-center gap-3">
              <span class="text-primary">03.</span> How We Use Your Data
            </h2>
            <p>
              Your data is exclusively used to deliver and optimize SubTrackr features:
            </p>
            <ul class="list-disc pl-6 space-y-2 text-gray-400">
              <li>To construct your personalized dashboard and compute monthly/yearly spending metrics.</li>
              <li>To issue real-time email alerts and reminders prior to your subscription renewal dates.</li>
              <li>To identify and place inactive subscriptions into the **Graveyard** so you can cut wasted spending.</li>
            </ul>
          </section>

          <div class="h-px bg-white/5"></div>

          <section class="space-y-4">
            <h2 class="text-2xl font-bold text-white flex items-center gap-3">
              <span class="text-primary">04.</span> Data Security & Storage
            </h2>
            <p>
              We use enterprise-grade cloud systems to shield your records:
            </p>
            <p class="text-gray-400">
              Your credentials are secured inside <strong>Google Firebase Authentication</strong>. Database records are stored inside a secure Firestore database guarded by robust security protocols and access tokens. We do not store or process raw credit cards or bank statements.
            </p>
          </section>

          <div class="h-px bg-white/5"></div>

          <section class="space-y-4">
            <h2 class="text-2xl font-bold text-white flex items-center gap-3">
              <span class="text-primary">05.</span> Your Rights & Controls
            </h2>
            <p>
              You maintain complete ownership of your data at all times. You have the right to inspect, edit, or permanently erase your profile and subscription history directly from the dashboard settings.
            </p>
          </section>

          <div class="h-px bg-white/5"></div>

          <!-- Contact Footer -->
          <div class="p-6 rounded-xl bg-white/5 border border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 mt-8">
            <div>
              <h4 class="text-white font-bold text-base">Have questions about your privacy?</h4>
              <p class="text-gray-400 text-xs mt-1">Our security officers are always here to assist you.</p>
            </div>
            <a href="mailto:support@subtrackr.com" class="px-5 py-2.5 rounded-xl bg-primary hover:bg-opacity-90 text-white font-semibold text-sm transition-all duration-200">
              Contact Privacy Team
            </a>
          </div>
        </div>
      </div>
    </div>
  `
})
export class PrivacyComponent implements OnInit {
  constructor(private seo: SeoService) {}

  ngOnInit() {
    this.seo.generateTags({
      title: 'Privacy Policy',
      description: 'Learn how SubTrackr protects your credentials and digital subscription metrics. Your financial privacy is our highest priority.'
    });
  }
}
