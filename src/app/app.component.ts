import { Component, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet, Platform } from '@ionic/angular/standalone';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit {
  constructor(private platform: Platform) {}

  async ngOnInit() {
    await this.platform.ready();
    await this.initializeStatusBar();
  }

  private async initializeStatusBar() {
    // Only initialize status bar on native platforms (not web)
    if (Capacitor.isNativePlatform()) {
      try {
        // Set status bar style
        await StatusBar.setStyle({ style: Style.Dark });
        
        // Set status bar background color to match header
        await StatusBar.setBackgroundColor({ color: '#3880ff' });
        
        // Show status bar
        await StatusBar.show();
        
        console.log('Status bar initialized successfully');
      } catch (error) {
        console.log('Error initializing status bar:', error);
      }
    } else {
      console.log('StatusBar plugin is not available on web platform - this is normal during development');
    }
  }
}
