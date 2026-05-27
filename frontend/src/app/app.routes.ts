import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { planGuard } from './core/guards/plan.guard';
import { corporateGuard } from './core/guards/corporate.guard';

export const routes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'pricing',
    loadComponent: () => import('./features/pricing/pricing.component').then(m => m.PricingComponent)
  },
  {
    path: 'graveyard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/graveyard/graveyard.component').then(m => m.GraveyardComponent)
  },
  {
    path: 'verify-email',
    loadComponent: () => import('./features/auth/verify-email/verify-email.component').then(m => m.VerifyEmailComponent)
  },
  {
    path: 'whatsapp-alerts',
    canActivate: [authGuard],
    loadComponent: () => import('./features/whatsapp-alerts/whatsapp-alerts.component').then(m => m.WhatsappAlertsComponent)
  },
  {
    path: 'corporate',
    canActivate: [authGuard, corporateGuard],
    loadComponent: () => import('./features/corporate/corporate.component').then(m => m.CorporateComponent)
  },
  {
    path: 'accept-invite',
    canActivate: [authGuard],
    loadComponent: () => import('./features/auth/accept-invite/accept-invite.component').then(m => m.AcceptInviteComponent)
  },
  {
    path: 'privacy',
    loadComponent: () => import('./features/privacy/privacy.component').then(m => m.PrivacyComponent)
  },
  {
    path: 'terms',
    loadComponent: () => import('./features/terms/terms.component').then(m => m.TermsComponent)
  }
];

