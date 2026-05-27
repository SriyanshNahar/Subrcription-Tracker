import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take } from 'rxjs/operators';

export const corporateGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const checkAccess = (profile: any) => {
    const plan = profile?.plan || 'free';
    const orgId = profile?.orgId;
    if (plan === 'corporate' || orgId) {
      return true;
    }
    // Redirect to pricing with corporate highlight (Fix 5)
    router.navigate(['/pricing'], { queryParams: { highlight: 'corporate' } });
    return false;
  };

  if (authService.userProfile$.value) {
    return checkAccess(authService.userProfile$.value);
  }

  return authService.fetchUserProfile().pipe(
    take(1),
    map(profile => checkAccess(profile))
  );
};
