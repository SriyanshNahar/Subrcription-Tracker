import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  private apiUrl = `${environment.apiUrl}/api`;

  constructor(private http: HttpClient) {}

  getSubscriptions() {
    return this.http.get(`${this.apiUrl}/subscriptions`);
  }

  addSubscription(data: any) {
    return this.http.post(`${this.apiUrl}/subscriptions`, data);
  }

  updateSubscription(id: string, data: any) {
    return this.http.put(`${this.apiUrl}/subscriptions/${id}`, data);
  }

  deleteSubscription(id: string) {
    return this.http.delete(`${this.apiUrl}/subscriptions/${id}`);
  }

  getAnalyticsSummary() {
    return this.http.get(`${this.apiUrl}/analytics/summary`);
  }

  getGraveyard() {
    return this.http.get(`${this.apiUrl}/analytics/graveyard`);
  }
}
