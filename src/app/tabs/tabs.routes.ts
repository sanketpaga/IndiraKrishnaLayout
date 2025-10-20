import { Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

export const routes: Routes = [
  {
    path: 'tabs',
    component: TabsPage,
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('../dashboard/dashboard.page').then((m) => m.DashboardPage),
      },
      {
        path: 'layout',
        loadComponent: () =>
          import('../layout/layout.page').then((m) => m.LayoutPage),
      },
      {
        path: 'plots',
        loadComponent: () =>
          import('../plots/plots.page').then((m) => m.PlotsPage),
      },
      {
        path: 'payments',
        loadComponent: () =>
          import('../payments/payments.page').then((m) => m.PaymentsPage),
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('../reports/reports.page').then((m) => m.ReportsPage),
      },
      {
        path: '',
        redirectTo: '/tabs/dashboard',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '',
    redirectTo: '/tabs/dashboard',
    pathMatch: 'full',
  },
];
