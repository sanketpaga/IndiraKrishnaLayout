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
        // Show status bar with proper configuration
        await StatusBar.show();
        
        // Set status bar to light content (white text) to work with blue header
        await StatusBar.setStyle({ style: Style.Light });
        
        // Set status bar background to match our header color
        await StatusBar.setBackgroundColor({ color: '#3880ff' });
        
        // Ensure status bar doesn't overlay content
        await StatusBar.setOverlaysWebView({ overlay: false });
        
        console.log('Status bar configured properly');
      } catch (error) {
        console.log('Error configuring status bar:', error);
      }
    } else {
      console.log('StatusBar plugin is not available on web platform - this is normal during development');
    }
  }
}
