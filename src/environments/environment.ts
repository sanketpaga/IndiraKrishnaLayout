// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  googleSheets: {
    apiKey: 'AIzaSyB9El5v_GzgJDNcGqWVgh5MiVn3klbHtug', // For read-only operations
    spreadsheetId: '1n5CRvk5hnHkIXD0GJNTd9tUxdQCtKThFwn0LyFuejEg',
    webAppUrl: 'https://script.google.com/macros/s/AKfycbw52XnUmtMbCBdI73ANekzmaJStOhnU1ELddUG7TIZ85xWmepdJxGXso765FKFTtL2kjg/exec', // For write operations
    sheets: {
      plots: 'Plots',
      payments: 'Payments', 
      customers: 'Customers'
    }
  }
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
