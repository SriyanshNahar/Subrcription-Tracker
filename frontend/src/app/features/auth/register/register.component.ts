import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="flex items-center justify-center min-h-[80vh]">
      <div class="glass-card w-full max-w-md p-8">
        <h2 class="text-3xl font-bold text-center mb-6">Create Account</h2>
        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-400 mb-1">Name</label>
            <input type="text" formControlName="name" class="w-full bg-[#0F0F0F] border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-primary transition-colors text-white" placeholder="John Doe">
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-400 mb-1">Email</label>
            <input type="email" formControlName="email" class="w-full bg-[#0F0F0F] border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-primary transition-colors text-white" placeholder="you@example.com">
          </div>
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-400 mb-1">Password</label>
            <input type="password" formControlName="password" class="w-full bg-[#0F0F0F] border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-primary transition-colors text-white" placeholder="••••••••">
          </div>
          <button type="submit" [disabled]="registerForm.invalid || isLoading" class="w-full bg-primary hover:bg-opacity-90 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50">
            {{ isLoading ? 'Creating...' : 'Sign Up' }}
          </button>
        </form>
        <p class="mt-4 text-center text-gray-400 text-sm">
          Already have an account? <a routerLink="/login" class="text-accent hover:underline">Login</a>
        </p>
      </div>
    </div>
  `
})
export class RegisterComponent {
  registerForm: FormGroup;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private toastr: ToastrService
  ) {
    this.registerForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit() {
    if (this.registerForm.valid) {
      this.isLoading = true;
      this.auth.register(this.registerForm.value).subscribe({
        next: () => {
          this.toastr.success('Account created successfully');
          this.router.navigate(['/']);
        },
        error: (err: any) => {
          this.toastr.error(err.error.error || 'Registration failed');
          this.isLoading = false;
        }
      });
    }
  }
}
