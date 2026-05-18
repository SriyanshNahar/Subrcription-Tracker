import { Injectable } from '@angular/core';
import { Auth, signInWithPopup, GoogleAuthProvider,
         createUserWithEmailAndPassword,
         signInWithEmailAndPassword,
         sendEmailVerification,
         signOut, user } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthService {

  currentUser$: Observable<any>;
  userProfile$ = new BehaviorSubject<any>(null);
  private apiUrl = 'http://localhost:5000/api';

  constructor(private auth: Auth, private router: Router, private http: HttpClient) {
    this.currentUser$ = user(this.auth);
    
    // Reactively fetch user profile whenever authentication state changes
    this.currentUser$.subscribe(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          localStorage.setItem('token', token);
          this.fetchUserProfile().subscribe({
            error: (err) => console.error('Failed to load user profile from backend:', err)
          });
        } catch (e) {
          console.error('Error updating auth token:', e);
        }
      } else {
        localStorage.removeItem('token');
        this.userProfile$.next(null);
      }
    });
  }

  // ✅ Fetch user profile from backend
  fetchUserProfile(): Observable<any> {
    const token = this.getToken();
    if (!token) return of(null);
    
    return this.http.get(`${this.apiUrl}/auth/profile`).pipe(
      tap((profile: any) => {
        this.userProfile$.next(profile);
      })
    );
  }

  // ✅ GOOGLE LOGIN — One Click
  async loginWithGoogle(): Promise<void> {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(this.auth, provider);
      const firebaseUser = result.user;
      
      const token = await firebaseUser.getIdToken();
      localStorage.setItem('token', token);
      
      // Save/register user on backend if needed
      await this.saveUserToBackend(firebaseUser);
      
      // Fetch profile
      this.fetchUserProfile().subscribe();
      
      this.router.navigate(['/']);
    } catch (error: any) {
      throw new Error(error.message);
    }
  }

  // ✅ EMAIL SIGNUP with OTP Verification
  async signupWithEmail(email: string, password: string, name: string): Promise<void> {
    try {
      const result = await createUserWithEmailAndPassword(this.auth, email, password);
      // Send verification email (Firebase built-in OTP)
      await sendEmailVerification(result.user);
      await this.saveUserToBackend(result.user, name);
      this.router.navigate(['/verify-email']);
    } catch (error: any) {
      throw new Error(error.message);
    }
  }

  // ✅ EMAIL LOGIN — Check if verified
  async loginWithEmail(email: string, password: string): Promise<void> {
    try {
      const result = await signInWithEmailAndPassword(this.auth, email, password);
      if (!result.user.emailVerified) {
        await signOut(this.auth);
        throw new Error('Please verify your email first. Check your inbox!');
      }
      const token = await result.user.getIdToken();
      localStorage.setItem('token', token);
      
      // Fetch profile
      this.fetchUserProfile().subscribe();
      
      this.router.navigate(['/']);
    } catch (error: any) {
      throw new Error(error.message);
    }
  }

  // ✅ RESEND VERIFICATION EMAIL
  async resendVerificationEmail(): Promise<void> {
    const currentUser = this.auth.currentUser;
    if (currentUser) {
      await sendEmailVerification(currentUser);
    }
  }

  // ✅ LOGOUT
  async logout(): Promise<void> {
    await signOut(this.auth);
    localStorage.removeItem('token');
    this.userProfile$.next(null);
    this.router.navigate(['/login']);
  }

  // ✅ IS LOGGED IN CHECK
  isLoggedIn(): Observable<any> {
    return this.currentUser$;
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  // Save to Backend
  private async saveUserToBackend(user: any, name?: string): Promise<void> {
    const token = await user.getIdToken();
    const userData = {
      name: name || user.displayName || 'User',
      email: user.email
    };
    
    // We hit the profile endpoint which creates the user if they don't exist
    this.http.get(`${this.apiUrl}/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (profile) => {
        this.userProfile$.next(profile);
      },
      error: (err) => console.error('Failed to sync user with backend:', err)
    });
  }
}
