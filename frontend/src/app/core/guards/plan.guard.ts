import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take } from 'rxjs/operators';
import { of } from 'rxjs';

export const planGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // If profile is already loaded, check it directly
  if (authService.userProfile$.value) {
    const plan = authService.userProfile$.value.plan || 'free';
    if (plan === 'pro' || plan === 'family') {
      return true;
    }
    router.navigate(['/pricing'], { queryParams: { reason: 'upgrade_required' } });
    return of(false);
  }

  // Otherwise, fetch it first to handle page reloads gracefully
  return authService.fetchUserProfile().pipe(
    take(1),
    map(profile => {
      const plan = profile?.plan || 'free';
      if (plan === 'pro' || plan === 'family') {
        return true;
      }
      router.navigate(['/pricing'], { queryParams: { reason: 'upgrade_required' } });
      return false;
    })
  );
};
