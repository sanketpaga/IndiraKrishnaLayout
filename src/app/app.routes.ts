import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./tabs/tabs.routes').then((m) => m.routes),
  },
  {
    path: 'admin',
    loadComponent: () => import('./admin/admin.page').then(m => m.AdminPage)
  },
];
