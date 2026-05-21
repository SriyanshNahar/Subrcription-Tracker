import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-screen py-16 px-4 relative overflow-hidden bg-background">
      <!-- Background Decorative Orbs -->
      <div class="absolute top-1/4 -right-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none animate-pulse duration-[6000ms]"></div>
      <div class="absolute bottom-1/4 -left-32 w-96 h-96 bg-accent/10 rounded-full blur-3xl pointer-events-none animate-pulse duration-[8000ms]"></div>

      <div class="max-w-4xl mx-auto relative z-10">
        <!-- Back Navigation -->
        <a routerLink="/" class="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors duration-200 mb-8 font-medium text-sm">
          <span>←</span> Back to Dashboard
        </a>

        <!-- Header -->
        <div class="text-center md:text-left mb-12">
          <span class="px-3 py-1 text-xs font-semibold rounded-full bg-accent/10 border border-accent/20 text-accent uppercase tracking-wider">Legal Center</span>
          <h1 class="text-4xl md:text-5xl font-extrabold mt-4 mb-2 text-transparent bg-clip-text bg-gradient-to-r from-accent via-primary to-accent">Terms of Service</h1>
          <p class="text-gray-400 text-sm">Last Updated: May 2026</p>
        </div>

        <!-- Main Glass Card Content -->
        <div class="glass-card rounded-2xl p-8 md:p-12 space-y-8 text-gray-300 leading-relaxed text-sm md:text-base">
          <section class="space-y-4">
            <h2 class="text-2xl font-bold text-white flex items-center gap-3">
              <span class="text-accent">01.</span> Agreement to Terms
            </h2>
            <p>
              By accessing and using <strong>SubTrackr</strong>, you represent and warrant that you have read, understood, and agree to be bound by these Terms of Service. If you do not agree, please refrain from using our application immediately.
            </p>
          </section>

          <div class="h-px bg-white/5"></div>

          <section class="space-y-4">
            <h2 class="text-2xl font-bold text-white flex items-center gap-3">
              <span class="text-accent">02.</span> Account Registration & Security
            </h2>
            <p>
              To track your subscriptions, you must create a profile using email/password or your Google account. You are solely responsible for:
            </p>
            <ul class="list-disc pl-6 space-y-2 text-gray-400">
              <li>Protecting the confidentiality of your credentials.</li>
              <li>Ensuring all details added to your account (email, names) are accurate.</li>
              <li>Promptly notifying our technical team of any unauthorized usage or security concerns.</li>
            </ul>
          </section>

          <div class="h-px bg-white/5"></div>

          <section class="space-y-4">
            <h2 class="text-2xl font-bold text-white flex items-center gap-3">
              <span class="text-accent">03.</span> Permitted Use & Service Limitations
            </h2>
            <p>
              SubTrackr is a personal subscription tracking utility. You agree not to abuse the system:
            </p>
            <ul class="list-disc pl-6 space-y-2 text-gray-400">
              <li>Do not attempt to scrape, reverse engineer, or crack database structures.</li>
              <li>Do not use bots or automated tools that degrade the application's performance.</li>
              <li>You acknowledge that pricing alerts, notifications, and analytics are provided for convenience and are subject to network transmission conditions.</li>
            </ul>
          </section>

          <div class="h-px bg-white/5"></div>

          <section class="space-y-4">
            <h2 class="text-2xl font-bold text-white flex items-center gap-3">
              <span class="text-accent">04.</span> Subscription Mockups & Third-Party Pricing
            </h2>
            <p>
              SubTrackr lets you store subscription prices and renewal frequencies. 
            </p>
            <p class="text-gray-400">
              We are not affiliated with, authorized, or endorsed by any external service provider cataloged inside your account. Real prices are subject to change by third-party services, and you are responsible for monitoring actual bank statements.
            </p>
          </section>

          <div class="h-px bg-white/5"></div>

          <section class="space-y-4">
            <h2 class="text-2xl font-bold text-white flex items-center gap-3">
              <span class="text-accent">05.</span> Account Deletion & Termination
            </h2>
            <p>
              We reserve the right to suspend or disable accounts that violate our usage terms or exhibit bot-like behavior. You can delete your account at any time, which will permanently scrub all database records associated with your profile.
            </p>
          </section>

          <div class="h-px bg-white/5"></div>

          <!-- Contact Footer -->
          <div class="p-6 rounded-xl bg-white/5 border border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 mt-8">
            <div>
              <h4 class="text-white font-bold text-base">Questions about our Terms?</h4>
              <p class="text-gray-400 text-xs mt-1">Review our license or consult our legal officers.</p>
            </div>
            <a href="mailto:support@subtrackr.com" class="px-5 py-2.5 rounded-xl bg-accent hover:bg-opacity-90 text-white font-semibold text-sm transition-all duration-200">
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </div>
  `
})
export class TermsComponent {}
