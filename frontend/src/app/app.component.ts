import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { FooterComponent } from './shared/components/footer/footer.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, FooterComponent],
  template: `
    <app-navbar></app-navbar>
    <main class="min-h-screen pt-16 px-4 md:px-8">
      <router-outlet></router-outlet>
    </main>
    <app-footer></app-footer>
  `
})
export class AppComponent implements OnInit {
  title = 'frontend';

  ngOnInit() {
    const savedTheme = localStorage.getItem('vaultly_theme') || 'theme-light';
    const body = document.body;
    body.classList.remove('theme-midnight', 'theme-volcanic', 'theme-forest', 'theme-light');
    body.classList.add(savedTheme);
  }
}
